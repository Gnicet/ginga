import React from "react";
import { createRoot } from "react-dom/client";
import { Access, useAccess } from "./components/Access";
import App from "./App";
import { PlazaProvider } from "./context/Praca";
import "./index.css";
import { PublicDeletion } from "./components/Community";
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
    {new URLSearchParams(location.search).has("excluir-conta") ? <PublicDeletion /> : <Access>
      <SessionApp />
    </Access>}
  </React.StrictMode>,
);
