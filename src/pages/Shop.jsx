import { Link } from "react-router-dom";

const PRODUCT_LINK =
  "/product/share_2026-01-16T21-20-04-257Z_26d5b8";

export default function Shop() {
  return (
    <div>
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "40px 24px 80px",
        }}
      >
        <h1 style={{ fontSize: 32, marginBottom: 20 }}>
          Shop music authored for the fan!!!!
        </h1>

        {/* NEW RELEASES */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>
            New Releases
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 10,
                  background: "#222",
                  opacity: 0.5,
                }}
              />
            ))}
          </div>
        </div>

        {/* TWO COLUMNS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "60% 40%",
            gap: 32,
          }}
        >
          {/* LEFT IMAGE */}
          <div>
            <img
              src="/the-vibrant-atmosphere-of-a-music-festival-with-a-crowd-of-enthusiastic-fans-cheering-for-their-favorite-band-generative-ai-photo.jpg"
              alt="Music crowd"
              style={{
                width: "100%",
                borderRadius: 16,
                display: "block",
              }}
            />
          </div>

          {/* RIGHT ALBUMS */}
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
              Available Albums
            </div>

            <Link to={PRODUCT_LINK} style={{ textDecoration: "none" }}>
              <div
                style={{
                  background: "#14141a",
                  borderRadius: 14,
                  padding: 16,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    borderRadius: 10,
                    background: "#222",
                    marginBottom: 10,
                  }}
                />
                <div style={{ color: "#fff", fontWeight: 600 }}>
                  Album
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
