from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import jwt
import bcrypt
import time
import secrets
import asyncio
import logging
import httpx
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated, Any, Dict

from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends, WebSocket, WebSocketDisconnect
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict
from bson import ObjectId
from mnemonic import Mnemonic

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"
HOT_WALLET_ADDRESS = os.environ.get('HOT_WALLET_ADDRESS', 'rXAMANhotwalletXRPplaceholderADDR')

mnemo = Mnemonic("english")
logger = logging.getLogger("xaman")
logging.basicConfig(level=logging.INFO)

YEAR_SECONDS = 365 * 24 * 3600

DEFAULT_VAULTS = [
    {"key": "xrp_flex", "name": "XRP Flex", "apy": 0.052, "duration_days": 0, "tier": "flex",
     "min_amount": 50000, "description": "Flexible XRP staking. Withdraw anytime after maturity ticks.", "enabled": True},
    {"key": "vip_silver", "name": "VIP Silver", "apy": 0.192, "duration_days": 30, "tier": "silver",
     "min_amount": 150000, "description": "30-day locked VIP vault for Silver members and above.", "enabled": True},
    {"key": "vip_gold", "name": "VIP Gold", "apy": 0.384, "duration_days": 45, "tier": "gold",
     "min_amount": 350000, "description": "45-day locked VIP vault. Elevated Gold yield.", "enabled": True},
    {"key": "vip_platinum", "name": "VIP Platinum", "apy": 0.836, "duration_days": 60, "tier": "platinum",
     "min_amount": 750000, "description": "60-day locked Platinum vault. Premium yield tier.", "enabled": True},
    {"key": "vip_diamond", "name": "VIP Diamond", "apy": 1.56, "duration_days": 90, "tier": "diamond",
     "min_amount": 2000000, "description": "90-day locked Diamond vault. Maximum protocol yield.", "enabled": True},
]

TIER_THRESHOLDS = [
    ("diamond", 2000000),
    ("platinum", 750000),
    ("gold", 350000),
    ("silver", 150000),
    ("starter", 0),
]

# ---------------------------------------------------------------------------
# Mongo helpers
# ---------------------------------------------------------------------------
def _oid(v: Any) -> str:
    if isinstance(v, ObjectId):
        return str(v)
    return str(v)

PyObjectId = Annotated[str, BeforeValidator(_oid)]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_iso(s: str) -> datetime:
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


# ---------------------------------------------------------------------------
# Auth utils
# ---------------------------------------------------------------------------
def hash_phrase(phrase: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(phrase.strip().lower().encode(), salt).decode()


def verify_phrase(phrase: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(phrase.strip().lower().encode(), hashed.encode())
    except Exception:
        return False


def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])


async def get_user_from_token(token: str) -> Optional[dict]:
    user = None
    try:
        payload = decode_token(token)
    except Exception:
        return None
    try:
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    except Exception:
        logger.debug("token->user lookup failed")
        return None
    return user


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = await get_user_from_token(auth[7:])
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return user


