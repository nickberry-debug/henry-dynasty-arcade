// Live "Cloud Sync" indicator. Shows whether Firebase is configured, the
// current online/offline state, and how recently the local copy synced
// with the cloud. Tap to expand for the family room code (also surfaced
// in the Profile Picker, but mirrored here so it's reachable mid-game).

import { useEffect, useState } from "react";
import { Wifi, WifiOff, Cloud, Check, Copy } from "lucide-react";
import {
  getLastSyncedAt, subscribeSyncStatus, ensureFamilyRoom, getRoomCode,
} from "../sync/cloudBlob";
import { isFirebaseConfigured } from "../sync/firebase";

function fmtAgo(ms: number): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  if (diff < 5000) return "just now";
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

interface Props {
  className?: string;
  style?: React.CSSProperties;
}

export function SyncIndicator({ className, style }: Props) {
  const [online, setOnline] = useState<boolean>(() => typeof navigator !== "undefined" ? navigator.onLine : true);
  const [lastSynced, setLastSynced] = useState<number>(getLastSyncedAt());
  const [, force] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // React to network online/offline changes.
  useEffect(() => {
    function up() { setOnline(true); }
    function down() { setOnline(false); }
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  // Subscribe to global sync-status changes.
  useEffect(() => {
    return subscribeSyncStatus(() => setLastSynced(getLastSyncedAt()));
  }, []);

  // Tick the "Xs ago" label every 10s so it stays fresh without a real
  // event source. Cheap — only re-renders this component.
  useEffect(() => {
    const t = setInterval(() => force(n => n + 1), 10_000);
    return () => clearInterval(t);
  }, []);

  if (!isFirebaseConfigured()) return null;

  const code = getRoomCode() ?? ensureFamilyRoom();
  const synced = lastSynced > 0;
  const stale = synced && Date.now() - lastSynced > 5 * 60 * 1000;
  const color = !online ? "#fca5a5" : stale ? "#fbbf24" : synced ? "#86efac" : "#9aa6bf";
  const label = !online ? "Offline" : stale ? "Stale" : synced ? "Synced" : "Connecting";

  return (
    <div className={className}
      style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 6, ...style }}>
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        aria-label={`Cloud sync ${label}. Last sync ${fmtAgo(lastSynced)}. Tap for family code.`}
        className="inline-flex items-center gap-1.5 rounded-full pressable touch-target"
        style={{
          padding: "4px 10px",
          background: `${color}1f`,
          border: `1px solid ${color}66`,
          color,
          minHeight: 30,
          fontSize: 10,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
        }}>
        {online ? <Cloud size={11} aria-hidden="true" /> : <WifiOff size={11} aria-hidden="true" />}
        <span className="font-display">{label}</span>
        <span className="opacity-70 normal-case tracking-normal">· {fmtAgo(lastSynced)}</span>
      </button>
      {expanded && (
        <div role="dialog" aria-label="Family code"
          className="absolute z-30"
          style={{
            top: "calc(100% + 6px)", right: 0,
            background: "rgba(5,5,15,0.95)",
            border: `1px solid ${color}55`,
            borderRadius: 10,
            padding: "10px 12px",
            minWidth: 220,
            boxShadow: "0 12px 30px -8px rgba(0,0,0,0.6)",
          }}>
          <div className="text-[9px] uppercase tracking-[0.3em]" style={{ color }}>FAMILY CODE</div>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="font-display text-base tracking-[0.2em]" style={{ color }}>{code}</div>
            <button
              type="button"
              onClick={() => {
                if (!code) return;
                try {
                  navigator.clipboard?.writeText(code);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1400);
                } catch { /* ignore */ }
              }}
              aria-label="Copy family code"
              className="pressable touch-target rounded-full"
              style={{
                width: 24, height: 24,
                background: `${color}1f`, border: `1px solid ${color}55`, color,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
              {copied ? <Check size={11} aria-hidden="true" /> : <Copy size={11} aria-hidden="true" />}
            </button>
          </div>
          <div className="text-[10px] mt-2 leading-relaxed" style={{ color: "rgba(229,231,235,0.7)" }}>
            Share this with another family device to sync the same saves.
          </div>
          <div className="text-[10px] mt-2 flex items-center gap-1" style={{ color: "rgba(229,231,235,0.6)" }}>
            {online ? <Wifi size={10} aria-hidden="true" /> : <WifiOff size={10} aria-hidden="true" />}
            <span>{online ? "Online" : "Offline — changes will sync when reconnected"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
