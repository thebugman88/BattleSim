# ⚔️ AI·ARENA — BattleSim

> **Two AIs. One Arena. Zero Mercy.**

AI·ARENA is a fully simulated AI-vs-AI war game where two rival AI commanders — **ARES** (Claude Sonnet 4.5) and **ORION** (GPT-5.2) — battle each other in real time. You set the stage, they build their armies, and the war is broadcast live with AI-generated voice commentary.

---

## 🗺️ Navigating the App

### 1. 🔐 Login / Register Page
The first thing you see when you open the app. It has a dramatic split-screen layout:
- **Left side:** A cinematic full-screen battlefield image with the tagline *"TWO AIs. ONE ARENA. ZERO MERCY."*
- **Right side:** A login form where you enter your email and password.

You can also click **Register** to create a new account. A demo account is pre-seeded:
- **Email:** `admin@arena.ai`
- **Password:** `Admin@1234`

---

### 2. 🏠 Dashboard (Home Page)
After logging in, you land on the main dashboard. It has three sections:

#### Hero Banner
A full-width cinematic banner with the headline *"FORGE THE MATCH. LET THE MACHINES BLEED."* with two buttons:
- **Launch New Battle** — Takes you straight to the battle setup page.
- **View Full Archive** — Shows your complete battle history.

#### Stats Bar
Four quick-glance stat cards showing:
- **Total Battles** — How many battles you've run in total.
- **ARES Wins** — How many times the Claude AI won.
- **ORION Wins** — How many times the GPT AI won.
- **In Progress** — How many battles are currently running.

#### Recent Battles
A grid of cards for your last 6 battles. Each card shows:
- The army theme (e.g., "Spartan hoplites")
- The setting/planet (e.g., "Mars desert canyon")
- The budget and number of turns
- Whether the battle is still running or who won

Clicking a card takes you into that battle's live view.

---

### 3. ⚙️ Battle Setup Page ("Forge the Battle")
This is where you configure a new battle before it starts. It has several sections:

#### 🌍 Setting / Planet
Pick a battlefield from preset options:
- Mars desert canyon
- Lunar far-side crater
- Ancient Spartan plains
- Ice planet Hoth tundra
- Cyberpunk ruined megacity

Or type in your own completely custom setting (e.g., *"orbital ring of Jupiter"*).

#### 🛡️ Army Theme
Choose a faction style for both AIs to build around:
- Spartan hoplites
- Star Wars Rebellion
- Roman legions
- Mongol cavalry
- Mecha samurai
- Zerg swarm
- Pirate fleet
- **Custom…** — Type in anything you want (e.g., *"samurai with magitek armor"*)

#### 💰 Budget Tier
Choose how big and long the battle is:
| Tier | Budget | Max Turns | Description |
|------|--------|-----------|-------------|
| Skirmish | 1,500 cr | 5 turns | Quick brawl, small forces |
| Battalion | 5,000 cr | 8 turns | Standard engagement |
| Total War | 15,000 cr | 12 turns | Massive armies, longer war |

You can also manually fine-tune the exact budget and number of turns using the custom input fields.

#### 🎙️ Commentator Voices
Name your two broadcast hosts and pick a voice for each from a list of ElevenLabs voices:
- George — Calm British analyst
- Liam — Energetic young narrator
- Sarah — Crisp news anchor
- Jessica — Dramatic broadcaster
- Daniel — Deep authoritative host
- Chris — Hyped sports commentator

Default hosts are named **Vex** and **Cipher**.

#### Commanders Panel
Shows you the two AIs that will fight:
- ⌬ **ARES** — Powered by Claude Sonnet 4.5 (Anthropic)
- ⌬ **ORION** — Powered by GPT-5.2 (OpenAI)

Hit the big **LAUNCH BATTLE** button and the AIs immediately get to work building their bases.

---

### 4. ⚡ Live Battle Page
This is where the action happens. After launching a battle, both AIs plan their bases simultaneously in the background. Once they're ready, you see:

#### Base Reveal
Side-by-side cards for ARES and ORION, each showing:
- **AI-generated base image** (unique cinematic sci-fi art for each base)
- Base codename and name (e.g., *"Operation Ironhold"*)
- Combat doctrine (their strategic philosophy)
- List of structures built
- Army units with counts and roles
- Their secret weapon
- Stats bars: Offense, Defense, Mobility, Morale

#### Turn-by-Turn Combat
You click **"Simulate Next Turn"** to advance the battle one turn at a time. Each turn shows:
- What action each AI commander chose (attack / defend / flank / special / sabotage)
- Dramatic narrative text from each commander
- HP and army-size meters updating live for both sides
- **Live audio commentary** — Your chosen hosts (with real ElevenLabs voices) read out commentary lines between turns

#### 📢 Viewer Interventions
While the battle is in progress, you can throw a wrench in the war as a viewer:
- **Reinforcements** — Send extra troops to one of the commanders
- **Event** — Drop in a random battlefield event (earthquake, storm, ambush)
- **Taunt** — Send a message to distract or rattle a commander

After you submit an intervention, the hosts react to it live with commentary, and it affects the next turn of the battle.

#### Battle End
When one commander's HP hits zero, or the max turn limit is reached, the battle ends and a **WINNER** banner is displayed. The result is saved to your archive.

---

### 5. 📜 Battle Archive / History Page
A full list of all your past battles, sortable and searchable. Click any battle to replay or review the full turn-by-turn log.

---

## 🧠 How It Works (Under the Hood)

| Layer | Tech |
|-------|------|
| Frontend | React + Tailwind CSS |
| Backend | Python FastAPI |
| Database | MongoDB |
| AI Commander A | Anthropic Claude Sonnet 4.5 |
| AI Commander B | OpenAI GPT-5.2 |
| Base Image Gen | Gemini image generation |
| Voice Commentary | ElevenLabs Text-to-Speech |
| Deployment | Vercel (frontend + serverless backend) |

---

## 🔑 Environment Variables Needed

To run this app, you need the following API keys set in `backend/.env`:

```
MONGO_URL=your_mongodb_connection_string
DB_NAME=battlesim
EMERGENT_LLM_KEY=your_emergent_key
ELEVENLABS_API_KEY=your_elevenlabs_key
FRONTEND_URL=https://your-frontend-url.vercel.app
```

---

## 🚀 Running Locally

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --reload

# Frontend
cd frontend
yarn install
yarn start
```

---

*Built with ❤️ and a lot of AI-vs-AI violence.*
