// src/pages/Product.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

  const [parsed, setParsed] = useState(null);
  const [err, setErr] = useState(null);

  // cover (manifest first, optional local preview fallback)
  const [coverOverrideUrl, setCoverOverrideUrl] = useState("");
  const coverFileRef = useRef(null);

  // player state
  const audioRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [curTime, setCurTime] = useState(0);
  const [dur, setDur] = useState(0);

  // seek state (prevents frozen slider due to rapid state writes)
  const seekingRef = useRef(false);

  // preview cap uses its own timer so it cannot be bypassed
  const capTimerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    fetchManifest(shareId)
      .then((m) => {
        if (cancelled) return;
        const v = validateManifest(m);
        setParsed(v);
        setErr(null);

        setActiveIdx(0);
        setPlaying(false);
        setCurTime(0);
        setDur(0);

        // reset local cover override on share changes
        setCoverOverrideUrl("");
        if (coverFileRef.current) coverFileRef.current.value = "";
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

  // pick cover
  const coverUrl = useMemo(() => {
    const fromManifest = String(parsed?.coverUrl || "").trim();
    return coverOverrideUrl || fromManifest || "";
  }, [parsed?.coverUrl, coverOverrideUrl]);

  // clear cap timer
  const clearCapTimer = () => {
    if (capTimerRef.current) window.clearTimeout(capTimerRef.current);
    capTimerRef.current = null;
  };

  // arm cap timer after play succeeds
  const armCapTimer = () => {
    clearCapTimer();
    capTimerRef.current = window.setTimeout(() => {
      const a = audioRef.current;
      if (!a) return;
      try {
        a.pause();
        a.currentTime = 0;
      } catch {}
      setPlaying(false);
      setCurTime(0);
    }, PREVIEW_SECONDS * 1000);
  };

  // keep audio src aligned with active track
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    clearCapTimer();
    setCurTime(0);
    setDur(0);

    const url = activeTrack?.playbackUrl;
    if (!url) {
      try {
        a.pause();
        a.removeAttribute("src");
        a.load();
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
    // do not auto-play here; controlled by user action
  }, [activeTrack?.playbackUrl]);

  // wire audio events + preview cap
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onMeta = () => {
      const d = Number(a.duration || 0);
      setDur(Number.isFinite(d) ? d : 0);
    };

    const onTime = () => {
      if (seekingRef.current) return;
      const t = Number(a.currentTime || 0);
      setCurTime(Number.isFinite(t) ? t : 0);

      // safety clamp (in case timer missed for any reason)
      if (t >= PREVIEW_SECONDS) {
        try {
          a.pause();
          a.currentTime = 0;
        } catch {}
        clearCapTimer();
        setPlaying(false);
        setCurTime(0);
      }
    };

    const onPlay = () => {
      setPlaying(true);
      // cap only after play succeeds
      armCapTimer();
    };

    const onPause = () => {
      setPlaying(false);
      clearCapTimer();
    };

    const onEnded = () => {
      setPlaying(false);
      clearCapTimer();
      setCurTime(0);
      // advance track selection (does not autoplay next)
      setActiveIdx((i) => Math.min(tracks.length - 1, i + 1));
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
  }, [tracks.length]);

  // controls
  const playIndex = (i) => {
    if (!tracks[i]?.playbackUrl) return;
    setActiveIdx(i);
    // wait one tick for src effect to run
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

  const prev = () => setActiveIdx((i) => Math.max(0, i - 1));
  const next = () => setActiveIdx((i) => Math.min(tracks.length - 1, i + 1));

  // slider
  const maxSeek = Math.min(dur || 0, PREVIEW_SECONDS);

  const onSeekStart = () => {
    seekingRef.current = true;
  };

  const onSeekMove = (e) => {
    const v = Number(e.target.value);
    if (!Number.isFinite(v)) return;
    setCurTime(v);
  };

  const onSeekEnd = (e) => {
    const a = audioRef.current;
    seekingRef.current = false;
    if (!a) return;

    const v = Number(e.target.value);
    const clamped = Number.isFinite(v) ? Math.min(v, PREVIEW_SECONDS) : 0;

    try {
      a.currentTime = clamped;
    } catch {}
    setCurTime(clamped);

    // if seeking near/at cap, enforce stop immediately
    if (clamped >= PREVIEW_SECONDS) {
      try {
        a.pause();
        a.currentTime = 0;
      } catch {}
      clearCapTimer();
      setPlaying(false);
      setCurTime(0);
    }
  };

  // cover local preview upload (does not persist)
  const onChooseCover = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setCoverOverrideUrl((prevUrl) => {
      if (prevUrl) {
        try {
          URL.revokeObjectURL(prevUrl);
        } catch {}
      }
      return url;
    });
  };

  const resetCover = () => {
    setCoverOverrideUrl((prevUrl) => {
      if (prevUrl) {
        try {
          URL.revokeObjectURL(prevUrl);
        } catch {}
      }
      return "";
    });
    if (coverFileRef.current) coverFileRef.current.value = "";
  };

  if (err) return <pre style={{ padding: 16 }}>{err}</pre>;
  if (!parsed) return <div style={{ padding: 16 }}>Loading…</div>;

  return (
    <>
      {/* GLOBAL HEADER (centered) */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "#111",
          color: "#fff",
          borderBottom: "1px solid #2a2a2a",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <strong style={{ letterSpacing: 0.2 }}>Block Radius</strong>

            <nav style={{ display: "flex", gap: 14, opacity: 0.95 }}>
              <Link to="/" style={{ color: "#fff", textDecoration: "none" }}>
                Home
              </Link>
              <Link to="/shop" style={{ color: "#fff", textDecoration: "none" }}>
                Shop
              </Link>
              <Link to="/account" style={{ color: "#fff", textDecoration: "none" }}>
                Account
              </Link>
            </nav>
          </div>

          <div style={{ flex: 1, maxWidth: 520 }}>
            <input
              value=""
              readOnly
              placeholder="Search (Directus placeholder)…"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 999,
                border: "1px solid #2f2f2f",
                background: "#161616",
                color: "#fff",
                outline: "none",
              }}
            />
          </div>

          <button
            onClick={() => navigate("/login")}
            style={{
              borderRadius: 999,
              padding: "8px 14px",
              border: "1px solid #2f2f2f",
              background: "#fff",
              color: "#111",
              fontWeight: 700,
              cursor: "pointer",
            }}
            title="Login (Clerk placeholder)"
          >
            Login
          </button>
        </div>

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "6px 16px 10px", fontSize: 12, opacity: 0.7 }}>
          Search is a placeholder; Shop will later query Directus. Login is a Clerk placeholder.
        </div>
      </header>

      {/* PAGE WRAP (centered) */}
      <div
        style={{
          minHeight: "100vh",
          background: "#0b0b0b",
          color: "#fff",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: 18, paddingBottom: 140 }}>
          {/* 65/35 columns */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 65fr) minmax(0, 35fr)",
              gap: 18,
              alignItems: "start",
            }}
          >
            {/* LEFT: Album card + cover */}
            <div
              style={{
                borderRadius: 18,
                border: "1px solid #1f1f1f",
                background: "linear-gradient(180deg, #121212 0%, #0d0d0d 100%)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                padding: 18,
                display: "grid",
                gridTemplateColumns: "320px minmax(0,1fr)",
                gap: 18,
              }}
            >
              <div
                style={{
                  borderRadius: 16,
                  border: "1px solid #242424",
                  background: "#0f0f0f",
                  overflow: "hidden",
                  minHeight: 220,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt="cover"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    onError={() => {
                      // if manifest cover is bad, fall back to none
                      if (!coverOverrideUrl) return;
                    }}
                  />
                ) : (
                  <div style={{ fontSize: 12, opacity: 0.6, padding: 12 }}>No cover in manifest</div>
                )}
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.05, marginBottom: 6 }}>
                  {parsed.albumTitle || "Album"}
                </div>

                {/* Drop verbose manifest metadata per request; keep minimal */}
                <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 14 }}>
                  Preview cap: {PREVIEW_SECONDS}s
                </div>

                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>Cover</div>
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px dashed #2a2a2a",
                    padding: 12,
                    background: "#101010",
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    Reads coverUrl from manifest. Local preview upload below (does not persist).
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <input ref={coverFileRef} type="file" accept="image/*" onChange={onChooseCover} />
                    <button
                      onClick={resetCover}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid #2a2a2a",
                        background: "#171717",
                        color: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: top card + tracks card */}
            <div style={{ display: "grid", gap: 18 }}>
              {/* NEW top card (requested) */}
              <div
                style={{
                  borderRadius: 18,
                  border: "1px solid #1f1f1f",
                  background: "linear-gradient(180deg, #121212 0%, #0d0d0d 100%)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>Now Playing</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
                  {activeTrack?.title || "—"}
                </div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  {fmtTime(Math.min(curTime, PREVIEW_SECONDS))} / {fmtTime(PREVIEW_SECONDS)} · remaining{" "}
                  {fmtTime(Math.max(0, PREVIEW_SECONDS - Math.min(curTime, PREVIEW_SECONDS)))}
                </div>
              </div>

              {/* Tracks card */}
              <div
                style={{
                  borderRadius: 18,
                  border: "1px solid #1f1f1f",
                  background: "linear-gradient(180deg, #121212 0%, #0d0d0d 100%)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                  padding: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>Tracks</div>
                  <div style={{ fontSize: 12, opacity: 0.65 }}>{tracks.length}</div>
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
                          padding: "12px 12px",
                          borderRadius: 14,
                          border: "1px solid #202020",
                          background: isActive ? "#1a1a1a" : "#111",
                          color: "#fff",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.title}
                        </span>
                        <span style={{ fontSize: 12, opacity: 0.65 }}>
                          {t.durationSec ? fmtTime(t.durationSec) : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* move tracks "lower right bottom of second column": achieved by stacking top card then tracks */}
            </div>
          </div>

          {/* audio element (no native controls) */}
          <audio ref={audioRef} data-audio="product" preload="metadata" playsInline />
        </div>

        {/* BOTTOM PLAYER (no 3-dot menu) */}
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            borderTop: "1px solid #1f1f1f",
            background: "#0f0f0f",
            padding: "12px 12px",
          }}
        >
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Now Playing</div>
                <div style={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {activeTrack?.title || "—"}
                </div>
                <div style={{ fontSize: 12, opacity: 0.65 }}>Preview cap: {PREVIEW_SECONDS}s</div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={prev}
                  disabled={activeIdx <= 0}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid #262626",
                    background: "#141414",
                    color: "#fff",
                    cursor: activeIdx <= 0 ? "not-allowed" : "pointer",
                    opacity: activeIdx <= 0 ? 0.5 : 1,
                  }}
                >
                  Prev
                </button>
                <button
                  onClick={togglePlay}
                  disabled={!activeTrack?.playbackUrl}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid #262626",
                    background: "#fff",
                    color: "#111",
                    fontWeight: 800,
                    cursor: !activeTrack?.playbackUrl ? "not-allowed" : "pointer",
                    opacity: !activeTrack?.playbackUrl ? 0.6 : 1,
                  }}
                >
                  {playing ? "Pause" : "Play"}
                </button>
                <button
                  onClick={next}
                  disabled={activeIdx >= tracks.length - 1}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid #262626",
                    background: "#141414",
                    color: "#fff",
                    cursor: activeIdx >= tracks.length - 1 ? "not-allowed" : "pointer",
                    opacity: activeIdx >= tracks.length - 1 ? 0.5 : 1,
                  }}
                >
                  Next
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 56, textAlign: "right", fontSize: 12, opacity: 0.75 }}>
                {fmtTime(Math.min(curTime, PREVIEW_SECONDS))}
              </div>

              <input
                type="range"
                min={0}
                max={Math.max(0, maxSeek)}
                step="0.01"
                value={Math.min(curTime, maxSeek)}
                onMouseDown={onSeekStart}
                onTouchStart={onSeekStart}
                onChange={onSeekMove}
                onMouseUp={onSeekEnd}
                onTouchEnd={onSeekEnd}
                style={{ width: "100%" }}
                disabled={!activeTrack?.playbackUrl}
              />

              <div style={{ width: 56, fontSize: 12, opacity: 0.75 }}>
                {fmtTime(PREVIEW_SECONDS)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
