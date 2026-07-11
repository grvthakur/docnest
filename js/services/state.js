export class State {
  constructor() {
    this.config = null;
    this.documents = [];
    this.currentUser = null;
    this.folderTrees = {};
    this.documentsByFolder = {};
  }

  setConfig(config) {
    this.config = config;
  }

  setDocuments(docs) {
    this.documents = docs;
    this._buildStructures();
  }

  setCurrentUser(user) {
    this.currentUser = user;
  }

  clearCurrentUser() {
    this.currentUser = null;
  }

  canAccessPerson(personId) {
    if (!this.currentUser) return false;
    return this.currentUser.permissions.includes(personId);
  }

  getAccessiblePersons() {
    if (!this.currentUser) return [];
    return this.currentUser.permissions
      .map((pid) => this.config.persons[pid])
      .filter(Boolean);
  }

  _buildStructures() {
    this.folderTrees = {};
    this.documentsByFolder = {};
    const folderPaths = new Set();
    for (const doc of this.documents) {
      if (!doc.folderPath) continue;
      folderPaths.add(doc.folderPath);
    }
    const trees = {};
    for (const path of folderPaths) {
      const parts = path.split("/");
      const personId = parts[0];
      if (!trees[personId]) trees[personId] = [];
      this._addPathToTree(trees[personId], parts.slice(1));
    }
    for (const personId in trees) {
      this.folderTrees[personId] = trees[personId].map((node) =>
        this._nodeFromPathParts(personId, node, ""),
      );
    }

    // Index documents by their EXACT folderPath first (case/slash normalized).
    const exactByFolder = {};
    for (const doc of this.documents) {
      const key = this._normalizePath(doc.folderPath || "/");
      if (!exactByFolder[key]) exactByFolder[key] = [];
      exactByFolder[key].push(doc);
    }

    // Root cause of the "empty folder" bug: a folder like "gaurav/Job/TCS"
    // that only contains sub-folders (no documents with that EXACT
    // folderPath) previously showed zero documents, even though its
    // descendant folders had files. Aggregate recursively so every folder
    // shows all documents nested anywhere beneath it.
    this.documentsByFolder = {};
    for (const key in exactByFolder) {
      for (const doc of exactByFolder[key]) {
        for (const ancestor of this._ancestorKeys(key)) {
          if (!this.documentsByFolder[ancestor])
            this.documentsByFolder[ancestor] = [];
          this.documentsByFolder[ancestor].push(doc);
        }
      }
    }

    // Attach recursive document counts to every tree node.
    for (const personId in this.folderTrees) {
      for (const node of this.folderTrees[personId]) {
        this._attachCounts(node);
      }
    }
  }

  // Normalizes a folderPath so trailing slashes / accidental case
  // differences don't cause silent lookup misses.
  _normalizePath(path) {
    return path.replace(/\\/g, "/").replace(/\/+$/, "");
  }

  // Returns every ancestor key (inclusive) for a normalized folder path,
  // e.g. "gaurav/Job/TCS/Salary Slips" ->
  // ["gaurav", "gaurav/Job", "gaurav/Job/TCS", "gaurav/Job/TCS/Salary Slips"]
  _ancestorKeys(key) {
    const parts = key.split("/");
    const keys = [];
    let acc = "";
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      keys.push(acc);
    }
    return keys;
  }

  _attachCounts(node) {
    for (const child of node.children) this._attachCounts(child);
    node.count = (this.documentsByFolder[node.path] || []).length;
  }

  _addPathToTree(tree, parts) {
    if (parts.length === 0) return;
    let current = tree;
    for (const part of parts) {
      let node = current.find((n) => n.name === part);
      if (!node) {
        node = { name: part, children: [] };
        current.push(node);
      }
      current = node.children;
    }
  }

  _nodeFromPathParts(personId, node, parentPath) {
    const path = parentPath
      ? `${parentPath}/${node.name}`
      : `${personId}/${node.name}`;
    return {
      id: path,
      name: node.name,
      personId,
      path,
      children: node.children.map((child) =>
        this._nodeFromPathParts(personId, child, path),
      ),
    };
  }

  getFolderTree(personId) {
    return this.folderTrees[personId] || [];
  }

  getDocumentsInFolder(folderId) {
    return this.documentsByFolder[folderId] || [];
  }

  // Returns every document under a person, ignoring any sub-folder/category
  // structure. Used for "flat" persons (e.g. Mummy, Papa) where the UI shows
  // one combined grid instead of a folder tree.
  getDocumentsForPerson(personId) {
    return this.documents.filter((doc) => {
      if (!doc.folderPath) return false;
      const root = doc.folderPath.split("/")[0];
      return root === personId;
    });
  }

  // Returns { count, lastUpdated } for a person, used for dashboard badges.
  getPersonStats(personId) {
    const docs = this.getDocumentsForPerson(personId);
    let lastUpdated = null;
    for (const doc of docs) {
      if (doc.lastUpdated && (!lastUpdated || doc.lastUpdated > lastUpdated)) {
        lastUpdated = doc.lastUpdated;
      }
    }
    return { count: docs.length, lastUpdated };
  }

  isFlatPerson(personId) {
    const person = this.config?.persons?.[personId];
    return person?.type === "flat";
  }

  searchDocuments(query, personIds = null) {
    const q = query.toLowerCase();
    let allowed = this.documents;
    if (personIds) {
      allowed = allowed.filter((doc) =>
        personIds.includes(doc.folderPath.split("/")[0]),
      );
    }
    return allowed.filter(
      (doc) =>
        doc.name.toLowerCase().includes(q) ||
        (doc.tags && doc.tags.some((t) => t.toLowerCase().includes(q))) ||
        (doc.category && doc.category.toLowerCase().includes(q)),
    );
  }
}
