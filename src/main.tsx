import React from "react";
import { createRoot } from "react-dom/client";
import { Access, useAccess } from "./components/Access";
import App from "./App";
import { PlazaProvider } from "./context/Praca";
import "./index.css";
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
    <Access>
      <SessionApp />
    </Access>
  </React.StrictMode>,
);
