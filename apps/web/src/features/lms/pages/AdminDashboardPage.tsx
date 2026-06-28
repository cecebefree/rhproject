import React, { useState } from "react";
import Home from "./screens/Home";
import Class from "./screens/Class";
import Hub from "./screens/Hub";
import Social from "./screens/Social";
import Profile from "./screens/Profile";

export default function App() {
  // Exact v0 tab router state
  const [activeTab, setActiveTab] = useState<"Home" | "Class" | "Hub" | "Social" | "Profile">("Home");

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "#e9ebee", padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      
      {/* Phone Frame Casing Container */}
      <div style={{ width: "390px", height: "844px", backgroundColor: "#F8F7F4", borderRadius: "40px", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", border: "10px solid #1a1a1a", position: "relative" }}>
        
        {/* Dynamic Screen Viewport Area */}
        <div style={{ flex: 1, overflowY: "auto", pb: "80px" }}>
          {activeTab === "Home" && <Home />}
          {activeTab === "Class" && <Class />}
          {activeTab === "Hub" && <Hub />}
          {activeTab === "Social" && <Social />}
          {activeTab === "Profile" && <Profile />}
        </div>

        {/* Pure v0 Core Bottom Navigation Tab Bar Structure */}
        <nav style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "64px", backgroundColor: "white", borderTop: "1px solid #e4e4e7", display: "flex", justifyContent: "space-around", alignItems: "center", padding: "0 8px", zIndex: 50 }}>
          
          <button onClick={() => setActiveTab("Home")} style={{ display: "flex", flexDirection: "column", alignItems: "center", justify: "center", flex: 1, height: "100%", border: "none", background: "none", cursor: "pointer", color: activeTab === "Home" ? "#DC2626" : "#a1a1aa" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            <span style={{ fontSize: "10px", marginTop: "4px", fontWeight: activeTab === "Home" ? "700" : "500" }}>Home</span>
          </button>

          <button onClick={() => setActiveTab("Class")} style={{ display: "flex", flexDirection: "column", alignItems: "center", justify: "center", flex: 1, height: "100%", border: "none", background: "none", cursor: "pointer", color: activeTab === "Class" ? "#DC2626" : "#a1a1aa" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span style={{ fontSize: "10px", marginTop: "4px", fontWeight: activeTab === "Class" ? "700" : "500" }}>Class</span>
          </button>

          <button onClick={() => setActiveTab("Hub")} style={{ display: "flex", flexDirection: "column", alignItems: "center", justify: "center", flex: 1, height: "100%", border: "none", background: "none", cursor: "pointer", color: activeTab === "Hub" ? "#DC2626" : "#a1a1aa" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
            <span style={{ fontSize: "10px", marginTop: "4px", fontWeight: activeTab === "Hub" ? "700" : "500" }}>Hub</span>
          </button>

          <button onClick={() => setActiveTab("Social")} style={{ display: "flex", flexDirection: "column", alignItems: "center", justify: "center", flex: 1, height: "100%", border: "none", background: "none", cursor: "pointer", color: activeTab === "Social" ? "#DC2626" : "#a1a1aa" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <span style={{ fontSize: "10px", marginTop: "4px", fontWeight: activeTab === "Social" ? "700" : "500" }}>Social</span>
          </button>

          <button onClick={() => setActiveTab("Profile")} style={{ display: "flex", flexDirection: "column", alignItems: "center", justify: "center", flex: 1, height: "100%", border: "none", background: "none", cursor: "pointer", color: activeTab === "Profile" ? "#DC2626" : "#a1a1aa" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span style={{ fontSize: "10px", marginTop: "4px", fontWeight: activeTab === "Profile" ? "700" : "500" }}>Profile</span>
          </button>

        </nav>

      </div>
    </div>
  );
}
