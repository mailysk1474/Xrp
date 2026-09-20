from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import re
import jwt
import bcrypt
import time
import uuid
import secrets
import asyncio
import logging
import httpx
import io
import csv
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

SETTINGS_ID = "global"
# In-process cache so hot wallet reads never hit the DB on the hot path.
_settings_cache: Dict[str, Any] = {}


async def get_hot_wallet() -> str:
    """Return the current hot wallet address. DB-backed (admin-editable) with env fallback."""
    if "hot_wallet_address" in _settings_cache:
        return _settings_cache["hot_wallet_address"]
    doc = await db.settings.find_one({"_id": SETTINGS_ID})
    addr = (doc or {}).get("hot_wallet_address") or HOT_WALLET_ADDRESS
    _settings_cache["hot_wallet_address"] = addr
    return addr


async def set_hot_wallet(address: str):
    await db.settings.update_one(
        {"_id": SETTINGS_ID},
        {"$set": {"hot_wallet_address": address, "updated_at": now_iso()}},
        upsert=True,
    )
    _settings_cache["hot_wallet_address"] = address


XRP_ADDRESS_RE = re.compile(r"^r[1-9A-HJ-NP-Za-km-z]{24,34}$")

mnemo = Mnemonic("english")
logger = logging.getLogger("xaman")
logging.basicConfig(level=logging.INFO)

YEAR_SECONDS = 365 * 24 * 3600

DEFAULT_VAULTS = [
    {"key": "xrp_flex", "name": "XRP Flex", "apy": 0.1999, "duration_days": 18, "tier": "flex",
     "min_amount": 25000, "early_exit_fee": 0.10, "slippage": 0.02, "description": "18-day XRP vault. Auto-settles to your balance at maturity.", "enabled": True},
    {"key": "vip_silver", "name": "VIP Silver", "apy": 0.2999, "duration_days": 30, "tier": "silver",
     "min_amount": 50000, "early_exit_fee": 0.10, "slippage": 0.02, "description": "30-day locked VIP vault for Silver members and above.", "enabled": True},
    {"key": "vip_gold", "name": "VIP Gold", "apy": 0.4999, "duration_days": 45, "tier": "gold",
     "min_amount": 100000, "early_exit_fee": 0.10, "slippage": 0.02, "description": "45-day locked VIP vault. Elevated Gold yield.", "enabled": True},
    {"key": "vip_platinum", "name": "VIP Platinum", "apy": 0.8999, "duration_days": 60, "tier": "platinum",
     "min_amount": 250000, "early_exit_fee": 0.10, "slippage": 0.02, "description": "60-day locked Platinum vault. Premium yield tier.", "enabled": True},
    {"key": "vip_diamond", "name": "VIP Diamond", "apy": 1.56, "duration_days": 90, "tier": "diamond",
     "min_amount": 500000, "early_exit_fee": 0.10, "slippage": 0.02, "description": "90-day locked Diamond vault. Maximum protocol yield.", "enabled": True},
]

TIER_THRESHOLDS = [
    ("diamond", 500000),
    ("platinum", 250000),
    ("gold", 100000),
    ("silver", 50000),
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


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode(), salt).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False


_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def valid_email(email: str) -> bool:
    return bool(_EMAIL_RE.match(email.strip().lower()))


async def unique_username_from_email(email: str) -> str:
    base = re.sub(r"[^a-z0-9_]", "", email.split("@")[0].lower()) or "vip"
    base = base[:20]
    candidate = base
    for _ in range(20):
        if not await db.users.find_one({"username": candidate}):
            return candidate
        candidate = f"{base}_{secrets.randbelow(9000) + 1000}"
    return f"{base}_{secrets.token_hex(4)}"


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

    async def notify_all(self, msg: dict = None):
        """Broadcast to every connected client (used for global/admin changes)."""
        msg = msg or {"type": "state_updated"}
        seen = set()
        for conns in list(self.by_user.values()):
            for ws in list(conns):
                if id(ws) in seen:
                    continue
                seen.add(id(ws))
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
    thresholds = {"starter": 0, "silver": 50000, "gold": 100000, "platinum": 250000, "diamond": 500000}
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
    # `apy` is the TOTAL return earned over the full lock period (not annualized).
    # Profit accrues live from 0 up to exactly principal * apy at maturity, based on the
    # CURRENT principal — so it always reflects the real staked balance.
    start = parse_iso(stake["start_at"])
    elapsed = (now - start).total_seconds()
    if elapsed < 0:
        elapsed = 0
    rate = stake.get("apy", 0) or 0
    principal = stake.get("principal", 0) or 0
    dur = stake.get("duration_days", 0) or 0
    if dur > 0:
        period = dur * 86400
        frac = elapsed / period
        if frac > 1:
            frac = 1.0
        return principal * rate * frac
    # No fixed term: fall back to a linear daily portion of the total rate.
    return principal * rate * (elapsed / YEAR_SECONDS)


def stake_matured(stake: dict, now: datetime) -> bool:
    dur = stake.get("duration_days", 0) or 0
    if dur <= 0:
        return False
    return now >= parse_iso(stake["start_at"]) + timedelta(days=dur)


