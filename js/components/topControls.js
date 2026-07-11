import { createElement } from "../utils/dom.js";

const THEME_KEY = "docnest_theme";

function getTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
}

export function mountTopControls() {
  const container = createElement("div", { className: "top-controls" });

  // Home — always available, harmless no-op if already on dashboard/login
  const homeBtn = createElement(
    "button",
    {
      className: "top-control-btn top-control-btn-home",
      title: "Home",
      onClick: () => {
        window.location.hash = "#/dashboard";
      },
    },
    ["🏠 ", createElement("span", {}, ["Home"])],
  );

  // Theme toggle
  const themeBtn = createElement(
    "button",
    { className: "top-control-btn", title: "Toggle theme" },
    [getTheme() === "dark" ? "☀️" : "🌙"],
  );
  themeBtn.addEventListener("click", () => {
    const next = getTheme() === "dark" ? "light" : "dark";
    setTheme(next);
    themeBtn.textContent = next === "dark" ? "☀️" : "🌙";
  });

  // Info popup (unchanged behavior, now grouped instead of separately anchored)
  const infoBtn = createElement(
    "button",
    { className: "top-control-btn", title: "Version info" },
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
    if (popup && !popup.contains(e.target) && e.target !== infoBtn) {
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
          data.deployedAt
            ? new Date(data.deployedAt).toLocaleString()
            : "N/A",
        ]),
      );
    } catch (e) {
      popup.textContent = "Could not load version info.";
    }
  }
  infoBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openPopup();
  });

  container.append(homeBtn, infoBtn, themeBtn);
  document.body.appendChild(container);
}
