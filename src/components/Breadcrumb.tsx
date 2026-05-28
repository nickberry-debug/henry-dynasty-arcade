import { Link } from "react-router-dom";
import { ChevronRight, ArrowLeft } from "lucide-react";

export interface Crumb { label: string; to?: string; }

interface Props {
  crumbs: Crumb[];
  backTo?: string;
  context?: React.ReactNode;
}

export function Breadcrumb({ crumbs, backTo, context }: Props) {
  return (
    <div className="sticky top-[52px] z-20 -mx-4 lg:-mx-8 px-4 lg:px-8 py-2 mb-4 glass border-b border-white/5 flex items-center gap-2 text-xs">
      {backTo && (
        <Link to={backTo} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center pressable touch-target shrink-0" aria-label="Back">
          <ArrowLeft size={16} />
        </Link>
      )}
      <nav className="flex items-center gap-1.5 min-w-0 flex-1">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <ChevronRight size={12} className="text-ink-300 shrink-0" />}
            {c.to ? (
              <Link to={c.to} className="text-ink-200 hover:text-white truncate">{c.label}</Link>
            ) : (
              <span className="text-white font-medium truncate">{c.label}</span>
            )}
          </span>
        ))}
      </nav>
      {context && <div className="shrink-0 ml-auto">{context}</div>}
    </div>
  );
}