def serialize_stake(stake: dict, now: datetime, vault: dict = None) -> dict:
    claimed = stake.get("claimed_profit", 0.0)
    net = stake_accrued(stake, now) - claimed
    if net < 0:
        net = 0.0
    matured = stake_matured(stake, now)
    principal = stake["principal"]
    # Live early-exit terms come from the vault (admin-managed). Fall back to snapshot on the stake.
    fee = (vault or {}).get("early_exit_fee", stake.get("early_exit_fee", 0.10))
    slip = (vault or {}).get("slippage", stake.get("slippage", 0.02))
    is_locked = (stake.get("duration_days", 0) or 0) > 0
    exited = principal <= 0 or stake.get("status") == "exited"
    # Flexible (unlocked) stakes can be stopped anytime with NO penalty.
    # Locked stakes can be stopped early (before maturity) with fee + slippage.
    can_exit = (not exited) and (not matured)
    if can_exit and is_locked:
        exit_kind = "locked"
        fee_amt = round(principal * fee, 6)
        slip_amt = round(principal * slip, 6)
        exit_return = round(principal - fee_amt - slip_amt, 6)
    elif can_exit:
        exit_kind = "flex"
        fee_amt = 0.0
        slip_amt = 0.0
        exit_return = round(principal + net, 6)  # principal + earned profit, no penalty
    else:
        exit_kind = None
        fee_amt = 0.0
        slip_amt = 0.0
        exit_return = 0.0
    if exited:
        status = "exited"
    elif matured:
        status = "matured"
    else:
        status = "active"
    return {
        "id": str(stake["_id"]),
        "vault_key": stake["vault_key"],
        "vault_name": stake["vault_name"],
        "principal": principal,
        "apy": stake["apy"],
        "duration_days": stake.get("duration_days", 0),
        "start_at": stake["start_at"],
        "matures_at": (parse_iso(stake["start_at"]) + timedelta(days=stake.get("duration_days", 0))).isoformat()
        if stake.get("duration_days", 0) else None,
        "status": status,
        "accrued": round(net, 6),
        "profit_at_maturity": round(max(principal * stake["apy"] - claimed, 0.0), 6),
        "total_at_maturity": round(principal + max(principal * stake["apy"] - claimed, 0.0), 6),
        "claimed_profit": round(claimed, 6),
        "tier": stake.get("tier", "flex"),
        "can_exit": can_exit,
        "exit_kind": exit_kind,
        "early_exit_fee": fee if exit_kind == "locked" else 0.0,
        "slippage": slip if exit_kind == "locked" else 0.0,
        "early_exit_fee_amount": fee_amt,
        "early_exit_slippage_amount": slip_amt,
        "early_exit_return": exit_return,
    }


def public_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "first_name": user.get("first_name", ""),
        "last_name": user.get("last_name", ""),
        "username": user.get("username", ""),
        "email": user.get("email", ""),
        "role": user.get("role", "user"),
        "locked": user.get("locked", False),
        "withdrawals_disabled": user.get("withdrawals_disabled", False),
        "destination_tag": user.get("destination_tag"),
        "tier_override": user.get("tier_override"),
        "auto_restake": user.get("auto_restake", {"enabled": False, "threshold": None, "vault_key": None}),
        "notify_prefs": user.get("notify_prefs", {"matured": True, "deposit": True, "withdrawal": True, "restake": True}),
        "has_password": bool(user.get("password_hash")),
        "last_login": user.get("last_login"),
        "created_at": user.get("created_at"),
    }


async def build_state(user: dict) -> dict:
    now = datetime.now(timezone.utc)
    stakes_docs = await db.stakes.find({"user_id": str(user["_id"])}).to_list(500)
    vault_docs = await db.vaults.find({}).to_list(100)
    vault_map = {v["key"]: v for v in vault_docs}
    stakes = [serialize_stake(s, now, vault_map.get(s.get("vault_key"))) for s in stakes_docs]
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
        "hot_wallet": await get_hot_wallet(),
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


async def gather_profit(user: dict, now: datetime):
    """Return (total_profit, [(stake_id, accrued)...]) claimable for this user."""
    stakes = await db.stakes.find({"user_id": str(user["_id"])}).to_list(500)
    total = round(user.get("bonus_profit", 0.0), 6)
    to_claim = []
    for s in stakes:
        if s.get("principal", 0) <= 0 or s.get("status") in ("exited", "completed"):
            continue
        acc = stake_accrued(s, now)
        net = acc - s.get("claimed_profit", 0.0)
        if net > 0:
            total += net
            to_claim.append((s["_id"], acc))
    return round(total, 6), to_claim


