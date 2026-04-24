import asyncio
import os
os.environ["TAVILY_API_KEY"] = "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"
os.environ["TAVILY_API_URL"] = "https://api.tavily.com/search"

from backend.search.web_fallback import search_public_web

async def run():
    res = await search_public_web("Fc Barcelona")
    print(res)

if __name__ == "__main__":
    asyncio.run(run())
