import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Crosshair, UserPlus } from "@phosphor-icons/react";
import { formatApiError } from "../lib/api";

export default function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await register(email, password, name);
      toast.success("Operator profile created.");
      nav("/");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-arena-bg px-6 py-12 relative">
      <div className="absolute inset-0 grid-bg opacity-10" />
      <form onSubmit={submit} data-testid="register-form" className="w-full max-w-sm bg-arena-surface border border-arena-border p-8 relative z-10">
        <div className="flex items-center gap-2 mb-6">
          <Crosshair size={26} weight="duotone" className="text-arena-yellow" />
          <div className="font-heading text-xl font-black tracking-tighter">AI·ARENA</div>
        </div>
        <div className="font-mono-arena text-[10px] tracking-[0.3em] uppercase text-arena-dim mb-1">// new · operator</div>
        <h2 className="font-heading text-2xl font-bold tracking-tight mb-6">Create account</h2>

        <label className="block text-[10px] tracking-[0.3em] uppercase text-arena-muted font-mono-arena mb-1">CALLSIGN (NAME)</label>
        <input data-testid="register-name" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-arena-bg border border-arena-border px-3 py-2 text-white font-mono-arena text-sm focus:outline-none focus:ring-1 focus:ring-arena-yellow focus:border-arena-yellow mb-4" />

        <label className="block text-[10px] tracking-[0.3em] uppercase text-arena-muted font-mono-arena mb-1">EMAIL</label>
        <input data-testid="register-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-arena-bg border border-arena-border px-3 py-2 text-white font-mono-arena text-sm focus:outline-none focus:ring-1 focus:ring-arena-yellow focus:border-arena-yellow mb-4" />

        <label className="block text-[10px] tracking-[0.3em] uppercase text-arena-muted font-mono-arena mb-1">PASSWORD</label>
        <input data-testid="register-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-arena-bg border border-arena-border px-3 py-2 text-white font-mono-arena text-sm focus:outline-none focus:ring-1 focus:ring-arena-yellow focus:border-arena-yellow mb-6" />

        <button data-testid="register-submit" disabled={loading} className="w-full bg-arena-yellow text-black font-bold py-2.5 flex items-center justify-center gap-2 hover:bg-arena-yellowHover transition-colors disabled:opacity-50">
          <UserPlus size={16} weight="bold" />
          {loading ? "REGISTERING…" : "CREATE OPERATOR"}
        </button>
        <div className="text-arena-muted text-sm mt-6 text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-arena-yellow hover:underline" data-testid="go-login">Login</Link>
        </div>
      </form>
    </div>
  );
}