async def require_active_user(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("locked"):
        raise HTTPException(status_code=403, detail="Your wallet is locked by an administrator.")
    return user


async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ---------------------------------------------------------------------------
# WebSocket manager
# ---------------------------------------------------------------------------
class WSManager:
    def __init__(self):
        self.by_user: Dict[str, set] = {}
        self.admins: set = set()

    async def connect(self, ws: WebSocket, user_id: str, is_admin: bool):
        await ws.accept()
        self.by_user.setdefault(user_id, set()).add(ws)
        if is_admin:
            self.admins.add(ws)

    def disconnect(self, ws: WebSocket, user_id: str):
        conns = self.by_user.get(user_id)
        if conns and ws in conns:
            conns.discard(ws)
        self.admins.discard(ws)

    async def _send(self, ws: WebSocket, msg: dict):
        try:
            await ws.send_json(msg)
        except Exception:
            pass

    async def notify_user(self, user_id: str, msg: dict = None):
        msg = msg or {"type": "state_updated"}
        for ws in list(self.by_user.get(str(user_id), set())):
            await self._send(ws, msg)

    async def notify_admins(self, msg: dict = None):
        msg = msg or {"type": "admin_updated"}
        for ws in list(self.admins):
            await self._send(ws, msg)


manager = WSManager()


# ---------------------------------------------------------------------------
# Domain logic
# ---------------------------------------------------------------------------
def compute_tier(total_staked: float) -> str:
    for name, threshold in TIER_THRESHOLDS:
        if total_staked >= threshold:
            return name
    return "starter"


def next_tier_progress(total_staked: float):
    order = ["starter", "silver", "gold", "platinum", "diamond"]
    thresholds = {"starter": 0, "silver": 150000, "gold": 350000, "platinum": 750000, "diamond": 2000000}
    current = compute_tier(total_staked)
    idx = order.index(current)
    if idx >= len(order) - 1:
        return {"current": current, "next": None, "progress": 1.0, "next_threshold": None, "current_threshold": thresholds[current]}
    nxt = order[idx + 1]
    cur_t = thresholds[current]
    nxt_t = thresholds[nxt]
    progress = (total_staked - cur_t) / (nxt_t - cur_t) if nxt_t > cur_t else 0
    return {"current": current, "next": nxt, "progress": max(0.0, min(1.0, progress)),
            "next_threshold": nxt_t, "current_threshold": cur_t}


def stake_accrued(stake: dict, now: datetime) -> float:
    start = parse_iso(stake["start_at"])
    elapsed = (now - start).total_seconds()
    if elapsed < 0:
        elapsed = 0
    dur = stake.get("duration_days", 0) or 0
    if dur > 0:
        elapsed = min(elapsed, dur * 86400)
    return stake["principal"] * stake["apy"] * (elapsed / YEAR_SECONDS)


def stake_matured(stake: dict, now: datetime) -> bool:
    dur = stake.get("duration_days", 0) or 0
    if dur <= 0:
        return False
    return now >= parse_iso(stake["start_at"]) + timedelta(days=dur)


def serialize_stake(stake: dict, now: datetime) -> dict:
    claimed = stake.get("claimed_profit", 0.0)
    net = stake_accrued(stake, now) - claimed
    if net < 0:
        net = 0.0
    return {
        "id": str(stake["_id"]),
        "vault_key": stake["vault_key"],
        "vault_name": stake["vault_name"],
        "principal": stake["principal"],
        "apy": stake["apy"],
        "duration_days": stake.get("duration_days", 0),
        "start_at": stake["start_at"],
        "matures_at": (parse_iso(stake["start_at"]) + timedelta(days=stake.get("duration_days", 0))).isoformat()
        if stake.get("duration_days", 0) else None,
        "status": "matured" if stake_matured(stake, now) else "active",
        "accrued": round(net, 6),
        "claimed_profit": round(claimed, 6),
        "tier": stake.get("tier", "flex"),
    }


def public_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "first_name": user.get("first_name", ""),
        "last_name": user.get("last_name", ""),
        "username": user.get("username", ""),
        "role": user.get("role", "user"),
        "locked": user.get("locked", False),
        "withdrawals_disabled": user.get("withdrawals_disabled", False),
        "destination_tag": user.get("destination_tag"),
        "tier_override": user.get("tier_override"),
        "created_at": user.get("created_at"),
    }


