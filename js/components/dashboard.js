import { createElement } from "../utils/dom.js";

export class DashboardComponent {
  constructor(state, onPersonClick) {
    this.state = state;
    this.onPersonClick = onPersonClick;
  }

  render() {
    this.container = createElement("div", { className: "dashboard" });
    const logoutBtn = createElement(
      "button",
      {
        className: "btn btn-outline",
        onClick: () => {
          window.dispatchEvent(new CustomEvent("docnest-logout"));
        },
      },
      ["Logout"],
    );
    const header = createElement("div", { className: "dashboard-header" }, [
      createElement("h2", {}, ["Documents"]),
      logoutBtn,
    ]);

    const grid = createElement("div", { className: "person-grid" });
    const persons = this.state.getAccessiblePersons();
    const colors = [
      "#2563eb",
      "#db2777",
      "#059669",
      "#d97706",
      "#7c3aed",
      "#0891b2",
    ];
    persons.forEach((person, i) => {
      const stats = this.state.getPersonStats(person.id);
      const color = colors[i % colors.length];
      const card = createElement(
        "div",
        {
          className: "card person-card",
          onClick: () => this.onPersonClick(person.id),
        },
        [
          createElement(
            "div",
            {
              className: "avatar-ring",
              style: `background:linear-gradient(135deg, ${color}, ${color}33);`,
            },
            [
              createElement(
                "div",
                {
                  className: "avatar",
                  style: `background:${color}22;color:${color};`,
                },
                [person.name.charAt(0)],
              ),
            ],
          ),
          createElement("div", { className: "person-name" }, [person.name]),
          createElement("div", { className: "person-doc-count" }, [
            `${stats.count} doc${stats.count === 1 ? "" : "s"}`,
          ]),
          createElement("div", { className: "person-last-updated" }, [
            stats.lastUpdated
              ? `Updated ${stats.lastUpdated}`
              : "No documents yet",
          ]),
        ],
      );
      grid.appendChild(card);
    });
    this.container.appendChild(header);
    this.container.appendChild(grid);
    return this.container;
  }
}
