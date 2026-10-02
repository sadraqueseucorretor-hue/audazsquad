import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import type { Asset } from "../lib/types";
export function Carousel({
  photos,
  name,
  large = false,
}: {
  photos: Asset[];
  name: string;
  large?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const available = photos.filter((p) => !failed.includes(p.id));
  const current = available[index % Math.max(available.length, 1)];
  const startX = useRef(0);
  const move = (delta: number) =>
    setIndex((i) => (i + delta + available.length) % available.length);
  return (
    <section
      className={`carousel ${large ? "large" : ""}`}
      aria-label={`Fotos de ${name}`}
      aria-roledescription="carrossel"
      onTouchStart={(e) => {
        startX.current = e.changedTouches[0].clientX;
      }}
      onTouchEnd={(e) => {
        const delta = e.changedTouches[0].clientX - startX.current;
        if (available.length > 1 && Math.abs(delta) > 50)
          move(delta < 0 ? 1 : -1);
      }}
    >
      {current ? (
        <img
          src={current.url}
          alt={`${name}, foto ${(index % available.length) + 1} de ${available.length}`}
          loading="lazy"
          onError={() => setFailed((f) => [...f, current.id])}
        />
      ) : (
        <div className="no-photo">
          <Building2 size={42} />
          <span>Fotos em breve</span>
        </div>
      )}
      {available.length > 1 && (
        <>
          <button
            type="button"
            className="carousel-arrow previous"
            aria-label={`Foto anterior de ${name}`}
            onClick={() => move(-1)}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            className="carousel-arrow next"
            aria-label={`Próxima foto de ${name}`}
            onClick={() => move(1)}
          >
            <ChevronRight size={20} />
          </button>
          <div className="dots">
            {available.map((p, i) => (
              <button
                key={p.id}
                className={i === index % available.length ? "active" : ""}
                aria-label={`Ver foto ${i + 1} de ${name}`}
                aria-pressed={i === index % available.length}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
          <span className="photo-counter" aria-live="polite">
            {(index % available.length) + 1} / {available.length}
          </span>
        </>
      )}
    </section>
  );
}
