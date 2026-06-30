import React from "react";

export default function Hub() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: "#1a2330" }}>
      <div style={{ background: "#1a2330", color: "#fff", padding: "20px 16px" }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>The Hub</div>
        <div style={{ fontSize: 13, opacity: 0.7 }}>Clubs & extra learning</div>
      </div>
      <div style={{ padding: 16 }}>
        {[
          ["Finance 101", "Money skills for teens", "12 lessons"],
          ["Culinary Club", "Cook with Chef Maria", "Wednesdays"],
          ["Coding Lab", "Build your first app", "8 lessons"],
        ].map(([title, sub, meta]) => (
          <div key={title} style={{ background: "#f8f7f4", borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <div style={{ fontWeight: 700 }}>{title}</div>
            <div style={{ fontSize: 13, color: "#555" }}>{sub}</div>
            <div style={{ fontSize: 12, color: "#8b1a2e", fontWeight: 600, marginTop: 4 }}>{meta}</div>
          </div>
        ))}
      </div>
    </div>
  );
}