import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchManifest, validateManifest } from "../lib/manifest.js";

const PREVIEW_SECONDS = 40;

function fmtTime(sec) {
  const n = Number(sec);
  if (!Number.isFinite(n) || n < 0) return "0:00";
  const m = Math.floor(n / 60);
  const s = Math.floor(n % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function Product() {
  const { shareId } = useParams();

  const [parsed, setParsed] = useState(null);
  const [err, setErr] = useState(null);

  const audioRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [curTime, setCurTime] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    fetchManifest(shareId)
      .then((m) => setParsed(validateManifest(m)))
      .catch((e) => setErr(String(e?.message || e)));
  }, [shareId]);

  const tracks = useMemo(() => parsed?.tracks || [], [parsed]);
  const activeTrack = tracks[activeIdx] || null;
  const coverUrl = parsed?.coverUrl || "";

  // keep audio src aligned with active track
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const url = activeTrack?.playbackUrl;
    try {
      a.pause();
      a.currentTime = 0;
      if (url) {
        a.src = url;
        a.load();
      }
    } catch {}
  }, [activeTrack?.playbackUrl]);

  // wire audio events + enforce preview cap
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onMeta = () => setDur(a.duration || 0);

    const onTime = () => {
      const t = a.currentTime || 0;
      setCurTime(t);

      if (t >= PREVIEW_SECONDS) {
        try {
          a.pause();
          a.currentTime = 0;
        } catch {}
        setPlaying(false);
        setCurTime(0);
      }
    };

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);

    return () => {
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
    };
  }, []);

  const playIndex = (i) => {
    if (!tracks[i]?.playbackUrl) return;
    setActiveIdx(i);
    setTimeout(() => audioRef.current?.play().catch(() => {}), 0);
  };

  if (err) return <pre style={{ padding: 24 }}>{err}</pre>;
  if (!parsed) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f10", color: "#f2f2f2" }}>
      {/* GLOBAL HEADER */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(17,17,17,0.92)",
          borderBottom: "1px solid #2b2b2b",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "14px 18px",
            display: "grid",
            gridTemplateColumns: "1fr 2fr 1fr",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
            <Link to="/" style={{ color: "#fff", textDecoration: "none", fontWeight: 700, letterSpacing: 0.2 }}>
              Block Radius
            </Link>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 16, alignItems: "center" }}>
            <nav style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <Link to="/" style={{ color: "#e8e8e8", textDecoration: "none", fontSize: 13, opacity: 0.9 }}>
                Home
              </Link>
              <Link to="/shop" style={{ color: "#e8e8e8", textDecoration: "none", fontSize: 13, opacity: 0.9 }}>
                Shop
              </Link>
              <Link to="/account" style={{ color: "#e8e8e8", textDecoration: "none", fontSize: 13, opacity: 0.9 }}>
                Account
              </Link>
            </nav>

            <form action="/shop" method="get" style={{ width: "min(520px, 46vw)" }}>
              <input
                name="query"
                placeholder="Search (Directus placeholder)…"
                autoComplete="off"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 999,
                  border: "1px solid #2b2b2b",
                  background: "#151515",
                  color: "#fff",
                  outline: "none",
                }}
              />
            </form>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
            <Link
              to="/login"
              style={{
                color: "#111",
                textDecoration: "none",
                background: "#fff",
                padding: "8px 12px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Login
            </Link>
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 18px 10px" }}>
          <div style={{ fontSize: 11, opacity: 0.7 }}>
            Search is a placeholder; Shop will later query Directus.
          </div>
        </div>
      </header>

      {/* PAGE BODY (65/35) */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "22px 18px 140px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "65% 35%", gap: 18, alignItems: "start" }}>
          {/* LEFT (65): cover + meta */}
          <section
            style={{
              border: "1px solid #232323",
              background: "#141414",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 240,
                  aspectRatio: "1 / 1",
                  borderRadius: 14,
                  border: "1px solid #2b2b2b",
                  overflow: "hidden",
                  background: "#1c1c1c",
                  flex: "0 0 auto",
                }}
              >
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt="Album cover"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <div style={{ height: "100%", display: "grid", placeItems: "center", opacity: 0.65, fontSize: 12 }}>
                    No cover in manifest
                  </div>
                )}
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <h1 style={{ margin: 0, fontSize: 26, lineHeight: 1.1 }}>{parsed.albumTitle}</h1>

                <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>
                  shareId: <span style={{ opacity: 0.9 }}>{shareId}</span>
                </div>

                <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>
                  Preview cap: <strong style={{ color: "#fff" }}>{PREVIEW_SECONDS}s</strong>
                </div>

                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>Cover source</div>
                  <div
                    style={{
                      padding: "10px 12px",
                      border: "1px dashed #2b2b2b",
                      borderRadius: 12,
                      background: "#121212",
                      fontSize: 12,
                      opacity: 0.85,
                    }}
                  >
                    Reads <code>coverUrl</code> from manifest. Upload/replace will be wired later.
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT (35): now playing + tracks */}
          <aside style={{ display: "grid", gap: 18 }}>
            <div
              style={{
                border: "1px solid #232323",
                background: "#141414",
                borderRadius: 16,
                padding: 16,
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.7 }}>Now Playing</div>
              <div style={{ fontWeight: 700, marginTop: 6, overflow: "hidden", textOverflow: "ellipsis" }}>
                {activeTrack?.title || "—"}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                {fmtTime(curTime)} / {fmtTime(Math.min(dur || 0, PREVIEW_SECONDS))}
              </div>
            </div>

            <div
              style={{
                border: "1px solid #232323",
                background: "#141414",
                borderRadius: 16,
                padding: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                <div style={{ fontWeight: 700 }}>Tracks</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{tracks.length}</div>
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {tracks.map((t, i) => {
                  const isActive = i === activeIdx;
                  return (
                    <button
                      key={i}
                      onClick={() => playIndex(i)}
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid #2b2b2b",
                        background: isActive ? "#1f1f1f" : "#121212",
                        color: "#fff",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.title}
                      </span>
                      <span style={{ fontSize: 12, opacity: 0.75 }}>
                        {t.durationSec ? fmtTime(t.durationSec) : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>

        <audio ref={audioRef} data-audio="product" preload="metadata" playsInline />
      </main>

      {/* Bottom player */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "rgba(20,20,20,0.92)",
          color: "#fff",
          borderTop: "1px solid #2b2b2b",
          padding: 12,
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Now Playing</div>
            <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {activeTrack?.title || "—"}
            </div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              {fmtTime(curTime)} / {fmtTime(Math.min(dur || 0, PREVIEW_SECONDS))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => audioRef.current?.play().catch(() => {})}
              disabled={playing || !activeTrack?.playbackUrl}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #2b2b2b",
                background: "#fff",
                color: "#111",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Play
            </button>
            <button
              onClick={() => audioRef.current?.pause()}
              disabled={!playing}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #2b2b2b",
                background: "#151515",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Pause
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
