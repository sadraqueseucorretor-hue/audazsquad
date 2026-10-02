// Painel do administrador. Só quem tem permissão de escrita no repositório consegue salvar.
import { AdminService } from "./application/admin-service.js";
import { CITIES, MATERIAL_TYPES, MAX_PHOTOS, STATUSES } from "./domain/catalog.js";
import { repositoryConfig } from "./config.js";
import { browserMedia } from "./infrastructure/browser-media.js";
import { AuthError, GitHubContentRepository } from "./infrastructure/github-repository.js";
import { brand, escapeHTML, money } from "./ui/components.js";

const BASE = "../";
const TOKEN_KEY = "audaz_admin_token";
const main = document.querySelector("main");
let service = null;
let tab = "catalog";
let flash = null; // { type, text } exibido uma vez no próximo render

const storage = {
  get: () => {
    try {
      return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token, remember) => {
    try {
      (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
    } catch {}
  },
  clear: () => {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
  },
};

const notice = (n) => (n ? `<p class="notice ${n.type}" role="${n.type === "error" ? "alert" : "status"}">${escapeHTML(n.text)}</p>` : "");
const takeFlash = () => {
  const n = flash;
  flash = null;
  return notice(n);
};

function setBrand() {
  document.querySelectorAll("[data-brand]").forEach((el) => (el.innerHTML = brand(service?.site.logo, BASE)));
}

async function start(token, remember) {
  service = new AdminService(new GitHubContentRepository({ ...repositoryConfig, token }), browserMedia);
  await service.repository.verify();
  await service.load();
  if (remember !== undefined) storage.set(token, remember);
  setBrand();
  renderDashboard();
}

function logout(message) {
  storage.clear();
  service = null;
  flash = message ? { type: "error", text: message } : null;
  renderLogin();
}

async function guard(action) {
  try {
    await action();
  } catch (error) {
    if (error instanceof AuthError) return logout(error.message);
    throw error;
  }
}

// ---------- Entrar ----------
function renderLogin() {
  document.querySelector("[data-logout]").hidden = true;
  main.innerHTML = `<div class="container"><form class="admin-box" id="login">
    <span class="eyebrow">Área do administrador</span>
    <h1>Entrar</h1>
    ${takeFlash()}
    <p class="muted">O admin grava direto no repositório <strong>${escapeHTML(repositoryConfig.owner)}/${escapeHTML(repositoryConfig.repo)}</strong>. Entre com a sua chave de acesso do GitHub.</p>
    <label>Chave de acesso do GitHub
      <input type="password" name="token" autocomplete="off" required placeholder="github_pat_…">
    </label>
    <label class="checkbox"><input type="checkbox" name="remember"> Manter conectado neste computador</label>
    <div class="form-actions"><button class="button">Entrar</button></div>
    <details><summary class="muted">Como criar a chave (uma vez só)</summary>
      <ol class="steps">
        <li>Abra <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com/settings/personal-access-tokens/new</a>.</li>
        <li>Nome: <em>Admin AUDAZ</em>. Validade: a que preferir.</li>
        <li>Em <em>Repository access</em>, escolha <em>Only select repositories</em> → <em>${escapeHTML(repositoryConfig.repo)}</em>.</li>
        <li>Em <em>Permissions</em> → <em>Contents</em>, escolha <em>Read and write</em>.</li>
        <li>Clique em <em>Generate token</em> e cole a chave aqui.</li>
      </ol>
    </details>
  </form></div>`;
  main.querySelector("#login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const button = form.querySelector("button");
    button.disabled = true;
    button.textContent = "Conferindo…";
    try {
      await start(form.token.value.trim(), form.remember.checked);
    } catch (error) {
      flash = { type: "error", text: error.message };
      renderLogin();
    }
  });
}

// ---------- Painel ----------
function renderDashboard() {
  document.querySelector("[data-logout]").hidden = false;
  main.innerHTML = `<div class="container">
    <span class="eyebrow">Área do administrador</span>
    <div class="section-heading"><h1>Administração</h1><a class="button outline" href="${BASE}" target="_blank" rel="noopener">Ver site público</a></div>
    <div class="tabs" role="tablist">
      <button role="tab" data-tab="catalog" class="${tab === "catalog" ? "selected" : ""}">Empreendimentos</button>
      <button role="tab" data-tab="logo" class="${tab === "logo" ? "selected" : ""}">Logo</button>
    </div>
    ${takeFlash()}
    <div id="view"></div>
  </div>`;
  main.querySelectorAll("[data-tab]").forEach((b) =>
    b.addEventListener("click", () => {
      tab = b.dataset.tab;
      renderDashboard();
    }),
  );
  tab === "logo" ? renderLogo() : renderList();
}

function renderList() {
  const view = main.querySelector("#view");
  const list = service.developments;
  view.innerHTML = `<div class="section-heading"><h2>Empreendimentos <span class="count">(${list.length})</span></h2><button class="button" id="new">+ Novo empreendimento</button></div>
    <div class="admin-list">${
      list
        .map(
          (d) => `<article class="admin-row">
        ${d.photos[0] ? `<img src="${escapeHTML(BASE + d.photos[0])}" alt="">` : `<span class="thumb"></span>`}
        <div class="grow"><strong>${escapeHTML(d.name)}</strong><small>${escapeHTML(d.neighborhood)} · ${escapeHTML(d.city)} · ${d.photos.length} foto(s)${d.materials.book ? " · book" : ""}</small></div>
        <span class="row-price">${money(d.price)}</span>
        <span class="row-actions"><button class="button small outline" data-edit="${escapeHTML(d.id)}">Editar</button><button class="button small danger" data-delete="${escapeHTML(d.id)}">Excluir</button></span>
      </article>`,
        )
        .join("") || `<p class="empty">Nenhum empreendimento ainda. Clique em “Novo empreendimento”.</p>`
    }</div>`;
  view.querySelector("#new").addEventListener("click", () => renderEditor(null));
  view.querySelectorAll("[data-edit]").forEach((b) =>
    b.addEventListener("click", () => renderEditor(service.developments.find((d) => d.id === b.dataset.edit))),
  );
  view.querySelectorAll("[data-delete]").forEach((b) =>
    b.addEventListener("click", async () => {
      const d = service.developments.find((x) => x.id === b.dataset.delete);
      if (!confirm(`Excluir “${d.name}” do site? As fotos e arquivos dele também serão apagados.`)) return;
      b.disabled = true;
      b.textContent = "Excluindo…";
      await guard(async () => {
        try {
          await service.deleteDevelopment(d.id);
          flash = { type: "success", text: `“${d.name}” foi excluído. O link atualiza em cerca de 1 minuto.` };
        } catch (error) {
          flash = { type: "error", text: error.message };
        }
        renderDashboard();
      });
    }),
  );
}

// ---------- Cadastro / edição ----------
function field(name, label, value, { type = "text", cls = "", attrs = "" } = {}) {
  return `<label class="${cls}">${label}<input type="${type}" name="${name}" value="${escapeHTML(value ?? "")}" ${attrs}></label>`;
}
function select(name, label, values, current) {
  return `<label>${label}<select name="${name}" required><option value="">Selecione</option>${values
    .map((v) => `<option ${v === current ? "selected" : ""}>${escapeHTML(v)}</option>`)
    .join("")}</select></label>`;
}

function renderEditor(dev) {
  const draft = { newPhotos: [], removedPhotos: new Set(), materialUploads: {}, removedMaterials: new Set() };
  const view = main.querySelector("#view");
  const d = dev ?? { photos: [], materials: {} };
  view.innerHTML = `<form id="editor" novalidate>
    <div class="section-heading"><h2>${dev ? `Editar ${escapeHTML(dev.name)}` : "Novo empreendimento"}</h2><button type="button" class="button outline" id="cancel">Voltar</button></div>
    <div id="editor-notice"></div>
    <section class="panel"><h3>Dados</h3>
      <div class="form-grid">
        ${field("name", "Nome do empreendimento *", d.name, { cls: "span-2", attrs: "required maxlength=120" })}
        ${field("builder", "Construtora", d.builder, { attrs: "maxlength=120" })}
        ${select("city", "Cidade *", CITIES, d.city)}
        ${field("neighborhood", "Bairro", d.neighborhood, { attrs: "maxlength=120" })}
        ${select("status", "Status *", STATUSES, d.status)}
        ${field("address", "Endereço / localização", d.address, { cls: "span-2", attrs: "maxlength=300" })}
        ${field("price", "Valor a partir de (R$) *", d.price ? d.price.toLocaleString("pt-BR") : "", { attrs: 'inputmode="numeric" required placeholder="259.000"' })}
        ${field("typology", "Tipologia", d.typology, { attrs: 'placeholder="2 quartos com suíte"' })}
        ${field("bedrooms", "Quartos", d.bedrooms, { type: "number", attrs: "min=0 max=30" })}
        ${field("suites", "Suítes", d.suites, { type: "number", attrs: "min=0 max=30" })}
        ${field("areaMin", "Metragem mínima (m²)", d.areaMin, { type: "number", attrs: "min=0 step=0.01" })}
        ${field("areaMax", "Metragem máxima (m²)", d.areaMax, { type: "number", attrs: "min=0 step=0.01" })}
        ${field("parking", "Vagas", d.parking, { type: "number", attrs: "min=0" })}
        ${field("towers", "Torres", d.towers, { type: "number", attrs: "min=0" })}
        ${field("units", "Unidades", d.units, { type: "number", attrs: "min=0" })}
        ${field("delivery", "Entrega", d.delivery, { attrs: 'placeholder="Dezembro/2028"' })}
        <label class="span-3">Descrição<textarea name="description" maxlength="5000">${escapeHTML(d.description ?? "")}</textarea></label>
      </div>
    </section>
    <section class="panel"><h3>Fotos do carrossel</h3>
      <p class="muted">A primeira foto é a capa. Até ${MAX_PHOTOS} fotos; elas são reduzidas automaticamente antes do envio.</p>
      <span class="button outline file-pick">+ Adicionar fotos<input type="file" id="photos" accept="image/jpeg,image/png,image/webp" multiple></span>
      <div class="photo-grid" id="photo-grid"></div>
    </section>
    <section class="panel"><h3>Book e materiais (PDF)</h3><div id="materials"></div></section>
    <div class="form-actions"><button type="button" class="button outline" id="cancel2">Cancelar</button><button class="button" id="save">Salvar e publicar</button></div>
  </form>`;

  const form = view.querySelector("#editor");
  const back = () => renderDashboard();
  view.querySelector("#cancel").addEventListener("click", back);
  view.querySelector("#cancel2").addEventListener("click", back);

  const drawPhotos = () => {
    const existing = d.photos.filter((p) => !draft.removedPhotos.has(p));
    view.querySelector("#photo-grid").innerHTML =
      existing.map((p) => `<div class="photo-tile"><img src="${escapeHTML(BASE + p)}" alt=""><button type="button" data-remove-photo="${escapeHTML(p)}" aria-label="Remover foto">×</button></div>`).join("") +
      draft.newPhotos.map((p, i) => `<div class="photo-tile pending" title="Nova — será enviada ao salvar"><img src="${p.url}" alt=""><button type="button" data-remove-new="${i}" aria-label="Remover foto nova">×</button></div>`).join("");
  };
  view.querySelector("#photo-grid").addEventListener("click", (e) => {
    const old = e.target.closest("[data-remove-photo]");
    const fresh = e.target.closest("[data-remove-new]");
    if (old) draft.removedPhotos.add(old.dataset.removePhoto);
    if (fresh) {
      const [removed] = draft.newPhotos.splice(Number(fresh.dataset.removeNew), 1);
      URL.revokeObjectURL(removed.url);
    }
    drawPhotos();
  });
  view.querySelector("#photos").addEventListener("change", (e) => {
    for (const file of e.target.files) draft.newPhotos.push({ file, url: URL.createObjectURL(file) });
    e.target.value = "";
    drawPhotos();
  });

  const drawMaterials = () => {
    view.querySelector("#materials").innerHTML = Object.entries(MATERIAL_TYPES)
      .map(([kind, label]) => {
        const current = !draft.removedMaterials.has(kind) && d.materials[kind];
        const pending = draft.materialUploads[kind];
        const status = pending
          ? `<small>Novo: ${escapeHTML(pending.name)} (enviado ao salvar)</small>`
          : current
            ? `<a href="${escapeHTML(BASE + current)}" target="_blank" rel="noopener">Ver arquivo atual</a>`
            : `<small class="muted">Nenhum arquivo</small>`;
        return `<div class="file-row"><div class="grow"><strong>${label}</strong><br>${status}</div>
          <span class="button small outline file-pick">${current || pending ? "Trocar PDF" : "Enviar PDF"}<input type="file" accept="application/pdf,.pdf" data-material="${kind}"></span>
          ${current || pending ? `<button type="button" class="button small danger" data-clear="${kind}">Remover</button>` : ""}</div>`;
      })
      .join("");
  };
  view.querySelector("#materials").addEventListener("change", (e) => {
    const kind = e.target.dataset.material;
    if (kind && e.target.files[0]) draft.materialUploads[kind] = e.target.files[0];
    drawMaterials();
  });
  view.querySelector("#materials").addEventListener("click", (e) => {
    const kind = e.target.closest("[data-clear]")?.dataset.clear;
    if (!kind) return;
    delete draft.materialUploads[kind];
    if (d.materials[kind]) draft.removedMaterials.add(kind);
    drawMaterials();
  });
  drawPhotos();
  drawMaterials();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const box = view.querySelector("#editor-notice");
    const save = view.querySelector("#save");
    save.disabled = true;
    save.textContent = "Enviando…";
    box.innerHTML = notice({ type: "info", text: "Enviando fotos e arquivos para o GitHub. Não feche a página." });
    await guard(async () => {
      try {
        const saved = await service.saveDevelopment({
          id: dev?.id,
          fields: Object.fromEntries(new FormData(form)),
          newPhotos: draft.newPhotos.map((p) => p.file),
          removedPhotos: [...draft.removedPhotos],
          materialUploads: draft.materialUploads,
          removedMaterials: [...draft.removedMaterials],
        });
        draft.newPhotos.forEach((p) => URL.revokeObjectURL(p.url));
        flash = { type: "success", text: `“${saved.name}” salvo! O link público atualiza em cerca de 1 minuto.` };
        renderDashboard();
      } catch (error) {
        box.innerHTML = notice({ type: "error", text: error.message });
        box.scrollIntoView({ behavior: "smooth", block: "center" });
        save.disabled = false;
        save.textContent = "Salvar e publicar";
      }
    });
  });
}

