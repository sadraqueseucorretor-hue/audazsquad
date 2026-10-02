import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { api } from "./api";
import type { Branding } from "./types";
type BrandingContext = Branding & { setBranding: (b: Branding) => void };
const Context = createContext<BrandingContext>(null!);
export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding>({ logo_url: null });
  useEffect(() => {
    api<Branding>("/branding")
      .then(setBranding)
      .catch(() => {});
  }, []);
  return (
    <Context.Provider value={{ ...branding, setBranding }}>
      {children}
    </Context.Provider>
  );
}
export const useBranding = () => useContext(Context);
