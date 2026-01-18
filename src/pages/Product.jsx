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
  const capFiredRef = useRef(false);
  const autoplayNextRef = useRef(false);

  const [activeIdx, setActiveIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [curTime, setCurTime] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setErr(null);
    setParsed(null);
    setActiveIdx(0);
    setPlaying(false);
    setCurTime(0);
    setDur(0);
    capFiredRef.current = false;
    autoplayNextRef.current = false;

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

  const tracks = useMemo(() => parsed?.tracks || [], [parsed]);
  const activeTrack = tracks[activeIdx] || null;

  // best-effort: if backend later adds coverUrl via validateManifest, we render it automatically
  const coverUrl =
    parsed?.coverUrl ||
    parsed?.cover?.url ||
    parsed?.cover?.playbackUrl ||
    parsed?.meta?.coverUrl ||
    "";

  const albumTitle = parsed?.albumTitle || "Album";
  const artistName = parsed?.meta?.artistName || "";
  const releaseDate = parsed?.meta?.releaseDate || "";

  // keep audio src aligned with active track; autoplay next if we advanced due to cap
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    capFiredRef.current = false;
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
      }
    } catch {}

    // if we are advancing automatically, auto-play after src swap
    if (autoplayNextRef.current && url) {
      autoplayNextRef.current = false;
      setTimeout(() => {
        a.play().catch(() => {});
      }, 0);
    }
  }, [activeTrack?.playbackUrl]);

  // wire events: time, meta, play/pause; LOCKED 40s cap + autoplay chain
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onMeta = () => setDur(a.duration || 0);

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    const goNextAutoplay = () => {
      setActiveIdx((i) => {
        const next = Math.min(tracks.length - 1, i + 1);
        if (next === i) return i;
        autoplayNextRef.current = true;
        return next;
      });
    };

    const onTime = () => {
      const t = a.currentTime || 0;
      setCurTime(t);

      // LOCKED preview rule: each track can play max 40s
      if (t >= PREVIEW_SECONDS && !capFiredRef.current) {
        capFiredRef.current = true;

        try {
          a.pause();
          a.currentTime = 0;
        } catch {}

        setPlaying(false);
        setCurTime(0);

        // continue playlist automatically
        if (tracks.length > 0) {
          goNextAutoplay();
        }
      }
    };

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
    autoplayNextRef.current = false; // user intent: start here; chain will still work after cap
    setActiveIdx(i);
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
    autoplayNextRef.current = false;
    setActiveIdx((i) => Math.max(0, i - 1));
    setTimeout(() => {
      const a = audioRef.current;
      if (a && playing) a.play().catch(() => {});
    }, 0);
  };

  const next = () => {
    autoplayNextRef.current = false;
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

    // clamp seeks to preview window
    const clamped = Math.min(Math.max(0, v), PREVIEW_SECONDS);
    try {
      a.currentTime = clamped;
      setCurTime(clamped);
      // allow cap to fire again if user seeks back under limit
      if (clamped < PREVIEW_SECONDS) capFiredRef.current = false;
    } catch {}
  };

  if (err) return <pre style={{ padding: 24 }}>{err}</pre>;
  if (!parsed) return <div style={{ padding: 24 }}>Loading…</div>;

  const maxSeek = Math.min(dur || 0, PREVIEW_SECONDS);
  const seekVal = Math.min(curTime, maxSeek || 0);

  // SINGLE ROOT LAYOUT CONTAINER (truth)
  const ROOT_BG = "#0b0b10"; // near-black with slight purple tint
  const PANEL_BG = "rgba(255,255,255,0.06)";
  const BORDER = "1px solid rgba(255,255,255,0.10)";
  const TEXT_DIM = "rgba(255,255,255,0.72)";
  const TEXT_FAINT = "rgba(255,255,255,0.55)";

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: ROOT_BG,
        color: "#fff",
      }}
    >
      {/* Header lives inside the same centered container */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 16px" }}>
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            background: ROOT_BG,
            borderBottom: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "14px 0",
            }}
          >
            <strong style={{ whiteSpace: "nowrap" }}>Block Radius</strong>

            <nav style={{ display: "flex", gap: 14, whiteSpace: "nowrap" }}>
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

            <form
              action="/shop"
              method="get"
              style={{ flex: 1, display: "flex", justifyContent: "center" }}
            >
              <input
                name="query"
                placeholder="Search (Directus placeholder)…"
                autoComplete="off"
                style={{
                  width: "100%",
                  maxWidth: 520,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  outline: "none",
                }}
              />
            </form>

            <div style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
              {/* Clerk placeholder */}
              <Link to="/login" style={{ color: "#fff", textDecoration: "none", opacity: 0.9 }}>
                Login
              </Link>
            </div>
          </div>

          <div style={{ paddingBottom: 12, fontSize: 11, color: TEXT_FAINT }}>
            Search is a placeholder; Shop will later query Directus. Login will be Clerk.
          </div>
        </header>
      </div>

      {/* Body (same single centered container) */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "18px 16px 160px" }}>
        {/* Title block */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.2 }}>{albumTitle}</div>
          <div style={{ color: TEXT_DIM, marginTop: 6 }}>
            {artistName ? artistName : "Artist"} {releaseDate ? `· ${releaseDate}` : ""}
          </div>
          <div style={{ color: TEXT_FAINT, marginTop: 6, fontSize: 12 }}>
            shareId: {shareId || "—"} · tracks: {tracks.length}
          </div>
        </div>

        {/* 65/35 layout */}
        <div style={{ display: "grid", gridTemplateColumns: "65% 35%", gap: 16 }}>
          {/* LEFT column: cover */}
          <div
            style={{
              background: PANEL_BG,
              border: BORDER,
              borderRadius: 18,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 12, color: TEXT_FAINT, marginBottom: 10 }}>Album Cover</div>

            <div
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                borderRadius: 16,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt="Album cover"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{ textAlign: "center", padding: 18 }}>
                  <div style={{ fontWeight: 700 }}>No cover in published manifest</div>
                  <div style={{ marginTop: 8, fontSize: 12, color: TEXT_DIM }}>
                    Add <code style={{ color: "#fff" }}>coverUrl</code> to publish output to render it here.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT column: cards + tracks pushed down */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
            {/* Card 1: buy button */}
            <div
              style={{
                background: PANEL_BG,
                border: BORDER,
                borderRadius: 18,
                padding: 14,
              }}
            >
              <div style={{ fontSize: 12, color: TEXT_FAINT, marginBottom: 10 }}>Purchase</div>
              <button
                type="button"
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(34,197,94,0.35)",
                  background: "transparent",
                  color: "#22c55e",
                  fontWeight: 800,
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                Buy · $19.50
              </button>
            </div>

            {/* Card 2: marketing */}
            <div
              style={{
                background: PANEL_BG,
                border: BORDER,
                borderRadius: 18,
                padding: 14,
              }}
            >
              <div style={{ fontSize: 12, color: TEXT_FAINT, marginBottom: 10 }}>What you get</div>
              <div style={{ color: TEXT_DIM, fontSize: 14, lineHeight: 1.55 }}>
                <div>• 8 songs</div>
                <div>• Smart Bridge mode</div>
                <div>• Album mode</div>
                <div>• Artist control</div>
                <div>• Over 60 minutes of bonus authored bridge content</div>
                <div>• FREE MP3 album mix download included</div>
              </div>
            </div>

            {/* Tracks card pushed to bottom of column */}
            <div
              style={{
                marginTop: "auto",
                background: PANEL_BG,
                border: BORDER,
                borderRadius: 18,
                padding: 14,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>Tracks</div>
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
                        padding: "10px 12px",
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: isActive ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)",
                        cursor: "pointer",
                        color: "#fff",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
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

        {/* Hidden audio (no native controls) */}
        <audio ref={audioRef} data-audio="product" preload="metadata" playsInline />
      </div>

      {/* Bottom player (unchanged placement; dark theme) */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          borderTop: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(10,10,14,0.92)",
          backdropFilter: "blur(10px)",
          padding: "10px 12px",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 16px", display: "grid", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Now Playing</div>
              <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {activeTrack ? activeTrack.title : "—"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Preview: {PREVIEW_SECONDS}s max</div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={prev}
                disabled={activeIdx <= 0}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
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
                onClick={togglePlay}
                disabled={!activeTrack?.playbackUrl}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  cursor: "pointer",
                  opacity: !activeTrack?.playbackUrl ? 0.4 : 1,
                }}
              >
                {playing ? "Pause" : "Play"}
              </button>
              <button
                onClick={next}
                disabled={activeIdx >= tracks.length - 1}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
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

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 52, textAlign: "right", fontSize: 12, opacity: 0.75 }}>
              {fmtTime(seekVal)}
            </div>
            <input
              type="range"
              min={0}
              max={maxSeek || 0}
              step="0.01"
              value={seekVal}
              onChange={onSeek}
              style={{ width: "100%" }}
              disabled={!maxSeek}
            />
            <div style={{ width: 52, fontSize: 12, opacity: 0.75 }}>
              {fmtTime(maxSeek || 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
