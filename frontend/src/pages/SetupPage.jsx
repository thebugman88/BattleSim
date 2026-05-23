import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { toast } from "sonner";
import { Rocket, ArrowRight, Crosshair } from "@phosphor-icons/react";

const ALIEN_IMG = "https://static.prod-images.emergentagent.com/jobs/fc7d2cf5-bbe7-4606-b479-896a17c8cb8f/images/fa31e922b60caf53655160282c17b97d954be70d129f3b9e32e73da83204ab83.png";
const SPARTAN_IMG = "https://static.prod-images.emergentagent.com/jobs/fc7d2cf5-bbe7-4606-b479-896a17c8cb8f/images/62a07a2f85520bfafdab92f272f3df25f7a6037a433f7c2d0085111030b6c9c6.png";

const SETTING_PRESETS = [
  { label: "Mars desert canyon", img: ALIEN_IMG },
  { label: "Lunar far-side crater", img: ALIEN_IMG },
  { label: "Ancient Spartan plains", img: SPARTAN_IMG },
  { label: "Ice planet Hoth tundra", img: ALIEN_IMG },
  { label: "Cyberpunk ruined megacity", img: SPARTAN_IMG },
];

const ARMY_PRESETS = [
  "Spartan hoplites",
  "Star Wars Rebellion",
  "Roman legions",
  "Mongol cavalry",
  "Mecha samurai",
  "Zerg swarm",
  "Pirate fleet",
  "Custom…",
];

const TIERS = [
  { label: "Skirmish", budget: 1500, max_turns: 5, desc: "Quick brawl, small forces." },
  { label: "Battalion", budget: 5000, max_turns: 8, desc: "Standard engagement." },
  { label: "Total War", budget: 15000, max_turns: 12, desc: "Massive armies, longer war." },
];

