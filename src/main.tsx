import React from "react";
import { createRoot } from "react-dom/client";
import { Access, useAccess } from "./components/Access";
import App from "./App";
import { PlazaProvider } from "./context/Praca";
import "./index.css";
import { PublicDeletion } from "./components/Community";
import { Policies } from "./components/Policies";
const page = new URLSearchParams(location.search);
function SessionApp() {
  const { account } = useAccess();
  return (
    <PlazaProvider key={account?.id ?? "guest"}>
      <App />
    </PlazaProvider>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {page.has("privacidade") || page.has("regras") ? <Policies privacy={page.has("privacidade")} /> :
      page.has("excluir-conta") ? <PublicDeletion /> : <Access>
      <SessionApp />
    </Access>}
  </React.StrictMode>,
);
