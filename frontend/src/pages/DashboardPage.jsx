import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { Plus, Trophy, Skull, ArrowRight, Hourglass, Cube } from "@phosphor-icons/react";

const HERO_BG = "https://static.prod-images.emergentagent.com/jobs/fc7d2cf5-bbe7-4606-b479-896a17c8cb8f/images/e71336823380c7bf8eef107e1fef29ad9d0587c581388bfb6329c5efede7ec4c.png";

export default function DashboardPage() {
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/battles").then((r) => setBattles(r.data.battles || [])).finally(() => setLoading(false));
  }, []);

  const wins = battles.filter((b) => b.winner === "A").length;
  const losses = battles.filter((b) => b.winner === "B").length;
  const inProgress = battles.filter((b) => !b.winner && b.status !== "error").length;

  return (
    <div data-testid="dashboard-page" className="max-w-[1600px] mx-auto px-6 py-8">
      {/* HERO */}
      <div className="relative overflow-hidden border border-arena-border mb-8 corner-cut">
        <img src={HERO_BG} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-r from-arena-bg via-arena-bg/70 to-arena-bg/20" />
        <div className="absolute inset-0 grid-bg opacity-25" />
        <div className="relative z-10 p-10 md:p-14">
          <div className="font-mono-arena text-[10px] tracking-[0.4em] uppercase text-arena-yellow mb-4">
            // briefing room · {new Date().toLocaleDateString()}
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-[0.95] max-w-3xl">
            FORGE THE <span className="text-arena-yellow">MATCH</span>.<br />
            LET THE MACHINES <span className="text-arena-red">BLEED</span>.
          </h1>
          <p className="text-arena-muted mt-4 max-w-xl text-sm leading-relaxed">
            Two rival AI commanders. One battlefield of your design. Set the planet, choose the army theme,
            crank the budget — and broadcast the war.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/battle/new"
              data-testid="cta-new-battle"
              className="bg-arena-yellow text-black px-5 py-3 font-bold tracking-wider uppercase text-xs flex items-center gap-2 hover:bg-arena-yellowHover transition-colors"
            >
              <Plus size={16} weight="bold" /> Launch new battle
            </Link>
            <Link
              to="/history"
              data-testid="cta-history"
              className="border border-arena-border text-white px-5 py-3 font-mono-arena tracking-wider uppercase text-xs hover:border-arena-yellow hover:text-arena-yellow transition-colors flex items-center gap-2"
            >
              View full archive <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Total Battles" value={battles.length} icon={<Cube size={20} weight="duotone" className="text-arena-yellow" />} testid="stat-total" />
        <StatCard label="ARES Wins" value={wins} icon={<Trophy size={20} weight="duotone" className="text-arena-yellow" />} testid="stat-wins" />
        <StatCard label="ORION Wins" value={losses} icon={<Skull size={20} weight="duotone" className="text-arena-red" />} testid="stat-losses" />
        <StatCard label="In Progress" value={inProgress} icon={<Hourglass size={20} weight="duotone" className="text-arena-muted" />} testid="stat-progress" />
      </div>

      {/* RECENT */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="font-mono-arena text-[10px] tracking-[0.3em] uppercase text-arena-dim">// archive</div>
          <h2 className="font-heading text-2xl font-bold tracking-tight">Recent battles</h2>
        </div>
        <Link to="/history" className="text-xs text-arena-muted hover:text-arena-yellow font-mono-arena uppercase tracking-widest">See all →</Link>
      </div>

      {loading ? (
        <div className="font-mono-arena text-arena-muted text-sm cursor-blink">LOADING ARCHIVE</div>
      ) : battles.length === 0 ? (
        <div className="border border-dashed border-arena-border p-10 text-center">
          <div className="font-heading text-lg font-bold mb-2">No battles yet.</div>
          <div className="text-arena-muted text-sm">Run your first AI vs AI simulation to see history here.</div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {battles.slice(0, 6).map((b) => <BattleCard key={b.id} b={b} />)}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, testid }) {
  return (
    <div data-testid={testid} className="bg-arena-surface border border-arena-border p-4 flex items-center gap-3 hover:border-arena-yellow/50 transition-colors">
      {icon}
      <div>
        <div className="font-mono-arena text-[9px] tracking-[0.3em] uppercase text-arena-dim">{label}</div>
        <div className="font-heading text-2xl font-black">{value}</div>
      </div>
    </div>
  );
}

function BattleCard({ b }) {
  const status = b.winner ? `WINNER: ${b.winner === "A" ? "ARES" : "ORION"}` : (b.status || "—").toUpperCase();
  const color = b.winner ? "text-arena-yellow" : b.status === "error" ? "text-arena-red" : "text-arena-muted";
  return (
    <Link
      to={`/battle/${b.id}`}
      data-testid={`battle-card-${b.id}`}
      className="block bg-arena-surface border border-arena-border p-5 hover:border-arena-yellow/60 transition-colors group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`font-mono-arena text-[10px] tracking-[0.3em] uppercase ${color}`}>{status}</div>
        <ArrowRight size={14} className="text-arena-dim group-hover:text-arena-yellow group-hover:translate-x-0.5 transition-transform" />
      </div>
      <h3 className="font-heading text-base font-bold mb-1 truncate">{b.army_theme}</h3>
      <div className="text-xs text-arena-muted truncate">{b.setting}</div>
      <div className="mt-4 flex items-center gap-4 font-mono-arena text-[10px] text-arena-dim uppercase tracking-wider">
        <span>BUDGET {b.budget}</span>
        <span>·</span>
        <span>{b.max_turns} TURNS</span>
      </div>
    </Link>
  );
}
