import { FormEvent, useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { User, Role, roleLabels, rolePermissions } from "../lib/types";
const permissionLabels: Record<string, string> = {
  "catalog.edit": "Cadastrar, editar e publicar empreendimentos",
  "assets.manage": "Anexar e remover fotos e materiais",
};
export function UsersPanel() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [editing, setEditing] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [perms, setPerms] = useState<string[]>([]);
  const load = () =>
    api<User[]>("/admin/users")
      .then(setUsers)
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  function openForm(u: User | null) {
    setEditing(u);
    setPerms(u ? u.permissions : rolePermissions.corretor);
    setOpen(true);
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const password = String(d.get("password") || "");
    const values = {
      name: d.get("name"),
      role: d.get("role"),
      permissions: d.getAll("permissions"),
      ...(editing
        ? { active: d.get("active") === "on", password: password || null }
        : { email: d.get("email"), password }),
    };
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(editing ? `/admin/users/${editing.id}` : "/admin/users", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(values),
      });
      if (editing?.id === user?.id) {
        window.location.assign("/login");
        return;
      }
      setOpen(false);
      setNotice(
        editing
          ? "Acesso atualizado. Sessões anteriores foram encerradas."
          : "Usuário criado.",
      );
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Usuários e acessos</h2>
          <p className="muted">
            Crie acessos para corretores, gerentes e diretores e escolha o que
            cada um pode editar.
          </p>
        </div>
        <button className="button" onClick={() => openForm(null)}>
          <Plus size={18} />
          Novo usuário
        </button>
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
      {open && (
        <form
          className="editor-panel"
          onSubmit={save}
          key={editing?.id || "new"}
        >
          <div className="section-heading">
            <h3>{editing ? "Editar acesso" : "Criar acesso"}</h3>
            <button
              type="button"
              className="icon-button"
              onClick={() => setOpen(false)}
              aria-label="Fechar formulário de usuário"
            >
              <X />
            </button>
          </div>
          <div className="form-grid">
            <label>
              Nome
              <input
                name="name"
                defaultValue={editing?.name}
                required
                minLength={2}
                maxLength={120}
              />
            </label>
            <label>
              E-mail
              <input
                name="email"
                type="email"
                defaultValue={editing?.email}
                required
                disabled={!!editing}
              />
            </label>
            <label>
              {editing ? "Nova senha (opcional)" : "Senha inicial"}
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required={!editing}
              />
              <small>Mínimo de 12 caracteres.</small>
            </label>
            <label>
              Perfil
              <select
                name="role"
                defaultValue={editing?.role || "corretor"}
                disabled={editing?.id === user?.id}
                onChange={(e) =>
                  setPerms(rolePermissions[e.target.value as Role])
                }
              >
                {(Object.keys(roleLabels) as Role[])
                  .filter((r) => r !== "admin" || user?.role === "admin")
                  .map((r) => (
                    <option key={r} value={r}>
                      {roleLabels[r]}
                    </option>
                  ))}
              </select>
              {editing?.id === user?.id && (
                <input type="hidden" name="role" value={editing?.role} />
              )}
            </label>
          </div>
          <fieldset className="permission-list">
            <legend>Permissões</legend>
            <small className="muted">
              Sem permissões, a pessoa entra e consulta o catálogo. O
              administrador sempre tem acesso total.
            </small>
            {Object.entries(permissionLabels)
              .filter(([key]) => user?.permissions.includes(key))
              .map(([key, label]) => (
                <label className="checkbox" key={key}>
                  <input
                    type="checkbox"
                    name="permissions"
                    value={key}
                    checked={perms.includes(key)}
                    onChange={(e) =>
                      setPerms(
                        e.target.checked
                          ? [...perms, key]
                          : perms.filter((p) => p !== key),
                      )
                    }
                    disabled={editing?.id === user?.id}
                  />
                  {label}
                  {editing?.id === user?.id &&
                    editing?.permissions.includes(key) && (
                      <input type="hidden" name="permissions" value={key} />
                    )}
                </label>
              ))}
          </fieldset>
          {editing && (
            <label className="checkbox">
              <input
                type="checkbox"
                name="active"
                defaultChecked={editing.active}
                disabled={editing.id === user?.id}
              />
              Acesso ativo
              {editing.id === user?.id && (
                <input type="hidden" name="active" value="on" />
              )}
            </label>
          )}
          <div className="form-actions">
            <span className="muted">
              Compartilhe a senha inicial por um canal seguro.
            </span>
            <button className="button" disabled={busy}>
              {busy ? "Salvando…" : "Salvar acesso"}
            </button>
          </div>
        </form>
      )}
      <div className="admin-list">
        {users.map((u) => (
          <article key={u.id} className="admin-row">
            <span className="avatar">{u.name.charAt(0)}</span>
            <div className="row-description">
              <strong>{u.name}</strong>
              <small>{u.email}</small>
            </div>
            <span className="pill">{roleLabels[u.role]}</span>
            <span className={`pill ${u.active ? "" : "inactive"}`}>
              {u.active ? "Ativo" : "Inativo"}
            </span>
            <button
              className="button small outline"
              onClick={() => openForm(u)}
            >
              Editar acesso
            </button>
          </article>
        ))}
      </div>
    </>
  );
}
