// Stub - other agent will implement.
import { useNavigate } from "react-router-dom";
export default function StrikeRescueHub() {
  const nav = useNavigate();
  return (
    <div style={{ position: "fixed", inset: 0, background: "#0a1c2c", color: "#fde68a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", fontFamily: "Georgia,serif", padding: 24, textAlign: "center" }}>
      <h2>Strike Rescue</h2>
      <p style={{ color: "#cbd5e1" }}>Coming soon.</p>
      <button onClick={() => nav("/home")} style={{ marginTop: 16, background: "#fbbf24", color: "#1c1530", border: "none", padding: "10px 20px", borderRadius: 6, fontWeight: 700, cursor: "pointer" }}>&larr; Home</button>
    </div>
  );
}
