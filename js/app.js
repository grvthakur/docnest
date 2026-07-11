import { loadConfig, loadDocuments } from "./services/configLoader.js";
import { Auth } from "./services/auth.js";
import { State } from "./services/state.js";
import { LoginComponent } from "./components/login.js";
import { DashboardComponent } from "./components/dashboard.js";
import { ExplorerComponent } from "./components/explorer.js";
import { ViewerComponent } from "./components/viewer.js";
import { mountVersionInfo } from "./components/versionInfo.js";

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
    mountVersionInfo();

    const config = await loadConfig();
    // loadDocuments now reads config.persons[*].documentsFile and merges
    // each person's own JSON file, instead of one monolithic documents.json.
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

  handleRoute() {
    // window.location.hash includes the leading "#", e.g. "#/login" or "#/explorer/gaurav/Resume"
    // Strip the "#" and any leading "/" so "login" or "explorer/gaurav/Resume" remains.
    const hash = window.location.hash.replace(/^#\/?/, "") || "login";
    const [route, ...rawParams] = hash.split("/");
    // Segments come from the URL hash and are percent-encoded (e.g. spaces
    // become "%20"). They must be decoded before use, otherwise folderPath
    // lookups like "Personal Docs Misc" never match the literal string
    // "Personal%20Docs%20Misc" and the folder appears empty.
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
    const dashboard = new DashboardComponent(this.state, (personId) => {
      this.navigate(`explorer/${personId}`);
    });
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
    // Encode each "/"-separated segment individually so folder names with
    // spaces/special characters survive the round trip through the hash,
    // while the "/" separators themselves stay intact.
    const encoded = hash
      .split("/")
      .map((seg) => encodeURIComponent(seg))
      .join("/");
    window.location.hash = `#/${encoded}`;
  }
}
