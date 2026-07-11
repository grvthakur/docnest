import { createElement } from "../utils/dom.js";

export class LoginComponent {
  constructor(auth, onLoginSuccess) {
    this.auth = auth;
    this.onLoginSuccess = onLoginSuccess;
  }

  render() {
    this.container = createElement("div", { className: "login-container" });
    const box = createElement("div", { className: "login-box" }, [
      createElement("h1", {}, ["DocNest"]),
      createElement(
        "p",
        { style: "text-align:center;color:var(--text-light);" },
        ["Enter PIN to continue"],
      ),
      this.buildForm(),
    ]);
    this.container.appendChild(box);
    return this.container;
  }

  buildForm() {
    const form = createElement("form", {
      className: "login-form",
      onSubmit: (e) => this.handleSubmit(e),
    });
    const pinInput = createElement("input", {
      type: "password",
      className: "input",
      placeholder: "PIN",
      maxLength: "6",
      inputMode: "numeric",
      pattern: "[0-9]*",
      autofocus: true,
    });
    this.pinInput = pinInput;
    const rememberDiv = createElement("div", { className: "checkbox-label" }, [
      createElement("input", { type: "checkbox", id: "remember" }),
      createElement("label", { for: "remember" }, ["Stay logged in"]),
    ]);
    this.rememberCheckbox = rememberDiv.querySelector("input");
    const errorEl = createElement("div", {
      className: "error-message",
      style: "color:red;text-align:center;min-height:1.2em;",
    });
    this.errorEl = errorEl;
    const submitBtn = createElement(
      "button",
      { type: "submit", className: "btn" },
      ["Login"],
    );

    form.append(pinInput, rememberDiv, errorEl, submitBtn);
    return form;
  }

  handleSubmit(e) {
    e.preventDefault();
    const pin = this.pinInput.value.trim();
    const remember = this.rememberCheckbox.checked;
    if (!pin) {
      this.errorEl.textContent = "Please enter PIN";
      return;
    }
    const success = this.auth.login(pin, remember);
    if (success) {
      this.onLoginSuccess();
    } else {
      this.errorEl.textContent = "Invalid PIN";
      this.pinInput.value = "";
      this.pinInput.focus();
    }
  }
}
