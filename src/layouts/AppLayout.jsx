import { Link, useLocation } from "react-router-dom";

export default function AppLayout({ children }) {
  const loc = useLocation();

  const isActive = (path) => (loc.pathname === path ? 1 : 0);

  const shell = {
    minHeight: "100vh",
    width: "100%",
    background: "transparent",
  };

  const container = {
    width: "100%",
    maxWidth: 1200,
    margin: "0 auto",
    padding: "16px 18px",
  };

  const headerWrap = {
    position: "sticky",
    top: 0,
    zIndex: 100,
    backdropFilter: "blur(10px)",
    background: "linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0.25))",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  };

  const rowTop = {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 12,
    paddingBottom: 10,
  };

  const brand = {
    fontWeight: 800,
    letterSpacing: 0.2,
  };

  const nav = {
    display: "flex",
    gap: 18,
    justifyContent: "center",
    fontWeight: 600,
    opacity: 0.9,
  };

  const navLink = (active) => ({
    textDecoration: "none",
    padding: "6px 10px",
    borderRadius: 999,
    background: active ? "rgba(255,255,255,0.08)" : "transparent",
    border: active ? "1px solid rgba(255,255,255,0.10)" : "1px solid transparent",
  });

  const loginWrap = {
    display: "flex",
    justifyContent: "flex-end",
  };

  const loginBtn = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "9px 14px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.92)",
    color: "#111",
    fontWeight: 700,
    textDecoration: "none",
  };

  const rowSearch = {
    display: "flex",
    justifyContent: "center",
    paddingBottom: 14,
  };

  const search = {
    width: "min(720px, 100%)",
    padding: "12px 14px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.92)",
    outline: "none",
  };

  const helper = {
    marginTop: 8,
    fontSize: 12,
    opacity: 0.6,
    textAlign: "center",
    paddingBottom: 10,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  };

  return (
    <div style={shell}>
      <header style={headerWrap}>
        <div style={container}>
          <div style={rowTop}>
            <div style={brand}>Block Radius</div>

            <nav style={nav}>
              <Link to="/" style={navLink(isActive("/"))}>Home</Link>
              <Link to="/shop" style={navLink(isActive("/shop"))}>Shop</Link>
              <Link to="/account" style={navLink(isActive("/account"))}>Account</Link>
            </nav>

            <div style={loginWrap}>
              {/* Placeholder for Clerk */}
              <Link to="/login" style={loginBtn} title="Login (Clerk placeholder)">
                Login
              </Link>
            </div>
          </div>

          <div style={rowSearch}>
            <input
              style={search}
              placeholder="Search (Directus placeholder)…"
              disabled
            />
          </div>

          <div style={helper}>
            Search is a placeholder; Shop will later query Directus. Login will be Clerk.
          </div>
        </div>
      </header>

      {/* ONLY centered page body container */}
      <main style={container}>{children}</main>
    </div>
  );
}
