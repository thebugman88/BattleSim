"""AI vs AI Battle Arena — FastAPI backend."""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import base64
import logging
import asyncio
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import FastAPI, APIRouter, HTTPException, Response, Request, Depends, BackgroundTasks
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user_factory,
)
from battle_engine import (
    plan_base,
    generate_base_image,
    simulate_turn,
    check_winner,
    react_to_intervention,
    COMMANDERS,
)
from elevenlabs.client import ElevenLabs

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# ---------- DB & app ----------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="AI Arena")
api = APIRouter(prefix="/api")

# CORS — using FRONTEND_URL to support credentials
frontend_url = os.environ.get("FRONTEND_URL", "*")
allowed = [frontend_url] if frontend_url != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- ElevenLabs ----------
eleven = ElevenLabs(api_key=os.environ.get("ELEVENLABS_API_KEY", ""))

# Curated host voice options (publicly available ElevenLabs voice IDs)
DEFAULT_VOICES = [
    {"voice_id": "JBFqnCBsd6RMkjVDRZzb", "name": "George", "description": "Calm British analyst"},
    {"voice_id": "TX3LPaxmHKxFdv7VOQHJ", "name": "Liam", "description": "Energetic young narrator"},
    {"voice_id": "EXAVITQu4vr4xnSDxMaL", "name": "Sarah", "description": "Crisp news anchor"},
    {"voice_id": "cgSgspJ2msm6clMCkdW9", "name": "Jessica", "description": "Dramatic broadcaster"},
    {"voice_id": "onwK4e9ZLuTAKqWW03F9", "name": "Daniel", "description": "Deep authoritative host"},
    {"voice_id": "iP95p4xoKVk53GoZ742B", "name": "Chris", "description": "Hyped sports commentator"},
]

# ---------- Models ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class BattleCreateIn(BaseModel):
    setting: str  # e.g., "Mars desert canyon"
    army_theme: str  # e.g., "Spartan", "Star Wars Rebels"
    budget: int = Field(ge=500, le=100000, default=5000)
    max_turns: int = Field(ge=3, le=15, default=8)
    host_a_voice_id: str = DEFAULT_VOICES[0]["voice_id"]
    host_b_voice_id: str = DEFAULT_VOICES[1]["voice_id"]
    host_a_name: str = "Vex"
    host_b_name: str = "Cipher"


class InterventionIn(BaseModel):
    kind: str  # "reinforcements" | "event" | "taunt"
    text: str = ""
    commander_target: str = "A"  # for reinforcements


class TTSIn(BaseModel):
    text: str
    voice_id: str


# ---------- Helpers ----------
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=60 * 60 * 24,
        path="/",
    )


def public_user(u: dict) -> dict:
    return {
        "id": u["id"],
        "email": u["email"],
        "name": u.get("name") or u["email"].split("@")[0],
    }


# ---------- Auth routes ----------
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": body.name or email.split("@")[0],
        "password_hash": hash_password(body.password),
        "created_at": _now_iso(),
    }
    await db.users.insert_one(user_doc)
    token = create_access_token(user_doc["id"], email)
    set_auth_cookie(response, token)
    return {"user": public_user(user_doc), "token": token}


