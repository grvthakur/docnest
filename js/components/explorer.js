import { createElement, emptyElement } from "../utils/dom.js";

export class ExplorerComponent {
  constructor(state, onDocumentClick, onNavigate, onHome) {
    this.state = state;
    this.onDocumentClick = onDocumentClick;
    this.onNavigate = onNavigate;
    this.onHome = onHome;
    this.currentPersonId = null;
    this.currentFolderId = null;
    this.searchQuery = "";
    this.activeFilter = "all";
    this.sortBy = "name"; // "name" | "date" | "type"
    // Tracks which folder nodes are expanded, keyed by full folder path.
    // Persists across re-renders/navigation for the life of this component.
    this.expandedFolders = new Set();
  }

  setPerson(personId, folderPath = "") {
    this.currentPersonId = personId;
    this.isFlat = this.state.isFlatPerson(personId);
    this.currentFolderId = folderPath ? `${personId}/${folderPath}` : personId;
    this.searchQuery = "";
    this.activeFilter = "all";
    // Auto-expand every ancestor of the folder we're navigating into.
    if (!this.isFlat) {
      const parts = this.currentFolderId.split("/");
      let acc = parts[0];
      for (let i = 1; i < parts.length; i++) {
        acc += "/" + parts[i];
        this.expandedFolders.add(acc);
      }
    }
  }

  render() {
    this.container = createElement("div", {
      className: `explorer ${this.isFlat ? "explorer-flat" : ""}`,
    });
    this.main = createElement("div", { className: "explorer-main" });

    if (this.isFlat) {
      // Simplified view for Mummy/Papa: no sidebar folder tree, no breadcrumb.
      this.sidebar = null;
      this.renderFlatHeader();
    } else {
      this.sidebar = createElement("div", { className: "sidebar" });
      this.renderSidebar();
      this.container.appendChild(this.sidebar);
      this.renderBreadcrumb();
    }

    this.docGrid = null;
    this.renderToolbar();
    this.docGrid = createElement("div", { className: "documents-grid" });
    this.main.appendChild(this.docGrid);
    this.container.appendChild(this.main);

    if (!this.isFlat) this.addMobileSupport();
    this.renderDocuments();
    return this.container;
  }

  renderFlatHeader() {
    const personConfig = this.state.config.persons[this.currentPersonId];
    const header = createElement(
      "div",
      { className: "flat-header sidebar-header" },
      [
        createElement("h2", {}, [personConfig.name]),
        createElement(
          "button",
          {
            className: "btn btn-outline home-btn",
            onClick: () => this.onHome && this.onHome(),
          },
          ["🏠 Home"],
        ),
      ],
    );
    this.main.appendChild(header);
  }

  renderSidebar() {
    emptyElement(this.sidebar);
    const tree = this.state.getFolderTree(this.currentPersonId);
    const personConfig = this.state.config.persons[this.currentPersonId];
    const headerRow = createElement("div", { className: "sidebar-header" }, [
      createElement("h3", {}, [personConfig.name]),
      createElement(
        "button",
        {
          className: "btn btn-outline home-btn",
          onClick: () => this.onHome && this.onHome(),
        },
        ["🏠 Home"],
      ),
    ]);
    this.sidebar.appendChild(headerRow);

    const treeControls = createElement("div", { className: "tree-controls" }, [
      createElement(
        "button",
        {
          className: "btn btn-outline tree-control-btn",
          onClick: () => {
            this.collectAllFolderPaths(tree).forEach((p) =>
              this.expandedFolders.add(p),
            );
            this.renderSidebar();
          },
        },
        ["Expand all"],
      ),
      createElement(
        "button",
        {
          className: "btn btn-outline tree-control-btn",
          onClick: () => {
            this.expandedFolders.clear();
            this.renderSidebar();
          },
        },
        ["Collapse all"],
      ),
    ]);
    this.sidebar.appendChild(treeControls);

    const ul = createElement("ul", { className: "folder-tree" });
    this.buildTreeNodes(ul, tree, this.currentFolderId);
    this.sidebar.appendChild(ul);
  }

  // Flattens a folder tree into a list of every node's path, used by
  // "Expand all" to open every level in one click.
  collectAllFolderPaths(nodes) {
    const paths = [];
    for (const node of nodes) {
      paths.push(node.path);
      if (node.children && node.children.length > 0) {
        paths.push(...this.collectAllFolderPaths(node.children));
      }
    }
    return paths;
  }

