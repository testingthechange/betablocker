import SiteShell from "../layouts/SiteShell.jsx";

export default function Home() {
  return (
    <SiteShell>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 16px 40px" }}>
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            borderRadius: 18,
            padding: 18,
          }}
        >
          <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: -0.5 }}>Home</div>
          <div style={{ marginTop: 10, opacity: 0.82, maxWidth: 820 }}>
            Placeholder. Shop is the marketing/search landing. Product is the receiver for publish manifests.
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
