import React from "react";

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background:
          "radial-gradient(1200px 600px at 20% -10%, rgba(120,60,255,0.18), transparent 55%), radial-gradient(900px 500px at 90% 10%, rgba(40,120,255,0.10), transparent 55%), linear-gradient(180deg, #07060b 0%, #05040a 45%, #060410 100%)",
        color: "#fff",
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "36px 16px 120px",
        }}
      >
        <div style={{ maxWidth: 920 }}>
          <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 10 }}>
            Block Radius – Music for the fan
          </div>

          <h1 style={{ fontSize: 44, lineHeight: 1.1, margin: "0 0 18px" }}>
            Block Radius – Music for the fan
          </h1>

          <div
            style={{
              fontSize: 18,
              lineHeight: 1.7,
              opacity: 0.92,
              marginBottom: 26,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 10 }}>
              How we compare to Streaming
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 650 }}>Streaming provides music for the music listener.</div>
              <div style={{ paddingLeft: 18, opacity: 0.9 }}>
                • Convenient, affordable, easy access to unlimited songs
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 650 }}>Block Radius provides music for the music fan.</div>
              <div style={{ paddingLeft: 18, opacity: 0.9 }}>
                • Album format, artist authored, artist controlled, fan supported
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 700 }}>Smart bridge</div>
              <div style={{ opacity: 0.92 }}>
                Our Smart bridge technology allows the artist to have full control of their music. They now can
                showcase how they want their fans to experience their art. With Smart bridge, artist take their
                fans on musical journey’s, tell stories and focus on providing quality entertainment. Smart bridge
                is designed to capture artist/fan connections through artist authored transitions. These
                transitions are designed to create anticipation which results in <span style={{ fontWeight: 800 }}>ENGAGEMENT</span>.
                Thus, a fan is born.
              </div>
            </div>

            <div style={{ fontWeight: 700, marginBottom: 8 }}>How it works.</div>
            <div style={{ opacity: 0.92 }}>
              Imagine the next time you listen to your favorite album, it plays and sounds different, EVERYTIME!
              Like a DJ mix but now artist authored transitions. In between each song is a unique method/system
              for songs to blend into each other. That is what Smart bridge delivers. That is Block Radius.
            </div>
          </div>

          <div
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
              borderRadius: 18,
              padding: 18,
              maxWidth: 920,
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 6 }}>
              Note
            </div>
            <div style={{ fontSize: 16, lineHeight: 1.6, opacity: 0.92 }}>
              This is marketing copy for the Home page receiver. Layout: full-viewport background + centered max-width container.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
