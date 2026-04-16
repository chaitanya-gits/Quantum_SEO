from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

import httpx
import uvicorn
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.api.health import router as health_router
from backend.api.search import router as search_router
from backend.api.suggest import router as suggest_router
from backend.api.trending import router as trending_router
from backend.config import settings
from backend.crawler.scheduler import CrawlScheduler
from backend.runtime import build_frontier, open_runtime_services, require_redis, require_search_index
from backend.search.engine import SearchEngine


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with open_runtime_services(
        with_redis=True,
        with_search_index=True,
        ensure_index=True,
    ) as services:
        redis = require_redis(services)
        search_index = require_search_index(services)
        frontier = build_frontier(services)

        app.state.postgres = services.postgres
        app.state.redis = redis
        app.state.search_index = search_index
        app.state.search_engine = SearchEngine(
            postgres=services.postgres,
            redis=redis,
            search_index=search_index,
        )
        app.state.frontier = frontier
        app.state.scheduler = CrawlScheduler(frontier, services.postgres, search_index)
        app.state.scheduler.start()

        try:
            yield
        finally:
            app.state.scheduler.stop()


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search_router, prefix="/api")
app.include_router(suggest_router, prefix="/api")
app.include_router(trending_router, prefix="/api")
app.include_router(health_router, prefix="/api")


@app.get("/api/location/reverse")
async def reverse_location(lat: float = Query(...), lng: float = Query(...)) -> JSONResponse:
    url = "https://nominatim.openstreetmap.org/reverse"
    params = {
        "format": "jsonv2",
        "lat": lat,
        "lon": lng,
        "addressdetails": 1,
    }

    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            response = await client.get(
                url,
                params=params,
                headers={"User-Agent": settings.crawl_user_agent},
            )
            response.raise_for_status()
    except httpx.HTTPError:
        return JSONResponse({"lat": lat, "lng": lng, "results": []})

    payload = response.json()
    address = payload.get("address", {})
    result = {
        "formattedAddress": payload.get("display_name", ""),
        "areaName": address.get("suburb", ""),
        "cityName": address.get("city", "") or address.get("town", ""),
        "stateName": address.get("state", ""),
        "countryName": address.get("country", ""),
        "pincode": address.get("postcode", ""),
        "latitude": float(payload.get("lat", lat)),
        "longitude": float(payload.get("lon", lng)),
        "placeId": str(payload.get("place_id", "")),
        "types": [payload["type"]] if payload.get("type") else [],
    }
    return JSONResponse({"lat": lat, "lng": lng, "results": [result]})


frontend_dir = Path(settings.frontend_dir)
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")


if __name__ == "__main__":
    uvicorn.run("backend.main:app", host=settings.host, port=settings.port, reload=False)
