import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";

function ProductPage() {
  const { shareId } = useParams();
  return (
    <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <h1 style={{ margin: 0 }}>Product</h1>
      <p style={{ marginTop: 12 }}>
        shareId: <code>{shareId}</code>
      </p>
      <p style={{ marginTop: 12, opacity: 0.8 }}>
        Next: fetch manifest from <code>import.meta.env.VITE_MANIFEST_BASE_URL</code> and render the fixed Product layout.
      </p>
    </div>
  );
}

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
        <Route path="/product/:shareId" element={<ProductPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
