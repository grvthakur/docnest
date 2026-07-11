import { App } from "./app.js";

console.log("[DocNest] main.js loaded");

const app = new App();
app.init().catch((err) => {
  console.error("[DocNest] Fatal init error:", err);
  document.getElementById("app").innerHTML =
    `<div style="padding:2rem;color:red;font-family:sans-serif;">
      <strong>Failed to start DocNest.</strong><br>${err.message}
    </div>`;
});
