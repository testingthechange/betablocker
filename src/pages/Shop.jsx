// src/pages/Shop.jsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

const DEMO_SHARE_ID = "share_2026-01-16T21-20-04-257Z_26d5b8";

function Card({ children, style }) {
  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.06)",
        boxShadow: "0 18px 55px rgba(0,0,0,0.35) inset, 0 10px 40px rgba(0,0,0,0.20)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default function Shop() {
  const nav = useNavigate();

  const fakeThumbs = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => ({
      id: `fake-${i}`,
      label: `Release ${i + 1}`,
    }));
  }, []);

  const goDemo = () => nav(`/product/${DEMO_SHARE_ID}`);

  return (
    <div style={{ padding: 18 }}>
      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.3 }}>Shop</div>
      <div style={{ fontSize: 13, opacity: 0.72, marginTop: 6 }}>
        Marketing + search landing (Directus later).
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
        {/* NEW RELEASES row (cosmetic only) */}
        <Card style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>New Releases</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{fakeThumbs.length}</div>
          </div>

          <div
            style={{
              marginTop: 12,
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
                  overflow: "hidden",
                }}
                title={t.label}
                aria-label={t.label}
              >
                <div
                  style={{
                    height: "100%",
                    width: "100%",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 11,
                    opacity: 0.8,
                  }}
                >
                  {t.label}
                </div>
              </button>
            ))}
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65 }}>
            Cosmetic thumbnails (not linked).
          </div>
        </Card>

        {/* REAL thumbnail under the row (links to Product) */}
        <Card style={{ padding: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>Featured</div>

          <button
            onClick={goDemo}
            style={{
              marginTop: 12,
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
                opacity: 0.85,
              }}
            >
              Album
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.15 }}>Demo Album</div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                Click to open Product page
              </div>
              <div style={{ fontSize: 12, opacity: 0.55, marginTop: 6 }}>{DEMO_SHARE_ID}</div>
            </div>
          </button>
        </Card>
      </div>
    </div>
  );
}
