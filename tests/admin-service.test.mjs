// Testes do domínio e dos casos de uso do admin. Rode com: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { AdminService, ConflictError } from "../docs/js/application/admin-service.js";
import { ValidationError, buildDevelopment, orphanFiles, search, uniqueId } from "../docs/js/domain/catalog.js";

const fields = {
  name: "Reserva Teste",
  builder: "Direcional",
  city: "Caucaia",
  neighborhood: "Centro",
  status: "Em obras",
  price: "259.000",
  bedrooms: "2",
  suites: "1",
  areaMin: "45",
  areaMax: "52",
};

class FakeRepository {
  constructor(catalog = { developments: [] }, site = { logo: null }) {
    this.data = { catalog, site, version: "v0" };
    this.commits = [];
    this.conflictOnce = false;
  }
  async load() {
    return structuredClone(this.data);
  }
  async commit(message, changes, parent) {
    if (this.conflictOnce) {
      this.conflictOnce = false;
      this.data.version = "v-other";
      throw new ConflictError("mudou");
    }
    assert.equal(parent, this.data.version);
    this.commits.push({ message, ...changes });
    for (const w of changes.writes) {
      if (w.path === "content/catalog.json") this.data.catalog = w.json;
      if (w.path === "content/site.json") this.data.site = w.json;
    }
    this.data.version = `v${this.commits.length}`;
    return this.data.version;
  }
}
const media = { photo: async () => "jpg", logo: async () => "png", pdf: async (f) => f };

test("valida cidade, valor e suítes", () => {
  assert.throws(() => buildDevelopment({ ...fields, city: "Recife" }), ValidationError);
  assert.throws(() => buildDevelopment({ ...fields, price: "" }), ValidationError);
  assert.throws(() => buildDevelopment({ ...fields, suites: "3" }), ValidationError);
  assert.equal(buildDevelopment({ ...fields, id: "x" }).price, 259000);
});

test("gera ids únicos e busca sem acento", () => {
  assert.equal(uniqueId("Solar do Lago", ["solar-do-lago"]), "solar-do-lago-2");
  const list = [buildDevelopment({ ...fields, id: "a", neighborhood: "Maracanaú Centro" })];
  assert.equal(search(list, { q: "maracanau" }).length, 1);
  assert.equal(search(list, { city: "Fortaleza" }).length, 0);
});

test("cadastra com fotos e book em um único commit", async () => {
  const repo = new FakeRepository();
  const service = new AdminService(repo, media);
  await service.load();
  const dev = await service.saveDevelopment({
    fields,
    newPhotos: [{}, {}],
    materialUploads: { book: { name: "book.pdf" } },
  });
  assert.equal(repo.commits.length, 1);
  assert.equal(dev.id, "reserva-teste");
  assert.equal(dev.photos.length, 2);
  assert.match(dev.materials.book, /^content\/media\/reserva-teste\/book-.*\.pdf$/);
  const paths = repo.commits[0].writes.map((w) => w.path);
  assert.ok(paths.includes("content/catalog.json"));
  assert.equal(paths.filter((p) => p.endsWith(".jpg")).length, 2);
});

test("remover foto e trocar book apaga os arquivos antigos", async () => {
  const repo = new FakeRepository();
  const service = new AdminService(repo, media);
  await service.load();
  const dev = await service.saveDevelopment({ fields, newPhotos: [{}, {}], materialUploads: { book: {} } });
  const oldBook = dev.materials.book;
  const updated = await service.saveDevelopment({
    id: dev.id,
    fields: { ...fields, price: "300000" },
    removedPhotos: [dev.photos[0]],
    materialUploads: { book: {} },
  });
  assert.equal(updated.photos.length, 1);
  assert.notEqual(updated.materials.book, oldBook);
  assert.deepEqual(repo.commits[1].deletes.sort(), [dev.photos[0], oldBook].sort());
});

test("excluir não apaga arquivos de exemplo compartilhados", async () => {
  const shared = { ...buildDevelopment({ ...fields, id: "a" }), photos: ["assets/residencial-1.jpg"] };
  const repo = new FakeRepository({ developments: [shared] });
  const service = new AdminService(repo, media);
  await service.load();
  await service.deleteDevelopment("a");
  assert.deepEqual(repo.commits[0].deletes, []);
  assert.equal(repo.data.catalog.developments.length, 0);
  assert.deepEqual(orphanFiles(["content/x.jpg", "assets/y.jpg"], []), ["content/x.jpg"]);
});

test("logo: envia, troca e remove", async () => {
  const repo = new FakeRepository();
  const service = new AdminService(repo, media);
  await service.load();
  await service.setLogo({});
  const first = repo.data.site.logo;
  assert.match(first, /^content\/logo-.*\.png$/);
  await service.setLogo({});
  assert.deepEqual(repo.commits[1].deletes, [first]);
  await service.removeLogo();
  assert.equal(repo.data.site.logo, null);
});

test("se o repositório mudou, recarrega e salva de novo", async () => {
  const repo = new FakeRepository();
  const service = new AdminService(repo, media);
  await service.load();
  repo.conflictOnce = true;
  await service.saveDevelopment({ fields });
  assert.equal(repo.commits.length, 1);
  assert.equal(repo.data.catalog.developments.length, 1);
});
