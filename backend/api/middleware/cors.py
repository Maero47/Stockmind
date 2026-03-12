from fastapi.middleware.cors import CORSMiddleware


def add_cors(app):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],       # dev — tighten in production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
