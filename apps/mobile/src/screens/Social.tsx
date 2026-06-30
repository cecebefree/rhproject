import React from "react";

export default function Social() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: "#1a2330" }}>
      <div style={{ background: "#1a2330", color: "#fff", padding: "20px 16px" }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>Social</div>
        <div style={{ fontSize: 13, opacity: 0.7 }}>School feed</div>
      </div>
      <div style={{ padding: 16 }}>
        {[
          ["Sports Day", "Grade 8 won the relay! Photos posted.", "2h ago"],
          ["Art Exhibition", "Student work on display in the main hall.", "5h ago"],
          ["Debate Team", "Congrats to our regional finalists.", "1d ago"],
        ].map(([title, body, time]) => (
          <div key={title} style={{ background: "#f8f7f4", borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <div style={{ fontWeight: 700 }}>{title}</div>
            <div style={{ fontSize: 13, color: "#555", margin: "4px 0" }}>{body}</div>
            <div style={{ fontSize: 12, color: "#999" }}>{time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
