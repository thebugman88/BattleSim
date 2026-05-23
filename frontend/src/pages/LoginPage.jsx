import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Crosshair, Lightning } from "@phosphor-icons/react";
import { formatApiError } from "../lib/api";

const HERO_BG = "https://static.prod-images.emergentagent.com/jobs/fc7d2cf5-bbe7-4606-b479-896a17c8cb8f/images/e71336823380c7bf8eef107e1fef29ad9d0587c581388bfb6329c5efede7ec4c.png";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@arena.ai");
  const [password, setPassword] = useState("Admin@1234");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back, operator.");
      nav("/");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative grid lg:grid-cols-2 bg-arena-bg">
      <div className="relative hidden lg:block">
        <img src={HERO_BG} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-r from-arena-bg via-arena-bg/30 to-transparent" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute bottom-12 left-12 right-12 z-10">
          <div className="font-mono-arena text-arena-yellow text-[10px] tracking-[0.4em] uppercase mb-4">
            // command interface · v0.1
          </div>
          <h1 className="font-heading text-4xl xl:text-6xl font-black tracking-tighter leading-[0.95]">
            TWO AIs.<br />
            ONE <span className="text-arena-yellow">ARENA</span>.<br />
            <span className="text-arena-red">ZERO MERCY.</span>
          </h1>
          <p className="mt-4 text-arena-muted max-w-md text-sm leading-relaxed">
            Pit Claude Sonnet 4.5 against GPT-5.2 in a fully simulated war game.
            Set the planet, pick the army, then watch them tear each other apart — with live audio commentary.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12 relative">
        <div className="absolute inset-0 grid-bg opacity-10 lg:hidden" />
        <form
          onSubmit={submit}
          data-testid="login-form"
          className="w-full max-w-sm bg-arena-surface border border-arena-border p-8 relative z-10"
        >
          <div className="flex items-center gap-2 mb-6">
            <Crosshair size={26} weight="duotone" className="text-arena-yellow" />
            <div className="font-heading text-xl font-black tracking-tighter">AI·ARENA</div>
          </div>
          <div className="font-mono-arena text-[10px] tracking-[0.3em] uppercase text-arena-dim mb-1">// access · authenticate</div>
          <h2 className="font-heading text-2xl font-bold tracking-tight mb-6">Operator login</h2>

          <label className="block text-[10px] tracking-[0.3em] uppercase text-arena-muted font-mono-arena mb-1">EMAIL</label>
          <input
            data-testid="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-arena-bg border border-arena-border px-3 py-2 text-white font-mono-arena text-sm focus:outline-none focus:ring-1 focus:ring-arena-yellow focus:border-arena-yellow mb-4"
            required
          />

          <label className="block text-[10px] tracking-[0.3em] uppercase text-arena-muted font-mono-arena mb-1">PASSWORD</label>
          <input
            data-testid="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-arena-bg border border-arena-border px-3 py-2 text-white font-mono-arena text-sm focus:outline-none focus:ring-1 focus:ring-arena-yellow focus:border-arena-yellow mb-6"
            required
          />

          <button
            data-testid="login-submit"
            disabled={loading}
            className="w-full bg-arena-yellow text-black font-bold py-2.5 flex items-center justify-center gap-2 hover:bg-arena-yellowHover transition-colors disabled:opacity-50"
          >
            <Lightning size={16} weight="bold" />
            {loading ? "AUTHENTICATING…" : "ENTER ARENA"}
          </button>

          <div className="text-arena-muted text-sm mt-6 text-center">
            No account?{" "}
            <Link to="/register" className="text-arena-yellow hover:underline" data-testid="go-register">
              Register
            </Link>
          </div>
          <div className="mt-4 text-[10px] text-arena-dim font-mono-arena text-center tracking-wider">
            DEMO: admin@arena.ai / Admin@1234
          </div>
        </form>
      </div>
    </div>
  );
}
