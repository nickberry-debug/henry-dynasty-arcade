import React from "react";
import ReactDOM from "react-dom/client";
import { setAutoFreeze } from "immer";
import App from "./App";
import "./styles/globals.css";

// Disable Immer's auto-freezing globally. Otherwise nested objects in
// the football/baseball league state get sealed after each mutation,
// and any code path that mutates the league outside of an active
// Immer producer throws "Cannot assign to read only property". We rely
// on Zustand's immutability discipline, not Immer's runtime freeze.
setAutoFreeze(false);

// Pre-warm the Web Speech voice list. iOS Safari and Chrome populate
// getVoices() asynchronously on first call; calling it at boot means
// voices are ready by the time the narrator fires, instead of falling
// back to the OS default on the first scene.
try {
  if (typeof speechSynthesis !== "undefined") {
    speechSynthesis.getVoices();
    speechSynthesis.addEventListener?.("voiceschanged", () => { speechSynthesis.getVoices(); });
  }
} catch {}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
