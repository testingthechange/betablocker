import { Link, useSearchParams } from "react-router-dom";
import SiteShell from "../layouts/SiteShell.jsx";

const DEMO_SHARE_ID = "share_2026-01-16T21-20-04-257Z_26d5b8";

export default function Shop() {
  const [sp] = useSearchParams();
  const q = sp.get("q") || "";

  return (
    <SiteShell>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "22px 16px 40px" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Link
            to={`/product/${DEMO_SHARE_ID}`}
            style={{
              width: 340,
              textDecoration: "none",
              color: "inherit",
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                aspectRatio: "1 / 1",
                background: "rgba(255,255,255,0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                opacity: 0.85,
              }}
            >
              Album Art
            </div>
            <div style={{ padding: 12, display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 900, fontSize: 16, lineHeight: 1.2 }}>Demo Album</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                {q ? `Search: "${q}"` : "Tap to open"}
              </div>
            </div>
          </Link>
        </div>
      </div>
    </SiteShell>
  );
}
