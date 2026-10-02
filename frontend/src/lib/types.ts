export type Role = "gerente" | "admin";
export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  permissions: string[];
};
export type Session = { user: User; csrf: string };
export type Asset = {
  id: string;
  kind: string;
  filename: string;
  url: string;
  content_type: string;
  public: boolean;
  updated_at: string;
};
export type Development = {
  id: string;
  name: string;
  builder: string;
  neighborhood: string;
  city: string;
  address: string;
  price_cents: number;
  typology: string;
  bedrooms: number;
  suites: number;
  area_min: number;
  area_max: number;
  parking: number;
  towers: number;
  units: number;
  delivery: string;
  status: string;
  description: string;
  published: boolean;
  demo: boolean;
  updated_at: string;
  assets: Asset[];
};
export const cities = ["Fortaleza", "Caucaia", "Maracanaú", "Eusébio"];
export const materialLabels: Record<string, string> = {
  book: "Book do empreendimento",
  tabela: "Tabela de preços",
  plantas: "Plantas",
  implantacao: "Implantação",
  memorial: "Memorial Descritivo",
  comerciais: "Informações Comerciais",
  outros: "Outros Materiais",
};
export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(cents / 100);
export const date = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Fortaleza",
  }).format(new Date(value));
