import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background:
          "radial-gradient(1200px 700px at 30% 0%, rgba(120,60,220,0.22), transparent 60%), #07060b",
        color: "rgba(255,255,255,0.92)",
      }}
    >
      {/* RECEIVER ROOT — DO NOT MOVE */}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "28px 18px 96px",
        }}
      >
        <h1 style={{ fontSize: 42, margin: 0 }}>
          Block Radius – Music for the fan
        </h1>

        <p style={{ marginTop: 10, opacity: 0.85 }}>
          Album format. Artist authored. Artist controlled. Fan supported.
        </p>

        <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
          <Link
            to="/shop"
            style={{
              textDecoration: "none",
              color: "#fff",
              padding: "10px 16px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.12)",
            }}
          >
            Browse Shop
          </Link>
          <Link
            to="/account"
            style={{
              textDecoration: "none",
              color: "#fff",
              padding: "10px 16px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
            }}
          >
            Account
          </Link>
        </div>

        {/* STREAMING VS FAN */}
        <section
          style={{
            marginTop: 32,
            padding: 20,
            borderRadius: 18,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <h3>How we compare to Streaming</h3>

          <p>
            <strong>Streaming</strong> provides music for the music listener.
          </p>
          <ul>
            <li>Convenient, affordable, unlimited access</li>
          </ul>

          <p>
            <strong>Block Radius</strong> provides music for the music fan.
          </p>
          <ul>
            <li>Album format</li>
            <li>Artist authored</li>
            <li>Artist controlled</li>
            <li>Fan supported</li>
          </ul>
        </section>

        {/* SMART BRIDGE */}
        <section
          style={{
            marginTop: 24,
            padding: 20,
            borderRadius: 18,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <h3>Smart bridge</h3>

          <p style={{ lineHeight: 1.6 }}>
            Smart bridge allows artists to control how fans experience their
            music. Songs are connected through artist-authored transitions that
            create anticipation, engagement, and emotional flow.
          </p>

          <p style={{ lineHeight: 1.6 }}>
            These transitions turn listeners into fans.
          </p>
        </section>

        {/* HOW IT WORKS */}
        <section
          style={{
            marginTop: 24,
            padding: 20,
            borderRadius: 18,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <h3>How it works</h3>

          <p style={{ lineHeight: 1.6 }}>
            Imagine listening to your favorite album and it sounds different
            every time.
          </p>

          <p style={{ lineHeight: 1.6 }}>
            Like a DJ mix — but artist authored. That is Smart bridge.
            <br />
            That is Block Radius.
          </p>
        </section>
      </div>
    </div>
  );
}
