// Casos de uso do administrador. Dependem de contratos, não de implementações:
//   repository: { load(): {catalog, site, version}, commit(message, changes, version) }
//   media:      { photo(file), logo(file), pdf(file) } -> Blob normalizado
import {
  MATERIAL_TYPES,
  buildDevelopment,
  filesOf,
  orphanFiles,
  uniqueId,
} from "../domain/catalog.js";

export class ConflictError extends Error {}

const stamp = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export class AdminService {
  constructor(repository, media) {
    this.repository = repository;
    this.media = media;
    this.state = null;
  }

  async load() {
    this.state = await this.repository.load();
    return this.state;
  }

  get developments() {
    return this.state?.catalog.developments ?? [];
  }

  get site() {
    return this.state?.site ?? { logo: null };
  }

  /**
   * Cria ou edita um empreendimento.
   * @param {{id?: string, fields: object, newPhotos?: File[], removedPhotos?: string[],
   *          materialUploads?: Record<string, File>, removedMaterials?: string[]}} input
   */
  async saveDevelopment({ id, fields, newPhotos = [], removedPhotos = [], materialUploads = {}, removedMaterials = [] }) {
    const photoBlobs = await Promise.all(newPhotos.map((f) => this.media.photo(f)));
    const pdfBlobs = {};
    for (const [kind, file] of Object.entries(materialUploads)) {
      if (!(kind in MATERIAL_TYPES)) continue;
      pdfBlobs[kind] = await this.media.pdf(file);
    }
    return this.#transaction((state) => {
      const list = state.catalog.developments;
      const previous = id ? list.find((d) => d.id === id) : null;
      if (id && !previous) throw new Error("Este empreendimento foi removido. Recarregue a página.");
      const devId = previous?.id ?? uniqueId(fields.name, list.map((d) => d.id));
      const folder = `content/media/${devId}`;
      const writes = [];

      const photos = (previous?.photos ?? []).filter((p) => !removedPhotos.includes(p));
      for (const blob of photoBlobs) {
        const path = `${folder}/foto-${stamp()}.jpg`;
        writes.push({ path, blob });
        photos.push(path);
      }
      const materials = { ...(previous?.materials ?? {}) };
      for (const kind of removedMaterials) delete materials[kind];
      for (const [kind, blob] of Object.entries(pdfBlobs)) {
        const path = `${folder}/${kind}-${stamp()}.pdf`;
        writes.push({ path, blob });
        materials[kind] = path;
      }

      const dev = buildDevelopment({ ...fields, id: devId }, { id: devId, photos, materials });
      const developments = previous
        ? list.map((d) => (d.id === devId ? dev : d))
        : [dev, ...list];
      const replaced = previous ? filesOf(previous) : [];
      return {
        catalog: { ...state.catalog, developments },
        writes,
        deletes: orphanFiles(replaced, developments),
        message: `${previous ? "Atualiza" : "Cadastra"} empreendimento ${dev.name}`,
        result: dev,
      };
    });
  }

  async deleteDevelopment(id) {
    return this.#transaction((state) => {
      const target = state.catalog.developments.find((d) => d.id === id);
      if (!target) throw new Error("Empreendimento não encontrado.");
      const developments = state.catalog.developments.filter((d) => d.id !== id);
      return {
        catalog: { ...state.catalog, developments },
        deletes: orphanFiles(filesOf(target), developments),
        message: `Remove empreendimento ${target.name}`,
      };
    });
  }

  async setLogo(file) {
    const blob = await this.media.logo(file);
    return this.#transaction((state) => {
      const path = `content/logo-${stamp()}.png`;
      return {
        site: { ...state.site, logo: path },
        writes: [{ path, blob }],
        deletes: state.site.logo ? [state.site.logo] : [],
        message: "Atualiza a logo",
      };
    });
  }

  async removeLogo() {
    return this.#transaction((state) => ({
      site: { ...state.site, logo: null },
      deletes: state.site.logo ? [state.site.logo] : [],
      message: "Remove a logo",
    }));
  }

  // Aplica a mudança sobre a versão mais recente; se outra gravação chegou antes,
  // recarrega e tenta mais uma vez, sem perder o que o administrador enviou.
  async #transaction(change) {
    for (let attempt = 0; ; attempt++) {
      const state = attempt === 0 && this.state ? this.state : await this.load();
      const plan = change(state);
      const catalog = plan.catalog ?? state.catalog;
      const site = plan.site ?? state.site;
      const writes = [...(plan.writes ?? [])];
      if (plan.catalog) writes.push({ path: "content/catalog.json", json: catalog });
      if (plan.site) writes.push({ path: "content/site.json", json: site });
      try {
        const version = await this.repository.commit(
          plan.message,
          { writes, deletes: plan.deletes ?? [] },
          state.version,
        );
        this.state = { catalog, site, version };
        return plan.result;
      } catch (error) {
        if (!(error instanceof ConflictError) || attempt > 0) throw error;
      }
    }
  }
}
