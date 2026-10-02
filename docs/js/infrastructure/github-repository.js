// Grava o conteúdo do site direto no repositório do GitHub (pasta publicada pelo Pages).
// Cada salvamento vira um único commit; o GitHub Pages republica o link sozinho.
import { ConflictError } from "../application/admin-service.js";

const API = "https://api.github.com";

export class AuthError extends Error {}

export class GitHubContentRepository {
  constructor({ owner, repo, branch, root, token }) {
    Object.assign(this, { owner, repo, branch, root, token });
  }

  async #request(path, options = {}) {
    const response = await fetch(`${API}/repos/${this.owner}/${this.repo}${path}`, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      cache: "no-store",
    });
    if (response.status === 401) throw new AuthError("Chave inválida ou expirada.");
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const error = new Error(body.message || `Erro ${response.status} no GitHub.`);
      error.status = response.status;
      throw error;
    }
    return response.status === 204 ? null : response.json();
  }

  /** Confirma que a chave pode gravar neste repositório. */
  async verify() {
    const repo = await this.#request("");
    if (!repo.permissions?.push)
      throw new AuthError("Esta chave não tem permissão para editar o repositório.");
  }

  async load() {
    const ref = await this.#request(`/git/ref/heads/${this.branch}`);
    const version = ref.object.sha;
    const [catalog, site] = await Promise.all([
      this.#readJSON("content/catalog.json", version),
      this.#readJSON("content/site.json", version),
    ]);
    return { catalog: catalog ?? { developments: [] }, site: site ?? { logo: null }, version };
  }

  async #readJSON(path, version) {
    try {
      const file = await this.#request(
        `/contents/${this.root}${path}?ref=${version}`,
      );
      const bytes = Uint8Array.from(atob(file.content.replace(/\n/g, "")), (c) => c.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  /**
   * @param {string} message
   * @param {{writes: {path: string, blob?: Blob, json?: object}[], deletes: string[]}} changes
   * @param {string} parent commit sobre o qual a mudança foi planejada
   */
  async commit(message, { writes, deletes }, parent) {
    const parentCommit = await this.#request(`/git/commits/${parent}`);
    const existing = await this.#existingPaths(parentCommit.tree.sha);
    const tree = [];
    for (const w of writes) {
      const blob = w.blob ?? new Blob([JSON.stringify(w.json, null, 1) + "\n"]);
      const created = await this.#request("/git/blobs", {
        method: "POST",
        body: JSON.stringify({ content: await toBase64(blob), encoding: "base64" }),
      });
      tree.push({ path: this.root + w.path, mode: "100644", type: "blob", sha: created.sha });
    }
    for (const path of deletes) {
      if (existing.has(this.root + path))
        tree.push({ path: this.root + path, mode: "100644", type: "blob", sha: null });
    }
    const newTree = await this.#request("/git/trees", {
      method: "POST",
      body: JSON.stringify({ base_tree: parentCommit.tree.sha, tree }),
    });
    const commit = await this.#request("/git/commits", {
      method: "POST",
      body: JSON.stringify({ message, tree: newTree.sha, parents: [parent] }),
    });
    try {
      await this.#request(`/git/refs/heads/${this.branch}`, {
        method: "PATCH",
        body: JSON.stringify({ sha: commit.sha, force: false }),
      });
    } catch (error) {
      if (error.status === 422) throw new ConflictError("O repositório mudou durante o envio.");
      throw error;
    }
    return commit.sha;
  }

  async #existingPaths(treeSha) {
    const tree = await this.#request(`/git/trees/${treeSha}?recursive=1`);
    return new Set(tree.tree.filter((e) => e.type === "blob").map((e) => e.path));
  }
}

function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
