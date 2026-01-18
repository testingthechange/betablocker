import { Link } from "react-router-dom";

const DEMO_SHARE_ID = "share_2026-01-16T21-20-04-257Z_26d5b8";

export default function Shop() {
  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#fff" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ padding: "14px 16px", display: "grid", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <strong>Block Radius</strong>
              <div style={{ marginLeft: "auto" }}>
                <Link
                  to="/login"
                  style={{
                    background: "#fff",
                    color: "#111",
                    padding: "8px 14px",
                    borderRadius: 999,
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  Login
                </Link>
              </div>
            </div>

            <nav style={{ display: "flex", justifyContent: "center", gap: 18 }}>
              <Link to="/" style={{ color: "#fff", textDecoration: "none" }}>
                Home
              </Link>
              <Link to="/shop" style={{ color: "#fff", textDecoration: "none" }}>
                Shop
              </Link>
              <Link to="/account" style={{ color: "#fff", textDecoration: "none" }}>
                Account
              </Link>
            </nav>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <input
                type="search"
                placeholder="Search (Directus placeholder)…"
                style={{
                  width: 520,
                  maxWidth: "92%",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 999,
                  padding: "10px 14px",
                  color: "#fff",
                }}
              />
            </div>
          </div>
        </header>

        <main style={{ padding: "22px 16px 40px" }}>
          {/* ONE thumbnail only */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Link
              to={`/product/${DEMO_SHARE_ID}`}
              style={{
                width: 320,
                textDecoration: "none",
                color: "inherit",
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                overflow: "hidden",
              }}
            >
              <div style={{ aspectRatio: "1 / 1", background: "rgba(255,255,255,0.10)" }} />
              <div style={{ padding: 12, display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 900, fontSize: 16, lineHeight: 1.2 }}>Demo Album</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>Tap to open</div>
              </div>
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