async def build_state(user: dict) -> dict:
    now = datetime.now(timezone.utc)
    stakes_docs = await db.stakes.find({"user_id": str(user["_id"])}).to_list(500)
    stakes = [serialize_stake(s, now) for s in stakes_docs]
    total_staked = sum(s["principal"] for s in stakes)
    total_accrued = sum(s["accrued"] for s in stakes)
    bonus_profit = user.get("bonus_profit", 0.0)
    profit = total_accrued + bonus_profit
    tier = user.get("tier_override") or compute_tier(total_staked)
    tier_info = next_tier_progress(total_staked)
    if user.get("tier_override"):
        tier_info["current"] = user["tier_override"]
    return {
        "user": public_user(user),
        "balance": round(user.get("balance", 0.0), 6),
        "total_staked": round(total_staked, 6),
        "profit": round(profit, 6),
        "bonus_profit": round(bonus_profit, 6),
        "tier": tier,
        "tier_info": tier_info,
        "stakes": stakes,
        "hot_wallet": HOT_WALLET_ADDRESS,
        "destination_tag": user.get("destination_tag"),
        "server_time": now.isoformat(),
    }


async def add_transaction(user_id: str, ttype: str, amount: float, status: str, meta: dict = None):
    doc = {
        "user_id": str(user_id),
        "type": ttype,
        "amount": round(amount, 6),
        "status": status,
        "meta": meta or {},
        "created_at": now_iso(),
    }
    res = await db.transactions.insert_one(doc)
    return str(res.inserted_id)


async def audit(admin: dict, action: str, target_user: str = None, detail: dict = None):
    await db.audit_log.insert_one({
        "admin_username": admin.get("username"),
        "action": action,
        "target_user": str(target_user) if target_user else None,
        "detail": detail or {},
        "created_at": now_iso(),
    })


async def unique_destination_tag() -> int:
    for _ in range(50):
        tag = secrets.randbelow(900000000) + 100000000
        exists = await db.users.find_one({"destination_tag": tag})
        if not exists:
            return tag
    return secrets.randbelow(900000000) + 100000000


# ---------------------------------------------------------------------------
# App + middleware
# ---------------------------------------------------------------------------
app = FastAPI(title="XamanProtocol API")
api = APIRouter(prefix="/api")


class NoStoreMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/api"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"
        return response


# ---------------------------------------------------------------------------
# Pydantic request models
# ---------------------------------------------------------------------------
class RegisterReq(BaseModel):
    first_name: str
    last_name: str
    username: str


class LoginReq(BaseModel):
    username: str
    phrase: str


class StakeReq(BaseModel):
    vault_key: str
    amount: float


class ReinvestReq(BaseModel):
    vault_key: str


class AmountReq(BaseModel):
    amount: float


class DeltaReq(BaseModel):
    amount: float


class TierReq(BaseModel):
    tier: Optional[str] = None


class BoolReq(BaseModel):
    value: bool


