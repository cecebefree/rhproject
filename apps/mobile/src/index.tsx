import React from "react";
import { createRoot } from "react-dom/client";
import Home from "./screens/Home";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Missing #root element in HTML");

createRoot(rootEl).render(<Home />);
