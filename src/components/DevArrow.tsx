// Shows up/down arrow next to a player overall rating reflecting last offseason's change.
import type { Player } from "../store/types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  player: Player;
  size?: number;
}

export function DevArrow({ player, size = 12 }: Props) {
  const delta = player.overall - player.prevOvr;
  if (delta >= 4) return <span className="inline-flex items-center text-emerald-400" title={`Up ${delta} from last year`}><TrendingUp size={size} /></span>;
  if (delta >= 1) return <span className="inline-flex items-center text-emerald-300" title={`Up ${delta} from last year`}><TrendingUp size={size} /></span>;
  if (delta <= -4) return <span className="inline-flex items-center text-red-400" title={`Down ${Math.abs(delta)} from last year`}><TrendingDown size={size} /></span>;
  if (delta <= -1) return <span className="inline-flex items-center text-orange-300" title={`Down ${Math.abs(delta)} from last year`}><TrendingDown size={size} /></span>;
  return <span className="inline-flex items-center text-ink-400 opacity-50" title="No change"><Minus size={size} /></span>;
}
