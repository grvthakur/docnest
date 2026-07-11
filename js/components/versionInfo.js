import { createElement } from "../utils/dom.js";

export function mountVersionInfo() {
  const btn = createElement(
    "button",
    { className: "version-info-btn", title: "Version info" },
    ["ⓘ"],
  );

  let popup = null;

  function closePopup() {
    if (popup) {
      popup.remove();
      popup = null;
      document.removeEventListener("click", handleOutsideClick, true);
    }
  }

  function handleOutsideClick(e) {
    if (popup && !popup.contains(e.target) && e.target !== btn) {
      closePopup();
    }
  }

  async function openPopup() {
    if (popup) {
      closePopup();
      return;
    }
    popup = createElement("div", { className: "version-info-popup" }, [
      "Loading…",
    ]);
    document.body.appendChild(popup);
    setTimeout(
      () => document.addEventListener("click", handleOutsideClick, true),
      0,
    );

    try {
      const resp = await fetch("version.json", { cache: "no-store" });
      if (!resp.ok) throw new Error("version.json not found");
      const data = await resp.json();
      popup.innerHTML = "";
      popup.append(
        createElement("div", { className: "version-info-row" }, [
          createElement("strong", {}, ["Commit: "]),
          data.commitMessage || "N/A",
        ]),
        createElement("div", { className: "version-info-row" }, [
          createElement("strong", {}, ["Hash: "]),
          data.commitHash || "N/A",
        ]),
        createElement("div", { className: "version-info-row" }, [
          createElement("strong", {}, ["Deployed: "]),
          data.deployedAt ? new Date(data.deployedAt).toLocaleString() : "N/A",
        ]),
      );
    } catch (e) {
      popup.textContent = "Could not load version info.";
    }
  }

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    openPopup();
  });

  document.body.appendChild(btn);
}