@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], email)
    set_auth_cookie(response, token)
    return {"user": public_user(user), "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


async def current_user(request: Request) -> dict:
    dep = await get_current_user_factory(db)
    return await dep(request)


@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return public_user(user)


# ---------- Voices ----------
@api.get("/voices")
async def list_voices(user: dict = Depends(current_user)):
    return {"voices": DEFAULT_VOICES, "commanders": list(COMMANDERS.values())}


# ---------- Battles ----------
async def _build_battle(battle_id: str, body: BattleCreateIn, user_id: str):
    """Background job: generate base plans + images for both commanders."""
    try:
        # Plan both bases in parallel
        plan_a_task = plan_base("A", body.setting, body.army_theme, body.budget, f"{battle_id}-A-plan")
        plan_b_task = plan_base("B", body.setting, body.army_theme, body.budget, f"{battle_id}-B-plan")
        plan_a, plan_b = await asyncio.gather(plan_a_task, plan_b_task)

        # Images in parallel
        img_a_task = generate_base_image(plan_a.get("image_prompt", body.setting), f"{battle_id}-A-img")
        img_b_task = generate_base_image(plan_b.get("image_prompt", body.setting), f"{battle_id}-B-img")
        img_a, img_b = await asyncio.gather(img_a_task, img_b_task)

        plan_a["image_b64"] = img_a
        plan_b["image_b64"] = img_b
        plan_a["commander"] = COMMANDERS["A"]
        plan_b["commander"] = COMMANDERS["B"]

        await db.battles.update_one(
            {"id": battle_id},
            {
                "$set": {
                    "commanders": {"A": plan_a, "B": plan_b},
                    "status": "ready",
                    "ready_at": _now_iso(),
                }
            },
        )
    except Exception as e:
        logger.exception(f"Battle build failed: {e}")
        await db.battles.update_one(
            {"id": battle_id},
            {"$set": {"status": "error", "error": str(e)}},
        )


@api.post("/battles")
async def create_battle(body: BattleCreateIn, bg: BackgroundTasks, user: dict = Depends(current_user)):
    battle_id = str(uuid.uuid4())
    doc = {
        "id": battle_id,
        "user_id": user["id"],
        "setting": body.setting,
        "army_theme": body.army_theme,
        "budget": body.budget,
        "max_turns": body.max_turns,
        "host_a_voice_id": body.host_a_voice_id,
        "host_b_voice_id": body.host_b_voice_id,
        "host_a_name": body.host_a_name,
        "host_b_name": body.host_b_name,
        "status": "building",
        "turns": [],
        "winner": None,
        "created_at": _now_iso(),
        "commanders": None,
    }
    await db.battles.insert_one(doc)
    bg.add_task(_build_battle, battle_id, body, user["id"])
    return {"id": battle_id, "status": "building"}


def _battle_public(b: dict) -> dict:
    # Strip _id, leave everything else (images included as base64)
    b = {k: v for k, v in b.items() if k != "_id"}
    return b


@api.get("/battles/{battle_id}")
async def get_battle(battle_id: str, user: dict = Depends(current_user)):
    b = await db.battles.find_one({"id": battle_id, "user_id": user["id"]}, {"_id": 0})
    if not b:
        raise HTTPException(status_code=404, detail="Battle not found")
    return _battle_public(b)


@api.get("/battles")
async def list_battles(user: dict = Depends(current_user)):
    cur = db.battles.find(
        {"user_id": user["id"]},
        {"_id": 0, "commanders.A.image_b64": 0, "commanders.B.image_b64": 0, "turns": 0},
    ).sort("created_at", -1).limit(50)
    items = await cur.to_list(length=50)
    return {"battles": items}


@api.delete("/battles/{battle_id}")
async def delete_battle(battle_id: str, user: dict = Depends(current_user)):
    res = await db.battles.delete_one({"id": battle_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Battle not found")
    return {"ok": True}


@api.post("/battles/{battle_id}/turn")
async def play_turn(battle_id: str, user: dict = Depends(current_user)):
    b = await db.battles.find_one({"id": battle_id, "user_id": user["id"]}, {"_id": 0})
    if not b:
        raise HTTPException(status_code=404, detail="Battle not found")
    if b.get("status") not in ("ready", "in_progress"):
        raise HTTPException(status_code=400, detail=f"Battle not ready (status={b.get('status')})")
    if b.get("winner"):
        raise HTTPException(status_code=400, detail="Battle already finished")

    turn_idx = len(b.get("turns", []))
    if turn_idx >= b.get("max_turns", 8):
        # Force winner = whoever has higher HP
        a = b["commanders"]["A"]
        bb = b["commanders"]["B"]
        winner = "A" if (a["hp"] + a["army_size"] / 10) >= (bb["hp"] + bb["army_size"] / 10) else "B"
        await db.battles.update_one({"id": battle_id}, {"$set": {"winner": winner, "status": "finished", "finished_at": _now_iso()}})
        return {"finished": True, "winner": winner}

    # consume pending intervention if any
    pending = b.get("pending_intervention")
    turn = await simulate_turn(b, turn_idx, user_intervention=pending)

    # update commanders state
    b["commanders"]["A"]["hp"] = turn["a_hp_after"]
    b["commanders"]["B"]["hp"] = turn["b_hp_after"]
    b["commanders"]["A"]["army_size"] = turn["a_army_after"]
    b["commanders"]["B"]["army_size"] = turn["b_army_after"]

    winner = check_winner(b)
    update = {
        "$push": {"turns": turn},
        "$set": {
            "commanders.A.hp": turn["a_hp_after"],
            "commanders.B.hp": turn["b_hp_after"],
            "commanders.A.army_size": turn["a_army_after"],
            "commanders.B.army_size": turn["b_army_after"],
            "status": "in_progress",
            "pending_intervention": None,
        },
    }
    if winner:
        update["$set"]["winner"] = winner
        update["$set"]["status"] = "finished"
        update["$set"]["finished_at"] = _now_iso()
    await db.battles.update_one({"id": battle_id}, update)
    return {
        "turn": turn,
        "winner": winner,
        "a_hp": turn["a_hp_after"],
        "b_hp": turn["b_hp_after"],
        "a_army": turn["a_army_after"],
        "b_army": turn["b_army_after"],
        "finished": winner is not None,
    }


@api.post("/battles/{battle_id}/intervene")
async def intervene(battle_id: str, body: InterventionIn, user: dict = Depends(current_user)):
    b = await db.battles.find_one({"id": battle_id, "user_id": user["id"]}, {"_id": 0})
    if not b:
        raise HTTPException(status_code=404, detail="Battle not found")
    if b.get("winner"):
        raise HTTPException(status_code=400, detail="Battle finished")

    reactions = await react_to_intervention(
        body.kind, body.text, b.get("host_a_name", "Vex"), b.get("host_b_name", "Cipher"),
        session_id=f"{battle_id}-react-{uuid.uuid4()}"
    )
    await db.battles.update_one(
        {"id": battle_id},
        {
            "$set": {
                "pending_intervention": {
                    "kind": body.kind,
                    "text": body.text,
                    "commander_target": body.commander_target,
                    "at": _now_iso(),
                },
            },
            "$push": {"interventions": {"kind": body.kind, "text": body.text, "commander_target": body.commander_target, "at": _now_iso(), "reactions": reactions}},
        },
    )
    return {"reactions": reactions}


# ---------- TTS ----------
@api.post("/tts")
async def tts(body: TTSIn, user: dict = Depends(current_user)):
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Empty text")
    try:
        audio_iter = eleven.text_to_speech.convert(
            text=body.text[:500],
            voice_id=body.voice_id,
            model_id="eleven_turbo_v2_5",
            output_format="mp3_44100_128",
        )
        buf = b""
        for chunk in audio_iter:
            buf += chunk
        b64 = base64.b64encode(buf).decode("utf-8")
        return {"audio_url": f"data:audio/mpeg;base64,{b64}"}
    except Exception as e:
        logger.exception(f"TTS failed: {e}")
        raise HTTPException(status_code=500, detail=f"TTS error: {e}")


# ---------- Health ----------
@api.get("/")
async def root():
    return {"ok": True, "service": "AI Arena"}


# ---------- Startup ----------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.battles.create_index("user_id")
    await db.battles.create_index("id", unique=True)
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@arena.ai").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@1234")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "Admin",
            "role": "admin",
            "password_hash": hash_password(admin_password),
            "created_at": _now_iso(),
        })
        logger.info(f"Seeded admin: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )


@app.on_event("shutdown")
async def shutdown():
    client.close()


app.include_router(api)
