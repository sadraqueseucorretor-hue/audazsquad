import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, SlidersHorizontal, FileText } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Development, cities, date } from "../lib/types";
import { PropertyCard } from "../components/PropertyCard";
const normalized = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function Catalog() {
  const { user } = useAuth();
  const [data, setData] = useState<Development[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [builder, setBuilder] = useState("");
  const [status, setStatus] = useState("");
  useEffect(() => {
    setLoading(true);
    api<Development[]>("/developments")
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);
  const results = data.filter(
    (p) =>
      normalized(`${p.name} ${p.neighborhood} ${p.builder}`).includes(
        normalized(search.trim()),
      ) &&
      (!city || p.city === city) &&
      (!builder || p.builder === builder) &&
      (!status || p.status === status),
  );
  const clear = () => {
    setSearch("");
    setCity("");
    setBuilder("");
    setStatus("");
  };
  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <span className="eyebrow">AUDAZ SQUAD · PORTFÓLIO IMOBILIÁRIO</span>
          <h1>
            Central de
            <br className="mobile-break" /> Empreendimentos
          </h1>
          <p>Os melhores endereços. Todos os materiais em um só lugar.</p>
          <label className="search">
            <Search size={21} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Busque por empreendimento, bairro ou construtora"
              aria-label="Buscar empreendimento, bairro ou construtora"
            />
          </label>
        </div>
        <div className="hero-number">
          <strong>04</strong>
          <span>
            CIDADES.
            <br />
            NOVAS POSSIBILIDADES.
          </span>
        </div>
      </section>
      <div className="container">
        <div className="filters">
          <span>
            <SlidersHorizontal size={16} /> Filtrar por
          </span>
          <select
            aria-label="Cidade"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            <option value="">Todas as cidades</option>
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Construtora"
            value={builder}
            onChange={(e) => setBuilder(e.target.value)}
          >
            <option value="">Todas as construtoras</option>
            {[...new Set(data.map((p) => p.builder))].map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
          <select
            aria-label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos os status</option>
            {["Lançamento", "Em obras", "Pronto para morar"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          {(search || city || builder || status) && (
            <button className="text-button crimson" onClick={clear}>
              Limpar filtros
            </button>
          )}
        </div>
        <div className="section-heading">
          <h2>Encontre seu próximo empreendimento</h2>
          <span aria-live="polite">{results.length} disponíveis</span>
        </div>
        {loading ? (
          <div className="loading" role="status">
            Carregando empreendimentos…
          </div>
        ) : error ? (
          <div className="notice error" role="alert">
            {error}{" "}
            <button onClick={() => location.reload()}>Tentar novamente</button>
          </div>
        ) : (
          <div className="property-grid">
            {results.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
            {!results.length && (
              <div className="empty">
                <h3>Nenhum empreendimento encontrado</h3>
                <p>Tente outro termo ou remova os filtros.</p>
                <button className="button" onClick={clear}>
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        )}
        {data.length > 0 && (
          <section className="recent">
            <div className="section-heading">
              <h2>Atualizados recentemente</h2>
              <span>Informação sempre à mão</span>
            </div>
            <div className="recent-grid">
              {[...data]
                .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
                .slice(0, 3)
                .map((p) => (
                  <Link
                    className="recent-card"
                    key={p.id}
                    to={`/empreendimentos/${p.id}`}
                  >
                    <span className="file-icon">
                      <FileText />
                    </span>
                    <div>
                      <strong>{p.name}</strong>
                      <small>Atualizado em {date(p.updated_at)}</small>
                    </div>
                  </Link>
                ))}
            </div>
          </section>
        )}
        {data.some((p) => p.demo) && (
          <p className="demo-note">
            Catálogo com exemplos fictícios. Fotos, preços e documentos dos
            imóveis marcados como ilustrativos não representam ofertas reais.
          </p>
        )}
      </div>
    </>
  );
}
