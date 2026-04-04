import os
from fastapi.middleware.cors import CORSMiddleware

_raw = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000")
_origins = [o.strip() for o in _raw.split(",")]
_wildcard = _origins == ["*"]


def add_cors(app):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_origins,
        allow_credentials=not _wildcard,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Free-Remaining"],
    )
