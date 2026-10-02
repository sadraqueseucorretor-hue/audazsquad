import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Plus, Building2, Users, Eye, Palette } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Development, money } from "../lib/types";
import { PropertyEditor } from "./PropertyEditor";
import { UsersPanel } from "./UsersPanel";
import { BrandingPanel } from "./BrandingPanel";
export function Admin() {
  const { user, loading, can } = useAuth();
  const location = useLocation();
  const [tab, setTab] = useState("catalog");
  const [properties, setProperties] = useState<Development[]>([]);
  const [editor, setEditor] = useState<Development | null | undefined>(
    undefined,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const catalogAccess = can("catalog.edit") || can("assets.manage");
  const load = () => {
    if (!catalogAccess) return;
    setBusy(true);
    api<Development[]>("/admin/developments")
      .then(setProperties)
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  };
  useEffect(() => {
    load();
  }, [user]);
  if (loading)
    return <div className="container loading">Carregando seu acesso…</div>;
  if (!user)
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  if (!catalogAccess && !can("users.manage"))
    return (
      <div className="container empty">
        <h1>Olá, {user.name.split(" ")[0]}.</h1>
        <p>
          Consulte os empreendimentos e os materiais disponíveis para seu
          acesso.
        </p>
        <Link className="button" to="/">
          Acessar catálogo
        </Link>
      </div>
    );
  const isAdmin = user.role === "admin";
  const current = catalogAccess ? tab : tab === "branding" ? tab : "users";
  return (
    <div className="container admin">
      <div className="admin-heading">
        <div>
          <span className="eyebrow muted">ÁREA ADMINISTRATIVA</span>
          <h1>Administração</h1>
          <p>Empreendimentos, materiais e acessos em um só lugar.</p>
        </div>
        <Link className="button outline" to="/">
          <Eye size={17} />
          Ver catálogo público
        </Link>
      </div>
      <div className="tabs">
        {catalogAccess && (
          <button
            className={current === "catalog" ? "selected" : ""}
            onClick={() => setTab("catalog")}
          >
            <Building2 size={18} />
            Empreendimentos
          </button>
        )}
        {can("users.manage") && (
          <button
            className={current === "users" ? "selected" : ""}
            onClick={() => setTab("users")}
          >
            <Users size={18} />
            Usuários e permissões
          </button>
        )}
        {isAdmin && (
          <button
            className={current === "branding" ? "selected" : ""}
            onClick={() => setTab("branding")}
          >
            <Palette size={18} />
            Logo
          </button>
        )}
      </div>
      {current === "users" ? (
        <UsersPanel />
      ) : current === "branding" ? (
        <BrandingPanel />
      ) : (
        <>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          {editor !== undefined ? (
            <PropertyEditor
              key={editor?.id || "new"}
              property={editor}
              onClose={() => setEditor(undefined)}
              onSaved={load}
            />
          ) : (
            <>
              <div className="section-heading">
                <h2>
                  Seu portfólio{" "}
                  <span className="count-badge">{properties.length}</span>
                </h2>
                {can("catalog.edit") && (
                  <button className="button" onClick={() => setEditor(null)}>
                    <Plus size={18} />
                    Novo empreendimento
                  </button>
                )}
              </div>
              {busy ? (
                <p role="status">Carregando…</p>
              ) : (
                <div className="admin-list">
                  {properties.map((p) => (
                    <article key={p.id} className="admin-row">
                      {p.assets.find((a) => a.kind === "photo") ? (
                        <img
                          className="admin-thumb"
                          src={p.assets.find((a) => a.kind === "photo")!.url}
                          alt=""
                        />
                      ) : (
                        <span className="avatar">
                          <Building2 />
                        </span>
                      )}
                      <div className="row-description">
                        <strong>{p.name}</strong>
                        <small>
                          {p.neighborhood} · {p.city}
                        </small>
                      </div>
                      <span className="admin-price">
                        {money(p.price_cents)}
                      </span>
                      <span className={`pill ${p.published ? "" : "inactive"}`}>
                        {p.published ? "Publicado" : "Rascunho"}
                      </span>
                      <button
                        className="button small outline"
                        onClick={() => setEditor(p)}
                      >
                        {can("catalog.edit") ? "Editar" : "Materiais"}
                      </button>
                    </article>
                  ))}
                  {!properties.length && (
                    <p className="empty">
                      Cadastre o primeiro empreendimento para começar.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
