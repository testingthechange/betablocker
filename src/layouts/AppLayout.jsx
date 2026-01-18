// src/layouts/AppLayout.jsx
import { Link, Outlet, useLocation } from "react-router-dom";

const BG = "radial-gradient(900px 500px at 40% 10%, rgba(140,70,255,0.18), transparent 60%), radial-gradient(800px 520px at 70% 30%, rgba(90,40,210,0.16), transparent 60%), #05040a";

function NavLink({ to, children }) {
  const loc = useLocation();
  const active = loc.pathname === to || (to !== "/" && loc.pathname.startsWith(to));
  return (
    <Link
      to={to}
      style={{
        textDecoration: "none",
        color: active ? "#ffffff" : "rgba(255,255,255,0.82)",
        fontWeight: 650,
        padding: "6px 10px",
        borderRadius: 999,
        background: active ? "rgba(255,255,255,0.10)" : "transparent",
        border: active ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent",
      }}
    >
      {children}
    </Link>
  );
}

export default function AppLayout() {
  return (
    <div style={{ minHeight: "100vh", width: "100%", background: BG, color: "#fff" }}>
      {/* SINGLE global header (ONLY place it exists) */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          backdropFilter: "blur(10px)",
          background: "rgba(0,0,0,0.35)",
          borderBottom: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        {/* full-width row */}
        <div style={{ width: "100%" }}>
          {/* centered container */}
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "12px 16px" }}>
            {/* top line: brand / nav / login */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ fontWeight: 900, letterSpacing: -0.2 }}>Block Radius</div>

              <nav style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <NavLink to="/">Home</NavLink>
                <NavLink to="/shop">Shop</NavLink>
                <NavLink to="/account">Account</NavLink>
              </nav>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Link
                  to="/login"
                  style={{
                    textDecoration: "none",
                    color: "#111",
                    background: "#fff",
                    borderRadius: 999,
                    padding: "8px 14px",
                    fontWeight: 800,
                    border: "1px solid rgba(255,255,255,0.20)",
                  }}
                >
                  Login
                </Link>
              </div>
            </div>

            {/* second line: search */}
            <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}>
              <input
                placeholder="Search (Directus placeholder)…"
                style={{
                  width: "min(760px, 100%)",
                  padding: "12px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ marginTop: 8, textAlign: "center", fontSize: 12, opacity: 0.7 }}>
              Search is a placeholder; Shop will later query Directus. Login will be Clerk.
            </div>
          </div>
        </div>
      </header>

      {/* page container (ONLY place max-width is applied) */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "18px 16px 120px" }}>
        <Outlet />
      </main>
    </div>
  );
}
