import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Crosshair, SignOut, ListBullets, Plus } from "@phosphor-icons/react";

export default function Header() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const onAuthPage = loc.pathname === "/login" || loc.pathname === "/register";
  if (onAuthPage) return null;

  return (
    <header
      data-testid="app-header"
      className="sticky top-0 z-40 bg-arena-bg/90 backdrop-blur-md border-b border-arena-border"
    >
      <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center gap-6">
        <Link to="/" data-testid="logo-link" className="flex items-center gap-2 group">
          <Crosshair size={26} weight="duotone" className="text-arena-yellow group-hover:rotate-90 transition-transform duration-500" />
          <div className="font-heading text-lg font-black tracking-tighter">
            AI<span className="text-arena-yellow">·</span>ARENA
          </div>
        </Link>
        <div className="text-arena-dim font-mono-arena text-[10px] tracking-[0.3em] uppercase hidden md:block">
          // claude vs gpt · live combat
        </div>
        <div className="flex-1" />
        {user && (
          <>
            <Link
              to="/battle/new"
              data-testid="new-battle-link"
              className="flex items-center gap-2 px-3 py-1.5 bg-arena-yellow text-black font-bold text-xs tracking-wider uppercase hover:bg-arena-yellowHover transition-colors"
            >
              <Plus size={14} weight="bold" /> New Battle
            </Link>
            <Link
              to="/history"
              data-testid="history-link"
              className="flex items-center gap-1.5 text-arena-muted hover:text-arena-yellow font-mono-arena text-xs tracking-wider uppercase"
            >
              <ListBullets size={14} /> History
            </Link>
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] text-arena-dim font-mono-arena uppercase tracking-widest">Operator</span>
              <span className="text-sm text-white font-mono-arena" data-testid="user-name">{user.name}</span>
            </div>
            <button
              data-testid="logout-btn"
              onClick={async () => { await logout(); nav("/login"); }}
              className="p-2 text-arena-muted hover:text-arena-red transition-colors border border-arena-border hover:border-arena-red"
              title="Logout"
            >
              <SignOut size={16} />
            </button>
          </>
        )}
      </div>
    </header>
  );
}
