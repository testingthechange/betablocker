import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import AppLayout from "./layouts/AppLayout.jsx";
import Product from "./pages/Product.jsx";

const DEMO_SHARE_ID = "share_2026-01-16T21-20-04-257Z_26d5b8";

function Home() {
  return (
    <div style={{ padding: 18 }}>
      <h1 style={{ margin: 0, fontSize: 42, letterSpacing: -0.4 }}>Home</h1>
      <div style={{ marginTop: 10, opacity: 0.75 }}>
        Marketing landing will live here.
      </div>
    </div>
  );
}

function Shop() {
  const card = {
    display: "grid",
    gridTemplateColumns: "160px 1fr",
    gap: 14,
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.06)",
    boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
    textDecoration: "none",
    maxWidth: 820,
  };

  const thumb = {
    width: 160,
    height: 160,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    opacity: 0.8,
  };

  return (
    <div style={{ padding: 18 }}>
      <h1 style={{ margin: 0, fontSize: 42, letterSpacing: -0.4 }}>Shop</h1>
      <div style={{ marginTop: 10, opacity: 0.75 }}>
        Click the album to open the Product page.
      </div>

      <div style={{ marginTop: 18 }}>
        <Link to={`/product/${DEMO_SHARE_ID}`} style={card}>
          <div style={thumb}>Album</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>Album</div>
            <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>
              Demo product (shareId fixed)
            </div>
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
              Opens: /product/{DEMO_SHARE_ID}
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

function Account() {
  return (
    <div style={{ padding: 18 }}>
      <h1 style={{ margin: 0, fontSize: 42, letterSpacing: -0.4 }}>Account</h1>
      <div style={{ marginTop: 10, opacity: 0.75 }}>
        Account area placeholder.
      </div>
    </div>
  );
}

function Login() {
  return (
    <div style={{ padding: 18 }}>
      <h1 style={{ margin: 0, fontSize: 42, letterSpacing: -0.4 }}>Login</h1>
      <div style={{ marginTop: 10, opacity: 0.75 }}>
        Clerk placeholder.
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/account" element={<Account />} />
          <Route path="/login" element={<Login />} />
          <Route path="/product/:shareId" element={<Product />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}
