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
    this.sortBy = "name";
    this.listView = false;
    this.filtersOpen = false;
    this.expandedFolders = new Set();
  }

  setPerson(personId, folderPath = "") {
    this.currentPersonId = personId;
    this.isFlat = this.state.isFlatPerson(personId);
    this.currentFolderId = folderPath ? `${personId}/${folderPath}` : personId;
    this.searchQuery = "";
    this.activeFilter = "all";
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
      this.sidebar = null;
      this.renderFlatHeader();
    } else {
      this.sidebar = createElement("div", { className: "sidebar" });
      this.renderSidebar();
      this.container.appendChild(this.sidebar);
      this.addMobileSupport();
      this.renderBreadcrumb();
    }

    this.docGrid = null;
    this.toolbar = null;
    this.resultCount = null;
    this.renderToolbar();
    this.docGrid = createElement("div", {
      className: `documents-grid ${this.listView ? "list-view" : ""}`,
    });
    this.main.appendChild(this.docGrid);
    this.container.appendChild(this.main);

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

    const closeSidebarBtn = createElement(
      "button",
      {
        className: "btn btn-outline sidebar-close-btn",
        onClick: () => this.sidebar.classList.remove("open"),
      },
      ["✕ Close folders"],
    );
    this.sidebar.appendChild(closeSidebarBtn);

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
          onClick: () => {
            this.onNavigate(
              this.currentPersonId,
              node.path.split("/").slice(1).join("/"),
            );
            if (this.sidebar) this.sidebar.classList.remove("open");
          },
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
        ["← Back to folders"],
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
    if (this.resultCount && this.resultCount.parentNode) {
      this.resultCount.parentNode.removeChild(this.resultCount);
    }

    this.toolbar = createElement("div", {
      className: `toolbar ${this.filtersOpen ? "filters-open" : ""}`,
    });

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

    const filtersToggle = createElement(
      "button",
      {
        className: "btn btn-outline filters-toggle-btn",
        onClick: () => {
          this.filtersOpen = !this.filtersOpen;
          this.renderToolbar();
        },
      },
      [this.filtersOpen ? "▲ Hide filters" : "▼ Filters"],
    );

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
      title: "Sort documents",
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

    const viewToggle = createElement(
      "button",
      {
        className: "btn btn-outline view-toggle-btn",
        title: this.listView ? "Switch to grid view" : "Switch to list view",
        "aria-label": this.listView
          ? "Switch to grid view"
          : "Switch to list view",
        onClick: () => {
          this.listView = !this.listView;
          if (this.docGrid) {
            this.docGrid.classList.toggle("list-view", this.listView);
          }
          this.renderToolbar();
        },
      },
      [this.listView ? "⊞ Grid" : "☰ List"],
    );

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
      viewToggle,
      filterGroup,
      clearBtn,
    ]);

    this.toolbar.append(search, filtersToggle, toolbarRight);
    this.resultCount = createElement("div", { className: "result-count" });

    if (this.docGrid && this.docGrid.parentNode === this.main) {
      this.main.insertBefore(this.toolbar, this.docGrid);
      this.main.insertBefore(this.resultCount, this.docGrid);
    } else {
      this.main.appendChild(this.toolbar);
      this.main.appendChild(this.resultCount);
    }

    this.updateResultCount();
  }

  updateResultCount() {
    if (!this.resultCount) return;
    const isSearching = this.searchQuery.trim().length > 0;
    const docs = this.getFilteredDocs();
    this.resultCount.textContent = isSearching
      ? `${docs.length} result${docs.length === 1 ? "" : "s"} for "${this.searchQuery.trim()}"`
      : "";
  }

  getFilteredDocs() {
    const isSearching = this.searchQuery.trim().length > 0;
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
    return docs;
  }

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
    const docs = this.sortDocuments(this.getFilteredDocs());

    if (this.clearBtn) {
      const hasActiveFilters =
        this.searchQuery.trim().length > 0 || this.activeFilter !== "all";
      this.clearBtn.style.visibility = hasActiveFilters ? "visible" : "hidden";
    }
    this.updateResultCount();

    if (docs.length === 0) {
      const isFiltered =
        this.searchQuery.trim().length > 0 || this.activeFilter !== "all";
      this.docGrid.appendChild(
        createElement("div", { className: "empty-state" }, [
          createElement("div", { className: "empty-state-icon" }, [
            isFiltered ? "🔍" : "📂",
          ]),
          createElement("p", { className: "empty-state-title" }, [
            isFiltered ? "No matching documents" : "This folder is empty",
          ]),
          createElement("p", { className: "empty-state-sub" }, [
            isFiltered
              ? "Try a different search term or clear filters."
              : "No documents have been added here yet.",
          ]),
        ]),
      );
      return;
    }
    docs.forEach((doc, index) => {
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

      const firstVariant = (doc.variants || [])[0];
      const actions = createElement("div", { className: "doc-actions" }, [
        createElement(
          "span",
          {
            className: "doc-action-btn",
            title: "Preview",
            "aria-label": "Preview",
            onClick: (e) => {
              e.stopPropagation();
              this.onDocumentClick(doc);
            },
          },
          ["👁"],
        ),
        createElement(
          "a",
          {
            className: "doc-action-btn",
            title: "Download",
            "aria-label": "Download",
            href: firstVariant ? firstVariant.filePath : "#",
            download: firstVariant
              ? firstVariant.filePath.split("/").pop()
              : "",
            onClick: (e) => e.stopPropagation(),
          },
          ["⬇"],
        ),
      ]);

      const cardChildren = [
        actions,
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
          style: `--i:${index};`,
          onClick: () => this.onDocumentClick(doc),
        },
        cardChildren,
      );
      this.docGrid.appendChild(card);
    });
  }

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
        className: "btn btn-outline mobile-menu-btn",
        title: "Show folders",
        onClick: () => {
          this.sidebar.classList.toggle("open");
        },
      },
      ["☰ Folders"],
    );
    this.main.insertBefore(hamburger, this.main.firstChild);
  }
}