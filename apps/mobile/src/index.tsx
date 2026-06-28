import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import Home from "./screens/Home";
import Class from "./screens/Class";
import Hub from "./screens/Hub";
import Social from "./screens/Social";
import Profile from "./screens/Profile";

const screens = {
  Home: <Home />,
  Class: <Class />,
  Hub: <Hub />,
  Social: <Social />,
  Profile: <Profile />,
};

function App() {
  const [active, setActive] = useState<keyof typeof screens>("Home");

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#e9ebee" }}>
      <div style={{ width: 390, height: 844, background: "#fff", borderRadius: 40, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", border: "10px solid #1a1a1a" }}>
        <div style={{ flex: 1, overflowY: "auto" }}>{screens[active]}</div>
        <nav style={{ display: "flex", borderTop: "1px solid #e2e2e2", background: "#fff" }}>
          {(Object.keys(screens) as (keyof typeof screens)[]).map((name) => (
            <button key={name} onClick={() => setActive(name)} style={{ flex: 1, padding: "16px 0", border: "none", fontSize: 12, background: "#fff", color: active === name ? "#8b1a2e" : "#9aa0a6", fontWeight: active === name ? 700 : 500, cursor: "pointer" }}>
              {name}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Missing #root element in HTML");
createRoot(rootEl).render(<App />);

