export async function loadConfig() {
  const resp = await fetch("config.json", { cache: "no-store" });
  if (!resp.ok)
    throw new Error("Failed to load config.json (" + resp.status + ")");
  return resp.json();
}

// Reads config.persons[*].documentsFile and merges each person's own JSON
// file into a single flat array, instead of one monolithic documents.json.
export async function loadDocuments(config) {
  const persons = Object.values(config.persons || {});
  const allDocs = [];

  await Promise.all(
    persons.map(async (person) => {
      if (!person.documentsFile) return;
      const resp = await fetch(person.documentsFile, { cache: "no-store" });
      if (!resp.ok) {
        throw new Error(
          `Failed to load ${person.documentsFile} (${resp.status})`,
        );
      }
      const docs = await resp.json();
      allDocs.push(...docs);
    }),
  );

  return allDocs;
}