// ---------- Logo ----------
function renderLogo() {
  const view = main.querySelector("#view");
  const logo = service.site.logo;
  view.innerHTML = `<section class="panel"><h3>Logo da AUDAZ SQUAD</h3>
    <p class="muted">Aparece no topo do site. Use PNG com fundo transparente, JPG ou WebP.</p>
    <div id="logo-notice"></div>
    <div class="logo-preview">${logo ? `<img src="${escapeHTML(BASE + logo)}" alt="Logo atual">` : `<span class="muted">Nenhuma logo enviada. O site mostra o nome em texto.</span>`}</div>
    <div class="form-actions">
      ${logo ? `<button type="button" class="button danger" id="remove-logo">Remover logo</button>` : ""}
      <span class="button file-pick">${logo ? "Trocar logo" : "Enviar logo"}<input type="file" id="logo-file" accept="image/png,image/jpeg,image/webp"></span>
    </div></section>`;
  const run = async (action, success) => {
    view.querySelector("#logo-notice").innerHTML = notice({ type: "info", text: "Enviando…" });
    await guard(async () => {
      try {
        await action();
        setBrand();
        flash = { type: "success", text: success };
        renderDashboard();
      } catch (error) {
        view.querySelector("#logo-notice").innerHTML = notice({ type: "error", text: error.message });
      }
    });
  };
  view.querySelector("#logo-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) run(() => service.setLogo(file), "Logo atualizada! O link público atualiza em cerca de 1 minuto.");
  });
  view.querySelector("#remove-logo")?.addEventListener("click", () => {
    if (confirm("Remover a logo do site?")) run(() => service.removeLogo(), "Logo removida.");
  });
}

document.querySelector("[data-logout]").addEventListener("click", () => logout());
const saved = storage.get();
if (saved) {
  main.innerHTML = `<div class="container loading">Conectando…</div>`;
  start(saved).catch((error) => logout(error instanceof AuthError ? error.message : `Não foi possível conectar: ${error.message}`));
} else {
  renderLogin();
}