  buildTreeNodes(parentEl, nodes, activeId) {
    for (const node of nodes) {
      const li = createElement("li");
      const isActive = node.path === activeId;
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = this.expandedFolders.has(node.path);
      const arrow = createElement(
        "span",
        {
          className: `folder-arrow ${hasChildren ? "" : "folder-arrow-hidden"}`,
          // Arrow only toggles expand/collapse; it never navigates.
          onClick: (e) => {
            e.stopPropagation();
            if (isExpanded) this.expandedFolders.delete(node.path);
            else this.expandedFolders.add(node.path);
            this.renderSidebar();
          },
        },
        [hasChildren ? (isExpanded ? "▾" : "▸") : ""],
      );
      const item = createElement(
        "div",
        {
          className: `folder-item ${isActive ? "active" : ""}`,
          // Clicking the row (not the arrow) selects/navigates the folder.
          onClick: () =>
            this.onNavigate(
              this.currentPersonId,
              node.path.split("/").slice(1).join("/"),
            ),
        },
        [
          arrow,
          createElement("span", { className: "icon" }, ["📁"]),
          createElement("span", { className: "folder-name" }, [node.name]),
          createElement("span", { className: "folder-count" }, [
            `(${node.count ?? 0})`,
          ]),
        ],
      );
      li.appendChild(item);
      if (hasChildren && isExpanded) {
        const subUl = createElement("ul", { className: "subfolder" });
        this.buildTreeNodes(subUl, node.children, activeId);
        li.appendChild(subUl);
      }
      parentEl.appendChild(li);
    }
  }

  renderBreadcrumb() {
    this.breadcrumb = createElement("div", { className: "breadcrumb" });

    const homeBtn = createElement(
      "button",
      {
        className: "btn btn-outline home-btn",
        onClick: () => this.onHome && this.onHome(),
      },
      ["🏠 Home"],
    );
    this.breadcrumb.appendChild(homeBtn);

    const parts = this.currentFolderId.split("/");
    const folderParts = parts.slice(1);

    if (folderParts.length > 0) {
      const parentPath = folderParts.slice(0, -1).join("/");
      const backBtn = createElement(
        "button",
        {
          className: "btn btn-outline breadcrumb-back",
          onClick: () => this.onNavigate(this.currentPersonId, parentPath),
        },
        ["← Back"],
      );
      this.breadcrumb.appendChild(backBtn);
    }

    const personLink = createElement(
      "span",
      {
        className: "breadcrumb-item",
        onClick: () => this.onNavigate(this.currentPersonId, ""),
      },
      [this.state.config.persons[this.currentPersonId].name],
    );
    this.breadcrumb.appendChild(personLink);
    for (let i = 0; i < folderParts.length; i++) {
      const sep = createElement("span", { className: "breadcrumb-separator" }, [
        "/",
      ]);
      const pathSoFar = folderParts.slice(0, i + 1).join("/");
      const crumb = createElement(
        "span",
        {
          className: `breadcrumb-item ${i === folderParts.length - 1 ? "current" : ""}`,
          onClick: () => {
            if (i < folderParts.length - 1)
              this.onNavigate(this.currentPersonId, pathSoFar);
          },
        },
        [folderParts[i]],
      );
      this.breadcrumb.appendChild(sep);
      this.breadcrumb.appendChild(crumb);
    }
    this.main.appendChild(this.breadcrumb);
  }

