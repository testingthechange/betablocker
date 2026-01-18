import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import SiteShell from "../layouts/SiteShell.jsx";
import { fetchManifest, validateManifest } from "../lib/manifest.js";

const PREVIEW_SECONDS = 40;
const PREVIEW_MS = PREVIEW_SECONDS * 1000;

function fmtTime(sec) {
  const n = Number(sec);
  if (!Number.isFinite(n) || n < 0) return "0:00";
  const m = Math.floor(n / 60);
  const s = Math.floor(n % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function sumDurationSec(tracks) {
  let total = 0;
  for (const t of tracks || []) total += Number(t?.durationSec || 0) || 0;
  return total;
}

export default function Product() {
  const { shareId } = useParams();

  const [parsed, setParsed] = useState(null);
  const [err, setErr] = useState(null);

  const tracks = useMemo(() => parsed?.tracks || [], [parsed]);
  const totalAlbumSec = useMemo(() => sumDurationSec(tracks), [tracks]);

  // player state
  const audioRef = useRef(null);
  const capTimerRef = useRef(null);

  const [activeIdx, setActiveIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [curTime, setCurTime] = useState(0);
  const [dur, setDur] = useState(0);

  // fetch manifest
  useEffect(() => {
    let cancelled = false;

    setParsed(null);
    setErr(null);

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
      })
      .catch((e) => {
        if (cancelled) return;
        setErr(String(e?.message || e));
      });

    return () => {
      cancelled = true;
    };
  }, [shareId]);

  const activeTrack = tracks[activeIdx] || null;

  function clearCapTimer() {
    if (capTimerRef.current) window.clearTimeout(capTimerRef.current);
    capTimerRef.current = null;
  }

  // align audio src with active track
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    clearCapTimer();
    setCurTime(0);
    setDur(0);

    const url = activeTrack?.playbackUrl;
    try {
      a.pause();
      a.currentTime = 0;
      setPlaying(false);

      if (url) {
        a.src = url;
        a.load();
      } else {
        a.removeAttribute("src");
      }
    } catch {}
  }, [activeTrack?.playbackUrl]);

  // wire events + preview enforcement
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onMeta = () => {
      const d = Number(a.duration || 0) || 0;
      setDur(d);
    };

    const onPlay = () => {
      setPlaying(true);

      // hard cap timer (cannot be skipped if play started)
      clearCapTimer();
      capTimerRef.current = window.setTimeout(() => {
        try {
          a.pause();
          a.currentTime = 0;
        } catch {}
        setPlaying(false);
        setCurTime(0);

        // auto-advance after preview ends
        setActiveIdx((i) => {
          const next = Math.min(tracks.length - 1, i + 1);
          if (next !== i) {
            // start next track after state updates
            setTimeout(() => {
              const aa = audioRef.current;
              if (!aa) return;
              aa.play().catch(() => {});
            }, 0);
          }
          return next;
        });
      }, PREVIEW_MS);
    };

    const onPause = () => {
      setPlaying(false);
      clearCapTimer();
    };

    const onTime = () => {
      const t = Number(a.currentTime || 0) || 0;
      setCurTime(t);

      // clamp currentTime display/seek behavior (doesn't stop playback by itself)
      if (t >= PREVIEW_SECONDS) {
        try {
          a.currentTime = PREVIEW_SECONDS;
        } catch {}
      }
    };

    const onEnded = () => {
      setPlaying(false);
      clearCapTimer();
      setCurTime(0);
      setActiveIdx((i) => Math.min(tracks.length - 1, i + 1));
      setTimeout(() => audioRef.current?.play().catch(() => {}), 0);
    };

    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnded);

    return () => {
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnded);
    };
  }, [tracks.length]);

  const playIndex = (i) => {
    if (!tracks[i]?.playbackUrl) return;
    setActiveIdx(i);
    setTimeout(() => audioRef.current?.play().catch(() => {}), 0);
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
      if (playing) audioRef.current?.play().catch(() => {});
    }, 0);
  };

  const next = () => {
    setActiveIdx((i) => Math.min(tracks.length - 1, i + 1));
    setTimeout(() => {
      if (playing) audioRef.current?.play().catch(() => {});
    }, 0);
  };

  const onSeek = (e) => {
    const a = audioRef.current;
    if (!a) return;
    const v = Number(e.target.value);
    if (!Number.isFinite(v)) return;
    const clamped = Math.max(0, Math.min(v, PREVIEW_SECONDS));
    try {
      a.currentTime = clamped;
      setCurTime(clamped);
    } catch {}
  };

  if (err) return <pre style={{ padding: 24 }}>{err}</pre>;
  if (!parsed) return <div style={{ padding: 24 }}>Loading…</div>;

  const coverUrl = String(parsed.coverUrl || "").trim();

  return (
    <SiteShell>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "22px 16px 140px" }}>
        {/* Two-column layout 65/35 */}
        <div style={{ display: "grid", gridTemplateColumns: "65% 35%", gap: 18, alignItems: "start" }}>
          {/* LEFT: cover + title */}
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              borderRadius: 18,
              overflow: "hidden",
            }}
          >
            <div style={{ aspectRatio: "16 / 10", background: "rgba(255,255,255,0.08)" }}>
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt="Album cover"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: 0.75,
                    fontWeight: 800,
                  }}
                >
                  No coverUrl in manifest
                </div>
              )}
            </div>

            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Album</div>
              <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -0.5, marginTop: 4 }}>
                {parsed.albumTitle || "Album"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>shareId: {parsed.shareId}</div>
            </div>
          </div>

          {/* RIGHT: cards stack */}
          <div style={{ display: "grid", gap: 12 }}>
            {/* Card 1: Album meta placeholders */}
            <div
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                borderRadius: 18,
                padding: 14,
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>Album Info</div>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ opacity: 0.75 }}>Name</div>
                  <div style={{ fontWeight: 800, textAlign: "right" }}>{parsed.meta?.albumTitle || parsed.albumTitle || "—"}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ opacity: 0.75 }}>Performer</div>
                  <div style={{ fontWeight: 800, textAlign: "right" }}>{parsed.meta?.artistName || "—"}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ opacity: 0.75 }}>Release Date</div>
                  <div style={{ fontWeight: 800, textAlign: "right" }}>{parsed.meta?.releaseDate || "—"}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ opacity: 0.75 }}>Total Time</div>
                  <div style={{ fontWeight: 800, textAlign: "right" }}>
                    {totalAlbumSec ? fmtTime(totalAlbumSec) : "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Buy button */}
            <div
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                borderRadius: 18,
                padding: 14,
              }}
            >
              <button
                type="button"
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: 999,
                  padding: "12px 14px",
                  fontWeight: 900,
                  fontSize: 16,
                  cursor: "pointer",
                  background: "#22c55e",
                  color: "#08210f",
                }}
              >
                Buy $19.50
              </button>
            </div>

            {/* Card 3: Marketing */}
            <div
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                borderRadius: 18,
                padding: 14,
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Included</div>
              <div style={{ display: "grid", gap: 6, opacity: 0.9 }}>
                <div>• 8 songs</div>
                <div>• Smart Bridge mode</div>
                <div>• Album mode</div>
                <div>• Artist control</div>
                <div>• Over 60 minutes of bonus authored bridge content</div>
                <div>• FREE MP3 album mix download included</div>
              </div>
            </div>

            {/* Card 4: Tracks */}
            <div
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                borderRadius: 18,
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
                        padding: "10px 12px",
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: isActive ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
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

        {/* audio element (no native controls => no 3-dot menu) */}
        <audio ref={audioRef} data-audio="product" preload="metadata" playsInline />

        {/* Bottom player (icons, centered Now Playing + seek bar) */}
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            borderTop: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(0,0,0,0.70)",
            backdropFilter: "blur(10px)",
            padding: "12px 12px",
          }}
        >
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 140px", alignItems: "center", gap: 12 }}>
              {/* Left: play/pause */}
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
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
                    cursor: "pointer",
                    fontSize: 18,
                    fontWeight: 900,
                    display: "grid",
                    placeItems: "center",
                  }}
                  aria-label={playing ? "Pause" : "Play"}
                  title={playing ? "Pause" : "Play"}
                >
                  {playing ? "⏸" : "▶︎"}
                </button>
              </div>

              {/* Center: now playing */}
              <div style={{ textAlign: "center", minWidth: 0 }}>
                <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: 0.3 }}>NOW PLAYING</div>
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: 16,
                    marginTop: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {activeTrack?.title || "—"}
                </div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
                  Preview: {PREVIEW_SECONDS}s max
                </div>
              </div>

              {/* Right: prev/next */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  onClick={prev}
                  disabled={activeIdx <= 0}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.08)",
                    color: "#fff",
                    cursor: "pointer",
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
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.08)",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Next
                </button>
              </div>
            </div>

            {/* Centered time bar row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 52, textAlign: "right", fontSize: 12, opacity: 0.75 }}>
                {fmtTime(curTime)}
              </div>

              <input
                type="range"
                min={0}
                max={Math.min(Number(dur || 0) || 0, PREVIEW_SECONDS)}
                step="0.01"
                value={Math.min(curTime, Math.min(Number(dur || 0) || 0, PREVIEW_SECONDS))}
                onChange={onSeek}
                style={{ width: "100%" }}
                disabled={!dur}
              />

              <div style={{ width: 52, fontSize: 12, opacity: 0.75 }}>
                {fmtTime(Math.min(Number(dur || 0) || 0, PREVIEW_SECONDS))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