def restake_projection(p0: float, added: float, rate: float, dur: int, old_start_iso: str, now: datetime) -> dict:
    """Pure math for a weighted restake — used by both the live preview and the real compound.

    Extends the maturity by a WEIGHTED amount: new_start = amount-weighted average of the
    old start and now. `claimed` offsets the blended clock so net profit continues from 0
    and the stake pays the fair remaining amount at maturity. No DB writes.
    """
    new_principal = round(p0 + added, 6)
    if dur > 0 and new_principal > 0:
        old_start_e = parse_iso(old_start_iso).timestamp()
        now_e = now.timestamp()
        new_start_e = (p0 * old_start_e + added * now_e) / new_principal
        new_start_dt = datetime.fromtimestamp(new_start_e, tz=timezone.utc)
        period = dur * 86400
        frac = max(0.0, min(1.0, (now_e - new_start_e) / period))
        claimed = round(new_principal * rate * frac, 6)
        matures_at = (new_start_dt + timedelta(days=dur)).isoformat()
    else:
        new_start_dt = now
        claimed = 0.0
        matures_at = None
    profit_at_maturity = round(max(new_principal * rate - claimed, 0.0), 6)
    total_at_maturity = round(new_principal + profit_at_maturity, 6)
    return {
        "new_principal": new_principal,
        "new_start": new_start_dt.isoformat(),
        "claimed": claimed,
        "matures_at": matures_at,
        "profit_at_maturity": profit_at_maturity,
        "total_at_maturity": total_at_maturity,
    }


async def compound_restake(user: dict, target_stake: dict, total: float, to_claim: list,
                           now: datetime, auto: bool = False):
    """Option A — fold all available profit into an EXISTING stake's principal.

    The added capital extends the maturity date by a WEIGHTED amount (see restake_projection).
    Returns (amount_compounded, new_principal).
    """
    # Realize every source stake's earned-so-far profit so it isn't double-counted.
    for sid, acc in to_claim:
        await db.stakes.update_one({"_id": sid}, {"$set": {"claimed_profit": round(acc, 6)}})
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"bonus_profit": 0.0}})
    # Re-read the target after the claim update, then compound + re-time its clock.
    fresh_target = await db.stakes.find_one({"_id": target_stake["_id"]})
    p0 = float(fresh_target.get("principal", 0.0) or 0.0)
    added = float(total)
    rate = fresh_target.get("apy", 0) or 0
    dur = fresh_target.get("duration_days", 0) or 0

    proj = restake_projection(p0, added, rate, dur, fresh_target["start_at"], now)
    set_fields = {
        "principal": proj["new_principal"],
        "start_at": proj["new_start"],
        "claimed_profit": proj["claimed"],
    }
    await db.stakes.update_one({"_id": target_stake["_id"]}, {"$set": set_fields})
    await add_transaction(user["_id"], "reinvest", round(total, 6), "completed",
                          {"vault": target_stake.get("vault_name"),
                           "stake_id": str(target_stake["_id"]),
                           "new_principal": proj["new_principal"], "auto": auto})
    return round(total, 6), proj["new_principal"]


async def settle_matured_stake(stake: dict, now: datetime) -> float:
    """Auto-close a matured stake: return principal + earned profit to balance."""
    principal = round(stake.get("principal", 0.0), 6)
    acc = stake_accrued(stake, now)
    net = round(acc - stake.get("claimed_profit", 0.0), 6)
    if net < 0:
        net = 0.0
    returned = round(principal + net, 6)
    await db.users.update_one({"_id": ObjectId(stake["user_id"])}, {"$inc": {"balance": returned}})
    await db.stakes.update_one({"_id": stake["_id"]}, {"$set": {
        "principal": 0.0,
        "status": "completed",
        "matured_notified": True,
        "closed_at": now_iso(),
        "claimed_profit": round(acc, 6),
        "settle_return": returned,
    }})
    await add_transaction(stake["user_id"], "stake_closed", returned, "completed", {
        "vault": stake.get("vault_name"),
        "stake_id": str(stake["_id"]),
        "principal": principal,
        "profit": net,
    })
    return returned



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
    email: str
    password: str


class LoginReq(BaseModel):
    email: str
    password: str


class RecoverReq(BaseModel):
    email: str
    phrase: str


class ChangePasswordReq(BaseModel):
    current_password: Optional[str] = None
    new_password: str


class UpdateProfileReq(BaseModel):
    first_name: str
    last_name: str


class NotifyPrefsReq(BaseModel):
    matured: bool = True
    deposit: bool = True
    withdrawal: bool = True
    restake: bool = True


class StakeReq(BaseModel):
    vault_key: str
    amount: float


class ReinvestReq(BaseModel):
    stake_id: str


class AutoRestakeReq(BaseModel):
    enabled: bool
    threshold: Optional[float] = None
    vault_key: Optional[str] = None


class AmountReq(BaseModel):
    amount: float


class WithdrawReq(BaseModel):
    amount: float
    address: str
    tag: Optional[str] = None


class SaveAddressReq(BaseModel):
    label: str
    address: str
    tag: Optional[str] = None


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
    early_exit_fee: Optional[float] = None
    slippage: Optional[float] = None
    enabled: Optional[bool] = None


class SettingsReq(BaseModel):
    hot_wallet_address: str


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------
@api.post("/auth/register")
async def register(body: RegisterReq):
    email = body.email.strip().lower()
    if not valid_email(email):
        raise HTTPException(status_code=400, detail="Enter a valid email address.")
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    if not body.first_name.strip() or not body.last_name.strip():
        raise HTTPException(status_code=400, detail="First and last name are required.")
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="An account with that email already exists.")

    username = await unique_username_from_email(email)
    phrase = mnemo.generate(strength=128)
    tag = await unique_destination_tag()
    doc = {
        "first_name": body.first_name.strip(),
        "last_name": body.last_name.strip(),
        "username": username,
        "email": email,
        "password_hash": hash_password(body.password),
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
    email = body.email.strip().lower()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"last_login": now_iso()}})
    token = create_token(str(user["_id"]), user.get("role", "user"))
    return {"token": token, "user": public_user(user)}


