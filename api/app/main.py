from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import connect_db, disconnect_db
from app.routers import corpus, dreams, health, members, pitches, sessions


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = await connect_db()
    yield
    await disconnect_db()


app = FastAPI(title="Calcutta AI Club API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(members.router)
app.include_router(corpus.router)
app.include_router(pitches.router)
app.include_router(dreams.router)
app.include_router(sessions.router)
