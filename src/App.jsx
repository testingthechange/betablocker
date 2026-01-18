import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./layouts/AppLayout.jsx";
import Product from "./pages/Product.jsx";

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
  // Placeholder landing; you can swap this to a real catalog later.
  return (
    <div style={{ padding: 18 }}>
      <h1 style={{ margin: 0, fontSize: 42, letterSpacing: -0.4 }}>Shop</h1>
      <div style={{ marginTop: 10, opacity: 0.75 }}>
        Search landing (Directus later).
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
