import { Outlet, Link } from "react-router-dom";

export default function AppLayout() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background:
          "radial-gradient(1200px 600px at 50% -200px, #2a163a 0%, #0b0b0f 60%, #000 100%)",
        color: "#fff",
      }}
    >
      {/* GLOBAL HEADER */}
      <header
        style={{
          borderBottom: "1px solid #222",
          padding: "16px 0",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 24px",
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
          }}
        >
          <strong>Block Radius</strong>

          <nav style={{ display: "flex", gap: 24, justifyContent: "center" }}>
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

          <div style={{ textAlign: "right" }}>
            <span style={{ opacity: 0.7 }}>Login</span>
          </div>
        </div>
      </header>

      {/* PAGE CONTENT */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}
