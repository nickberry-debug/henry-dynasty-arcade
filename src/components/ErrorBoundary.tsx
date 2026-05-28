// Top-level error boundary. Any uncaught React error in a child tree
// renders this fallback instead of a blank white screen. Helps Henry's
// dad debug runtime issues from the device rather than guessing.
import { Component, ErrorInfo, ReactNode } from "react";

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error; info?: ErrorInfo }

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
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined, info: undefined });
  };

  reload = () => {
    // Clear caches so the next load gets fresh code if a stale SW is
    // serving a broken build.
    try {
      if ("caches" in window) {
        caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).finally(() => location.reload());
      } else {
        location.reload();
      }
    } catch {
      location.reload();
    }
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
              onClick={() => { location.href = "/play"; }}
              style={{
                padding: "10px 20px", borderRadius: 12,
                background: "rgba(218,165,32,0.12)",
                border: "1px solid rgba(218,165,32,0.3)",
                color: "#DAA520",
                fontFamily: "'Cinzel', serif", letterSpacing: "0.15em", fontSize: 13,
                cursor: "pointer", minHeight: 44,
              }}
            >
              GO TO ARCADE
            </button>
          </div>
        </div>
      </div>
    );
  }
}
