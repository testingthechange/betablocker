import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Product from "./pages/Product.jsx";

function Home() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <h1 style={{ margin: 0 }}>betablocker</h1>
      <p style={{ marginTop: 12 }}>
        Try: <code>/product/demo</code>
      </p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/product/:shareId" element={<Product />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
