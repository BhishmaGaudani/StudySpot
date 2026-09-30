"""
Live updates over WebSockets.

Every open browser tab connects to /api/ws and stays connected. When someone
submits a report, the server calls `manager.broadcast(...)`, which sends the
spot's new status to every connected tab, so all screens update without a
refresh.

This keeps the connection list in memory, which is fine for a single server
process. Running several server processes would need a shared message bus
(for example Redis pub/sub or Postgres LISTEN/NOTIFY) so a report on one
process reaches clients connected to another.
"""

import asyncio
import json

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active: set[WebSocket] = set()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.active.add(ws)

    def disconnect(self, ws: WebSocket) -> None:
        self.active.discard(ws)

    async def broadcast(self, message: dict) -> None:
        text = json.dumps(message, default=str)
        clients = list(self.active)
        # Send to everyone at once; one slow or dead client shouldn't block the rest.
        results = await asyncio.gather(
            *(ws.send_text(text) for ws in clients), return_exceptions=True
        )
        for ws, result in zip(clients, results):
            if isinstance(result, Exception):
                self.disconnect(ws)


manager = ConnectionManager()
