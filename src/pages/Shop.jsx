// src/pages/Shop.jsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

const DEMO_SHARE_ID = "share_2026-01-16T21-20-04-257Z_26d5b8";

function Card({ title, right, children }) {
  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.06)",
        boxShadow: "0 18px 55px rgba(0,0,0,0.35) inset, 0 10px 40px rgba(0,0,0,0.20)",
        overflow: "hidden",
      }}
    >
      {(title || right) && (
        <div
          style={{
            padding: "12px 14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 900 }}>{title}</div>
          {right ? <div style={{ fontSize: 12, opacity: 0.75 }}>{right}</div> : null}
        </div>
      )}
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

export default function Shop() {
  const nav = useNavigate();

  const fakeThumbs = useMemo(
    () => Array.from({ length: 8 }).map((_, i) => ({ id: `fake-${i}`, label: `Release ${i + 1}` })),
    []
  );

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div>
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.3 }}>Shop</div>
        <div style={{ fontSize: 13, opacity: 0.72, marginTop: 6 }}>Marketing + search landing (Directus later).</div>
      </div>

      {/* New Releases row (cosmetic) */}
      <Card title="New Releases" right={String(fakeThumbs.length)}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {fakeThumbs.map((t) => (
            <button
              key={t.id}
              onClick={() => {}}
              style={{
                height: 56,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(0,0,0,0.25)",
                cursor: "pointer",
                padding: 0,
              }}
              title={t.label}
              aria-label={t.label}
            >
              <div style={{ height: "100%", display: "grid", placeItems: "center", fontSize: 11, opacity: 0.85 }}>
                {t.label}
              </div>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65 }}>Cosmetic thumbnails (not linked).</div>
      </Card>

      {/* Real thumbnail (links to Product) */}
      <Card title="Featured">
        <button
          onClick={() => nav(`/product/${DEMO_SHARE_ID}`)}
          style={{
            width: "100%",
            textAlign: "left",
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(0,0,0,0.22)",
            cursor: "pointer",
            padding: 14,
            display: "grid",
            gridTemplateColumns: "120px 1fr",
            gap: 14,
            alignItems: "center",
          }}
        >
          <div
            style={{
              height: 120,
              width: 120,
              borderRadius: 14,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.10)",
              display: "grid",
              placeItems: "center",
              fontSize: 12,
              opacity: 0.9,
            }}
          >
            Album
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.15 }}>Demo Album</div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>Click to open Product page</div>
            <div style={{ fontSize: 12, opacity: 0.55, marginTop: 6 }}>{DEMO_SHARE_ID}</div>
          </div>
        </button>
      </Card>
    </div>
  );
}
