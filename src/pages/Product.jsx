// src/pages/Product.jsx
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

function IconPlay({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M8 5v14l11-7z" />
    </svg>
  );
}
function IconPause({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M7 5h4v14H7zM13 5h4v14h-4z" />
    </svg>
  );
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
    let cancelled = false;

    setParsed(null);
    setErr(null);
    setActiveIdx(0);
    setPlaying(false);
    setCurTime(0);
    setDur(0);

    fetchManifest(shareId)
      .then((m) => {
        if (cancelled) return;
        const v = validateManifest(m);
        setParsed(v);
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

  const cap = PREVIEW_SECONDS;

  const setSrcForActive = (autoplay) => {
    const a = audioRef.current;
    const url = activeTrack?.playbackUrl;
    if (!a) return;

    try {
      a.pause();
      a.currentTime = 0;
      setCurTime(0);
      setDur(0);

      if (!url) {
        setPlaying(false);
        return;
      }

      a.src = url;
      a.load();

      if (autoplay) {
        a.play().catch(() => {});
      }
    } catch {
      setPlaying(false);
    }
  };

  // keep audio src aligned with active track
  useEffect(() => {
    setSrcForActive(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrack?.playbackUrl]);

  const advanceTo = (nextIdx, autoplay) => {
    const clamped = Math.max(0, Math.min(tracks.length - 1, nextIdx));
    setActiveIdx(clamped);
    // wait for state -> effect, then play
    setTimeout(() => setSrcForActive(autoplay), 0);
  };

  const advanceNext = (autoplay) => {
    if (tracks.length <= 0) return;
    if (activeIdx >= tracks.length - 1) {
      // end of playlist
      const a = audioRef.current;
      try {
        if (a) {
          a.pause();
          a.currentTime = 0;
        }
      } catch {}
      setPlaying(false);
      setCurTime(0);
      return;
    }
    advanceTo(activeIdx + 1, autoplay);
  };

  const prev = () => {
    if (tracks.length <= 0) return;
    advanceTo(activeIdx - 1, playing);
  };

  const next = () => {
    if (tracks.length <= 0) return;
    advanceTo(activeIdx + 1, playing);
  };

  const playIndex = (i) => {
    if (!tracks[i]?.playbackUrl) return;
    advanceTo(i, true);
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a || !activeTrack?.playbackUrl) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  const onSeek = (e) => {
    const a = audioRef.current;
    if (!a) return;
    const v = Number(e.target.value);
    if (!Number.isFinite(v)) return;

    const clamped = Math.max(0, Math.min(v, cap));
    try {
      a.currentTime = clamped;
      setCurTime(clamped);
    } catch {}
  };

  // wire audio events + enforce preview cap + continuous playlist
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onMeta = () => setDur(a.duration || 0);

    const onTime = () => {
      const t = a.currentTime || 0;
      setCurTime(t);

      // preview cap: when it hits cap, advance to next track and autoplay
      if (t >= cap) {
        advanceNext(true);
      }
    };

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    // if track ends before cap, also advance playlist
    const onEnded = () => {
      setPlaying(false);
      setCurTime(0);
      advanceNext(true);
    };

    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);

    return () => {
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks.length, activeIdx]);

  if (err) {
    return (
      <div style={{ minHeight: "100vh", background: "#100a1a", color: "#fff", padding: 24 }}>
        <pre style={{ whiteSpace: "pre-wrap" }}>{err}</pre>
      </div>
    );
  }

  if (!parsed) {
    return (
      <div style={{ minHeight: "100vh", background: "#100a1a", color: "#fff", padding: 24 }}>
        Loading…
      </div>
    );
  }

  const meta = parsed?.meta || {};
  const coverUrl = String(parsed?.coverUrl || "");
  const showCover = Boolean(coverUrl);

  const pageBg = "#100a1a"; // black-purple tint

  const cardStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 16,
    padding: 14,
  };

  const titleStyle = { fontSize: 14, opacity: 0.8, marginBottom: 6 };
  const valueStyle = { fontSize: 14, fontWeight: 700 };

  const capMax = Math.min(dur || cap, cap);
  const curShown = Math.min(curTime, capMax);

  return (
    <div style={{ minHeight: "100vh", background: pageBg, color: "#fff" }}>
      {/* GLOBAL HEADER */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(16,10,26,0.92)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "12px 16px",
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>Block Radius</div>

            <nav style={{ display: "flex", gap: 14, margin: "0 auto" }}>
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

            <div style={{ marginLeft: "auto" }}>
              <Link to="/login" style={{ color: "#fff", textDecoration: "none", opacity: 0.9 }}>
                Login
              </Link>
            </div>
          </div>

          {/* Search row (one line below login row) */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <input
              placeholder="Search (Divertus)…"
              style={{
                width: "min(760px, 100%)",
                padding: "10px 12px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                outline: "none",
              }}
            />
          </div>
        </div>
      </header>

      {/* ROOT LAYOUT CONTAINER (controls width only here) */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "18px 16px 140px" }}>
        <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 16 }}>{parsed.albumTitle || "Album"}</div>

        {/* Two-column layout 65/35 */}
        <div style={{ display: "grid", gridTemplateColumns: "65% 35%", gap: 16 }}>
          {/* LEFT COLUMN */}
          <div style={{ ...cardStyle, minHeight: 380 }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>Album</div>

            {showCover ? (
              <img
                src={coverUrl}
                alt=""
                style={{
                  width: "100%",
                  height: 320,
                  objectFit: "cover",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.04)",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: 320,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.04)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0.8,
                }}
              >
                No cover in manifest
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: "grid", gap: 12 }}>
            {/* Card 1: Buy */}
            <div style={cardStyle}>
              <button
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "none",
                  background: "#2dd4bf",
                  color: "#0b0a0f",
                  fontWeight: 900,
                  cursor: "pointer",
                  fontSize: 16,
                }}
                onClick={() => {}}
              >
                Buy — $19.50
              </button>
            </div>

            {/* Card 2: Marketing */}
            <div style={cardStyle}>
              <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 8 }}>What you get</div>
              <div style={{ display: "grid", gap: 6, fontSize: 13, opacity: 0.92, lineHeight: 1.35 }}>
                <div>• 8 songs</div>
                <div>• Smart bridge mode</div>
                <div>• Album mode</div>
                <div>• Artist control</div>
                <div>• Over 60 minutes of bonus authored bridge content</div>
                <div>• FREE MP3 album mix download included</div>
              </div>
            </div>

            {/* Card 3: Album Info (future-ready fields) */}
            <div style={cardStyle}>
              <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 10 }}>Album Info</div>

              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <div style={titleStyle}>Album name</div>
                  <div style={valueStyle}>{meta?.albumTitle || parsed.albumTitle || "—"}</div>
                </div>
                <div>
                  <div style={titleStyle}>Performer</div>
                  <div style={valueStyle}>{meta?.artistName || "—"}</div>
                </div>
                <div>
                  <div style={titleStyle}>Release date</div>
                  <div style={valueStyle}>{meta?.releaseDate || "—"}</div>
                </div>
                <div>
                  <div style={titleStyle}>Total album time</div>
                  <div style={valueStyle}>—</div>
                </div>
              </div>
            </div>

            {/* Card 4: Tracks */}
            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontSize: 16, fontWeight: 900 }}>Tracks</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>{tracks.length}</div>
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {tracks.map((t, i) => {
                  const isActive = i === activeIdx;
                  const rightTime = t?.durationSec ? fmtTime(t.durationSec) : "—";
                  return (
                    <button
                      key={`${t.slot || i}-${i}`}
                      onClick={() => playIndex(i)}
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: isActive ? "rgba(45,212,191,0.12)" : "rgba(255,255,255,0.04)",
                        color: "#fff",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.title || `Track ${t.slot || i + 1}`}
                      </span>
                      <span style={{ fontSize: 12, opacity: 0.75, flex: "0 0 auto" }}>{rightTime}</span>
                    </button>
                  );
                })}

                {!tracks.length ? (
                  <div style={{ opacity: 0.8, padding: "10px 0" }}>No tracks in manifest.</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* audio element (no native controls) */}
      <audio ref={audioRef} data-audio="product" preload="metadata" playsInline />

      {/* Bottom player (layout preserved, no debug text) */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          borderTop: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(16,10,26,0.92)",
          backdropFilter: "blur(10px)",
          padding: "10px 12px",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}>
            {/* Play/Pause far left */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-start" }}>
              <button
                onClick={togglePlay}
                disabled={!activeTrack?.playbackUrl}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  cursor: activeTrack?.playbackUrl ? "pointer" : "not-allowed",
                }}
                aria-label={playing ? "Pause" : "Play"}
                title={playing ? "Pause" : "Play"}
              >
                {playing ? <IconPause size={20} /> : <IconPlay size={20} />}
              </button>
            </div>

            {/* Now Playing centered */}
            <div style={{ textAlign: "center", minWidth: 0 }}>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Now Playing</div>
              <div
                style={{
                  fontWeight: 900,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {activeTrack ? activeTrack.title : "—"}
              </div>
            </div>

            {/* Prev/Next right side */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={prev}
                disabled={activeIdx <= 0}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  cursor: activeIdx <= 0 ? "not-allowed" : "pointer",
                }}
              >
                Prev
              </button>
              <button
                onClick={next}
                disabled={activeIdx >= tracks.length - 1}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  cursor: activeIdx >= tracks.length - 1 ? "not-allowed" : "pointer",
                }}
              >
                Next
              </button>
            </div>
          </div>

          {/* Timebar centered */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 54, textAlign: "right", fontSize: 12, opacity: 0.75 }}>
              {fmtTime(curShown)}
            </div>

            <input
              type="range"
              min={0}
              max={capMax || cap}
              step="0.01"
              value={curShown}
              onChange={onSeek}
              style={{ width: "100%" }}
              disabled={!activeTrack?.playbackUrl}
            />

            <div style={{ width: 54, fontSize: 12, opacity: 0.75 }}>
              {fmtTime(capMax || cap)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