class VaultUpdateReq(BaseModel):
    name: Optional[str] = None
    apy: Optional[float] = None
    duration_days: Optional[int] = None
    min_amount: Optional[float] = None
    enabled: Optional[bool] = None


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------
@api.post("/auth/register")
async def register(body: RegisterReq):
    username = body.username.strip().lower()
    if not username or len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters.")
    if not body.first_name.strip() or not body.last_name.strip():
        raise HTTPException(status_code=400, detail="First and last name are required.")
    existing = await db.users.find_one({"username": username})
    if existing:
        raise HTTPException(status_code=409, detail="That username is already taken.")

    phrase = mnemo.generate(strength=128)
    tag = await unique_destination_tag()
    doc = {
        "first_name": body.first_name.strip(),
        "last_name": body.last_name.strip(),
        "username": username,
        "phrase_hash": hash_phrase(phrase),
        "role": "user",
        "balance": 0.0,
        "bonus_profit": 0.0,
        "locked": False,
        "withdrawals_disabled": False,
        "tier_override": None,
        "destination_tag": tag,
        "created_at": now_iso(),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    token = create_token(str(res.inserted_id), "user")
    await manager.notify_admins()
    return {"token": token, "phrase": phrase, "user": public_user(doc)}


@api.post("/auth/login")
async def login(body: LoginReq):
    username = body.username.strip().lower()
    user = await db.users.find_one({"username": username})
    if not user or not verify_phrase(body.phrase, user["phrase_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or recovery phrase.")
    token = create_token(str(user["_id"]), user.get("role", "user"))
    return {"token": token, "user": public_user(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": public_user(user)}


# ---------------------------------------------------------------------------
# Vaults (public)
# ---------------------------------------------------------------------------
@api.get("/vaults")
async def get_vaults():
    vaults = await db.vaults.find({}, {"_id": 0}).to_list(100)
    vaults.sort(key=lambda v: v.get("min_amount", 0))
    return {"vaults": vaults}


# ---------------------------------------------------------------------------
# XRP -> USD price (public, cached). Coinbase primary, Kraken fallback.
# ---------------------------------------------------------------------------
_price_cache: Dict[str, Any] = {"usd": None, "ts": 0.0, "source": None}
_PRICE_TTL = 60  # seconds


async def _fetch_xrp_usd() -> Optional[Dict[str, Any]]:
    async with httpx.AsyncClient(timeout=8.0) as http:
        # Coinbase
        try:
            r = await http.get("https://api.coinbase.com/v2/prices/XRP-USD/spot")
            if r.status_code == 200:
                amt = float(r.json()["data"]["amount"])
                if amt > 0:
                    return {"usd": amt, "source": "coinbase"}
        except Exception as e:
            logger.warning("coinbase price failed: %s", e)
        # Kraken fallback
        try:
            r = await http.get("https://api.kraken.com/0/public/Ticker?pair=XRPUSD")
            if r.status_code == 200:
                result = r.json().get("result", {})
                first = next(iter(result.values()))
                amt = float(first["c"][0])
                if amt > 0:
                    return {"usd": amt, "source": "kraken"}
        except Exception as e:
            logger.warning("kraken price failed: %s", e)
    return None


@api.get("/price/xrp")
async def price_xrp():
    now = time.time()
    if _price_cache["usd"] and (now - _price_cache["ts"] < _PRICE_TTL):
        return {"usd": _price_cache["usd"], "source": _price_cache["source"],
                "cached": True, "updated_at": _price_cache["ts"]}
    fresh = await _fetch_xrp_usd()
    if fresh:
        _price_cache.update({"usd": fresh["usd"], "ts": now, "source": fresh["source"]})
        return {"usd": fresh["usd"], "source": fresh["source"],
                "cached": False, "updated_at": now}
    # Serve stale value if we have one, else signal unavailable
    if _price_cache["usd"]:
        return {"usd": _price_cache["usd"], "source": _price_cache["source"],
                "cached": True, "stale": True, "updated_at": _price_cache["ts"]}
    return {"usd": None, "source": None, "cached": False, "updated_at": None}


# ---------------------------------------------------------------------------
# User state
# ---------------------------------------------------------------------------
@api.get("/state")
async def get_state(user: dict = Depends(get_current_user)):
    return await build_state(user)


@api.get("/deposit-info")
async def deposit_info(user: dict = Depends(get_current_user)):
    return {"address": HOT_WALLET_ADDRESS, "destination_tag": user.get("destination_tag"), "coin": "XRP"}


@api.get("/transactions")
async def transactions(user: dict = Depends(get_current_user)):
    txns = await db.transactions.find({"user_id": str(user["_id"])}).sort("created_at", -1).to_list(500)
    return {"transactions": [{
        "id": str(t["_id"]), "type": t["type"], "amount": t["amount"],
        "status": t["status"], "meta": t.get("meta", {}), "created_at": t["created_at"],
    } for t in txns]}


@api.post("/stakes")
async def create_stake(body: StakeReq, user: dict = Depends(require_active_user)):
    vault = await db.vaults.find_one({"key": body.vault_key})
    if not vault or not vault.get("enabled", True):
        raise HTTPException(status_code=404, detail="Vault not available.")
    amount = round(float(body.amount), 6)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Enter a valid amount.")
    if amount < vault.get("min_amount", 0):
        raise HTTPException(status_code=400, detail=f"Minimum for this vault is {vault['min_amount']} XRP.")
    fresh = await db.users.find_one({"_id": user["_id"]})
    if amount > fresh.get("balance", 0.0) + 1e-9:
        raise HTTPException(status_code=400, detail="Insufficient balance. Deposit XRP first.")
    await db.users.update_one({"_id": user["_id"]}, {"$inc": {"balance": -amount}})
    stake_doc = {
        "user_id": str(user["_id"]),
        "vault_key": vault["key"],
        "vault_name": vault["name"],
        "principal": amount,
        "apy": vault["apy"],
        "duration_days": vault.get("duration_days", 0),
        "tier": vault.get("tier", "flex"),
        "start_at": now_iso(),
        "created_at": now_iso(),
    }
    sid = await db.stakes.insert_one(stake_doc)
    await add_transaction(user["_id"], "stake", amount, "completed",
                          {"vault": vault["name"], "stake_id": str(sid.inserted_id)})
    await manager.notify_user(str(user["_id"]))
    await manager.notify_admins()
    return {"ok": True}


@api.post("/reinvest")
async def reinvest(body: ReinvestReq, user: dict = Depends(require_active_user)):
    vault = await db.vaults.find_one({"key": body.vault_key})
    if not vault or not vault.get("enabled", True):
        raise HTTPException(status_code=404, detail="Vault not available.")
    now = datetime.now(timezone.utc)
    fresh = await db.users.find_one({"_id": user["_id"]})
    stakes = await db.stakes.find({"user_id": str(user["_id"])}).to_list(500)
    total = round(fresh.get("bonus_profit", 0.0), 6)
    to_claim = []
    for s in stakes:
        acc = stake_accrued(s, now)
        net = acc - s.get("claimed_profit", 0.0)
        if net > 0:
            total += net
            to_claim.append((s["_id"], acc))
    total = round(total, 6)
    if total <= 0:
        raise HTTPException(status_code=400, detail="You have no profit to reinvest yet.")
    if total < vault.get("min_amount", 0):
        raise HTTPException(status_code=400, detail=f"You need at least {vault['min_amount']} XRP of profit to reinvest into {vault['name']}.")
    for sid, acc in to_claim:
        await db.stakes.update_one({"_id": sid}, {"$set": {"claimed_profit": round(acc, 6)}})
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"bonus_profit": 0.0}})
    stake_doc = {
        "user_id": str(user["_id"]),
        "vault_key": vault["key"],
        "vault_name": vault["name"],
        "principal": total,
        "apy": vault["apy"],
        "duration_days": vault.get("duration_days", 0),
        "tier": vault.get("tier", "flex"),
        "claimed_profit": 0.0,
        "start_at": now_iso(),
        "created_at": now_iso(),
    }
    sid = await db.stakes.insert_one(stake_doc)
    await add_transaction(user["_id"], "reinvest", total, "completed",
                          {"vault": vault["name"], "stake_id": str(sid.inserted_id)})
    await manager.notify_user(str(user["_id"]))
    await manager.notify_admins()
    return {"ok": True, "amount": total}


@api.post("/deposit-claim")
async def deposit_claim(body: AmountReq, user: dict = Depends(require_active_user)):
    amount = round(float(body.amount), 6)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Enter a valid deposit amount.")
    tid = await add_transaction(user["_id"], "deposit", amount, "pending",
                                {"destination_tag": user.get("destination_tag")})
    await manager.notify_admins()
    await manager.notify_user(str(user["_id"]))
    return {"ok": True, "transaction_id": tid}


@api.post("/withdraw")
async def withdraw(body: AmountReq, user: dict = Depends(require_active_user)):
    fresh = await db.users.find_one({"_id": user["_id"]})
    if fresh.get("withdrawals_disabled"):
        raise HTTPException(status_code=403, detail="Withdrawals are currently disabled for your account.")
    amount = round(float(body.amount), 6)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Enter a valid amount.")
    if amount > fresh.get("balance", 0.0) + 1e-9:
        raise HTTPException(status_code=400, detail="Insufficient available balance.")
    await db.users.update_one({"_id": user["_id"]}, {"$inc": {"balance": -amount}})
    tid = await add_transaction(user["_id"], "withdrawal", amount, "pending", {})
    await manager.notify_admins()
    await manager.notify_user(str(user["_id"]))
    return {"ok": True, "transaction_id": tid}


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------
@api.get("/admin/users")
async def admin_users(admin: dict = Depends(require_admin)):
    users = await db.users.find({}).sort("created_at", -1).to_list(1000)
    now = datetime.now(timezone.utc)
    out = []
    for u in users:
        stakes = await db.stakes.find({"user_id": str(u["_id"])}).to_list(500)
        total_staked = sum(s["principal"] for s in stakes)
        out.append({
            **public_user(u),
            "balance": round(u.get("balance", 0.0), 6),
            "total_staked": round(total_staked, 6),
            "tier": u.get("tier_override") or compute_tier(total_staked),
        })
    return {"users": out}


@api.get("/admin/users/{user_id}")
async def admin_user_detail(user_id: str, admin: dict = Depends(require_admin)):
    u = await db.users.find_one({"_id": ObjectId(user_id)})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    state = await build_state(u)
    txns = await db.transactions.find({"user_id": user_id}).sort("created_at", -1).to_list(500)
    state["transactions"] = [{
        "id": str(t["_id"]), "type": t["type"], "amount": t["amount"],
        "status": t["status"], "meta": t.get("meta", {}), "created_at": t["created_at"],
    } for t in txns]
    return state


async def _notify_change(user_id: str):
    await manager.notify_user(str(user_id))
    await manager.notify_admins()


@api.post("/admin/users/{user_id}/adjust-balance")
async def admin_adjust_balance(user_id: str, body: DeltaReq, admin: dict = Depends(require_admin)):
    u = await db.users.find_one({"_id": ObjectId(user_id)})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$inc": {"balance": round(body.amount, 6)}})
    ttype = "deposit" if body.amount >= 0 else "adjustment"
    await add_transaction(user_id, ttype if body.amount >= 0 else "adjustment", abs(body.amount), "completed",
                          {"by": admin["username"], "kind": "balance_adjust"})
    await audit(admin, "adjust_balance", user_id, {"amount": body.amount})
    await _notify_change(user_id)
    return {"ok": True}


@api.post("/admin/users/{user_id}/adjust-profit")
async def admin_adjust_profit(user_id: str, body: DeltaReq, admin: dict = Depends(require_admin)):
    u = await db.users.find_one({"_id": ObjectId(user_id)})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$inc": {"bonus_profit": round(body.amount, 6)}})
    await add_transaction(user_id, "profit", body.amount, "completed", {"by": admin["username"], "kind": "manual_bonus"})
    await audit(admin, "adjust_profit", user_id, {"amount": body.amount})
    await _notify_change(user_id)
    return {"ok": True}


@api.post("/admin/users/{user_id}/tier")
async def admin_set_tier(user_id: str, body: TierReq, admin: dict = Depends(require_admin)):
    tier = body.tier if body.tier and body.tier != "auto" else None
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"tier_override": tier}})
    await audit(admin, "set_tier", user_id, {"tier": tier})
    await _notify_change(user_id)
    return {"ok": True}