  renderToolbar() {
    if (this.toolbar && this.toolbar.parentNode) {
      this.toolbar.parentNode.removeChild(this.toolbar);
    }
    this.toolbar = createElement("div", { className: "toolbar" });
    const search = createElement("div", { className: "search-box" }, [
      createElement("span", { className: "search-icon" }, ["🔍"]),
      createElement("input", {
        className: "input",
        placeholder: "Search...",
        type: "text",
        value: this.searchQuery,
        onInput: (e) => {
          this.searchQuery = e.target.value;
          this.renderDocuments();
        },
      }),
    ]);
    const filterGroup = createElement("div", { className: "filter-group" });
    const filters = ["all", "pdf", "image", "word", "excel", "zip"];
    filters.forEach((f) => {
      const chip = createElement(
        "button",
        {
          className: `filter-chip ${this.activeFilter === f ? "active" : ""}`,
          onClick: () => {
            this.activeFilter = f;
            this.renderToolbar();
            this.renderDocuments();
          },
        },
        [f === "all" ? "All" : f.toUpperCase()],
      );
      filterGroup.appendChild(chip);
    });

    const sortSelect = createElement("select", {
      className: "input sort-select",
      onChange: (e) => {
        this.sortBy = e.target.value;
        this.renderDocuments();
      },
    });
    [
      { value: "name", label: "Sort: Name" },
      { value: "date", label: "Sort: Date added" },
      { value: "type", label: "Sort: File type" },
    ].forEach((opt) => {
      const optionEl = createElement("option", { value: opt.value }, [
        opt.label,
      ]);
      if (opt.value === this.sortBy) optionEl.setAttribute("selected", "");
      sortSelect.appendChild(optionEl);
    });

    const hasActiveFilters =
      this.searchQuery.trim().length > 0 || this.activeFilter !== "all";
    const clearBtn = createElement(
      "button",
      {
        className: "btn btn-outline clear-filters-btn",
        style: hasActiveFilters ? "" : "visibility:hidden;",
        onClick: () => {
          this.searchQuery = "";
          this.activeFilter = "all";
          this.renderToolbar();
          this.renderDocuments();
        },
      },
      ["✕ Clear filters"],
    );
    this.clearBtn = clearBtn;

    const toolbarRight = createElement("div", { className: "toolbar-right" }, [
      sortSelect,
      filterGroup,
      clearBtn,
    ]);

    this.toolbar.append(search, toolbarRight);
    this.resultCount = createElement("div", { className: "result-count" });
    if (this.docGrid && this.docGrid.parentNode === this.main) {
      this.main.insertBefore(this.toolbar, this.docGrid);
      this.main.insertBefore(this.resultCount, this.docGrid);
    } else {
      this.main.appendChild(this.toolbar);
      this.main.appendChild(this.resultCount);
    }
  }

  // A document now has multiple format variants (variants[].fileType) instead
  // of a single fileType. These helpers check across all of a document's
  // variants rather than a single field.
  getVariantTypes(doc) {
    return (doc.variants || []).map((v) => v.fileType?.toLowerCase());
  }

  matchesFilter(doc, filter) {
    if (filter === "all") return true;
    const typeMap = {
      pdf: ["pdf"],
      image: ["jpg", "jpeg", "png", "webp"],
      word: ["doc", "docx"],
      excel: ["xls", "xlsx"],
      zip: ["zip"],
    };
    const allowed = typeMap[filter] || [];
    return this.getVariantTypes(doc).some((t) => allowed.includes(t));
  }

  renderDocuments() {
    emptyElement(this.docGrid);
    const isSearching = this.searchQuery.trim().length > 0;
    // While searching, look across every document belonging to this person
    // (regardless of which folder is currently open) instead of only the
    // current folder's contents, so search works globally.
    let docs = isSearching
      ? this.state.getDocumentsForPerson(this.currentPersonId)
      : this.isFlat
        ? this.state.getDocumentsForPerson(this.currentPersonId)
        : this.state.getDocumentsInFolder(this.currentFolderId);
    if (isSearching) {
      const q = this.searchQuery.trim().toLowerCase();
      docs = docs.filter(
        (doc) =>
          doc.name.toLowerCase().includes(q) ||
          (doc.tags && doc.tags.some((t) => t.toLowerCase().includes(q))) ||
          (doc.category && doc.category.toLowerCase().includes(q)),
      );
    }
    if (this.activeFilter !== "all") {
      docs = docs.filter((doc) => this.matchesFilter(doc, this.activeFilter));
    }

    docs = this.sortDocuments(docs);

    if (this.clearBtn) {
      const hasActiveFilters =
        this.searchQuery.trim().length > 0 || this.activeFilter !== "all";
      this.clearBtn.style.visibility = hasActiveFilters ? "visible" : "hidden";
    }
    if (this.resultCount) {
      this.resultCount.textContent = isSearching
        ? `${docs.length} result${docs.length === 1 ? "" : "s"} for "${this.searchQuery.trim()}"`
        : "";
    }

    if (docs.length === 0) {
      this.docGrid.appendChild(
        createElement(
          "p",
          {
            style:
              "grid-column:1/-1;text-align:center;color:var(--text-light);",
          },
          ["No documents found."],
        ),
      );
      return;
    }
    for (const doc of docs) {
      const primaryType = this.getPrimaryType(doc);
      const typeClass = this.getTypeClass(primaryType);
      const badgeRow = createElement(
        "div",
        { className: "format-badges" },
        (doc.variants || []).map((variant) => {
          const badgeType = this.getTypeClass(variant.fileType).replace(
            "type-",
            "format-badge-",
          );
          return createElement(
            "span",
            { className: `format-badge ${badgeType}` },
            [variant.label],
          );
        }),
      );

      const iconEl = createElement(
        "div",
        { className: `document-icon ${typeClass}` },
        [this.getIcon(primaryType)],
      );

      const metaParts = [];
      if (doc.lastUpdated) metaParts.push(doc.lastUpdated);
      const totalSize = (doc.variants || []).reduce(
        (sum, v) => sum + (v.fileSize || 0),
        0,
      );
      if (totalSize > 0) metaParts.push(this.formatBytes(totalSize));
      const metaRow = metaParts.length
        ? createElement("div", { className: "document-meta" }, [
            metaParts.join(" · "),
          ])
        : null;

      const cardChildren = [
        iconEl,
        createElement("div", { className: "document-name" }, [doc.name]),
        createElement("div", { className: "document-type" }, [
          doc.category || primaryType,
        ]),
      ];
      if (metaRow) cardChildren.push(metaRow);
      cardChildren.push(badgeRow);

      const card = createElement(
        "div",
        {
          className: `card document-card ${typeClass}`,
          onClick: () => this.onDocumentClick(doc),
        },
        cardChildren,
      );
      this.docGrid.appendChild(card);
    }
  }

