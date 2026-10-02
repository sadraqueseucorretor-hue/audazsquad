import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { api, setCsrf } from "./api";
import type { Session, User } from "./types";
type Auth = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
};
const Context = createContext<Auth>(null!);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api<Session>("/auth/me")
      .then((s) => {
        setUser(s.user);
        setCsrf(s.csrf);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  async function login(email: string, password: string) {
    const s = await api<Session>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setUser(s.user);
    setCsrf(s.csrf);
  }
  async function logout() {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
    setCsrf("");
  }
  return (
    <Context.Provider
      value={{
        user,
        loading,
        login,
        logout,
        can: (p) => !!user?.permissions.includes(p),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
