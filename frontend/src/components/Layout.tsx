import { Link, Outlet, useNavigate } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../lib/auth";
import { useBranding } from "../lib/branding";
import { roleLabels } from "../lib/types";
export function Layout() {
  const { user, logout } = useAuth();
  const { logo_url } = useBranding();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [error, setError] = useState("");
  return (
    <>
      <a className="skip" href="#content">
        Pular para o conteúdo
      </a>
      <header className="header">
        <Link to="/" className="brand">
          {logo_url ? (
            <img className="brand-logo" src={logo_url} alt="AUDAZ SQUAD" />
          ) : (
            <>
              <span className="brand-mark">A</span>
              <span>
                AUDAZ<small>S Q U A D</small>
              </span>
            </>
          )}
        </Link>
        <button
          className="mobile-menu"
          aria-label="Abrir menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav className={open ? "open" : ""} onClick={() => setOpen(false)}>
          <Link to="/">Empreendimentos</Link>
          {user && <Link to="/admin">Minha área</Link>}
          {user ? (
            <>
              <span className="user-chip">
                {user.name.split(" ")[0]} · {roleLabels[user.role]}
              </span>
              <button
                className="text-button"
                onClick={() =>
                  logout()
                    .then(() => navigate("/"))
                    .catch((e) => setError(e.message))
                }
              >
                <LogOut size={16} /> Sair
              </button>
            </>
          ) : (
            <Link to="/login" className="button small outline">
              Entrar
            </Link>
          )}
        </nav>
      </header>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <main id="content">
        <Outlet />
      </main>
      <footer>
        <div className="footer-brand">
          {logo_url && <img className="footer-logo" src={logo_url} alt="" />}
          AUDAZ SQUAD<small>Central de Empreendimentos</small>
        </div>
        <p>
          Fortaleza · Caucaia · Maracanaú · Eusébio
          <br />
          Valores sujeitos à confirmação com a construtora.
        </p>
      </footer>
    </>
  );
}
