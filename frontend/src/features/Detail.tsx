import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FileText, MapPin } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Development, date, materialLabels, money } from "../lib/types";
import { Carousel } from "../components/Carousel";
export function Detail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [p, setP] = useState<Development>();
  const [error, setError] = useState("");
  useEffect(() => {
    setP(undefined);
    setError("");
    api<Development>(`/developments/${id}`)
      .then((p) => {
        setP(p);
        document.title = `${p.name} — AUDAZ SQUAD`;
      })
      .catch((e) => setError(e.message));
    return () => {
      document.title = "AUDAZ SQUAD — Central de Empreendimentos";
    };
  }, [id, user]);
  if (error)
    return (
      <div className="container empty">
        <h1>{error}</h1>
        <Link to="/" className="button">
          Voltar ao catálogo
        </Link>
      </div>
    );
  if (!p)
    return <div className="container loading">Carregando empreendimento…</div>;
  const materials = p.assets.filter((a) => a.kind !== "photo");
  const facts = [
    ["Endereço", p.address],
    ["Tipologia", p.typology],
    ["Quartos", p.bedrooms],
    ["Suítes", p.suites],
    ["Metragem", `${p.area_min} a ${p.area_max} m²`],
    ["Vagas", p.parking],
    ["Torres", p.towers],
    ["Unidades", p.units],
    ["Previsão de entrega", p.delivery],
  ];
  return (
    <div className="container">
      <Link className="back" to="/">
        Voltar aos empreendimentos
      </Link>
      <section className="detail-hero">
        <Carousel
          key={p.id}
          photos={p.assets.filter((a) => a.kind === "photo")}
          name={p.name}
          large
        />
        <div className="detail-heading">
          <span className="status inline">{p.status}</span>
          <p className="eyebrow">{p.builder}</p>
          <h1>{p.name}</h1>
          <p>
            {p.neighborhood} · {p.city}
          </p>
          <div className="price">
            <small>A partir de</small>
            <strong>{money(p.price_cents)}</strong>
          </div>
        </div>
      </section>
      {p.demo && (
        <p className="notice">
          Empreendimento fictício · Fotos e materiais de demonstração.
        </p>
      )}
      <section className="detail-section">
        <h2>O empreendimento</h2>
        {p.description && <p className="description">{p.description}</p>}
        <dl className="facts">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="detail-section">
        <div className="section-heading">
          <h2>Materiais comerciais</h2>
          <span>{materials.length} arquivos disponíveis</span>
        </div>
        <div className="material-grid">
          {materials.map((a) => (
            <a
              className="material"
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noreferrer"
            >
              <span className="file-icon">
                <FileText />
              </span>
              <div>
                <strong>{materialLabels[a.kind] || a.kind}</strong>
                <small>
                  {a.kind === "tabela"
                    ? `Atualizada em ${date(a.updated_at)} (Brasília)`
                    : "PDF · Baixar arquivo"}
                </small>
                <small>{a.filename}</small>
              </div>
            </a>
          ))}
          <a
            className="material"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.demo ? `${p.neighborhood}, ${p.city}, Ceará` : p.address + ", " + p.city + ", Ceará")}`}
            target="_blank"
            rel="noreferrer"
          >
            <span className="file-icon">
              <MapPin />
            </span>
            <div>
              <strong>Localização</strong>
              <small>
                {p.demo ? "Consultar bairro no mapa" : "Abrir endereço no mapa"}
              </small>
            </div>
          </a>
        </div>
      </section>
    </div>
  );
}
