// Slim layout used by the non-franchise baseball modes (Live Game,
// Training Camp, Score Keeper). No franchise sidenav, no news ticker —
// just a back-to-Baseball-Hub bar so Henry never feels stuck inside
// these tools.
import { Outlet, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function NonFranchiseLayout() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #0b1a2f 0%, #050a16 100%)" }}>
      <header className="sticky top-0 z-30 glass border-b border-white/5 safe-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate("/baseball")}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center pressable touch-target"
            aria-label="Back to Baseball Hub"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] tracking-[0.3em] font-display text-ink-200">⚾ BASEBALL</div>
          </div>
        </div>
      </header>
      <main className="flex-1 min-w-0 p-5 lg:p-8 overflow-y-auto safe-bottom">
        <Outlet />
      </main>
    </div>
  );
}
