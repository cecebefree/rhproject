import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import Home from "./screens/Home";
import Class from "./screens/Class";
import Hub from "./screens/Hub";
import Social from "./screens/Social";
import Profile from "./screens/Profile";
import "./index.css";

const tabs = [
  { key: "home", label: "Home", Component: Home },
  { key: "class", label: "Class", Component: Class },
  { key: "hub", label: "Hub", Component: Hub },
  { key: "social", label: "Social", Component: Social },
  { key: "profile", label: "Profile", Component: Profile },
];

function App() {
  const [active, setActive] = useState("home");
  const ActiveScreen =
    tabs.find((t) => t.key === active)?.Component ?? Home;

  return (
    <div className="app-shell">
      <div className="screen-container">
        <ActiveScreen />
      </div>
      <nav className="tab-bar">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`tab-button ${active === t.key ? "active" : ""}`}
            onClick={() => setActive(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Missing #root element in HTML");
createRoot(rootEl).render(<App />);
