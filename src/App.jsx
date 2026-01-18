// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./layouts/AppLayout.jsx";
import Product from "./pages/Product.jsx";
import Shop from "./pages/Shop.jsx";

function Home() {
  return <div>Home</div>;
}

function Account() {
  return <div>Account</div>;
}

function Login() {
  return <div>Login (Clerk placeholder)</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/account" element={<Account />} />
          <Route path="/login" element={<Login />} />
          <Route path="/product/:shareId" element={<Product />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
