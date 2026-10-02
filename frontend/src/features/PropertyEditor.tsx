import { FormEvent, useState } from "react";
import { FileUp, Trash2, Save, X } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Development, cities, materialLabels } from "../lib/types";
const empty = {
  name: "",
  builder: "",
  neighborhood: "",
  city: "Fortaleza",
  address: "",
  price_cents: 0,
  typology: "2 quartos",
  bedrooms: 2,
  suites: 0,
  area_min: 45,
  area_max: 52,
  parking: 1,
  towers: 1,
  units: 1,
  delivery: "",
  status: "Em obras",
  description: "",
  published: false,
};
export function PropertyEditor({
  property,
  onClose,
  onSaved,
}: {
  property: Development | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { can } = useAuth();
  const [values, setValues] = useState<Record<string, unknown>>(
    property
      ? Object.fromEntries(
          Object.keys(empty).map((k) => [k, property[k as keyof Development]]),
        )
      : { ...empty },
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [current, setCurrent] = useState(property);
  const [kind, setKind] = useState("photo");
  function field(key: string, value: unknown) {
    setValues((v) => ({ ...v, [key]: value }));
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const p = await api<Development>(
        current ? `/admin/developments/${current.id}` : "/admin/developments",
        { method: current ? "PUT" : "POST", body: JSON.stringify(values) },
      );
      setCurrent(p);
      setMessage(
        "Empreendimento salvo. Você já pode anexar fotos e materiais.",
      );
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!current) return;
    const form = e.currentTarget;
    const input = form.elements.namedItem("files") as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    setBusy(true);
    setError("");
    setMessage("");
    let done = 0;
    try {
      for (const file of files) {
        if (file.size > 20 * 1024 * 1024)
          throw new Error(`${file.name}: limite de 20 MB.`);
        const body = new FormData();
        body.set("file", file);
        body.set("kind", kind);
        const p = await api<Development>(
          `/admin/developments/${current.id}/assets`,
          { method: "POST", body },
        );
        setCurrent(p);
        done++;
      }
      form.reset();
      setMessage(`${done} arquivo(s) anexado(s).`);
    } catch (e) {
      setError(
        `${done ? `${done} arquivo(s) já anexado(s). ` : ""}${(e as Error).message}`,
      );
    } finally {
      setBusy(false);
      onSaved();
    }
  }
  async function remove(id: string) {
    if (!confirm("Remover este arquivo do empreendimento?")) return;
    setBusy(true);
    setError("");
    try {
      await api(`/admin/assets/${id}`, { method: "DELETE" });
      setCurrent((p) =>
        p ? { ...p, assets: p.assets.filter((a) => a.id !== id) } : p,
      );
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const input = (
    key: string,
    label: string,
    type = "text",
    required = true,
  ) => (
    <label key={key}>
      {label}
      <input
        type={type}
        value={String(values[key] ?? "")}
        required={required}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "any" : undefined}
        maxLength={type === "text" ? 300 : undefined}
        onChange={(e) =>
          field(
            key,
            type === "number" ? Number(e.target.value) : e.target.value,
          )
        }
      />
    </label>
  );
  return (
    <section className="editor-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow muted">
            {current ? "EDITAR EMPREENDIMENTO" : "NOVO EMPREENDIMENTO"}
          </span>
          <h2>{current?.name || "Vamos cadastrar um novo endereço"}</h2>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Fechar edição"
        >
          <X />
        </button>
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="notice success" role="status">
          {message}
        </p>
      )}
      {can("catalog.edit") && (
        <form onSubmit={save}>
          <div className="form-grid">
            {input("name", "Nome do empreendimento")}
            {input("builder", "Construtora")}
            {input("neighborhood", "Bairro")}
            <label>
              Cidade
              <select
                value={String(values.city)}
                onChange={(e) => field("city", e.target.value)}
              >
                {cities.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            {input("address", "Endereço completo")}
            <label>
              Valor inicial (R$)
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={Number(values.price_cents) / 100}
                onChange={(e) =>
                  field("price_cents", Math.round(Number(e.target.value) * 100))
                }
              />
            </label>
            {input("typology", "Tipologia")}
            {input("bedrooms", "Quartos", "number")}
            {input("suites", "Suítes", "number")}
            {input("area_min", "Área mínima (m²)", "number")}
            {input("area_max", "Área máxima (m²)", "number")}
            {input("parking", "Vagas", "number")}
            {input("towers", "Torres", "number")}
            {input("units", "Unidades", "number")}
            {input("delivery", "Previsão de entrega")}
            <label>
              Status
              <select
                value={String(values.status)}
                onChange={(e) => field("status", e.target.value)}
              >
                {["Lançamento", "Em obras", "Pronto para morar"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="full">
              Descrição
              <textarea
                rows={3}
                maxLength={5000}
                value={String(values.description)}
                onChange={(e) => field("description", e.target.value)}
              />
            </label>
          </div>
          <div className="form-actions">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={Boolean(values.published)}
                onChange={(e) => field("published", e.target.checked)}
              />{" "}
              Visível no catálogo público
            </label>
            <button className="button" disabled={busy}>
              <Save size={17} />
              {busy ? "Salvando…" : "Salvar empreendimento"}
            </button>
          </div>
        </form>
      )}
      {current && can("assets.manage") && (
        <section className="uploads">
          <h3>Fotos e materiais</h3>
          <p className="muted">
            Fotos JPG, PNG ou WebP. Documentos em PDF. Até 20 MB por arquivo e
            15 fotos por empreendimento. Os arquivos de imóveis publicados são
            visíveis para todos.
          </p>
          <form className="upload-form" onSubmit={upload}>
            <label>
              Tipo de arquivo
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="photo">Fotos do empreendimento</option>
                {Object.entries(materialLabels).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Selecionar arquivos
              <input
                key={kind}
                name="files"
                type="file"
                multiple={kind === "photo"}
                accept={
                  kind === "photo"
                    ? "image/jpeg,image/png,image/webp"
                    : "application/pdf"
                }
                required
              />
            </label>
            <button className="button" disabled={busy}>
              <FileUp size={17} />
              {busy ? "Enviando…" : "Anexar arquivos"}
            </button>
          </form>
          <div className="asset-list">
            {current.assets.map((a) => (
              <div className="asset-row" key={a.id}>
                {a.kind === "photo" ? (
                  <img src={a.url} alt="Foto anexada" />
                ) : (
                  <FileUp size={24} />
                )}
                <div>
                  <a href={a.url} target="_blank" rel="noreferrer">
                    {a.filename}
                  </a>
                  <small>
                    {a.kind === "photo" ? "Foto" : materialLabels[a.kind]} ·
                    Público quando publicado
                  </small>
                </div>
                <button
                  type="button"
                  className="icon-button danger"
                  disabled={busy}
                  aria-label={`Remover ${a.filename}`}
                  onClick={() => remove(a.id)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
      {!current && (
        <p className="notice">
          Salve as informações para começar a anexar os arquivos.
        </p>
      )}
    </section>
  );
}
