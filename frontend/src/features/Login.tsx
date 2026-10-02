import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import { useAuth } from "../lib/auth";
export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      await login(String(data.get("email")), String(data.get("password")));
      const next = params.get("next");
      navigate(
        next?.startsWith("/") && !next.startsWith("//") ? next : "/admin",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="login-wrap">
      <div className="login-card">
        <span className="file-icon">
          <LockKeyhole />
        </span>
        <p className="eyebrow muted">ÁREA ADMINISTRATIVA</p>
        <h1>Bom ter você aqui.</h1>
        <p>Entre para cadastrar empreendimentos e atualizar materiais.</p>
        <form onSubmit={submit}>
          <label>
            E-mail
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            Senha
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </label>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <button className="button" disabled={busy}>
            {busy ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <p className="muted">
          Precisa de acesso? Fale com o responsável pela sua equipe.
        </p>
        <Link className="back" to="/">
          Consultar catálogo público
        </Link>
      </div>
    </section>
  );
}