@api.post("/auth/recover")
async def recover(body: RecoverReq):
    email = body.email.strip().lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_phrase(body.phrase, user["phrase_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or recovery phrase.")
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"last_login": now_iso()}})
    token = create_token(str(user["_id"]), user.get("role", "user"))
    return {"token": token, "user": public_user(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": public_user(user)}


# ---------------------------------------------------------------------------
# Account / profile self-service
# ---------------------------------------------------------------------------
@api.post("/auth/change-password")
async def change_password(body: ChangePasswordReq, user: dict = Depends(get_current_user)):
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters.")
    if user.get("password_hash"):
        if not body.current_password or not verify_password(body.current_password, user["password_hash"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect.")
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"password_hash": hash_password(body.new_password)}})
    return {"ok": True}


@api.post("/auth/update-profile")
async def update_profile(body: UpdateProfileReq, user: dict = Depends(get_current_user)):
    first = body.first_name.strip()
    last = body.last_name.strip()
    if not first or not last:
        raise HTTPException(status_code=400, detail="First and last name are required.")
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"first_name": first, "last_name": last}})
    fresh = await db.users.find_one({"_id": user["_id"]})
    await manager.notify_admins()
    return {"ok": True, "user": public_user(fresh)}


@api.put("/notifications/prefs")
async def set_notify_prefs(body: NotifyPrefsReq, user: dict = Depends(get_current_user)):
    prefs = {"matured": body.matured, "deposit": body.deposit,
             "withdrawal": body.withdrawal, "restake": body.restake}
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"notify_prefs": prefs}})
    return {"ok": True, "notify_prefs": prefs}


# ---------------------------------------------------------------------------
# Transaction export (CSV / PDF) — auth via Authorization header
# ---------------------------------------------------------------------------
_TXN_LABELS = {
    "deposit": "Deposit", "withdraw": "Withdrawal", "withdrawal": "Withdrawal",
    "stake": "Stake", "reinvest": "Restake", "early_exit": "Early exit",
    "profit": "Profit", "matured": "Matured", "admin_credit": "Admin credit",
    "admin_debit": "Admin debit",
}


def _meta_summary(meta: dict) -> str:
    if not meta:
        return ""
    parts = []
    for k in ("vault", "kind", "fee_amount", "slippage_amount", "forfeited_profit", "profit_paid", "destination_address", "destination_tag"):
        if k in meta and meta[k] not in (None, ""):
            parts.append(f"{k}={meta[k]}")
    return "; ".join(parts)


