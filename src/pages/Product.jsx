// src/pages/Product.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchManifest, validateManifest } from "../lib/manifest.js";

const PREVIEW_SECONDS = 40;

function fmtTime(sec) {
  const n = Number(sec);
  if (!Number.isFinite(n) || n <= 0) return "--:--";
  const m = Math.floor(n / 60);
  const s = Math.floor(n % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function IconPlay({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 7l10 5-10 5V7z" fill="currentColor" />
    </svg>
  );
}
function IconPause({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 6h4v12H7V6zm6 0h4v12h-4V6z" fill="currentColor" />
    </svg>
  );
}
function IconPrev({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 6h2v12H7V6zm3 6l11-6v12l-11-6z" fill="currentColor" />
    </svg>
  );
}
function IconNext({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 12L4 6v12l11-6zm0-6h2v12h-2V6z" fill="currentColor" />
    </svg>
  );
}

export default function Product() {
  const { shareId } = useParams();

  const [parsed, setParsed] = useState(null);
  const [err, setErr] = useState(null);

  // player
  const audioRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [curTime, setCurTime] = useState(0);
  const [dur, setDur] = useState(0);

  // receiver: published manifest
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
        setParsed(validateManifest(m));
      })
      .catch((e) => {
        if (cancelled) return;
        setErr(String(e?.message || e));
      });

    return () => {
      cancelled = true;
    };
  }, [shareId]);

  const tracks = useMemo(() => (parsed?.tracks || []).filter((t) => t?.playbackUrl), [parsed]);
  const activeTrack = tracks[activeIdx] || null;

  // keep audio aligned to active track
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    setCurTime(0);
    setDur(0);

    const url = activeTrack?.playbackUrl;
    try {
      a.pause();
      a.currentTime = 0;
      if (url) {
        a.src = url;
        a.load();
      } else {
        a.removeAttribute("src");
        a.load();
      }
    } catch {}

    // if we were playing, auto-play new selection
    if (playing && url) {
      setTimeout(() => {
        a.play().catch(() => {});
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrack?.playbackUrl]);

  // audio events + 40s cap + continuous next
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onMeta = () => setDur(a.duration || 0);

    const advanceToNext = () => {
      setActiveIdx((i) => {
        const next = Math.min(tracks.length - 1, i + 1);
        return next;
      });
      setTimeout(() => {
        const aa = audioRef.current;
        if (!aa) return;
        if (tracks.length === 0) return;
        const nextIdx = Math.min(tracks.length - 1, activeIdx + 1);
        if (nextIdx !== activeIdx) {
          // will auto-play via effect if playing stays true
          aa.play().catch(() => {});
        } else {
          setPlaying(false);
        }
      }, 0);
    };

    const onTime = () => {
      const t = a.currentTime || 0;
      setCurTime(t);

      // hard preview cap (locked)
      if (t >= PREVIEW_SECONDS) {
        try {
          a.pause();
          a.currentTime = 0;
        } catch {}
        // continue playlist if possible
        if (activeIdx < tracks.length - 1) {
          setPlaying(true);
          setActiveIdx((i) => Math.min(tracks.length - 1, i + 1));
          setTimeout(() => {
            const aa = audioRef.current;
            if (!aa) return;
            aa.play().catch(() => {});
          }, 0);
        } else {
          setPlaying(false);
        }
        setCurTime(0);
      }
    };

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    const onEnded = () => {
      setCurTime(0);
      if (activeIdx < tracks.length - 1) {
        setPlaying(true);
        setActiveIdx((i) => Math.min(tracks.length - 1, i + 1));
        setTimeout(() => {
          const aa = audioRef.current;
          if (!aa) return;
          aa.play().catch(() => {});
        }, 0);
      } else {
        setPlaying(false);
      }
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
  }, [tracks.length, activeIdx]);

  const playIndex = (i) => {
    if (!tracks[i]?.playbackUrl) return;
    setActiveIdx(i);
    setPlaying(true);
    setTimeout(() => {
      audioRef.current?.play().catch(() => {});
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
  };
  const next = () => {
    setActiveIdx((i) => Math.min(tracks.length - 1, i + 1));
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

  if (err) return <pre style={{ padding: 24 }}>{err}</pre>;
  if (!parsed) return <div style={{ padding: 24 }}>Loading…</div>;

  const bg = "#0b0612"; // black-purple tint
  const panel = "#140b22";
  const border = "rgba(255,255,255,0.10)";
  const textDim = "rgba(255,255,255,0.75)";

  const maxSeek = Math.min(dur || 0, PREVIEW_SECONDS);
  const seekVal = Math.min(curTime || 0, maxSeek);

  return (
    <div style={{ minHeight: "100vh", width: "100vw", background: bg, color: "#fff" }}>
      {/* Global header (kept) */}
      <header style={{ borderBottom: `1px solid ${border}`, background: "#0f081a" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link to="/" style={{ color: "#fff", textDecoration: "none", fontWeight: 800 }}>
              Block Radius
            </Link>

            <nav style={{ marginLeft: "auto", marginRight: "auto", display: "flex", gap: 18 }}>
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

            <Link to="/login" style={{ color: "#fff", textDecoration: "none", opacity: 0.9 }}>
              Login
            </Link>
          </div>

          {/* Search row (kept) */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
            <input
              placeholder="Search (Directus later)"
              style={{
                width: "min(720px, 100%)",
                padding: "10px 12px",
                borderRadius: 12,
                border: `1px solid ${border}`,
                background: "#0b0612",
                color: "#fff",
                outline: "none",
              }}
              onChange={() => {}}
              value={""}
              readOnly
            />
          </div>
        </div>
      </header>

      {/* Root centered container (ONLY width control) */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px 120px" }}>
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 0.2 }}>{parsed.albumTitle || "Album"}</div>
          <div style={{ fontSize: 12, color: textDim }}>Preview only</div>
        </div>

        {/* Two-column layout */}
        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "65% 35%",
            gap: 16,
            alignItems: "start",
          }}
        >
          {/* Left column (cover / hero) */}
          <div
            style={{
              background: panel,
              border: `1px solid ${border}`,
              borderRadius: 18,
              padding: 16,
              minHeight: 360,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Album</div>
            <div
              style={{
                borderRadius: 16,
                border: `1px solid ${border}`,
                background: "#0b0612",
                height: 300,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: textDim,
                fontSize: 13,
              }}
            >
              Cover will render when publish includes coverUrl
            </div>
          </div>

          {/* Right column (cards) */}
          <div style={{ display: "grid", gap: 12 }}>
            {/* Buy card */}
            <div style={{ background: panel, border: `1px solid ${border}`, borderRadius: 18, padding: 14 }}>
              <button
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "0",
                  cursor: "pointer",
                  fontWeight: 900,
                  background: "#2fe37a",
                  color: "#06200f",
                  fontSize: 16,
                }}
                onClick={() => {}}
              >
                Buy — $19.50
              </button>
            </div>

            {/* Marketing card */}
            <div style={{ background: panel, border: `1px solid ${border}`, borderRadius: 18, padding: 14 }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Includes</div>
              <div style={{ color: textDim, fontSize: 13, lineHeight: 1.5 }}>
                8 songs / Smart bridge mode / Album mode / Artist control / over 60 minutes of bonus authored bridge
                content / FREE MP3 album mix download included
              </div>
            </div>

            {/* Album meta card (placeholder until publish emits it) */}
            <div style={{ background: panel, border: `1px solid ${border}`, borderRadius: 18, padding: 14 }}>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Album Info</div>
              <div style={{ display: "grid", gap: 8, fontSize: 13, color: textDim }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span>Album name</span>
                  <span style={{ color: "#fff", opacity: 0.9 }}>—</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span>Performer</span>
                  <span style={{ color: "#fff", opacity: 0.9 }}>—</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span>Release date</span>
                  <span style={{ color: "#fff", opacity: 0.9 }}>—</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span>Total album time</span>
                  <span style={{ color: "#fff", opacity: 0.9 }}>—</span>
                </div>
              </div>
            </div>

            {/* Tracks card */}
            <div style={{ background: panel, border: `1px solid ${border}`, borderRadius: 18, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontSize: 18, fontWeight: 900 }}>Tracks</div>
                <div style={{ fontSize: 12, color: textDim }}>{tracks.length}</div>
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
                        padding: "10px 12px",
                        borderRadius: 14,
                        border: `1px solid ${border}`,
                        background: isActive ? "#1a0f2a" : "#0b0612",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        color: "#fff",
                      }}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.title || `Track ${t.slot || i + 1}`}
                      </span>
                      <span style={{ fontSize: 12, color: textDim }}>{fmtTime(t.durationSec)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* audio element (no native controls) */}
        <audio ref={audioRef} data-audio="product" preload="metadata" playsInline />
      </div>

      {/* Bottom player (locked layout) */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          borderTop: `1px solid ${border}`,
          background: "#0f081a",
          padding: "10px 12px",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", alignItems: "center", gap: 12 }}>
            {/* Left: Play/Pause */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={togglePlay}
                disabled={!activeTrack?.playbackUrl}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  border: `1px solid ${border}`,
                  background: "#1a0f2a",
                  color: "#fff",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                }}
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? <IconPause size={20} /> : <IconPlay size={20} />}
              </button>
            </div>

            {/* Center: Now playing + time bar */}
            <div style={{ textAlign: "center", minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Now Playing</div>
              <div
                style={{
                  fontWeight: 800,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  marginTop: 2,
                }}
              >
                {activeTrack ? activeTrack.title : "—"}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                <div style={{ width: 48, textAlign: "right", fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
                  {fmtTime(curTime)}
                </div>
                <input
                  type="range"
                  min={0}
                  max={maxSeek}
                  step="0.01"
                  value={seekVal}
                  onChange={onSeek}
                  style={{ width: "100%" }}
                  disabled={!maxSeek}
                />
                <div style={{ width: 48, fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
                  {fmtTime(maxSeek)}
                </div>
              </div>
            </div>

            {/* Right: Prev/Next */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={prev}
                disabled={activeIdx <= 0}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  border: `1px solid ${border}`,
                  background: "#0b0612",
                  color: "#fff",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                }}
                aria-label="Previous"
              >
                <IconPrev />
              </button>
              <button
                onClick={next}
                disabled={activeIdx >= tracks.length - 1}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  border: `1px solid ${border}`,
                  background: "#0b0612",
                  color: "#fff",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                }}
                aria-label="Next"
              >
                <IconNext />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
