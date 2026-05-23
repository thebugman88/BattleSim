"""AI vs AI battle engine: base generation, turn simulation, commentary.

Commander A = Claude Sonnet 4.5 (anthropic)
Commander B = GPT-5.2 (openai)
Both use EMERGENT_LLM_KEY via emergentintegrations.LlmChat.
Base images via Gemini Nano Banana (gemini-3.1-flash-image-preview).
"""
import os
import json
import base64
import uuid
import random
import logging
import re
from typing import Optional

from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

COMMANDER_A = {
    "id": "A",
    "name": "ARES (Claude Sonnet 4.5)",
    "provider": "anthropic",
    "model": "claude-sonnet-4-5-20250929",
    "color": "#FFB800",
}
COMMANDER_B = {
    "id": "B",
    "name": "ORION (GPT-5.2)",
    "provider": "openai",
    "model": "gpt-5.2",
    "color": "#FF3B30",
}
COMMANDERS = {"A": COMMANDER_A, "B": COMMANDER_B}


def _key() -> str:
    return os.environ["EMERGENT_LLM_KEY"]


def _strip_json(text: str) -> str:
    """Pull JSON out of a possibly fenced LLM response."""
    if not text:
        return "{}"
    m = re.search(r"```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```", text, re.DOTALL)
    if m:
        return m.group(1)
    m = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
    if m:
        return m.group(1)
    return text


async def plan_base(commander_key: str, setting: str, army_theme: str, budget: int, session_id: str) -> dict:
    """Have the commander LLM design its base + army. Returns parsed JSON dict."""
    c = COMMANDERS[commander_key]
    system = (
        f"You are {c['name']}, an elite AI war commander. You are designing a secret base and army "
        f"to compete against a rival AI commander. Respond ONLY with strict JSON, no prose."
    )
    chat = LlmChat(api_key=_key(), session_id=session_id, system_message=system).with_model(
        c["provider"], c["model"]
    )
    prompt = f"""SETTING: {setting}
ARMY THEME: {army_theme}
RESOURCE BUDGET: {budget} credits

Design your base + army within the budget. Be creative, decisive, and tactical.

Return JSON exactly in this shape:
{{
  "codename": "<short codename>",
  "base_name": "<evocative base name>",
  "doctrine": "<1-2 sentence combat doctrine>",
  "structures": ["<structure 1>", "<structure 2>", "<structure 3>", "<structure 4>"],
  "units": [
    {{"name": "<unit type>", "count": <int>, "role": "<role>", "cost_each": <int>}},
    {{"name": "<unit type>", "count": <int>, "role": "<role>", "cost_each": <int>}},
    {{"name": "<unit type>", "count": <int>, "role": "<role>", "cost_each": <int>}}
  ],
  "secret_weapon": "<one secret weapon or trick>",
  "stats": {{"offense": <0-100>, "defense": <0-100>, "mobility": <0-100>, "morale": <0-100>}},
  "image_prompt": "<vivid 2-sentence visual prompt describing your base for an artist>"
}}
"""
    raw = await chat.send_message(UserMessage(text=prompt))
    try:
        data = json.loads(_strip_json(raw))
    except Exception as e:
        logger.warning(f"plan_base parse failed for {commander_key}: {e}; raw={raw[:300]}")
        data = {
            "codename": c["name"].split()[0],
            "base_name": f"{c['name'].split()[0]} Stronghold",
            "doctrine": "Strike fast, hold harder.",
            "structures": ["Command Bunker", "Power Core", "Barracks", "Watchtower"],
            "units": [
                {"name": "Infantry", "count": 100, "role": "Frontline", "cost_each": 10},
                {"name": "Snipers", "count": 20, "role": "Long-range", "cost_each": 25},
                {"name": "Heavy Tank", "count": 5, "role": "Siege", "cost_each": 100},
            ],
            "secret_weapon": "EMP Grenade Volley",
            "stats": {"offense": 70, "defense": 70, "mobility": 65, "morale": 75},
            "image_prompt": f"A {army_theme} base on {setting}, dark cinematic lighting.",
        }
    # Compute HP from stats
    data["hp"] = 100
    data["army_size"] = sum(u.get("count", 0) for u in data.get("units", []))
    return data


