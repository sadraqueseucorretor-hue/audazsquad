// Leitura pública do conteúdo publicado (sem login).
export async function loadSiteContent(base = "./") {
  const get = (path, fallback) =>
    fetch(base + path, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : fallback))
      .catch(() => fallback);
  const [catalog, site] = await Promise.all([
    get("content/catalog.json", { developments: [] }),
    get("content/site.json", { logo: null }),
  ]);
  return { developments: catalog.developments ?? [], site };
}
