// src/pages/Product.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchManifest, validateManifest } from "../lib/manifest.js";

const PREVIEW_SECONDS = 40;

function clamp(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.min(max, Math.max(min, x));
}

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

  // cover preview (local only, does not persist)
  const [localCoverUrl, setLocalCoverUrl] = useState("");
  const lastLocalCoverRef = useRef("");

  // player state
  const audioRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [curTime, setCurTime] = useState(0);
  const [dur, setDur] = useState(0);

  // autoplay intent across src swaps
  const pendingAutoplayRef = useRef(false);

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

        if (lastLocalCoverRef.current) {
          try {
            URL.revokeObjectURL(lastLocalCoverRef.current);
          } catch {}
          lastLocalCoverRef.current = "";
        }
        setLocalCoverUrl("");
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

  const coverUrl = useMemo(() => {
    return localCoverUrl || parsed?.coverUrl || "";
  }, [localCoverUrl, parsed?.coverUrl]);

  // keep audio src aligned with active track
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    setCurTime(0);
    setDur(0);

    const url = activeTrack?.playbackUrl;

    try {
      a.pause();
      a.currentTime = 0;
    } catch {}

    if (!url) {
      setPlaying(false);
      return;
    }

    try {
      a.src = url;
      a.load();
    } catch {
      setPlaying(false);
      return;
    }

    if (pendingAutoplayRef.current) {
      pendingAutoplayRef.current = false;
      a.play()
        .then(() => {})
        .catch(() => {
          setPlaying(false);
        });
    }
  }, [activeTrack?.playbackUrl]);

  // audio events + enforce preview cap + auto-advance playlist
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onMeta = () => {
      const d = Number(a.duration || 0);
      setDur(Number.isFinite(d) ? d : 0);
    };

    const onTime = () => {
      const t = Number(a.currentTime || 0);
      setCurTime(t);

      // cap at PREVIEW_SECONDS, then advance + autoplay next track (continuous preview playlist)
      if (t >= PREVIEW_SECONDS) {
        try {
          a.pause();
        } catch {}
        try {
          a.currentTime = 0;
        } catch {}

        const nextIdx = activeIdx + 1;
        if (nextIdx < tracks.length && tracks[nextIdx]?.playbackUrl) {
          pendingAutoplayRef.current = true;
          setActiveIdx(nextIdx);
        } else {
          setPlaying(false);
          setCurTime(0);
        }
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
  }, [activeIdx, tracks.length]);

  const playIndex = (i) => {
    if (!tracks[i]?.playbackUrl) return;
    pendingAutoplayRef.current = true;
    setActiveIdx(i);
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a || !activeTrack?.playbackUrl) return;

    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  const prev = () => {
    const nextIdx = Math.max(0, activeIdx - 1);
    if (nextIdx === activeIdx) return;
    pendingAutoplayRef.current = playing;
    setActiveIdx(nextIdx);
  };

  const next = () => {
    const nextIdx = Math.min(tracks.length - 1, activeIdx + 1);
    if (nextIdx === activeIdx) return;
    pendingAutoplayRef.current = playing;
    setActiveIdx(nextIdx);
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

  const remaining = Math.max(0, PREVIEW_SECONDS - curTime);

  const onPickCover = (file) => {
    if (!file) return;
    if (lastLocalCoverRef.current) {
      try {
        URL.revokeObjectURL(lastLocalCoverRef.current);
      } catch {}
      lastLocalCoverRef.current = "";
    }
    const u = URL.createObjectURL(file);
    lastLocalCoverRef.current = u;
    setLocalCoverUrl(u);
  };

  const onResetCover = () => {
    if (lastLocalCoverRef.current) {
      try {
        URL.revokeObjectURL(lastLocalCoverRef.current);
      } catch {}
      lastLocalCoverRef.current = "";
    }
    setLocalCoverUrl("");
  };

  if (err) return <pre style={{ padding: 24 }}>{err}</pre>;
  if (!parsed) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b12", color: "#fff" }}>
      {/* GLOBAL HEADER */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(11,11,18,0.9)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 18,
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18, width: "100%", maxWidth: 1100 }}>
            <div style={{ fontWeight: 700, letterSpacing: 0.2 }}>Block Radius</div>

            <nav style={{ display: "flex", gap: 14, opacity: 0.9 }}>
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

            <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
              <input
                placeholder="Search (Directus placeholder)…"
                disabled
                style={{
                  width: "100%",
                  maxWidth: 560,
                  padding: "10px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  outline: "none",
                }}
              />
            </div>

            <button
              type="button"
              style={{
                borderRadius: 999,
                padding: "10px 14px",
                border: "1px solid rgba(255,255,255,0.18)",
                background: "#fff",
                color: "#111",
                fontWeight: 600,
                cursor: "pointer",
              }}
              onClick={() => alert("Login (Clerk placeholder)")}
            >
              Login
            </button>
          </div>
        </div>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 16px 10px", fontSize: 12, opacity: 0.7 }}>
          Search is a placeholder; Shop will later query Directus.
        </div>
      </header>

      {/* PAGE */}
      <div style={{ padding: 18, paddingBottom: 120 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "65% 35%",
              gap: 18,
              alignItems: "start",
            }}
          >
            {/* Left column */}
            <div
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 18,
                padding: 18,
                minHeight: 360,
                display: "grid",
                gridTemplateColumns: "280px 1fr",
                gap: 18,
              }}
            >
              {/* cover */}
              <div
                style={{
                  borderRadius: 16,
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(0,0,0,0.35)",
                  height: 280,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {coverUrl ? (
                  <img src={coverUrl} alt="cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ fontSize: 12, opacity: 0.7 }}>No cover in manifest</div>
                )}
              </div>

              {/* album info */}
              <div>
                <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.05 }}>Album</div>
                <div style={{ marginTop: 10, fontSize: 14, opacity: 0.75 }}>shareId: {parsed.shareId || shareId}</div>
                <div style={{ marginTop: 10, fontSize: 14, opacity: 0.75 }}>
                  Preview cap: <b>{PREVIEW_SECONDS}s</b>
                </div>

                <div style={{ marginTop: 18, fontSize: 13, opacity: 0.8 }}>Cover</div>
                <div
                  style={{
                    marginTop: 8,
                    padding: 12,
                    borderRadius: 14,
                    border: "1px dashed rgba(255,255,255,0.18)",
                    background: "rgba(0,0,0,0.22)",
                  }}
                >
                  <div style={{ fontSize: 13, opacity: 0.85 }}>
                    Reads coverUrl from manifest. Local preview upload below (does not persist).
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <input type="file" accept="image/*" onChange={(e) => onPickCover(e.target.files?.[0])} style={{ fontSize: 12 }} />
                    <button
                      type="button"
                      onClick={onResetCover}
                      style={{
                        borderRadius: 12,
                        padding: "8px 10px",
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "rgba(255,255,255,0.08)",
                        color: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* manifest meta card */}
                <div
                  style={{
                    marginTop: 18,
                    padding: 14,
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <div style={{ fontSize: 13, opacity: 0.7 }}>Manifest</div>
                  <div style={{ marginTop: 8, display: "grid", gap: 6, fontSize: 14 }}>
                    <div>
                      <span style={{ opacity: 0.7 }}>albumTitle:</span> {parsed.albumTitle || "—"}
                    </div>
                    <div>
                      <span style={{ opacity: 0.7 }}>artistName:</span> {parsed.meta?.artistName || "—"}
                    </div>
                    <div>
                      <span style={{ opacity: 0.7 }}>releaseDate:</span> {parsed.meta?.releaseDate || "—"}
                    </div>
                    <div>
                      <span style={{ opacity: 0.7 }}>projectId:</span> {parsed.projectId || "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: "grid", gap: 18 }}>
              {/* Now Playing */}
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 18,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.7 }}>Now Playing</div>
                <div style={{ marginTop: 10, fontSize: 20, fontWeight: 700 }}>{activeTrack?.title || "—"}</div>
                <div style={{ marginTop: 6, fontSize: 13, opacity: 0.75 }}>
                  {fmtTime(curTime)} / {fmtTime(Math.min(dur || 0, PREVIEW_SECONDS))} · remaining {fmtTime(remaining)}
                </div>
              </div>

              {/* BUY CARD */}
              <div style={{ padding: 0 }}>
                <button
                  type="button"
                  onClick={() => alert("Buy (placeholder)")}
                  style={{
                    width: "100%",
                    borderRadius: 16,
                    padding: "14px 16px",
                    border: "1px solid rgba(0,0,0,0.0)",
                    background: "#22c55e",
                    color: "#0b0b0b",
                    fontWeight: 900,
                    fontSize: 16,
                    cursor: "pointer",
                  }}
                >
                  Buy $19.50
                </button>
              </div>

              {/* MARKETING CARD */}
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 18,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Includes</div>
                <div style={{ display: "grid", gap: 8, fontSize: 14, opacity: 0.92 }}>
                  <div>• 8 songs</div>
                  <div>• Smart Bridge mode</div>
                  <div>• Album mode</div>
                  <div>• Artist control</div>
                  <div>• Over 60 minutes of bonus authored bridge content</div>
                  <div>• FREE MP3 album mix download included</div>
                </div>
              </div>

              {/* Tracks */}
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 18,
                  padding: 16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>Tracks</div>
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
                          padding: "12px 12px",
                          borderRadius: 14,
                          border: "1px solid rgba(255,255,255,0.10)",
                          background: isActive ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.15)",
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
                        <span style={{ fontSize: 12, opacity: 0.7 }}>{t.durationSec ? fmtTime(t.durationSec) : ""}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Hidden audio (no native controls => no 3-dot menu) */}
          <audio ref={audioRef} data-audio="product" preload="metadata" playsInline />
        </div>
      </div>

      {/* Bottom player */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(11,11,18,0.92)",
          backdropFilter: "blur(10px)",
          padding: "10px 12px",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Now Playing</div>
              <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {activeTrack ? activeTrack.title : "—"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Preview cap: {PREVIEW_SECONDS}s</div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={prev}
                disabled={activeIdx <= 0}
                style={{
                  padding: "10px 14px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
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
                  padding: "10px 18px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "#fff",
                  color: "#111",
                  fontWeight: 700,
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
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
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
            <div style={{ width: 52, textAlign: "right", fontSize: 12, opacity: 0.75 }}>{fmtTime(curTime)}</div>

            <input
              type="range"
              min={0}
              max={Math.min(dur || 0, PREVIEW_SECONDS)}
              step="0.01"
              value={clamp(curTime, 0, Math.min(dur || 0, PREVIEW_SECONDS))}
              onChange={onSeek}
              style={{ width: "100%" }}
              disabled={!dur}
            />

            <div style={{ width: 52, fontSize: 12, opacity: 0.75 }}>
              {fmtTime(Math.min(dur || 0, PREVIEW_SECONDS))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
