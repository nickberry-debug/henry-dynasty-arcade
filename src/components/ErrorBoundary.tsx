// Top-level error boundary. Any uncaught React error in a child tree
// renders this fallback instead of a blank white screen. Helps Henry's
// dad debug runtime issues from the device rather than guessing.
import { Component, ErrorInfo, ReactNode } from "react";

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error; info?: ErrorInfo }

/** Detect the stale-deploy chunk-mismatch error family. After a Vercel
 *  deploy, an old SW can keep serving the previous index.html which
 *  references chunk hashes that no longer exist. The browser fetches
 *  the missing chunk, gets index.html back (SPA fallback), and refuses
 *  to execute HTML as JS module. */
function isStaleChunkError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { message?: string; name?: string };
  const msg = String(e.message ?? "");
  const name = String(e.name ?? "");
  return (
    name === "ChunkLoadError" ||
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("is not a valid JavaScript MIME type") ||
    msg.includes("'text/html' is not a valid")
  );
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console for desktop debugging, persist a copy to localStorage
    // so we can recover the trace from a mobile device after the fact.
    console.error("[ErrorBoundary]", error, info);
    try {
      localStorage.setItem("dd_last_error", JSON.stringify({
        ts: Date.now(),
        message: error.message,
        stack: error.stack?.slice(0, 4000),
        componentStack: info.componentStack?.slice(0, 2000),
      }));
    } catch {}
    this.setState({ info });
    // Auto-recover from stale-deploy chunk errors. App.tsx's lazy loader
    // catches most of these, but if one slips through (e.g. an inline
    // dynamic import deep in a page), unregister the SW + clear caches
    // and reload exactly once. The sessionStorage guard prevents loops.
    if (isStaleChunkError(error)) {
      const already = (() => {
        try { return sessionStorage.getItem("dd_chunk_reload_attempted") === "1"; }
        catch { return false; }
      })();
      if (!already) {
        try { sessionStorage.setItem("dd_chunk_reload_attempted", "1"); } catch {}
        this.reload();
      }
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined, info: undefined });
  };

  reload = () => {
    // Aggressive recovery for a stuck PWA: unregister every service worker
    // AND clear every Cache Storage entry. Without the SW unregister, the
    // same worker re-installs the broken cached assets on the next load.
    const finish = () => {
      try { location.reload(); } catch { /* ignore */ }
    };
    const clearCaches = async () => {
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
      } catch { /* ignore */ }
    };
    const unregSw = async () => {
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(r => r.unregister().catch(() => false)));
        }
      } catch { /* ignore */ }
    };
    Promise.all([clearCaches(), unregSw()]).finally(finish);
  };

  // Last-resort: wipe localStorage too. Loses unsynced game progress on
  // this device, but recovers from a corrupted persisted state that
  // crashes every render. Only used when the basic Reload didn't help.
  wipeAndReload = () => {
    const finish = () => {
      try { location.reload(); } catch { /* ignore */ }
    };
    const clear = async () => {
      try { localStorage.clear(); } catch { /* ignore */ }
      try { sessionStorage.clear(); } catch { /* ignore */ }
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
      } catch { /* ignore */ }
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(r => r.unregister().catch(() => false)));
        }
      } catch { /* ignore */ }
      // Try to wipe IndexedDB so a corrupted Dexie store can't keep
      // crashing on re-hydrate. Best-effort — not all browsers support
      // databases() listing.
      try {
        const anyIdb = indexedDB as unknown as { databases?: () => Promise<{ name?: string }[]> };
        if (anyIdb.databases) {
          const dbs = await anyIdb.databases();
          await Promise.all(dbs.map(d => d.name ? new Promise<void>(res => {
            const req = indexedDB.deleteDatabase(d.name!);
            req.onsuccess = req.onerror = req.onblocked = () => res();
          }) : Promise.resolve()));
        }
      } catch { /* ignore */ }
    };
    clear().finally(finish);
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{
        position: "fixed", inset: 0,
        background: "linear-gradient(180deg, #0F1B2D 0%, #07101E 100%)",
        color: "#e9e3d2",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "'EB Garamond', 'Crimson Text', Georgia, serif",
      }}>
        <div style={{ maxWidth: 520, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🛠️</div>
          <div style={{ fontFamily: "'Cinzel', serif", letterSpacing: "0.15em", color: "#DAA520", fontSize: 22, marginBottom: 8 }}>
            SOMETHING BROKE
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: "rgba(233,227,210,0.85)", marginBottom: 16 }}>
            The app hit a snag rendering this screen. Your saves are safe — they live in IndexedDB and didn't move. Try a reload to clear caches.
          </p>
          {this.state.error && (
            <div style={{
              textAlign: "left", fontSize: 11, padding: 12,
              background: "rgba(15,27,45,0.6)", border: "1px solid rgba(218,165,32,0.25)",
              borderRadius: 12, marginBottom: 16, color: "rgba(233,227,210,0.85)",
              fontFamily: "monospace", overflow: "auto", maxHeight: 260,
            }}>
              <div style={{ color: "#DAA520", marginBottom: 6, fontFamily: "'Cinzel', serif", fontSize: 11, letterSpacing: "0.15em" }}>
                ERROR
              </div>
              <div style={{ wordBreak: "break-word", color: "#ff8b8b", marginBottom: 8 }}>
                {this.state.error.name}: {this.state.error.message}
              </div>
              {this.state.error.stack && (
                <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: 10, lineHeight: 1.4 }}>
                  {this.state.error.stack.slice(0, 1800)}
                </pre>
              )}
              {this.state.info?.componentStack && (
                <pre style={{ whiteSpace: "pre-wrap", marginTop: 8, marginBottom: 0, fontSize: 10, lineHeight: 1.4, color: "rgba(233,227,210,0.5)" }}>
                  {this.state.info.componentStack.slice(0, 1000)}
                </pre>
              )}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={this.reload}
              style={{
                padding: "10px 20px", borderRadius: 12, border: "none",
                background: "#DAA520", color: "#0F1B2D",
                fontFamily: "'Cinzel', serif", letterSpacing: "0.15em", fontSize: 13,
                cursor: "pointer", minHeight: 44,
              }}
            >
              RELOAD & CLEAR CACHE
            </button>
            <button
              onClick={() => {
                // If the crash IS the arcade landing, /play just loops.
                // Send the user to a static page (What's New) instead.
                const here = location.pathname;
                const safe = (here === "/" || here === "/play") ? "/whats-new" : "/play";
                location.href = safe;
              }}
              style={{
                padding: "10px 20px", borderRadius: 12,
                background: "rgba(218,165,32,0.12)",
                border: "1px solid rgba(218,165,32,0.3)",
                color: "#DAA520",
                fontFamily: "'Cinzel', serif", letterSpacing: "0.15em", fontSize: 13,
                cursor: "pointer", minHeight: 44,
              }}
            >
              SAFE PAGE
            </button>
          </div>
          <div style={{ marginTop: 14 }}>
            <button
              onClick={() => {
                if (confirm("Wipe all local data on this device and start fresh? Cloud-synced saves stay safe; this only clears this device's cache.")) {
                  this.wipeAndReload();
                }
              }}
              style={{
                padding: "8px 14px", borderRadius: 10,
                background: "transparent",
                border: "1px dashed rgba(255,139,139,0.4)",
                color: "#ff8b8b",
                fontFamily: "'Cinzel', serif", letterSpacing: "0.15em", fontSize: 11,
                cursor: "pointer",
              }}
              title="Use this if Reload & Clear Cache didn't help — wipes local storage."
            >
              FRESH START (WIPE DEVICE)
            </button>
          </div>
        </div>
      </div>
    );
  }
}
