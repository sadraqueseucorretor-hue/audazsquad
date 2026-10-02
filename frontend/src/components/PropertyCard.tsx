import { Link } from "react-router-dom";
import { BedDouble, Maximize, MapPin } from "lucide-react";
import { Carousel } from "./Carousel";
import { Development, money } from "../lib/types";
export function PropertyCard({ property: p }: { property: Development }) {
  return (
    <article className="property-card">
      <div className="card-image">
        <Carousel
          photos={p.assets.filter((a) => a.kind === "photo")}
          name={p.name}
        />
        <span className={`status ${p.status === "Lançamento" ? "red" : ""}`}>
          {p.status}
        </span>
        {p.demo && <span className="demo-badge">Ilustrativo</span>}
      </div>
      <div className="card-body">
        <span className="eyebrow muted">{p.builder}</span>
        <h3>
          <Link to={`/empreendimentos/${p.id}`}>{p.name}</Link>
        </h3>
        <p className="location">
          <MapPin size={14} />
          {p.neighborhood} · {p.city}
        </p>
        <div className="specs">
          <span>
            <BedDouble size={17} />
            {p.typology}
          </span>
          <span>
            <Maximize size={15} />
            {p.area_min}–{p.area_max} m²
          </span>
        </div>
        <div className="card-bottom">
          <div className="price">
            <small>A partir de</small>
            <strong>{money(p.price_cents)}</strong>
          </div>
          <Link className="button small" to={`/empreendimentos/${p.id}`}>
            Acessar materiais
          </Link>
        </div>
      </div>
    </article>
  );
}