  // Returns the first image variant of a document, if any, for thumbnail use.
  getImageVariant(doc) {
    const imageTypes = ["jpg", "jpeg", "png", "webp"];
    return (doc.variants || []).find((v) =>
      imageTypes.includes(v.fileType?.toLowerCase()),
    );
  }

  getTypeClass(fileType) {
    const type = fileType?.toLowerCase();
    if (type === "pdf") return "type-pdf";
    if (["jpg", "jpeg", "png", "webp"].includes(type)) return "type-image";
    if (["doc", "docx"].includes(type)) return "type-word";
    if (["xls", "xlsx"].includes(type)) return "type-excel";
    if (type === "zip") return "type-zip";
    return "type-other";
  }

  formatBytes(bytes) {
    if (!bytes || bytes <= 0) return "";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    let val = bytes;
    while (val >= 1024 && i < units.length - 1) {
      val /= 1024;
      i++;
    }
    return `${val.toFixed(val < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
  }

  sortDocuments(docs) {
    const sorted = docs.slice();
    if (this.sortBy === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (this.sortBy === "date") {
      sorted.sort((a, b) =>
        (b.lastUpdated || "").localeCompare(a.lastUpdated || ""),
      );
    } else if (this.sortBy === "type") {
      sorted.sort((a, b) => {
        const ta = this.getPrimaryType(a) || "";
        const tb = this.getPrimaryType(b) || "";
        return ta.localeCompare(tb) || a.name.localeCompare(b.name);
      });
    }
    return sorted;
  }

  // Prefer showing a PDF icon if a PDF variant exists, otherwise the first
  // variant's type, so mixed PDF+Photo documents get a sensible icon.
  getPrimaryType(doc) {
    const types = this.getVariantTypes(doc);
    if (types.includes("pdf")) return "pdf";
    return types[0] || "";
  }

  getIcon(fileType) {
    const type = fileType?.toLowerCase();
    if (type === "pdf") return "📄";
    if (["jpg", "jpeg", "png", "webp"].includes(type)) return "🖼️";
    if (["doc", "docx"].includes(type)) return "📝";
    if (["xls", "xlsx"].includes(type)) return "📊";
    if (type === "zip") return "🗜️";
    return "📁";
  }

  addMobileSupport() {
    const hamburger = createElement(
      "button",
      {
        className: "btn btn-outline",
        style: "display:none;",
        onClick: () => {
          this.sidebar.classList.toggle("open");
        },
      },
      ["☰ Folders"],
    );
    this.main.insertBefore(hamburger, this.main.firstChild);
    if (!document.getElementById("docnest-mobile-style")) {
      const style = document.createElement("style");
      style.id = "docnest-mobile-style";
      style.textContent = `@media (max-width: 768px) { .explorer > .btn-outline { display: inline-flex; } }`;
      document.head.appendChild(style);
    }
  }
}
