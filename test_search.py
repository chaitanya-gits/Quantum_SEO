import asyncio
from backend.search.engine import SearchEngine
from backend.storage.postgres import PostgresStorage
from backend.storage.redis import RedisStorage
from backend.indexer.es_client import SearchIndexClient

async def test():
    p = PostgresStorage()
    r = RedisStorage()
    s = SearchIndexClient()
    e = SearchEngine(p, r, s)
    res = await e.search('Fc Barcelona')
    print(res)

if __name__ == "__main__":
    asyncio.run(test())
