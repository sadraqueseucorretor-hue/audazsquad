import { ChangeEvent, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { useBranding } from "../lib/branding";
import type { Branding } from "../lib/types";
export function BrandingPanel() {
  const { logo_url, setBranding } = useBranding();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function run(request: Promise<Branding>, message: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setBranding(await request);
      setNotice(message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    run(
      api<Branding>("/admin/branding/logo", { method: "POST", body }),
      "Logo atualizada em todo o site.",
    );
  }
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Identidade visual</h2>
          <p className="muted">
            A logo aparece no topo e no rodapé de todas as páginas.
          </p>
        </div>
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="notice success" role="status">
          {notice}
        </p>
      )}
      <div className="editor-panel branding-panel">
        <div className="logo-preview">
          {logo_url ? (
            <img src={logo_url} alt="Logo atual da AUDAZ SQUAD" />
          ) : (
            <span className="muted">
              Nenhuma logo enviada. O site usa o nome em texto.
            </span>
          )}
        </div>
        <div className="form-actions">
          <span className="muted">
            PNG com fundo transparente, JPG ou WebP.
          </span>
          <span className="branding-actions">
            {logo_url && (
              <button
                className="button outline"
                disabled={busy}
                onClick={() =>
                  run(
                    api<Branding>("/admin/branding/logo", { method: "DELETE" }),
                    "Logo removida.",
                  )
                }
              >
                <Trash2 size={17} />
                Remover
              </button>
            )}
            <label className={`button ${busy ? "disabled" : ""}`}>
              <ImagePlus size={17} />
              {busy ? "Enviando…" : logo_url ? "Trocar logo" : "Enviar logo"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={upload}
                disabled={busy}
                hidden
              />
            </label>
          </span>
        </div>
      </div>
    </>
  );
}
