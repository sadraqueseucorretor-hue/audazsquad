// Site público: catálogo, valores e materiais. Não exige login.
import { CITIES, search } from "./domain/catalog.js";
import { loadSiteContent } from "./infrastructure/site-content.js";
import {
  area,
  brand,
  carousel,
  enableCarousels,
  escapeHTML,
  materialCards,
  price,
  propertyCard,
} from "./ui/components.js";

const main = document.querySelector("main");
const { developments, site } = await loadSiteContent();
document.querySelectorAll("[data-brand]").forEach((el) => (el.innerHTML = brand(site.logo)));
enableCarousels();

const id = new URLSearchParams(location.search).get("empreendimento");
if (id) {
  const d = developments.find((x) => x.id === id);
  d ? detail(d) : notFound();
} else {
  home();
}

function options(values, label, key) {
  return `<select data-filter="${key}" aria-label="Filtrar por ${label}"><option value="">${label}</option>${values
    .map((v) => `<option>${escapeHTML(v)}</option>`)
    .join("")}</select>`;
}

function home() {
  const uniq = (key) => [...new Set(developments.map((d) => d[key]))].sort();
  main.innerHTML = `
    <section class="intro">
      <div class="eyebrow">Seu próximo negócio começa aqui</div>
      <h1>Central de Empreendimentos</h1>
      <p>Encontre o imóvel, veja os valores e acesse os materiais.</p>
      <label class="search"><span aria-hidden="true">⌕</span><input data-filter="q" type="search" placeholder="Busque por empreendimento, bairro ou construtora" aria-label="Buscar"></label>
    </section>
    <div class="container">
      <div class="filters">
        <span class="filter-label">Filtrar por</span>
        ${options(CITIES.filter((c) => uniq("city").includes(c)), "Cidade", "city")}
        ${options(uniq("builder"), "Construtora", "builder")}
        ${options(uniq("status"), "Status", "status")}
        <button class="clear" type="button" hidden>Limpar filtros</button>
      </div>
      <section id="catalogo">
        <div class="section-heading"><h2>Empreendimentos</h2><span class="count" role="status" aria-live="polite"></span></div>
        <div class="grid"></div>
      </section>
      ${developments.some((d) => d.demo) ? `<p class="demo">Itens marcados como ilustrativos usam dados e imagens de exemplo.</p>` : ""}
    </div>`;
  const controls = [...main.querySelectorAll("[data-filter]")];
  const clear = main.querySelector(".clear");
  const update = () => {
    const filters = Object.fromEntries(controls.map((c) => [c.dataset.filter, c.value]));
    const items = search(developments, filters);
    main.querySelector(".count").textContent = `${items.length} ${items.length === 1 ? "empreendimento" : "empreendimentos"}`;
    main.querySelector(".grid").innerHTML = items.length
      ? items.map((d) => propertyCard(d)).join("")
      : `<div class="empty"><h3>Nenhum empreendimento encontrado</h3><p>Tente outro nome ou limpe os filtros.</p></div>`;
    clear.hidden = !controls.some((c) => c.value);
  };
  controls.forEach((c) => c.addEventListener(c.tagName === "INPUT" ? "input" : "change", update));
  clear.addEventListener("click", () => {
    controls.forEach((c) => (c.value = ""));
    update();
  });
  update();
}

function detail(d) {
  document.title = `${d.name} — AUDAZ SQUAD`;
  const facts = [
    ["Endereço", d.address, "wide"],
    ["Tipologia", d.typology],
    ["Quartos", d.bedrooms],
    ["Suítes", d.suites],
    ["Metragem", area(d)],
    ["Vagas", d.parking],
    ["Torres", d.towers],
    ["Unidades", d.units],
    ["Entrega", d.delivery],
  ].filter(([, v]) => v !== "" && v !== null && v !== undefined);
  main.innerHTML = `<div class="container">
    <a class="back" href="./">← Voltar aos empreendimentos</a>
    <section class="detail-hero">
      <div class="photo">${carousel(d.photos, d.name, "./", { eager: true })}</div>
      <div class="detail-heading">
        <span class="badge ${d.status === "Lançamento" ? "launch" : ""}">${escapeHTML(d.status)}</span>
        <h1>${escapeHTML(d.name)}</h1>
        <p>${escapeHTML(d.builder)}</p>
        <p class="location">${escapeHTML(d.neighborhood)} · ${escapeHTML(d.city)}</p>
        ${price(d.price)}
      </div>
    </section>
    ${d.description ? `<section class="info"><h2>Sobre</h2><p class="description">${escapeHTML(d.description)}</p></section>` : ""}
    <section class="info"><h2>O empreendimento</h2><div class="facts">${facts
      .map(([label, value, cls = ""]) => `<div class="fact ${cls}"><small>${label}</small><strong>${escapeHTML(value)}</strong></div>`)
      .join("")}</div></section>
    <section class="materials" id="materiais"><div class="section-heading"><h2>Materiais</h2></div><div class="material-grid">${materialCards(d)}</div></section>
    ${d.demo ? `<p class="demo">Empreendimento ilustrativo: dados, fotos e arquivos de exemplo.</p>` : ""}
  </div>`;
  if (location.hash === "#materiais") requestAnimationFrame(() => document.getElementById("materiais").scrollIntoView());
}

function notFound() {
  document.title = "Empreendimento não encontrado — AUDAZ SQUAD";
  main.innerHTML = `<div class="container"><div class="empty"><h1>Empreendimento não encontrado</h1><p>O link pode ter mudado.</p><a class="action" href="./">Ver empreendimentos</a></div></div>`;
}
