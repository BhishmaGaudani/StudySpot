"""
App entry point. Run with:  uvicorn app.main:app --reload

This file only wires things together: CORS, the routers, and the WebSocket
endpoint. All routes live under /api so the React dev server can forward
everything starting with /api to this server.
"""

from fastapi import APIRouter, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.realtime import manager
from app.routers import auth, locations, reports

app = FastAPI(title="StudySpot API")

# Lets the React app (a different port in dev) call this API from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[get_settings().client_origin],
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")
api.include_router(auth.router)
api.include_router(locations.router)
api.include_router(reports.router)


@api.get("/health", tags=["meta"])
def health() -> dict:
    return {"ok": True}


@api.websocket("/ws")
async def websocket_endpoint(ws: WebSocket) -> None:
    """Clients connect here and receive {"type": "location_update", ...}
    messages whenever a spot's status changes. They never need to send
    anything; the receive loop just keeps the connection open and notices
    when the browser goes away."""
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)


app.include_router(api)
