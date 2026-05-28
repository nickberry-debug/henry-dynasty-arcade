// Shared mic error banner used across all voice-enabled apps.
// Shows actionable recovery steps and a retry / reload button.

interface Props {
  error: "denied" | "unavailable";
  onRetry?: () => void;
  compact?: boolean;
}

export function MicErrorBanner({ error, onRetry, compact }: Props) {
  const isDenied = error === "denied";
  return (
    <div className={`rounded-xl space-y-2 ${compact ? "px-2 py-1.5" : "p-3"}`}
      style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)" }}>
      <p className={`leading-relaxed ${compact ? "text-[10px]" : "text-[11px]"}`} style={{ color: "#fca5a5" }}>
        {isDenied ? (
          <>
            🎤 <strong>Mic blocked.</strong> In Safari, tap the <strong>aA</strong> button in the address bar → <strong>Website Settings → Microphone → Allow</strong>.
            {" "}Or go to <strong>Settings → Safari → Microphone → Allow</strong>, then reload.
          </>
        ) : (
          <>
            🎤 <strong>Mic unavailable.</strong> Another app may be using the mic, or Safari needs a reload. Try closing other apps first.
          </>
        )}
      </p>
      <div className="flex gap-2">
        {onRetry && (
          <button onClick={onRetry}
            className={`pressable rounded ${compact ? "text-[10px] px-2 py-0.5" : "text-[11px] px-3 py-1.5"}`}
            style={{ background: "rgba(239,68,68,0.25)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.45)" }}>
            Try again
          </button>
        )}
        <button onClick={() => window.location.reload()}
          className={`pressable rounded ${compact ? "text-[10px] px-2 py-0.5" : "text-[11px] px-3 py-1.5"}`}
          style={{ background: "rgba(255,255,255,0.06)", color: "#9aa6bf", border: "1px solid rgba(255,255,255,0.12)" }}>
          Reload page
        </button>
      </div>
    </div>
  );
}
