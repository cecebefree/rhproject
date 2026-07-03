
export default function Class() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: "#1a2330" }}>
      <div style={{ background: "#1a2330", color: "#fff", padding: "20px 16px" }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>Classes</div>
        <div style={{ fontSize: 13, opacity: 0.7 }}>Cambridge Grade 8 · Term 2</div>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ background: "#8b1a2e", color: "#fff", borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{ fontWeight: 700 }}>Mathematics</div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>Mr. Olivier · Live now</div>
        </div>
        {[
          ["English", "Mrs. Daniels", "10:30"],
          ["Natural Sciences", "Mr. Kruger", "11:45"],
          ["History", "Ms. Abrahams", "13:00"],
        ].map(([s, t, time]) => (
          <div key={s} style={{ background: "#f8f7f4", borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <div style={{ fontWeight: 700 }}>{s}</div>
            <div style={{ fontSize: 13, color: "#555" }}>{t} · {time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}