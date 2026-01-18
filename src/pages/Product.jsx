// src/pages/Product.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchManifest, validateManifest } from "../lib/manifest.js";

const PREVIEW_SECONDS = 40;

// TEMP PROOF: remove later if you want
const BUILD_MARKER = "PRODUCT_RECEIVER_2COL_V1";

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

  // player state (LOCKED behavior)
  const audioRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [curTime, setCurTime] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setParsed(null);
    setErr(null);

    fetchManifest(shareId)
      .then((m) => {
        if (cancelled) return;
        const v = validateManifest(m);
        setParsed(v);
        setActiveIdx(0);
        setPlaying(false);
        setCurTime(0);
        setDur(0);
      })
      .catch((e) => {
        if (cancelled) return;
        setErr(String(e?.message || e));
      });

    return () => {
      cancelled = true;
    };
  }, [shareId]);

  const tracks = useMemo(() => parsed?.tracks || [], [parsed]);
  const activeTrack = tracks[activeIdx] || null;

  // Keep audio src aligned with active track
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    setCurTime(0);
    setDur(0);

    const url = activeTrack?.playbackUrl;
    if (!url) {
      try {
        a.pause();
      } catch {}
      setPlaying(false);
      return;
    }

    try {
      a.pause();
      a.currentTime = 0;
      a.src = url;
      a.load();
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrack?.playbackUrl]);

  // Wire audio events + enforce preview cap + autoplay next track
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onMeta = () => setDur(a.duration || 0);

    const onTime = () => {
      const t = a.currentTime || 0;
      setCurTime(t);

      // preview cap: hard stop at 40s
      if (t >= PREVIEW_SECONDS) {
        try {
          a.pause();
          a.currentTime = 0;
        } catch {}
        setPlaying(false);

        // autoplay next track (continuous)
        setActiveIdx((i) => {
          const next = Math.min(tracks.length - 1, i + 1);
          if (next !== i) {
            setTimeout(() => {
              const aa = audioRef.current;
              if (!aa) return;
              aa.play().catch(() => {});
            }, 0);
          }
          return next;
        });
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
  }, [tracks.length]);

  const playIndex = (i) => {
    if (!tracks[i]?.playbackUrl) return;
    setActiveIdx(i);
    setTimeout(() => {
      const a = audioRef.current;
      if (!a) return;
      a.play().catch(() => {});
    }, 0);
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a || !activeTrack?.playbackUrl) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  const prev = () => {
    setActiveIdx((i) => Math.max(0, i - 1));
    setTimeout(() => {
      const a = audioRef.current;
      if (a && playing) a.play().catch(() => {});
    }, 0);
  };

  const next = () => {
    setActiveIdx((i) => Math.min(tracks.length - 1, i + 1));
    setTimeout(() => {
      const a = audioRef.current;
      if (a && playing) a.play().catch(() => {});
    }, 0);
  };

  const onSeek = (e) => {
    const a = audioRef.current;
    if (!a) return;
    const v = Number(e.target.value);
    if (!Number.isFinite(v)) return;

    const clamped = Math.min(v, PREVIEW_SECONDS);
    try {
      a.currentTime = clamped;
      setCurTime(clamped);
    } catch {}
  };

  if (err) {
    return (
      <div style={{ minHeight: "100vh", background: "#07060b", color: "#fff", padding: 24 }}>
        <pre style={{ whiteSpace: "pre-wrap" }}>{err}</pre>
      </div>
    );
  }

  // Root full-viewport background + centered container (ONLY width control)
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        background:
          "radial-gradient(1000px 500px at 50% -10%, rgba(140,80,255,0.18), rgba(0,0,0,0) 60%), #07060b",
        color: "#fff",
      }}
    >
      {/* GLOBAL HEADER (single) */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(5,4,8,0.92)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 18px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}>
            <div style={{ fontWeight: 800, letterSpacing: 0.2 }}>Block Radius</div>

            <nav style={{ display: "flex", gap: 18, justifyContent: "center" }}>
              <Link to="/" style={{ color: "#fff", textDecoration: "none", opacity: 0.9 }}>
                Home
              </Link>
              <Link to="/shop" style={{ color: "#fff", textDecoration: "none", opacity: 0.9 }}>
                Shop
              </Link>
              <Link to="/account" style={{ color: "#fff", textDecoration: "none", opacity: 0.9 }}>
                Account
              </Link>
            </nav>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Link
                to="/login"
                style={{
                  color: "#111",
                  background: "#f2f2f2",
                  textDecoration: "none",
                  padding: "8px 14px",
                  borderRadius: 999,
                  fontWeight: 700,
                }}
              >
                Login
              </Link>
            </div>
          </div>

          <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}>
            <input
              placeholder="Search (Directus placeholder)..."
              style={{
                width: "min(820px, 100%)",
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                outline: "none",
              }}
            />
          </div>

          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7, textAlign: "center" }}>
            Search is a placeholder; Shop will later query Directus. Login will be Clerk.
          </div>
        </div>
      </header>

      {/* BODY */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "22px 18px 120px" }}>
        {/* PROOF */}
        <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 10 }}>{BUILD_MARKER}</div>

        {!parsed ? (
          <div style={{ opacity: 0.9 }}>Loading…</div>
        ) : (
          <>
            <h1 style={{ margin: "10px 0 18px", fontSize: 44, letterSpacing: -0.8 }}>Album</h1>

            {/* TWO COLUMN LAYOUT (RESTORED) */}
            <div style={{ display: "grid", gridTemplateColumns: "65% 35%", gap: 16, alignItems: "start" }}>
              {/* LEFT COLUMN */}
              <div
                style={{
                  borderRadius: 18,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.04)",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
                  overflow: "hidden",
                }}
              >
                <div style={{ padding: 14, fontSize: 12, opacity: 0.75 }}>Album Cover</div>

                <div
                  style={{
                    height: 320,
                    display: "grid",
                    placeItems: "center",
                    background: "rgba(0,0,0,0.25)",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div style={{ opacity: 0.8, fontWeight: 700 }}>No coverUrl in manifest</div>
                </div>

                <div style={{ padding: 16 }}>
                  {/* keep album title only; remove debug/shareId text */}
                  <div style={{ fontSize: 12, opacity: 0.65 }}>Album</div>
                  <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: -0.6 }}>
                    {parsed.albumTitle || "Album"}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div style={{ display: "grid", gap: 12 }}>
                {/* Album meta card (placeholders) */}
                <div
                  style={{
                    borderRadius: 18,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.04)",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
                    padding: 14,
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>Album Info</div>

                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ opacity: 0.8 }}>Name</div>
                      <div style={{ fontWeight: 800 }}>{parsed.albumTitle || "Album"}</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ opacity: 0.8 }}>Performer</div>
                      <div style={{ fontWeight: 700, opacity: 0.8 }}>—</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ opacity: 0.8 }}>Release Date</div>
                      <div style={{ fontWeight: 700, opacity: 0.8 }}>—</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ opacity: 0.8 }}>Total Time</div>
                      <div style={{ fontWeight: 700, opacity: 0.8 }}>—</div>
                    </div>
                  </div>
                </div>

                {/* Purchase card */}
                <div
                  style={{
                    borderRadius: 18,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.04)",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
                    padding: 14,
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>Purchase</div>
                  <button
                    style={{
                      width: "100%",
                      borderRadius: 999,
                      border: "1px solid rgba(56,255,160,0.35)",
                      background: "rgba(20,80,40,0.25)",
                      color: "#37ff9b",
                      fontSize: 18,
                      fontWeight: 900,
                      padding: "12px 14px",
                      cursor: "pointer",
                    }}
                    onClick={() => {}}
                  >
                    Buy $19.50
                  </button>
                </div>

                {/* Marketing card */}
                <div
                  style={{
                    borderRadius: 18,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.04)",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
                    padding: 14,
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>Included</div>
                  <div style={{ display: "grid", gap: 8, opacity: 0.9 }}>
                    <div>• 8 songs</div>
                    <div>• Smart Bridge mode</div>
                    <div>• Album mode</div>
                    <div>• Artist control</div>
                    <div>• Over 60 minutes of bonus authored bridge content</div>
                    <div>• FREE MP3 album mix download included</div>
                  </div>
                </div>

                {/* Tracks card */}
                <div
                  style={{
                    borderRadius: 18,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.04)",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
                    padding: 14,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>Tracks</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{tracks.length}</div>
                  </div>

                  <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                    {tracks.map((t, i) => {
                      const isActive = i === activeIdx;
                      return (
                        <button
                          key={i}
                          onClick={() => playIndex(i)}
                          style={{
                            textAlign: "left",
                            padding: "12px 12px",
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.10)",
                            background: isActive ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.06)",
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 12,
                            color: "#fff",
                          }}
                        >
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {t.title}
                          </span>
                          <span style={{ fontSize: 12, opacity: 0.7 }}>
                            {t.durationSec ? fmtTime(t.durationSec) : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Hidden audio element (no native controls / no 3-dot) */}
            <audio ref={audioRef} data-audio="product" preload="metadata" playsInline />
          </>
        )}
      </div>

      {/* BOTTOM PLAYER (KEEP DESIGN) */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(20,20,22,0.92)",
          borderTop: "1px solid rgba(255,255,255,0.10)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 18px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 180px", alignItems: "center", gap: 10 }}>
            {/* LEFT: play/pause */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={togglePlay}
                disabled={!activeTrack?.playbackUrl}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.10)",
                  color: "#fff",
                  fontSize: 18,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
                aria-label={playing ? "Pause" : "Play"}
                title={playing ? "Pause" : "Play"}
              >
                {playing ? "❚❚" : "▶"}
              </button>
            </div>

            {/* CENTER: now playing + timeline */}
            <div style={{ display: "grid", justifyItems: "center", gap: 6 }}>
              <div style={{ fontSize: 11, letterSpacing: 1.4, opacity: 0.65 }}>NOW PLAYING</div>
              <div style={{ fontSize: 16, fontWeight: 900 }}>
                {activeTrack ? activeTrack.title : "—"}
              </div>

              <div style={{ width: "min(760px, 100%)", display: "grid", gridTemplateColumns: "48px 1fr 48px", alignItems: "center", gap: 10 }}>
                <div style={{ textAlign: "right", fontSize: 12, opacity: 0.75 }}>{fmtTime(curTime)}</div>
                <input
                  type="range"
                  min={0}
                  max={Math.min(dur || 0, PREVIEW_SECONDS)}
                  step="0.01"
                  value={Math.min(curTime, Math.min(dur || 0, PREVIEW_SECONDS))}
                  onChange={onSeek}
                  style={{ width: "100%" }}
                  disabled={!dur}
                />
                <div style={{ fontSize: 12, opacity: 0.75 }}>{fmtTime(Math.min(dur || 0, PREVIEW_SECONDS))}</div>
              </div>

              <div style={{ fontSize: 12, opacity: 0.65 }}>Preview: {PREVIEW_SECONDS}s max</div>
            </div>

            {/* RIGHT: prev/next */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={prev}
                disabled={activeIdx <= 0}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  cursor: "pointer",
                  opacity: activeIdx <= 0 ? 0.4 : 1,
                }}
              >
                Prev
              </button>
              <button
                onClick={next}
                disabled={activeIdx >= tracks.length - 1}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  cursor: "pointer",
                  opacity: activeIdx >= tracks.length - 1 ? 0.4 : 1,
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
