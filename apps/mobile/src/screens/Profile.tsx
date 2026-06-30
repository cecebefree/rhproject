import React from "react";

export default function Profile() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: "#1a2330" }}>
      <div style={{ background: "#1a2330", color: "#fff", padding: "28px 16px", textAlign: "center" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#8b1a2e", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700 }}>
          LB
        </div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Liam van der Berg</div>
        <div style={{ fontSize: 13, opacity: 0.7 }}>Cambridge Grade 8 · Mid School</div>
      </div>
      <div style={{ padding: 16 }}>
        {[
          ["Student ID", "RH-2026-0481"],
          ["House", "Crimson"],
          ["Attendance", "98%"],
          ["Settings", "Account & notifications"],
        ].map(([label, val]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", background: "#f8f7f4", borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <span style={{ fontWeight: 600 }}>{label}</span>
            <span style={{ fontSize: 13, color: "#555" }}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
