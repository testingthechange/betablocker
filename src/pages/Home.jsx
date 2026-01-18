import SiteShell from "../layouts/SiteShell.jsx";

export default function Home() {
  return (
    <SiteShell>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 16px" }}>
        <h1 style={{ margin: 0, fontSize: 44, letterSpacing: -0.5 }}>Home</h1>
        <div style={{ opacity: 0.78, marginTop: 10, maxWidth: 820 }}>
          Placeholder. Shop is the marketing/search landing.
        </div>
      </div>
    </SiteShell>
  );
}
