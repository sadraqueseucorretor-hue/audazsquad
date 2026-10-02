// Componentes de apresentação compartilhados pelo site público e pelo admin.
import { MATERIAL_TYPES, mapsUrl } from "../domain/catalog.js";

export const escapeHTML = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const money = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

export const date = (v) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Fortaleza" }).format(new Date(v));

export const area = (d) =>
  d.areaMin && d.areaMax ? (d.areaMin === d.areaMax ? `${d.areaMin} m²` : `${d.areaMin} a ${d.areaMax} m²`) : "";

const badge = (status) =>
  `<span class="badge ${status === "Lançamento" ? "launch" : ""}">${escapeHTML(status)}</span>`;

export function price(value) {
  return `<div class="price"><small>A partir de</small><strong>${money(value)}</strong></div>`;
}

/** Carrossel de fotos com setas, pontos e arraste no celular. */
export function carousel(photos, name, base, { eager = false } = {}) {
  if (!photos.length) return `<div class="carousel empty-photo"><span>Fotos em breve</span></div>`;
  const slides = photos
    .map(
      (p, i) =>
        `<img src="${escapeHTML(base + p)}" alt="${escapeHTML(name)} — foto ${i + 1} de ${photos.length}" loading="${eager && i === 0 ? "eager" : "lazy"}" draggable="false">`,
    )
    .join("");
  const controls =
    photos.length > 1
      ? `<button type="button" class="carousel-nav prev" data-step="-1" aria-label="Foto anterior">‹</button>
         <button type="button" class="carousel-nav next" data-step="1" aria-label="Próxima foto">›</button>
         <div class="dots" aria-hidden="true">${photos.map((_, i) => `<span class="${i ? "" : "on"}"></span>`).join("")}</div>`
      : "";
  return `<div class="carousel" data-carousel><div class="slides" tabindex="0" aria-label="Fotos de ${escapeHTML(name)}">${slides}</div>${controls}</div>`;
}

export function propertyCard(d, base = "./") {
  const href = `${base}?empreendimento=${encodeURIComponent(d.id)}`;
  return `<article class="card">
    <div class="photo">${carousel(d.photos, d.name, base)}${badge(d.status)}</div>
    <div class="card-body">
      <span class="builder">${escapeHTML(d.builder)}</span>
      <h3><a href="${href}">${escapeHTML(d.name)}</a></h3>
      <div class="location">${escapeHTML(d.neighborhood)} · ${escapeHTML(d.city)}</div>
      <div class="spec">${[d.typology, area(d)].filter(Boolean).map((s) => `<span>${escapeHTML(s)}</span>`).join("")}</div>
      <div class="card-bottom">${price(d.price)}<a class="action" href="${href}" aria-label="Ver detalhes e materiais de ${escapeHTML(d.name)}">Ver materiais</a></div>
    </div>
  </article>`;
}

const extension = (path) => (path.split(".").pop() || "").toUpperCase();

export function materialCards(d, base = "./") {
  const cards = Object.entries(MATERIAL_TYPES)
    .filter(([kind]) => d.materials[kind])
    .map(
      ([kind, label]) =>
        `<a class="material" href="${escapeHTML(base + d.materials[kind])}" target="_blank" rel="noopener"><div class="doc-icon">${extension(d.materials[kind])}</div><div><strong>${label}</strong><small>Abrir em nova aba</small></div></a>`,
    );
  cards.push(
    `<a class="material" href="${mapsUrl(d)}" target="_blank" rel="noopener noreferrer"><div class="doc-icon">MAPA</div><div><strong>Localização</strong><small>Ver no Google Maps</small></div></a>`,
  );
  return cards.join("");
}

export function brand(logo, base = "./") {
  return logo
    ? `<img class="brand-logo" src="${escapeHTML(base + logo)}" alt="AUDAZ SQUAD">`
    : `<span class="brand-mark">A</span><span>AUDAZ<small>S Q U A D</small></span>`;
}

// Um único ouvinte cuida de todos os carrosséis da página.
export function enableCarousels(root = document) {
  root.addEventListener("click", (e) => {
    const button = e.target.closest(".carousel-nav");
    if (!button) return;
    e.preventDefault();
    const slides = button.parentElement.querySelector(".slides");
    const count = slides.children.length;
    const current = Math.round(slides.scrollLeft / slides.clientWidth);
    const next = (current + Number(button.dataset.step) + count) % count;
    slides.scrollTo({ left: next * slides.clientWidth, behavior: "smooth" });
  });
  root.addEventListener(
    "scroll",
    (e) => {
      const slides = e.target;
      if (!slides.classList?.contains("slides")) return;
      const index = Math.round(slides.scrollLeft / slides.clientWidth);
      slides.parentElement.querySelectorAll(".dots span").forEach((dot, i) => dot.classList.toggle("on", i === index));
    },
    true,
  );
  root.addEventListener("keydown", (e) => {
    if (!e.target.classList?.contains("slides") || !["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    e.preventDefault();
    e.target.parentElement.querySelector(e.key === "ArrowLeft" ? ".prev" : ".next")?.click();
  });
}
