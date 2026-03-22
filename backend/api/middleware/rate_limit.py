"""
Simple in-memory rate limiter — swap for Redis-backed in production.
"""

import time
from collections import defaultdict
from fastapi import Request
from fastapi.responses import JSONResponse

_REQUEST_LOG: dict[str, list[float]] = defaultdict(list)
_WINDOW = 60    # seconds
_MAX_REQUESTS = 600  # 8 cards × ~5 endpoints × 12 req/min each + headroom


async def rate_limit_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)

    # Evict oldest IPs if the log grows too large
    if len(_REQUEST_LOG) > 10000:
        sorted_ips = sorted(_REQUEST_LOG, key=lambda k: _REQUEST_LOG[k][-1] if _REQUEST_LOG[k] else 0)
        for stale_ip in sorted_ips[:len(_REQUEST_LOG) - 10000]:
            del _REQUEST_LOG[stale_ip]

    ip = request.client.host if request.client else "unknown"
    now = time.time()
    log = _REQUEST_LOG[ip]

    _REQUEST_LOG[ip] = [t for t in log if now - t < _WINDOW]

    if len(_REQUEST_LOG[ip]) >= _MAX_REQUESTS:
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded. Try again in a minute."},
        )

    _REQUEST_LOG[ip].append(now)
    return await call_next(request)
