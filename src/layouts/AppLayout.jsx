import React, { useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

export default function AppLayout() {
  const nav = useNavigate();
  const loc = useLocation();
  const [q, setQ] = useState("");

  const isActive = useMemo(() => {
    const p = loc.pathname;
    return {
      home: p === "/",
      shop: p.startsWith("/shop"),
      account: p.startsWith("/account"),
    };
  }, [loc.pathname]);

  const onSubmit = (e) => {
    e.preventDefault();
    const query = String(q || "").trim();
    nav(`/shop${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background:
          "radial-gradient(1200px 600px at 20% -10%, rgba(120,60,255,0.18), transparent 55%), radial-gradient(900px 500px at 90% 10%, rgba(40,120,255,0.10), transparent 55%), linear-gradient(180deg, #07060b 0%, #05040a 45%, #060410 100%)",
        color: "#fff",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(7,6,11,0.75)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "14px 16px" }}>
          {/* Row 1: brand / nav / login */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link to="/" style={{ color: "#fff", textDecoration: "none", fontWeight: 800 }}>
              Block Radius
            </Link>

            <nav style={{ margin: "0 auto", display: "flex", gap: 16, fontSize: 14 }}>
              <Link
                to="/"
                style={{
                  color: "#fff",
                  textDecoration: "none",
                  opacity: isActive.home ? 1 : 0.75,
                }}
              >
                Home
              </Link>
              <Link
                to="/shop"
                style={{
                  color: "#fff",
                  textDecoration: "none",
                  opacity: isActive.shop ? 1 : 0.75,
                }}
              >
                Shop
              </Link>
              <Link
                to="/account"
                style={{
                  color: "#fff",
                  textDecoration: "none",
                  opacity: isActive.account ? 1 : 0.75,
                }}
              >
                Account
              </Link>
            </nav>

            <Link to="/login" style={{ color: "#fff", textDecoration: "none", opacity: 0.85 }}>
              Login
            </Link>
          </div>

          {/* Row 2: search (placeholder for Directus) */}
          <form onSubmit={onSubmit} style={{ marginTop: 10 }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search (Directus placeholder)…"
              style={{
                width: "100%",
                maxWidth: 520,
                display: "block",
                margin: "0 auto",
                padding: "10px 12px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                outline: "none",
              }}
            />
          </form>
        </div>
      </header>

      {/* Page outlet */}
      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "18px 16px 140px" }}>
        <Outlet />
      </main>
    </div>
  );
}
