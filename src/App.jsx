import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home.jsx";
import Shop from "./pages/Shop.jsx";
import Product from "./pages/Product.jsx";

function Account() {
  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#fff", padding: 24 }}>
      <h1 style={{ margin: 0 }}>Account</h1>
      <p style={{ opacity: 0.8, marginTop: 10 }}>Placeholder.</p>
    </div>
  );
}

function Login() {
  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#fff", padding: 24 }}>
      <h1 style={{ margin: 0 }}>Login</h1>
      <p style={{ opacity: 0.8, marginTop: 10 }}>Placeholder (Clerk later).</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/product/:shareId" element={<Product />} />
        <Route path="/account" element={<Account />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
