import asyncio, os, time
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parent.parent / "backend" / ".env")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


async def main():
    c = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = c[os.environ["DB_NAME"]]
    vaults = {v["key"]: v async for v in db.vaults.find({})}
    flex = vaults["xrp_flex"]
    diamond = vaults["vip_diamond"]

    # Clean any prior test artifacts
    old = [u["_id"] async for u in db.users.find({"email": {"$regex": "^loop_test_"}})]
    for uid in old:
        await db.stakes.delete_many({"user_id": str(uid)})
    await db.users.delete_many({"email": {"$regex": "^loop_test_"}})

    # ---- User A: matured flex stake should auto-settle (principal + profit) ----
    ua = await db.users.insert_one({
        "first_name": "Loop", "last_name": "A", "username": "loop_test_a",
        "email": "loop_test_a@example.com", "role": "user", "balance": 0.0,
        "bonus_profit": 0.0, "locked": False, "created_at": now_iso(),
    })
    uaid = ua.inserted_id
    start_a = (datetime.now(timezone.utc) - timedelta(days=19)).isoformat()  # flex=18d -> matured
    await db.stakes.insert_one({
        "user_id": str(uaid), "vault_key": "xrp_flex", "vault_name": flex["name"],
        "principal": 30000.0, "apy": flex["apy"], "duration_days": 18, "tier": "flex",
        "claimed_profit": 0.0, "start_at": start_a, "created_at": start_a,
    })
    expected_profit_a = round(30000 * flex["apy"] * (18 / 365), 6)
    print(f"[A] matured flex: principal 30000, expected profit ~{expected_profit_a}, expected balance ~{round(30000+expected_profit_a,2)}")

    # ---- User B: auto-restake should trigger (profit >= threshold and >= flex min) ----
    ub = await db.users.insert_one({
        "first_name": "Loop", "last_name": "B", "username": "loop_test_b",
        "email": "loop_test_b@example.com", "role": "user", "balance": 0.0,
        "bonus_profit": 0.0, "locked": False, "created_at": now_iso(),
        "auto_restake": {"enabled": True, "threshold": 25000, "vault_key": "xrp_flex"},
    })
    ubid = ub.inserted_id
    start_b = (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()  # diamond 90d, not matured
    await db.stakes.insert_one({
        "user_id": str(ubid), "vault_key": "vip_diamond", "vault_name": diamond["name"],
        "principal": 2000000.0, "apy": diamond["apy"], "duration_days": 90, "tier": "diamond",
        "claimed_profit": 0.0, "start_at": start_b, "created_at": start_b,
    })
    accrued_b = round(2000000 * diamond["apy"] * (5 / 365), 6)
    print(f"[B] auto-restake: source diamond accrued ~{accrued_b} (>=25000 threshold & flex min) -> expect new flex stake")

    c.close()
    print("Seeded. Waiting 26s for maturity_loop (runs every 20s)...")
    await asyncio.sleep(26)

    c = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = c[os.environ["DB_NAME"]]

    # Verify A
    a = await db.users.find_one({"_id": uaid})
    a_stakes = await db.stakes.find({"user_id": str(uaid)}).to_list(50)
    a_tx = await db.transactions.find({"user_id": str(uaid), "type": "stake_closed"}).to_list(10)
    print("\n=== USER A (auto-close) ===")
    print("balance:", round(a["balance"], 2), "| stake statuses:", [(s["vault_name"], s.get("status"), s["principal"]) for s in a_stakes])
    print("stake_closed txns:", [(round(t["amount"], 2), t["meta"].get("profit")) for t in a_tx])

    # Verify B
    b = await db.users.find_one({"_id": ubid})
    b_stakes = await db.stakes.find({"user_id": str(ubid)}).to_list(50)
    b_tx = await db.transactions.find({"user_id": str(ubid), "type": "reinvest"}).to_list(10)
    print("\n=== USER B (auto-restake) ===")
    print("bonus_profit:", b.get("bonus_profit"), "| stakes:", [(s["vault_name"], s.get("status"), round(s["principal"], 2)) for s in b_stakes])
    print("reinvest txns:", [(round(t["amount"], 2), t["meta"].get("auto")) for t in b_tx])

    # Cleanup
    for uid in (uaid, ubid):
        await db.stakes.delete_many({"user_id": str(uid)})
        await db.transactions.delete_many({"user_id": str(uid)})
    await db.users.delete_many({"_id": {"$in": [uaid, ubid]}})
    print("\nCleaned up test users.")
    c.close()


asyncio.run(main())
