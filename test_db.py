import asyncio
from backend.storage.postgres import PostgresStorage
from backend.config import settings
import os

url = "postgresql://neondb_owner:npg_prCgk49tlyQJ@ep-cool-meadow-antmj4ok-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require"

async def run():
    p = PostgresStorage(database_url=url)
    await p.connect()
    rows = await p.fetch_page_documents(10)
    print("URLs in DB:")
    print([r['url'] for r in rows])

if __name__ == "__main__":
    asyncio.run(run())