@api.post("/admin/users/{user_id}/lock")
async def admin_lock(user_id: str, body: BoolReq, admin: dict = Depends(require_admin)):
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"locked": body.value}})
    await audit(admin, "lock" if body.value else "unlock", user_id, {"locked": body.value})
    await _notify_change(user_id)
    return {"ok": True}


@api.post("/admin/users/{user_id}/withdrawals")
async def admin_withdrawals_toggle(user_id: str, body: BoolReq, admin: dict = Depends(require_admin)):
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"withdrawals_disabled": body.value}})
    await audit(admin, "disable_withdrawals" if body.value else "enable_withdrawals", user_id, {"disabled": body.value})
    await _notify_change(user_id)
    return {"ok": True}


@api.get("/admin/withdrawals")
async def admin_withdrawal_queue(admin: dict = Depends(require_admin)):
    txns = await db.transactions.find({"type": "withdrawal", "status": "pending"}).sort("created_at", 1).to_list(500)
    out = []
    for t in txns:
        u = await db.users.find_one({"_id": ObjectId(t["user_id"])})
        out.append({
            "id": str(t["_id"]), "amount": t["amount"], "created_at": t["created_at"],
            "username": u.get("username") if u else "?",
            "user_id": t["user_id"],
        })
    return {"withdrawals": out}


