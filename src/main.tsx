import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { PlazaProvider } from "./context/Praca";
import "./index.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PlazaProvider>
      <App />
    </PlazaProvider>
  </React.StrictMode>,
);