async def generate_base_image(prompt: str, session_id: str) -> Optional[str]:
    """Returns base64 PNG string (no data: prefix) or None on failure."""
    try:
        chat = LlmChat(
            api_key=_key(),
            session_id=session_id,
            system_message="You are a concept artist generating cinematic dark sci-fi war scenes.",
        ).with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
        full_prompt = (
            f"{prompt}. Dark cinematic lighting, dramatic atmosphere, military sci-fi concept art, "
            f"wide shot, no text or watermarks, ultra detailed."
        )
        _, images = await chat.send_message_multimodal_response(UserMessage(text=full_prompt))
        if images and len(images) > 0:
            return images[0]["data"]
    except Exception as e:
        logger.warning(f"generate_base_image failed: {e}")
    return None


async def simulate_turn(
    battle: dict, turn_index: int, user_intervention: Optional[dict] = None
) -> dict:
    """Simulate one battle turn. Returns dict with events, damage, commentary."""
    a = battle["commanders"]["A"]
    b = battle["commanders"]["B"]
    setting = battle["setting"]

    # Each commander picks an action (use its own LLM)
    async def commander_action(key: str, self_state: dict, enemy_state: dict) -> dict:
        c = COMMANDERS[key]
        system = (
            f"You are {c['name']}, an AI war commander in turn-by-turn combat. "
            f"Pick one tactical action this turn. Reply ONLY JSON."
        )
        chat = LlmChat(
            api_key=_key(),
            session_id=f"{battle['id']}-{key}-turn",
            system_message=system,
        ).with_model(c["provider"], c["model"])
        prompt = f"""TURN {turn_index + 1}. Setting: {setting}.
YOUR STATE: HP={self_state['hp']}, Army={self_state['army_size']}, Doctrine={self_state['doctrine']}
ENEMY (limited intel): HP={enemy_state['hp']}, Army~{enemy_state['army_size']}

Choose ONE action. JSON shape:
{{"action": "<attack|defend|flank|special|sabotage>", "target": "<unit/structure>", "narrative": "<1 sentence dramatic narration>"}}
"""
        try:
            raw = await chat.send_message(UserMessage(text=prompt))
            return json.loads(_strip_json(raw))
        except Exception as e:
            logger.warning(f"commander_action {key} failed: {e}")
            return {
                "action": random.choice(["attack", "defend", "flank"]),
                "target": "frontline",
                "narrative": f"{c['name']} commits to a calculated maneuver.",
            }

    action_a = await commander_action("A", a, b)
    action_b = await commander_action("B", b, a)

    # Resolve damage with stats + randomness
    def damage_calc(attacker, defender, action):
        base = attacker["stats"].get("offense", 60) / 100.0
        defense = defender["stats"].get("defense", 60) / 100.0
        mult = {"attack": 1.0, "flank": 1.2, "special": 1.4, "sabotage": 0.8, "defend": 0.3}.get(
            action.get("action", "attack"), 1.0
        )
        roll = random.uniform(0.7, 1.3)
        dmg = max(2, int(15 * base * mult * roll * (1 - defense * 0.4)))
        army_loss = int(dmg * random.uniform(1.5, 3.5))
        return dmg, army_loss

    dmg_to_b, army_loss_b = damage_calc(a, b, action_a)
    dmg_to_a, army_loss_a = damage_calc(b, a, action_b)

    # Apply user intervention boost
    intervention_text = None
    if user_intervention:
        kind = user_intervention.get("kind")
        target = user_intervention.get("commander_target", "A")  # which side benefits
        text = user_intervention.get("text", "")
        intervention_text = f"USER INTERVENTION ({kind}) -> {COMMANDERS[target]['name']}: {text}"
        if kind == "reinforcements":
            if target == "A":
                a["army_size"] += 50
            else:
                b["army_size"] += 50
        elif kind == "event":
            # storm/betrayal - mild HP penalty to both
            dmg_to_a += 8
            dmg_to_b += 8
        elif kind == "taunt":
            # morale shift
            pass

    # Apply
    b["hp"] = max(0, b["hp"] - dmg_to_b)
    a["hp"] = max(0, a["hp"] - dmg_to_a)
    b["army_size"] = max(0, b["army_size"] - army_loss_b)
    a["army_size"] = max(0, a["army_size"] - army_loss_a)

    # Generate two-host commentary
    commentary = await generate_commentary(
        setting=setting,
        turn=turn_index + 1,
        action_a=action_a,
        action_b=action_b,
        a=a,
        b=b,
        dmg_to_a=dmg_to_a,
        dmg_to_b=dmg_to_b,
        army_loss_a=army_loss_a,
        army_loss_b=army_loss_b,
        intervention_text=intervention_text,
        host_a=battle.get("host_a_name", "Vex"),
        host_b=battle.get("host_b_name", "Cipher"),
        session_id=f"{battle['id']}-commentary-{turn_index}",
    )

    return {
        "turn": turn_index + 1,
        "action_a": action_a,
        "action_b": action_b,
        "dmg_to_a": dmg_to_a,
        "dmg_to_b": dmg_to_b,
        "army_loss_a": army_loss_a,
        "army_loss_b": army_loss_b,
        "a_hp_after": a["hp"],
        "b_hp_after": b["hp"],
        "a_army_after": a["army_size"],
        "b_army_after": b["army_size"],
        "intervention": intervention_text,
        "commentary": commentary,
    }