@api.get("/admin/deposits")
async def admin_deposit_queue(admin: dict = Depends(require_admin)):
    txns = await db.transactions.find({"type": "deposit", "status": "pending"}).sort("created_at", 1).to_list(500)
    out = []
    for t in txns:
        u = await db.users.find_one({"_id": ObjectId(t["user_id"])})
        out.append({
            "id": str(t["_id"]), "amount": t["amount"], "created_at": t["created_at"],
            "username": u.get("username") if u else "?", "user_id": t["user_id"],
            "destination_tag": t.get("meta", {}).get("destination_tag"),
        })
    return {"deposits": out}


@api.post("/admin/deposits/{txn_id}/confirm")
async def admin_confirm_deposit(txn_id: str, admin: dict = Depends(require_admin)):
    t = await db.transactions.find_one({"_id": ObjectId(txn_id)})
    if not t or t["type"] != "deposit":
        raise HTTPException(status_code=404, detail="Deposit not found")
    if t["status"] != "pending":
        return {"ok": True, "note": "already processed"}
    await db.transactions.update_one({"_id": ObjectId(txn_id)}, {"$set": {"status": "completed", "meta.confirmed_by": admin["username"]}})
    await db.users.update_one({"_id": ObjectId(t["user_id"])}, {"$inc": {"balance": t["amount"]}})
    await audit(admin, "confirm_deposit", t["user_id"], {"amount": t["amount"], "txn": txn_id})
    await manager.notify_user(t["user_id"], {"type": "notify", "event": "deposit_confirmed", "amount": t["amount"]})
    await manager.notify_admins()
    return {"ok": True}


