import { createElement } from "../utils/dom.js";

export class DashboardComponent {
  constructor(state, onPersonClick, activePersonId = null) {
    this.state = state;
    this.onPersonClick = onPersonClick;
    this.activePersonId = activePersonId;
  }

  render() {
    this.container = createElement("div", { className: "dashboard" });
    const header = createElement("div", { className: "dashboard-header" }, [
      createElement("h2", {}, ["Documents"]),
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

    const statsList = persons.map((p) => ({
      person: p,
      stats: this.state.getPersonStats(p.id),
    }));
    const mostRecent = statsList.reduce((latest, cur) => {
      if (!cur.stats.lastUpdated) return latest;
      if (!latest || cur.stats.lastUpdated > latest.stats.lastUpdated)
        return cur;
      return latest;
    }, null);

    statsList.forEach(({ person, stats }, i) => {
      const color = colors[i % colors.length];
      const isRecent = mostRecent && mostRecent.person.id === person.id;
      const isActive = this.activePersonId === person.id;
      const card = createElement(
        "div",
        {
          className: `card person-card ${isRecent ? "person-card-recent" : ""} ${isActive ? "person-card-active" : ""}`,
          style: `--card-color:${color};`,
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
    this.container.appendChild(this.buildRecentActivity(statsList));
    return this.container;
  }

  buildRecentActivity(statsList) {
    const totalDocs = statsList.reduce((sum, s) => sum + s.stats.count, 0);
    const sorted = statsList
      .filter((s) => s.stats.lastUpdated)
      .sort((a, b) => b.stats.lastUpdated.localeCompare(a.stats.lastUpdated));

    const section = createElement("div", { className: "recent-activity" }, [
      createElement("h3", { className: "recent-activity-title" }, [
        "Recent activity",
      ]),
      createElement("div", { className: "recent-activity-summary" }, [
        `${totalDocs} document${totalDocs === 1 ? "" : "s"} across ${statsList.length} profile${statsList.length === 1 ? "" : "s"}`,
      ]),
    ]);

    const list = createElement("div", { className: "recent-activity-list" });
    sorted.slice(0, 5).forEach(({ person, stats }) => {
      list.appendChild(
        createElement("div", { className: "recent-activity-row" }, [
          createElement("span", { className: "recent-activity-name" }, [
            person.name,
          ]),
          createElement("span", { className: "recent-activity-date" }, [
            stats.lastUpdated,
          ]),
        ]),
      );
    });
    if (sorted.length > 0) section.appendChild(list);
    return section;
  }
}
