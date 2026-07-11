import { sha256 } from "../utils/crypto.js";

const SESSION_KEY = "docnest_session";
const REMEMBER_KEY = "docnest_remember";

export class Auth {
  constructor(state) {
    this.state = state;
  }

  login(pin, remember) {
    const config = this.state.config;
    const users = config.users;
    const hashedInput = sha256(pin);
    const user = users.find((u) => u.pinHash === hashedInput);
    if (user) {
      this.state.setCurrentUser(user);
      this.saveSession(user.id, remember);
      return true;
    }
    return false;
  }

  logout() {
    this.state.clearCurrentUser();
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(REMEMBER_KEY);
    window.location.hash = "#/login";
  }

  saveSession(userId, remember) {
    const sessionData = { userId, timestamp: Date.now() };
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    if (remember) {
      localStorage.setItem(REMEMBER_KEY, "true");
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
  }

  checkSession() {
    const session =
      localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (session) {
      try {
        const data = JSON.parse(session);
        const user = this.state.config.users.find((u) => u.id === data.userId);
        if (user) {
          this.state.setCurrentUser(user);
          return true;
        }
      } catch (e) {
        /* ignore */
      }
    }
    return false;
  }

  isLoggedIn() {
    return this.state.currentUser !== null;
  }
}