@api.get("/transactions/export")
async def export_transactions(fmt: str = "csv", user: dict = Depends(get_current_user)):
    txns = await db.transactions.find({"user_id": str(user["_id"])}).sort("created_at", -1).to_list(2000)
    rows = []
    for t in txns:
        rows.append([
            t.get("created_at", ""),
            _TXN_LABELS.get(t.get("type", ""), (t.get("type", "") or "").title()),
            f"{float(t.get('amount', 0) or 0):.6f}",
            (t.get("status", "") or "").title(),
            _meta_summary(t.get("meta", {})),
        ])
    headers_row = ["Date (UTC)", "Type", "Amount (XRP)", "Status", "Details"]
    fname = f"xamanprotocol_transactions_{datetime.now(timezone.utc).strftime('%Y%m%d')}"

    if fmt == "pdf":
        from fpdf import FPDF
        pdf = FPDF(orientation="L", unit="mm", format="A4")
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 16)
        pdf.cell(0, 10, "XamanProtocol - Transaction History", ln=True)
        pdf.set_font("Helvetica", "", 9)
        who = f"{user.get('first_name','')} {user.get('last_name','')} ({user.get('email') or user.get('username','')})"
        pdf.cell(0, 6, who.strip(), ln=True)
        pdf.cell(0, 6, f"Generated {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} - {len(rows)} transactions", ln=True)
        pdf.ln(2)
        widths = [46, 32, 40, 26, 133]
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_fill_color(240, 243, 250)
        for w, h in zip(widths, headers_row):
            pdf.cell(w, 8, h, border=1, fill=True)
        pdf.ln(8)
        pdf.set_font("Helvetica", "", 8)
        for r in rows:
            for w, val in zip(widths, r):
                s = str(val)
                # truncate long detail cell to fit
                maxc = int(w / 1.7)
                if len(s) > maxc:
                    s = s[: maxc - 3] + "..."
                # core PDF fonts are latin-1 only; drop unsupported chars
                s = s.encode("latin-1", "replace").decode("latin-1")
                pdf.cell(w, 7, s, border=1)
            pdf.ln(7)
        out = pdf.output()
        pdf_bytes = bytes(out)
        return Response(content=pdf_bytes, media_type="application/pdf",
                        headers={"Content-Disposition": f'attachment; filename="{fname}.pdf"'})

    # default: CSV
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(headers_row)
    writer.writerows(rows)
    return Response(content=buf.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": f'attachment; filename="{fname}.csv"'})


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
_PRICE_TTL = 300  # seconds (5 min) — keeps external calls well under free rate limits


async def _fetch_xrp_usd() -> Optional[Dict[str, Any]]:
    async with httpx.AsyncClient(timeout=8.0) as http:
        # CoinGecko (primary)
        try:
            r = await http.get(
                "https://api.coingecko.com/api/v3/simple/price",
                params={"ids": "ripple", "vs_currencies": "usd"},
            )
            if r.status_code == 200:
                amt = float(r.json().get("ripple", {}).get("usd", 0))
                if amt > 0:
                    return {"usd": amt, "source": "coingecko"}
            else:
                logger.warning("coingecko price status %s", r.status_code)
        except Exception as e:
            logger.warning("coingecko price failed: %s", e)
        # Coinbase (fallback)
        try:
            r = await http.get("https://api.coinbase.com/v2/prices/XRP-USD/spot")
            if r.status_code == 200:
                amt = float(r.json()["data"]["amount"])
                if amt > 0:
                    return {"usd": amt, "source": "coinbase"}
        except Exception as e:
            logger.warning("coinbase price failed: %s", e)
        # Kraken (fallback)
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
    return {"address": await get_hot_wallet(), "destination_tag": user.get("destination_tag"), "coin": "XRP"}


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
    try:
        oid = ObjectId(body.stake_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Stake not found.")
    target = await db.stakes.find_one({"_id": oid, "user_id": str(user["_id"])})
    if not target or target.get("principal", 0) <= 0 or target.get("status") in ("exited", "completed"):
        raise HTTPException(status_code=400, detail="Choose an active stake to compound your profit into.")
    now = datetime.now(timezone.utc)
    fresh = await db.users.find_one({"_id": user["_id"]})
    total, to_claim = await gather_profit(fresh, now)
    if total <= 0:
        raise HTTPException(status_code=400, detail="You have no profit to restake yet.")
    amount, new_principal = await compound_restake(fresh, target, total, to_claim, now, auto=False)
    await manager.notify_user(str(user["_id"]))
    await manager.notify_admins()
    return {"ok": True, "amount": amount, "principal": new_principal}


@api.post("/reinvest/preview")
async def reinvest_preview(body: ReinvestReq, user: dict = Depends(require_active_user)):
    """Show the exact new maturity date + payout BEFORE the member confirms a restake."""
    try:
        oid = ObjectId(body.stake_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Stake not found.")
    target = await db.stakes.find_one({"_id": oid, "user_id": str(user["_id"])})
    if not target or target.get("principal", 0) <= 0 or target.get("status") in ("exited", "completed"):
        raise HTTPException(status_code=400, detail="Choose an active stake to compound your profit into.")
    now = datetime.now(timezone.utc)
    fresh = await db.users.find_one({"_id": user["_id"]})
    total, _ = await gather_profit(fresh, now)
    p0 = float(target.get("principal", 0.0) or 0.0)
    rate = target.get("apy", 0) or 0
    dur = target.get("duration_days", 0) or 0
    proj = restake_projection(p0, float(total), rate, dur, target["start_at"], now)
    return {
        "stake_id": body.stake_id,
        "vault_name": target.get("vault_name"),
        "duration_days": dur,
        "amount": round(total, 6),
        "current_principal": round(p0, 6),
        "new_principal": proj["new_principal"],
        "current_matures_at": (parse_iso(target["start_at"]) + timedelta(days=dur)).isoformat() if dur else None,
        "new_matures_at": proj["matures_at"],
        "profit_at_maturity": proj["profit_at_maturity"],
        "total_at_maturity": proj["total_at_maturity"],
    }


@api.post("/auto-restake")
async def set_auto_restake(body: AutoRestakeReq, user: dict = Depends(require_active_user)):
    if not body.enabled:
        await db.users.update_one({"_id": user["_id"]}, {"$set": {"auto_restake": {"enabled": False, "threshold": None, "vault_key": None}}})
        await manager.notify_user(str(user["_id"]))
        return {"ok": True, "auto_restake": {"enabled": False, "threshold": None, "vault_key": None}}
    threshold = round(float(body.threshold or 0), 6)
    if threshold <= 0:
        raise HTTPException(status_code=400, detail="Set a trigger amount greater than 0.")
    # vault_key is an optional PREFERRED target — profit is compounded into that vault's
    # stake if the user holds one, otherwise into their largest active stake.
    vault_key = body.vault_key
    if vault_key:
        vault = await db.vaults.find_one({"key": vault_key})
        if not vault:
            vault_key = None
    cfg = {"enabled": True, "threshold": threshold, "vault_key": vault_key}
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"auto_restake": cfg}})
    await manager.notify_user(str(user["_id"]))
    return {"ok": True, "auto_restake": cfg}


