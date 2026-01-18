import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "radial-gradient(1200px 700px at 30% 0%, rgba(120,60,220,0.22), transparent 60%), #07060b",
        color: "rgba(255,255,255,0.92)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 18px 90px" }}>
        <div style={{ marginTop: 8 }}>
          <h1 style={{ margin: 0, fontSize: 42, letterSpacing: "-0.02em" }}>
            Block Radius – Music for the fan
          </h1>
          <div style={{ marginTop: 10, fontSize: 16, opacity: 0.85 }}>
            Album format. Artist authored. Artist controlled. Fan supported.
          </div>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Link
              to="/shop"
              style={{
                textDecoration: "none",
                color: "inherit",
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
              }}
            >
              Browse Shop
            </Link>
            <Link
              to="/account"
              style={{
                textDecoration: "none",
                color: "inherit",
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              Account
            </Link>
          </div>
        </div>

        <div
          style={{
            marginTop: 28,
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 16,
          }}
        >
          <div
            style={{
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.06)",
              padding: 18,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>
              How we compare to Streaming
            </div>

            <div style={{ display: "grid", gap: 14, lineHeight: 1.55 }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Streaming provides music for the music listener.</div>
                <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.9 }}>
                  <li>Convenient, affordable, easy access to unlimited songs</li>
                </ul>
              </div>

              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Block Radius provides music for the music fan.</div>
                <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.9 }}>
                  <li>Album format, artist authored, artist controlled, fan supported</li>
                </ul>
              </div>
            </div>
          </div>

          <div
            style={{
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.06)",
              padding: 18,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>Smart bridge</div>

            <div style={{ lineHeight: 1.65, opacity: 0.92 }}>
              Our Smart bridge technology allows the artist to have full control of their music. They now can showcase
              how they want their fans to experience their art. With Smart bridge, artist take their fans on musical
              journey’s, tell stories and focus on providing quality entertainment.
              <br />
              <br />
              Smart bridge is designed to capture artist/fan connections through artist authored transitions. These
              transitions are designed to create anticipation which results in <span style={{ fontWeight: 800 }}>ENGAGEMENT</span>.
              Thus, a fan is born.
            </div>
          </div>

          <div
            style={{
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.06)",
              padding: 18,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>How it works</div>

            <div style={{ lineHeight: 1.65, opacity: 0.92 }}>
              Imagine the next time you listen to your favorite album, it plays and sounds different, <span style={{ fontWeight: 800 }}>EVERYTIME!</span>
              <br />
              <br />
              Like a DJ mix but now artist authored transitions. In between each song is a unique method/system for
              songs to blend into each other. That is what Smart bridge delivers. That is what Smart bridge delivers.
              This is Block Radius.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