export default function SetupPage() {
  const nav = useNavigate();
  const [setting, setSetting] = useState(SETTING_PRESETS[0].label);
  const [army, setArmy] = useState(ARMY_PRESETS[0]);
  const [tier, setTier] = useState(TIERS[1]);
  const [customBudget, setCustomBudget] = useState(5000);
  const [maxTurns, setMaxTurns] = useState(8);
  const [voices, setVoices] = useState([]);
  const [hostA, setHostA] = useState("");
  const [hostB, setHostB] = useState("");
  const [hostAName, setHostAName] = useState("Vex");
  const [hostBName, setHostBName] = useState("Cipher");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/voices").then((r) => {
      setVoices(r.data.voices || []);
      if (r.data.voices?.length >= 2) {
        setHostA(r.data.voices[0].voice_id);
        setHostB(r.data.voices[1].voice_id);
      }
    });
  }, []);

  useEffect(() => {
    setCustomBudget(tier.budget);
    setMaxTurns(tier.max_turns);
  }, [tier]);

  const submit = async () => {
    setSubmitting(true);
    try {
      const { data } = await api.post("/battles", {
        setting,
        army_theme: army === "Custom…" ? "" : army,
        budget: customBudget,
        max_turns: maxTurns,
        host_a_voice_id: hostA,
        host_b_voice_id: hostB,
        host_a_name: hostAName || "Vex",
        host_b_name: hostBName || "Cipher",
      });
      toast.success("Battle queued. AIs are building bases.");
      nav(`/battle/${data.id}`);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Failed to create battle");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="setup-page" className="max-w-[1400px] mx-auto px-6 py-8">
      <div className="font-mono-arena text-[10px] tracking-[0.4em] uppercase text-arena-yellow mb-3">// arena · configuration</div>
      <h1 className="font-heading text-4xl lg:text-5xl font-black tracking-tighter mb-2">Forge the battle</h1>
      <p className="text-arena-muted mb-8 max-w-2xl">Set the stage. The AIs will build their own bases, design their own armies, and broadcast the war live.</p>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* LEFT: setting + army */}
        <div className="lg:col-span-2 space-y-6">
          <Section label="// theater of operations" title="Setting / planet">
            <div className="grid sm:grid-cols-2 gap-2">
              {SETTING_PRESETS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  data-testid={`setting-${s.label.replace(/\s+/g, '-').toLowerCase()}`}
                  onClick={() => setSetting(s.label)}
                  className={`relative h-24 overflow-hidden border text-left p-3 transition-colors ${setting === s.label ? "border-arena-yellow" : "border-arena-border hover:border-arena-muted"}`}
                >
                  <img src={s.img} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                  <div className="absolute inset-0 bg-gradient-to-br from-arena-bg/80 to-transparent" />
                  <div className="relative font-heading font-bold text-sm">{s.label}</div>
                </button>
              ))}
            </div>
            <label className="block mt-4 text-[10px] tracking-[0.3em] uppercase text-arena-muted font-mono-arena mb-1">Or write your own</label>
            <input
              data-testid="setting-custom"
              value={setting}
              onChange={(e) => setSetting(e.target.value)}
              className="w-full bg-arena-bg border border-arena-border px-3 py-2 text-white font-mono-arena text-sm focus:outline-none focus:ring-1 focus:ring-arena-yellow focus:border-arena-yellow"
              placeholder="e.g. orbital ring of Jupiter"
            />
          </Section>

          <Section label="// faction · theme" title="Army theme">
            <div className="flex flex-wrap gap-2 mb-3">
              {ARMY_PRESETS.map((a) => (
                <button
                  type="button"
                  key={a}
                  data-testid={`army-${a.replace(/\s+/g, '-').toLowerCase()}`}
                  onClick={() => setArmy(a)}
                  className={`px-3 py-1.5 text-xs font-mono-arena uppercase tracking-wider border transition-colors ${army === a ? "border-arena-yellow text-arena-yellow" : "border-arena-border text-arena-muted hover:text-white"}`}
                >
                  {a}
                </button>
              ))}
            </div>
            {army === "Custom…" && (
              <input
                data-testid="army-custom-input"
                onChange={(e) => setArmy(e.target.value)}
                className="w-full bg-arena-bg border border-arena-border px-3 py-2 text-white font-mono-arena text-sm focus:outline-none focus:ring-1 focus:ring-arena-yellow focus:border-arena-yellow"
                placeholder="e.g. samurai with magitek armor"
              />
            )}
            {army !== "Custom…" && (
              <input
                data-testid="army-input-readonly"
                value={army}
                onChange={(e) => setArmy(e.target.value)}
                className="w-full bg-arena-bg border border-arena-border px-3 py-2 text-white font-mono-arena text-sm focus:outline-none focus:ring-1 focus:ring-arena-yellow focus:border-arena-yellow"
              />
            )}
          </Section>

          <Section label="// resource · tier" title="Budget tier">
            <div className="grid sm:grid-cols-3 gap-2">
              {TIERS.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  data-testid={`tier-${t.label.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => setTier(t)}
                  className={`text-left p-4 border transition-colors ${tier.label === t.label ? "border-arena-yellow bg-arena-yellow/5" : "border-arena-border hover:border-arena-muted"}`}
                >
                  <div className="font-heading font-bold text-lg">{t.label}</div>
                  <div className="text-arena-muted text-xs mb-2">{t.desc}</div>
                  <div className="font-mono-arena text-arena-yellow text-sm">{t.budget.toLocaleString()} cr</div>
                  <div className="font-mono-arena text-arena-dim text-[10px] uppercase tracking-wider">{t.max_turns} turns max</div>
                </button>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              <div>
                <label className="block text-[10px] tracking-[0.3em] uppercase text-arena-muted font-mono-arena mb-1">CUSTOM BUDGET</label>
                <input
                  data-testid="custom-budget"
                  type="number"
                  min={500}
                  max={100000}
                  value={customBudget}
                  onChange={(e) => setCustomBudget(parseInt(e.target.value || "0"))}
                  className="w-full bg-arena-bg border border-arena-border px-3 py-2 text-white font-mono-arena text-sm focus:outline-none focus:ring-1 focus:ring-arena-yellow focus:border-arena-yellow"
                />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.3em] uppercase text-arena-muted font-mono-arena mb-1">MAX TURNS</label>
                <input
                  data-testid="max-turns"
                  type="number"
                  min={3}
                  max={15}
                  value={maxTurns}
                  onChange={(e) => setMaxTurns(parseInt(e.target.value || "0"))}
                  className="w-full bg-arena-bg border border-arena-border px-3 py-2 text-white font-mono-arena text-sm focus:outline-none focus:ring-1 focus:ring-arena-yellow focus:border-arena-yellow"
                />
              </div>
            </div>
          </Section>
        </div>

        {/* RIGHT: hosts + commit */}
        <div className="space-y-6">
          <Section label="// broadcast · hosts" title="Commentator voices">
            <HostPicker label="Host A" name={hostAName} setName={setHostAName} voice={hostA} setVoice={setHostA} voices={voices} testid="host-a" />
            <div className="h-3" />
            <HostPicker label="Host B" name={hostBName} setName={setHostBName} voice={hostB} setVoice={setHostB} voices={voices} testid="host-b" />
          </Section>

          <Section label="// commanders" title="Match-up">
            <div className="space-y-2 font-mono-arena text-sm">
              <div className="flex items-center justify-between py-2 border-b border-arena-border">
                <span className="text-arena-yellow">⌬ ARES</span>
                <span className="text-arena-muted">Claude Sonnet 4.5</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-arena-red">⌬ ORION</span>
                <span className="text-arena-muted">GPT-5.2</span>
              </div>
            </div>
          </Section>

          <button
            data-testid="launch-battle-btn"
            disabled={submitting}
            onClick={submit}
            className="w-full bg-arena-yellow text-black font-bold py-4 flex items-center justify-center gap-2 hover:bg-arena-yellowHover transition-colors disabled:opacity-50 uppercase tracking-widest"
          >
            <Rocket size={18} weight="bold" />
            {submitting ? "QUEUING…" : "LAUNCH BATTLE"}
            <ArrowRight size={16} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ label, title, children }) {
  return (
    <div className="bg-arena-surface border border-arena-border p-5 relative">
      <div className="absolute top-3 right-3 text-arena-dim">
        <Crosshair size={14} className="opacity-50" />
      </div>
      <div className="font-mono-arena text-[10px] tracking-[0.3em] uppercase text-arena-dim mb-1">{label}</div>
      <h3 className="font-heading text-lg font-bold tracking-tight mb-4">{title}</h3>
      {children}
    </div>
  );
}

function HostPicker({ label, name, setName, voice, setVoice, voices, testid }) {
  return (
    <div>
      <div className="font-mono-arena text-[10px] tracking-[0.3em] uppercase text-arena-dim mb-2">{label}</div>
      <input
        data-testid={`${testid}-name`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Host name"
        className="w-full bg-arena-bg border border-arena-border px-3 py-2 text-white font-mono-arena text-sm focus:outline-none focus:ring-1 focus:ring-arena-yellow focus:border-arena-yellow mb-2"
      />
      <select
        data-testid={`${testid}-voice`}
        value={voice}
        onChange={(e) => setVoice(e.target.value)}
        className="w-full bg-arena-bg border border-arena-border px-3 py-2 text-white font-mono-arena text-sm focus:outline-none focus:ring-1 focus:ring-arena-yellow focus:border-arena-yellow"
      >
        {voices.map((v) => (
          <option key={v.voice_id} value={v.voice_id}>
            {v.name} — {v.description}
          </option>
        ))}
      </select>
    </div>
  );
}