@api.post("/stakes/{stake_id}/exit")
async def exit_stake_early(stake_id: str, user: dict = Depends(require_active_user)):
    try:
        oid = ObjectId(stake_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Stake not found.")
    stake = await db.stakes.find_one({"_id": oid, "user_id": str(user["_id"])})
    if not stake:
        raise HTTPException(status_code=404, detail="Stake not found.")
    if stake.get("status") == "exited" or stake.get("principal", 0) <= 0:
        raise HTTPException(status_code=400, detail="This stake is no longer active.")
    now = datetime.now(timezone.utc)
    dur = stake.get("duration_days", 0) or 0
    if dur > 0 and stake_matured(stake, now):
        raise HTTPException(status_code=400, detail="This stake has matured — no early exit needed.")
    vault = await db.vaults.find_one({"key": stake.get("vault_key")}) or {}
    principal = round(float(stake["principal"]), 6)
    accrued = round(stake_accrued(stake, now) - stake.get("claimed_profit", 0.0), 6)
    if accrued < 0:
        accrued = 0.0

    if dur <= 0:
        # Flexible vault: stop anytime with no penalty — return principal + earned profit.
        fee = 0.0
        slip = 0.0
        fee_amt = 0.0
        slip_amt = 0.0
        returned = round(principal + accrued, 6)
        forfeited = 0.0
        profit_paid = accrued
        kind = "flex"
    else:
        # Locked vault, before maturity: early exit fee + slippage, forfeit profit.
        fee = float(vault.get("early_exit_fee", stake.get("early_exit_fee", 0.10)))
        slip = float(vault.get("slippage", stake.get("slippage", 0.02)))
        fee_amt = round(principal * fee, 6)
        slip_amt = round(principal * slip, 6)
        returned = round(principal - fee_amt - slip_amt, 6)
        forfeited = round(stake_accrued(stake, now), 6)
        profit_paid = 0.0
        kind = "locked"
    if returned < 0:
        returned = 0.0
    await db.users.update_one({"_id": user["_id"]}, {"$inc": {"balance": returned}})
    await db.stakes.update_one({"_id": oid}, {"$set": {
        "principal": 0.0,
        "status": "exited",
        "exited_at": now_iso(),
        "claimed_profit": round(stake_accrued(stake, now), 6),
        "exit_return": returned,
        "exit_fee_amount": fee_amt,
        "exit_slippage_amount": slip_amt,
    }})
    await add_transaction(user["_id"], "early_exit", returned, "completed", {
        "vault": stake.get("vault_name"),
        "stake_id": stake_id,
        "kind": kind,
        "principal": principal,
        "fee_pct": fee,
        "slippage_pct": slip,
        "fee_amount": fee_amt,
        "slippage_amount": slip_amt,
        "forfeited_profit": forfeited,
        "profit_paid": profit_paid,
    })
    await manager.notify_user(str(user["_id"]))
    await manager.notify_admins()
    return {"ok": True, "returned": returned, "fee_amount": fee_amt,
            "slippage_amount": slip_amt, "principal": principal}


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
async def withdraw(body: WithdrawReq, user: dict = Depends(require_active_user)):
    fresh = await db.users.find_one({"_id": user["_id"]})
    if fresh.get("withdrawals_disabled"):
        raise HTTPException(status_code=403, detail="Withdrawals are currently disabled for your account.")
    amount = round(float(body.amount), 6)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Enter a valid amount.")
    if amount > fresh.get("balance", 0.0) + 1e-9:
        raise HTTPException(status_code=400, detail="Insufficient available balance.")
    address = (body.address or "").strip()
    if not XRP_ADDRESS_RE.match(address):
        raise HTTPException(status_code=400, detail="Enter a valid destination XRP address (starts with 'r').")
    tag = (body.tag or "").strip()
    if tag and not tag.isdigit():
        raise HTTPException(status_code=400, detail="Destination tag must be a number.")
    await db.users.update_one({"_id": user["_id"]}, {"$inc": {"balance": -amount}})
    meta = {"destination_address": address}
    if tag:
        meta["destination_tag"] = tag
    tid = await add_transaction(user["_id"], "withdrawal", amount, "pending", meta)
    await manager.notify_admins()
    await manager.notify_user(str(user["_id"]))
    return {"ok": True, "transaction_id": tid}


# ---------------------------------------------------------------------------
# Withdrawal address book
# ---------------------------------------------------------------------------
@api.get("/withdraw-addresses")
async def list_withdraw_addresses(user: dict = Depends(get_current_user)):
    fresh = await db.users.find_one({"_id": user["_id"]})
    return {"addresses": fresh.get("saved_addresses", [])}


@api.post("/withdraw-addresses")
async def add_withdraw_address(body: SaveAddressReq, user: dict = Depends(get_current_user)):
    label = (body.label or "").strip()
    address = (body.address or "").strip()
    tag = (body.tag or "").strip()
    if not label:
        raise HTTPException(status_code=400, detail="Give this address a name.")
    if not XRP_ADDRESS_RE.match(address):
        raise HTTPException(status_code=400, detail="Enter a valid XRP address (starts with 'r').")
    if tag and not tag.isdigit():
        raise HTTPException(status_code=400, detail="Destination tag must be a number.")
    fresh = await db.users.find_one({"_id": user["_id"]})
    existing = fresh.get("saved_addresses", [])
    if any(a.get("address") == address and (a.get("tag") or "") == tag for a in existing):
        raise HTTPException(status_code=400, detail="That address is already saved.")
    entry = {"id": str(uuid.uuid4()), "label": label, "address": address,
             "tag": tag or None, "created_at": now_iso()}
    await db.users.update_one({"_id": user["_id"]}, {"$push": {"saved_addresses": entry}})
    return {"ok": True, "address": entry}


@api.delete("/withdraw-addresses/{addr_id}")
async def delete_withdraw_address(addr_id: str, user: dict = Depends(get_current_user)):
    await db.users.update_one({"_id": user["_id"]}, {"$pull": {"saved_addresses": {"id": addr_id}}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------
@api.get("/admin/stats")
async def admin_stats(admin: dict = Depends(require_admin)):
    total_users = await db.users.count_documents({})
    bal_agg = await db.users.aggregate([{"$group": {"_id": None, "total": {"$sum": "$balance"}}}]).to_list(1)
    total_balance = round(bal_agg[0]["total"], 6) if bal_agg else 0.0
    stk_agg = await db.stakes.aggregate([
        {"$match": {"principal": {"$gt": 0}, "status": {"$nin": ["completed", "exited"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$principal"}}},
    ]).to_list(1)
    total_staked = round(stk_agg[0]["total"], 6) if stk_agg else 0.0
    pending_deposits = await db.transactions.count_documents({"type": "deposit", "status": "pending"})
    pending_withdrawals = await db.transactions.count_documents({"type": "withdrawal", "status": "pending"})
    return {
        "total_users": total_users,
        "total_balance": total_balance,
        "total_staked": total_staked,
        "aum": round(total_balance + total_staked, 6),
        "pending_deposits": pending_deposits,
        "pending_withdrawals": pending_withdrawals,
    }


@api.get("/admin/settings")
async def admin_get_settings(admin: dict = Depends(require_admin)):
    return {"hot_wallet_address": await get_hot_wallet()}


@api.put("/admin/settings")
async def admin_update_settings(body: SettingsReq, admin: dict = Depends(require_admin)):
    addr = (body.hot_wallet_address or "").strip()
    if not XRP_ADDRESS_RE.match(addr):
        raise HTTPException(status_code=400, detail="Enter a valid XRP address (starts with 'r', 25–35 chars).")
    old = await get_hot_wallet()
    await set_hot_wallet(addr)
    await audit(admin, "update_hot_wallet", None, {"old": old, "new": addr})
    # Enforce immediately for every connected client (users + admins).
    await manager.notify_all({"type": "state_updated"})
    await manager.notify_admins()
    return {"ok": True, "hot_wallet_address": addr}


@api.get("/admin/activity")
async def admin_activity(admin: dict = Depends(require_admin)):
    """Unified, most-recent-first feed: deposits, withdrawals, admin account changes, signups."""
    items = []
    user_cache = {}

    async def uname(uid):
        if not uid:
            return None
        if uid in user_cache:
            return user_cache[uid]
        try:
            u = await db.users.find_one({"_id": ObjectId(uid)})
        except Exception:
            u = None
        name = (u.get("username") if u else None) or "unknown"
        user_cache[uid] = name
        return name

    txns = await db.transactions.find({"type": {"$in": ["deposit", "withdrawal"]}}).sort("created_at", -1).to_list(80)
    for t in txns:
        items.append({
            "id": str(t["_id"]),
            "kind": t["type"],
            "username": await uname(t.get("user_id")),
            "amount": t.get("amount"),
            "status": t.get("status"),
            "created_at": t.get("created_at"),
            "detail": t.get("meta", {}),
        })

    logs = await db.audit_log.find({}).sort("created_at", -1).to_list(80)
    for l in logs:
        items.append({
            "id": str(l["_id"]),
            "kind": "admin_action",
            "action": l.get("action"),
            "admin_username": l.get("admin_username"),
            "username": await uname(l.get("target_user")),
            "amount": (l.get("detail") or {}).get("amount"),
            "created_at": l.get("created_at"),
            "detail": l.get("detail", {}),
        })

    users = await db.users.find({}).sort("created_at", -1).to_list(40)
    for u in users:
        if u.get("created_at"):
            items.append({
                "id": f"signup-{str(u['_id'])}",
                "kind": "signup",
                "username": u.get("username"),
                "created_at": u.get("created_at"),
            })

    items.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return {"activity": items[:80]}


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


@api.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(require_admin)):
    """Permanently delete a user and all of their stakes, transactions and audit entries."""
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=404, detail="User not found.")
    u = await db.users.find_one({"_id": oid})
    if not u:
        raise HTTPException(status_code=404, detail="User not found.")
    if u.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Admin accounts cannot be deleted.")
    if str(u["_id"]) == str(admin["_id"]):
        raise HTTPException(status_code=400, detail="You cannot delete your own account.")
    st = await db.stakes.delete_many({"user_id": user_id})
    tx = await db.transactions.delete_many({"user_id": user_id})
    await db.audit_log.delete_many({"target_user": user_id})
    await db.users.delete_one({"_id": oid})
    await audit(admin, "delete_user", user_id, {
        "email": u.get("email"), "username": u.get("username"),
        "stakes": st.deleted_count, "transactions": tx.deleted_count,
    })
    # Instantly end the deleted user's live session, then refresh admin views.
    await manager.notify_user(user_id, {"type": "force_logout", "reason": "account_deleted"})
    await manager.notify_admins()
    return {"ok": True, "deleted": {"stakes": st.deleted_count, "transactions": tx.deleted_count}}


@api.get("/admin/withdrawals")
async def admin_withdrawal_queue(admin: dict = Depends(require_admin)):
    txns = await db.transactions.find({"type": "withdrawal", "status": "pending"}).sort("created_at", 1).to_list(500)
    out = []
    for t in txns:
        u = await db.users.find_one({"_id": ObjectId(t["user_id"])})
        meta = t.get("meta", {}) or {}
        out.append({
            "id": str(t["_id"]), "amount": t["amount"], "created_at": t["created_at"],
            "username": u.get("username") if u else "?",
            "user_id": t["user_id"],
            "destination_address": meta.get("destination_address"),
            "destination_tag": meta.get("destination_tag"),
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


@api.get("/admin/profit-log")
async def admin_profit_log(admin: dict = Depends(require_admin)):
    """History of manual profit added/removed by admins (from the audit trail)."""
    logs = await db.audit_log.find({"action": "adjust_profit"}).sort("created_at", -1).to_list(500)
    uids = list({l.get("target_user") for l in logs if l.get("target_user")})
    users = {}
    for uid in uids:
        try:
            u = await db.users.find_one({"_id": ObjectId(uid)})
            if u:
                users[uid] = u
        except Exception:
            continue
    out = []
    for l in logs:
        uid = l.get("target_user")
        u = users.get(uid) or {}
        name = (f"{u.get('first_name', '')} {u.get('last_name', '')}").strip() or u.get("username") or "—"
        out.append({
            "id": str(l["_id"]),
            "admin_username": l.get("admin_username"),
            "user_id": uid,
            "user_name": name,
            "user_email": u.get("email", ""),
            "amount": (l.get("detail") or {}).get("amount", 0),
            "created_at": l.get("created_at"),
        })
    return {"log": out}


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
    await manager.notify_all()  # vault terms are global — reflect immediately for every user
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
    await db.users.create_index("email", unique=True, sparse=True)
    await db.users.create_index("destination_tag", unique=True, sparse=True)

    # Seed the editable settings singleton (hot wallet) from env on first boot.
    existing_settings = await db.settings.find_one({"_id": SETTINGS_ID})
    if not existing_settings:
        await db.settings.insert_one({
            "_id": SETTINGS_ID,
            "hot_wallet_address": HOT_WALLET_ADDRESS,
            "updated_at": now_iso(),
        })
    _settings_cache.pop("hot_wallet_address", None)  # refresh cache on boot

    admin_username = os.environ["ADMIN_USERNAME"].strip().lower()
    admin_phrase = os.environ["ADMIN_PHRASE"].strip()
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@xamanprotocol.com").strip().lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin12345").strip()
    existing = await db.users.find_one({"username": admin_username})
    if not existing:
        tag = await unique_destination_tag()
        await db.users.insert_one({
            "first_name": "Protocol", "last_name": "Admin", "username": admin_username,
            "email": admin_email, "password_hash": hash_password(admin_password),
            "phrase_hash": hash_phrase(admin_phrase), "role": "admin", "balance": 0.0,
            "bonus_profit": 0.0, "locked": False, "withdrawals_disabled": False,
            "tier_override": None, "destination_tag": tag, "created_at": now_iso(),
        })
        logger.info("Seeded admin user '%s'", admin_username)
    else:
        set_fields = {
            "role": "admin",
            "phrase_hash": hash_phrase(admin_phrase),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
        }
        await db.users.update_one({"username": admin_username}, {"$set": set_fields})


async def maturity_loop():
    while True:
        try:
            now = datetime.now(timezone.utc)
            # 1) Auto-close matured stakes -> return principal + profit to balance.
            async for s in db.stakes.find({"duration_days": {"$gt": 0},
                                           "status": {"$nin": ["completed", "exited"]},
                                           "principal": {"$gt": 0}}):
                if stake_matured(s, now):
                    returned = await settle_matured_stake(s, now)
                    await manager.notify_user(s["user_id"], {
                        "type": "notify", "event": "stake_matured", "amount": returned})
            # 2) Auto-restake: compound profit into an existing stake once it hits the threshold.
            async for u in db.users.find({"auto_restake.enabled": True}):
                try:
                    cfg = u.get("auto_restake") or {}
                    threshold = float(cfg.get("threshold") or 0)
                    if threshold <= 0:
                        continue
                    total, to_claim = await gather_profit(u, now)
                    if total <= 0 or total < threshold:
                        continue
                    actives = await db.stakes.find({
                        "user_id": str(u["_id"]),
                        "principal": {"$gt": 0},
                        "status": {"$nin": ["exited", "completed"]},
                    }).to_list(500)
                    if not actives:
                        continue
                    # Prefer the configured vault's stake, else the largest active stake.
                    pref = cfg.get("vault_key")
                    target = next((s for s in actives if s.get("vault_key") == pref), None)
                    if target is None:
                        target = max(actives, key=lambda s: s.get("principal", 0.0))
                    amount, _ = await compound_restake(u, target, total, to_claim, now, auto=True)
                    await manager.notify_user(str(u["_id"]), {
                        "type": "notify", "event": "auto_restake", "amount": amount})
                    await manager.notify_admins()
                except Exception as e:
                    logger.warning("auto-restake error for user: %s", e)
        except Exception as e:
            logger.warning("maturity loop error: %s", e)
        await asyncio.sleep(20)


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
