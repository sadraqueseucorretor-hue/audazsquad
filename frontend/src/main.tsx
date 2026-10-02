import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { BrandingProvider } from "./lib/branding";
import { Layout } from "./components/Layout";
import { Catalog } from "./features/Catalog";
import { Detail } from "./features/Detail";
import { Login } from "./features/Login";
import { Admin } from "./features/Admin";
import "./styles.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <BrandingProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Catalog />} />
              <Route path="empreendimentos/:id" element={<Detail />} />
              <Route path="login" element={<Login />} />
              <Route path="admin" element={<Admin />} />
              <Route
                path="*"
                element={
                  <div className="container empty">
                    <h1>Página não encontrada</h1>
                    <Link to="/" className="button">
                      Voltar ao catálogo
                    </Link>
                  </div>
                }
              />
            </Route>
          </Routes>
        </BrandingProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
