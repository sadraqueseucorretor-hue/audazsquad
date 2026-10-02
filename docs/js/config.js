// Repositório onde o admin grava o conteúdo. No GitHub Pages é detectado pelo endereço.
const pages = location.hostname.endsWith(".github.io");

export const repositoryConfig = {
  owner: pages ? location.hostname.split(".")[0] : "sadraqueseucorretor-hue",
  repo: pages ? location.pathname.split("/")[1] : "audazsquad",
  branch: "main",
  root: "docs/",
};
