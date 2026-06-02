import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

import config  # runs mkdir on import
from routers import upload, transcribe, translate, export

app = FastAPI(title="OSTTFV Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # local-only server, WS needs wildcard to bypass Starlette CORS bug
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(transcribe.router, prefix="/api", tags=["transcribe"])
app.include_router(translate.router, prefix="/api", tags=["translate"])
app.include_router(export.router, prefix="/api", tags=["export"])

storage_dir = Path(__file__).parent / "storage"
storage_dir.mkdir(exist_ok=True)
app.mount("/storage", StaticFiles(directory=str(storage_dir)), name="storage")


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
