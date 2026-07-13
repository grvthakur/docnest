import { loadConfig, loadDocuments } from "./services/configLoader.js";
import { Auth } from "./services/auth.js";
import { State } from "./services/state.js";
import { LoginComponent } from "./components/login.js";
import { DashboardComponent } from "./components/dashboard.js";
import { ExplorerComponent } from "./components/explorer.js";
import { ViewerComponent } from "./components/viewer.js";

export class App {
  constructor() {
    this.state = new State();
    this.auth = new Auth(this.state);
    this.components = { explorer: null, viewer: null };

    window.addEventListener("docnest-logout", () => {
      this.auth.logout();
    });
  }

  async init() {
    console.log("[DocNest] init() starting");
    import("./components/topControls.js")
      .then((mod) => mod.mountTopControls())
      .catch((e) => console.error("[DocNest] top controls failed to load:", e));

    this.showSkeleton();

    const config = await loadConfig();
    const documents = await loadDocuments(config);
    console.log("[DocNest] config + documents loaded", config, documents);

    this.state.setConfig(config);
    this.state.setDocuments(documents);

    window.addEventListener("hashchange", () => this.handleRoute());

    if (this.auth.checkSession()) {
      this.navigate("dashboard");
    } else {
      this.navigate("login");
    }
    this.handleRoute();
  }

  showSkeleton() {
    const appEl = document.getElementById("app");
    const grid = document.createElement("div");
    grid.className = "skeleton-grid";
    for (let i = 0; i < 8; i++) {
      const card = document.createElement("div");
      card.className = "skeleton-card";
      grid.appendChild(card);
    }
    appEl.innerHTML = "";
    appEl.appendChild(grid);
  }

  handleRoute() {
    const hash = window.location.hash.replace(/^#\/?/, "") || "login";
    const [route, ...rawParams] = hash.split("/");
    const params = rawParams.map((p) => decodeURIComponent(p));
    console.log("[DocNest] routing to:", route, params);

    const appEl = document.getElementById("app");
    appEl.innerHTML = "";

    switch (route) {
      case "login":
        this.showLogin();
        break;
      case "dashboard":
        if (!this.state.currentUser) {
          window.location.hash = "#/login";
          return;
        }
        this.showDashboard();
        break;
      case "explorer": {
        if (!this.state.currentUser) {
          window.location.hash = "#/login";
          return;
        }
        const personId = params[0];
        const folderPath = params.slice(1).join("/") || "";
        this.showExplorer(personId, folderPath);
        break;
      }
      default:
        window.location.hash = "#/login";
    }
  }

  showLogin() {
    const login = new LoginComponent(this.auth, () =>
      this.navigate("dashboard"),
    );
    document.getElementById("app").appendChild(login.render());
  }

  showDashboard() {
    // Pass the last-opened person id so the dashboard can highlight the
    // actually-active profile instead of any one person being hardcoded.
    const activePersonId = this.components.explorer?.currentPersonId || null;
    const dashboard = new DashboardComponent(
      this.state,
      (personId) => this.navigate(`explorer/${personId}`),
      activePersonId,
    );
    document.getElementById("app").appendChild(dashboard.render());
  }

  showExplorer(personId, folderPath) {
    if (!this.state.canAccessPerson(personId)) {
      this.navigate("dashboard");
      return;
    }
    if (!this.components.explorer) {
      this.components.explorer = new ExplorerComponent(
        this.state,
        (doc) => this.openViewer(doc),
        (pId, fPath) => this.navigate(`explorer/${pId}/${fPath}`),
        () => this.navigate("dashboard"),
      );
    }
    this.components.explorer.setPerson(personId, folderPath);
    document
      .getElementById("app")
      .appendChild(this.components.explorer.render());
  }

  openViewer(doc) {
    if (!this.components.viewer) {
      this.components.viewer = new ViewerComponent();
    }
    this.components.viewer.open(
      doc,
      this.state.getDocumentsInFolder(
        this.components.explorer?.currentFolderId,
      ),
    );
  }

  navigate(hash) {
    const encoded = hash
      .split("/")
      .map((seg) => encodeURIComponent(seg))
      .join("/");
    window.location.hash = `#/${encoded}`;
  }
}