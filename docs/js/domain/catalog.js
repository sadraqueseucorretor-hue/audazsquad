// Domínio: regras do catálogo. Não conhece navegador, GitHub nem HTML.

export const CITIES = ["Fortaleza", "Caucaia", "Maracanaú", "Eusébio"];
export const STATUSES = ["Lançamento", "Em obras", "Pronto para morar"];

// Materiais na ordem em que aparecem para o corretor.
export const MATERIAL_TYPES = {
  book: "Book do empreendimento",
  tabela: "Tabela de preços",
  plantas: "Plantas",
  implantacao: "Implantação",
  memorial: "Memorial descritivo",
  comerciais: "Informações comerciais",
  outros: "Outros materiais",
};

export const MAX_PHOTOS = 15;

export class ValidationError extends Error {}

export function slugify(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function uniqueId(name, existingIds) {
  const base = slugify(name) || "empreendimento";
  let id = base;
  for (let n = 2; existingIds.includes(id); n++) id = `${base}-${n}`;
  return id;
}

const toInt = (v) => Number.parseInt(String(v ?? "").replace(/\D/g, ""), 10) || 0;
const toNumber = (v) => Number(String(v ?? "").replace(",", ".")) || 0;
const text = (v) => String(v ?? "").trim();

/** Cria um empreendimento válido a partir dos campos do formulário. */
export function buildDevelopment(fields, previous = null) {
  const d = {
    id: previous?.id ?? fields.id,
    name: text(fields.name),
    builder: text(fields.builder),
    neighborhood: text(fields.neighborhood),
    city: text(fields.city),
    address: text(fields.address),
    price: toInt(fields.price),
    status: text(fields.status),
    typology: text(fields.typology),
    bedrooms: toInt(fields.bedrooms),
    suites: toInt(fields.suites),
    areaMin: toNumber(fields.areaMin),
    areaMax: toNumber(fields.areaMax),
    parking: toInt(fields.parking),
    towers: toInt(fields.towers),
    units: toInt(fields.units),
    delivery: text(fields.delivery),
    description: text(fields.description),
    photos: previous?.photos ?? [],
    materials: previous?.materials ?? {},
    demo: false,
    updatedAt: new Date().toISOString(),
  };
  validate(d);
  return d;
}

export function validate(d) {
  if (d.name.length < 2) throw new ValidationError("Informe o nome do empreendimento.");
  if (!CITIES.includes(d.city))
    throw new ValidationError("Escolha Fortaleza, Caucaia, Maracanaú ou Eusébio.");
  if (!STATUSES.includes(d.status)) throw new ValidationError("Escolha o status da obra.");
  if (d.price <= 0) throw new ValidationError("Informe o valor a partir de.");
  if (d.areaMin && d.areaMax && d.areaMax < d.areaMin)
    throw new ValidationError("A metragem máxima não pode ser menor que a mínima.");
  if (d.suites > d.bedrooms)
    throw new ValidationError("O número de suítes não pode passar o de quartos.");
  if (d.photos.length > MAX_PHOTOS)
    throw new ValidationError(`Limite de ${MAX_PHOTOS} fotos por empreendimento.`);
}

/** Arquivos usados por um empreendimento (fotos e materiais). */
export function filesOf(d) {
  return [...d.photos, ...Object.values(d.materials)];
}

/** Arquivos que podem ser apagados sem afetar outros empreendimentos. */
export function orphanFiles(candidates, developments) {
  const inUse = new Set(developments.flatMap(filesOf));
  return candidates.filter((path) => path.startsWith("content/") && !inUse.has(path));
}

export function mapsUrl(d) {
  const query = `${d.address || d.neighborhood}, ${d.city}, Ceará`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function search(developments, { q = "", city = "", builder = "", status = "" }) {
  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const term = norm(q.trim());
  return developments.filter(
    (d) =>
      norm(`${d.name} ${d.neighborhood} ${d.builder}`).includes(term) &&
      (!city || d.city === city) &&
      (!builder || d.builder === builder) &&
      (!status || d.status === status),
  );
}
