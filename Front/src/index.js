import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import './base.css';
import './components.css';
import './networkDisplay.css';
import App from "./App";

const root = createRoot(document.getElementById("root"));
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);