@api.post("/admin/deposits/{txn_id}/reject")
async def admin_reject_deposit(txn_id: str, admin: dict = Depends(require_admin)):
    t = await db.transactions.find_one({"_id": ObjectId(txn_id)})
    if not t or t["type"] != "deposit":
        raise HTTPException(status_code=404, detail="Deposit not found")
    await db.transactions.update_one({"_id": ObjectId(txn_id)}, {"$set": {"status": "rejected", "meta.rejected_by": admin["username"]}})
    await audit(admin, "reject_deposit", t["user_id"], {"txn": txn_id})
    await _notify_change(t["user_id"])
    return {"ok": True}


@api.post("/admin/withdrawals/{txn_id}/approve")
async def admin_approve_withdrawal(txn_id: str, admin: dict = Depends(require_admin)):
    t = await db.transactions.find_one({"_id": ObjectId(txn_id)})
    if not t or t["type"] != "withdrawal":
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    if t["status"] != "pending":
        return {"ok": True, "note": "already processed"}
    await db.transactions.update_one({"_id": ObjectId(txn_id)}, {"$set": {"status": "completed", "meta.approved_by": admin["username"]}})
    await audit(admin, "approve_withdrawal", t["user_id"], {"amount": t["amount"], "txn": txn_id})
    await manager.notify_user(t["user_id"], {"type": "notify", "event": "withdrawal_approved", "amount": t["amount"]})
    await manager.notify_admins()
    return {"ok": True}


