# docnest
DocNest - Simple, self-hosted family document management system. Organize and access important documents for multiple family members. No server needed - runs on GitHub Pages!


# docnest
DocNest - Simple, self-hosted family document management system. Organize and access important documents for multiple family members. No server needed - runs on GitHub Pages!

## Workflow Commands

### Adding new documents
```bash
# 1. Copy new files into files/<person>/... folder

# 2. Preview what will be added (no changes written)
node scan-docs.js --dry-run --verbose

# 3. Actually scan and update the person's JSON file
node scan-docs.js

# (optional) scan only one person
node scan-docs.js --person=gaurav
```

### Backfill file sizes (one-time / after manual JSON edits)
```bash
node backfill-filesize.js --dry-run   # preview
node backfill-filesize.js             # apply
```

### Push changes to GitHub
```bash
git status                  # see what changed
git add .
git commit -m "docs: add new documents"
git push
git push -u origin main --force
```

### Full "added new documents" flow, start to finish
```bash
node scan-docs.js --dry-run --verbose
node scan-docs.js
git add .
git commit -m "docs: add new documents"
git push
```