async def generate_commentary(
    setting, turn, action_a, action_b, a, b,
    dmg_to_a, dmg_to_b, army_loss_a, army_loss_b,
    intervention_text, host_a, host_b, session_id
) -> list:
    """Generate alternating two-host dialogue. Returns list of {speaker, text}."""
    system = (
        f"You are scripting live war commentary between two TV hosts named {host_a} (analytical, sharp) "
        f"and {host_b} (hyped, dramatic). Reply ONLY with a JSON array."
    )
    chat = LlmChat(api_key=_key(), session_id=session_id, system_message=system).with_model(
        "openai", "gpt-5.2"
    )
    prompt = f"""LIVE BATTLE COMMENTARY — Turn {turn}, Setting: {setting}

ARES (Commander A): action={action_a.get('action')}, target={action_a.get('target')}, narration="{action_a.get('narrative')}"
ORION (Commander B): action={action_b.get('action')}, target={action_b.get('target')}, narration="{action_b.get('narrative')}"

Results: ARES lost {dmg_to_a} HP / {army_loss_a} units. ORION lost {dmg_to_b} HP / {army_loss_b} units.
ARES now HP={a['hp']} Army={a['army_size']}. ORION now HP={b['hp']} Army={b['army_size']}.
{"INTERVENTION: " + intervention_text if intervention_text else ""}

Produce 3-5 alternating commentary lines as JSON array:
[{{"speaker": "{host_a}", "text": "<line>"}}, {{"speaker": "{host_b}", "text": "<line>"}}, ...]
Keep each line under 25 words. Punchy, broadcasty, in-character.
"""
    try:
        raw = await chat.send_message(UserMessage(text=prompt))
        data = json.loads(_strip_json(raw))
        if isinstance(data, list):
            return data[:6]
    except Exception as e:
        logger.warning(f"commentary failed: {e}")
    return [
        {"speaker": host_a, "text": f"Turn {turn}: ARES strikes! ORION's defenses are shaking."},
        {"speaker": host_b, "text": f"And what a counter from ORION — this battle is FAR from over!"},
    ]


def check_winner(battle: dict) -> Optional[str]:
    a = battle["commanders"]["A"]
    b = battle["commanders"]["B"]
    a_done = a["hp"] <= 0 or a["army_size"] <= 0
    b_done = b["hp"] <= 0 or b["army_size"] <= 0
    if a_done and b_done:
        # tie-break by remaining hp + army
        score_a = a["hp"] + a["army_size"] / 10
        score_b = b["hp"] + b["army_size"] / 10
        return "A" if score_a >= score_b else "B"
    if a_done:
        return "B"
    if b_done:
        return "A"
    return None


async def react_to_intervention(intervention_kind: str, text: str, host_a: str, host_b: str, session_id: str) -> list:
    """Generate quick host reaction to a user intervention."""
    system = (
        f"You script live war commentary between {host_a} and {host_b}. Return ONLY JSON array."
    )
    chat = LlmChat(api_key=_key(), session_id=session_id, system_message=system).with_model(
        "openai", "gpt-5.2"
    )
    prompt = f"""A viewer just intervened LIVE in the broadcast.
KIND: {intervention_kind}
VIEWER MESSAGE: "{text}"

Produce 2 short reaction lines from the hosts (alternating). Each under 20 words.
JSON: [{{"speaker":"{host_a}","text":"..."}},{{"speaker":"{host_b}","text":"..."}}]
"""
    try:
        raw = await chat.send_message(UserMessage(text=prompt))
        data = json.loads(_strip_json(raw))
        if isinstance(data, list):
            return data[:3]
    except Exception as e:
        logger.warning(f"react_to_intervention failed: {e}")
    return [
        {"speaker": host_a, "text": f"Whoa — a viewer just called in: {text}"},
        {"speaker": host_b, "text": "Unbelievable! The arena bends to the audience tonight!"},
    ]