@api.post("/admin/withdrawals/{txn_id}/reject")
async def admin_reject_withdrawal(txn_id: str, admin: dict = Depends(require_admin)):
    t = await db.transactions.find_one({"_id": ObjectId(txn_id)})
    if not t or t["type"] != "withdrawal":
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    if t["status"] != "pending":
        return {"ok": True, "note": "already processed"}
    # refund the held balance
    await db.users.update_one({"_id": ObjectId(t["user_id"])}, {"$inc": {"balance": t["amount"]}})
    await db.transactions.update_one({"_id": ObjectId(txn_id)}, {"$set": {"status": "rejected", "meta.rejected_by": admin["username"]}})
    await audit(admin, "reject_withdrawal", t["user_id"], {"amount": t["amount"], "txn": txn_id})
    await _notify_change(t["user_id"])
    return {"ok": True}


@api.get("/admin/audit")
async def admin_audit_log(admin: dict = Depends(require_admin)):
    logs = await db.audit_log.find({}).sort("created_at", -1).to_list(300)
    return {"audit": [{
        "id": str(l["_id"]), "admin_username": l.get("admin_username"), "action": l["action"],
        "target_user": l.get("target_user"), "detail": l.get("detail", {}), "created_at": l["created_at"],
    } for l in logs]}


@api.put("/admin/vaults/{key}")
async def admin_update_vault(key: str, body: VaultUpdateReq, admin: dict = Depends(require_admin)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        return {"ok": True}
    res = await db.vaults.update_one({"key": key}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vault not found")
    await audit(admin, "update_vault", None, {"key": key, **updates})
    await manager.notify_admins()
    return {"ok": True}


# ---------------------------------------------------------------------------
# WebSocket
# ---------------------------------------------------------------------------
@api.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str = ""):
    user = await get_user_from_token(token)
    if not user:
        await ws.close(code=1008)
        return
    uid = str(user["_id"])
    is_admin = user.get("role") == "admin"
    await manager.connect(ws, uid, is_admin)
    try:
        await ws.send_json({"type": "connected"})
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws, uid)
    except Exception:
        manager.disconnect(ws, uid)


# ---------------------------------------------------------------------------
# Startup: seed vaults + admin + background accrual maturity checker
# ---------------------------------------------------------------------------
async def seed():
    for v in DEFAULT_VAULTS:
        await db.vaults.update_one({"key": v["key"]}, {"$setOnInsert": v}, upsert=True)
    await db.users.create_index("username", unique=True)
    await db.users.create_index("destination_tag", unique=True, sparse=True)

    admin_username = os.environ["ADMIN_USERNAME"].strip().lower()
    admin_phrase = os.environ["ADMIN_PHRASE"].strip()
    existing = await db.users.find_one({"username": admin_username})
    if not existing:
        tag = await unique_destination_tag()
        await db.users.insert_one({
            "first_name": "Protocol", "last_name": "Admin", "username": admin_username,
            "phrase_hash": hash_phrase(admin_phrase), "role": "admin", "balance": 0.0,
            "bonus_profit": 0.0, "locked": False, "withdrawals_disabled": False,
            "tier_override": None, "destination_tag": tag, "created_at": now_iso(),
        })
        logger.info("Seeded admin user '%s'", admin_username)
    else:
        await db.users.update_one({"username": admin_username},
                                  {"$set": {"role": "admin", "phrase_hash": hash_phrase(admin_phrase)}})


async def maturity_loop():
    while True:
        try:
            now = datetime.now(timezone.utc)
            async for s in db.stakes.find({"duration_days": {"$gt": 0}, "matured_notified": {"$ne": True}}):
                if stake_matured(s, now):
                    await db.stakes.update_one({"_id": s["_id"]}, {"$set": {"matured_notified": True}})
                    await manager.notify_user(s["user_id"])
        except Exception as e:
            logger.warning("maturity loop error: %s", e)
        await asyncio.sleep(30)


@app.on_event("startup")
async def on_startup():
    await seed()
    asyncio.create_task(maturity_loop())


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


app.include_router(api)
app.add_middleware(NoStoreMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
