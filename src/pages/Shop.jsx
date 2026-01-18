import { Link } from "react-router-dom";

const PRODUCT_LINK = "/product/share_2026-01-16T21-20-04-257Z_26d5b8";

export default function Shop() {
  return (
    <div
      style={{
        width: "100%",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "40px 24px 80px",
          color: "#fff",
        }}
      >
        <h1 style={{ fontSize: 32, marginBottom: 20 }}>Shop music authored for the fan!!!!</h1>

        {/* NEW RELEASES */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>New Releases</div>

          {/* Cosmetic thumbnails (do not link) */}
          <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 10,
                  background: "#222",
                  opacity: 0.55,
                  cursor: "pointer",
                }}
                title="Coming soon"
              />
            ))}
          </div>

          {/* TWO COLUMNS UNDER NEW RELEASES (60/40) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "60% 40%",
              gap: 28,
              alignItems: "start",
            }}
          >
            {/* LEFT: MARKETING IMAGE (static branding, not album/artist) */}
            <div
              style={{
                borderRadius: 16,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "#111",
                boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
              }}
            >
              <img
                src="/the-vibrant-atmosphere-of-a-music-festival-with-a-crowd-of-enthusiastic-fans-cheering-for-their-favorite-band-generative-ai-photo.jpg"
                alt="Marketing"
                style={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  objectFit: "cover",
                }}
              />
            </div>

            {/* RIGHT: THUMBNAILS (links to product pages) */}
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
                Albums Available
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
                {/* REAL THUMBNAIL (links to Product) */}
                <Link to={PRODUCT_LINK} style={{ textDecoration: "none" }}>
                  <div
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      borderRadius: 14,
                      padding: 12,
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "1 / 1",
                        borderRadius: 10,
                        background: "linear-gradient(135deg, #2a163a, #0b0b0f)",
                        marginBottom: 10,
                        border: "1px solid rgba(255,255,255,0.10)",
                      }}
                    />
                    <div style={{ color: "#fff", fontWeight: 650, marginBottom: 4 }}>Album</div>
                    <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>View product</div>
                  </div>
                </Link>

                {/* PLACEHOLDER THUMBNAILS (cosmetic only for now; no link) */}
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 14,
                      padding: 12,
                      opacity: 0.55,
                    }}
                    title="Coming soon"
                  >
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "1 / 1",
                        borderRadius: 10,
                        background: "#1b1b22",
                        marginBottom: 10,
                      }}
                    />
                    <div style={{ color: "#fff", fontSize: 13 }}>Coming soon</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
                Thumbnails link to product pages.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
