import asyncio, os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parent.parent / "backend" / ".env")

NEW_MINS = {
    "xrp_flex": 50000,
    "vip_silver": 150000,
    "vip_gold": 350000,
    "vip_platinum": 750000,
    "vip_diamond": 2000000,
}


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    for key, mn in NEW_MINS.items():
        res = await db.vaults.update_one({"key": key}, {"$set": {"min_amount": mn}})
        print(f"{key}: matched={res.matched_count} modified={res.modified_count} -> {mn}")
    rows = await db.vaults.find({}, {"_id": 0, "key": 1, "min_amount": 1}).to_list(100)
    print("Current DB vault minimums:", rows)
    client.close()


asyncio.run(main())
