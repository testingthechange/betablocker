import React from "react";
import { Outlet, Link, NavLink, useNavigate } from "react-router-dom";

export default function AppLayout() {
  const navigate = useNavigate();

  const onSearchSubmit = (e) => {
    e.preventDefault();
    const q = e.currentTarget.q.value.trim();
    navigate(q ? `/shop?query=${encodeURIComponent(q)}` : "/shop");
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="header-inner">
          <div className="brand">
            <Link to="/" className="brand-link">Block Radius</Link>
          </div>

          <nav className="nav">
            <NavLink to="/shop" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              Shop
            </NavLink>
            <NavLink to="/account" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              Account
            </NavLink>
          </nav>

          <form className="search" onSubmit={onSearchSubmit}>
            <input name="q" type="search" placeholder="Search" />
          </form>

          <div className="auth">
            <Link to="/login" className="auth-link">Login</Link>
          </div>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
