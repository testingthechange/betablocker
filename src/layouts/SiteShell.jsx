import { Link, useNavigate, useSearchParams } from "react-router-dom";

export default function SiteShell({ children }) {
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const q = sp.get("q") || "";

  const onSubmit = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const nextQ = String(form.q.value || "").trim();
    navigate(`/shop${nextQ ? `?q=${encodeURIComponent(nextQ)}` : ""}`);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#fff" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 16px" }}>
          {/* Row 1: brand left, login right */}
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
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
                Login
              </Link>
            </div>
          </div>

          {/* Row 2: centered nav */}
          <nav style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 10 }}>
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

          {/* Row 3: search centered (one line lower) */}
          <form onSubmit={onSubmit} style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
            <input
              name="q"
              defaultValue={q}
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
          </form>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
