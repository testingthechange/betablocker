// src/pages/Product.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchManifest, validateManifest } from "../lib/manifest.js";

const PREVIEW_SECONDS = 40;

function fmtTime(sec) {
  const n = Number(sec);
  if (!Number.isFinite(n) || n < 0) return "0:00";
  const m = Math.floor(n / 60);
  const s = Math.floor(n % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function Card({ title, right, children, style }) {
  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.06)",
        boxShadow: "0 18px 55px rgba(0,0,0,0.35) inset, 0 10px 40px rgba(0,0,0,0.20)",
        overflow: "hidden",
        ...style,
      }}
    >
      {(title || right) && (
        <div
          style={{
            padding: "12px 14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ fontSize: 13, opacity: 0.8 }}>{title}</div>
          {right ? <div style={{ fontSize: 12, opacity: 0.7 }}>{right}</div> : null}
        </div>
      )}
      <div style={{ padding: 14 }}>{children}</div>
    </div>
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

  const tracks = useMemo(() => parsed?.tracks || [], [parsed]);
  const activeTrack = tracks[activeIdx] || null;

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
  }, [activeTrack?.playbackUrl]);

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
        // continuous play: advance to next track after cap
        setActiveIdx((i) => Math.min(tracks.length - 1, i + 1));
        setTimeout(() => {
          const b = audioRef.current;
          if (!b) return;
          b.play().catch(() => {});
        }, 0);
      }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setCurTime(0);
      setActiveIdx((i) => Math.min(tracks.length - 1, i + 1));
      setTimeout(() => {
        const b = audioRef.current;
        if (!b) return;
        b.play().catch(() => {});
      }, 0);
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

  const playIndex = (i) => {
    if (!tracks[i]?.playbackUrl) return;
    setActiveIdx(i);
    setTimeout(() => {
      const a = audioRef.current;
      if (!a) return;
      a.play().catch(() => {});
    }, 0);
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
    const clamped = Math.min(v, PREVIEW_SECONDS);
    try {
      a.currentTime = clamped;
      setCurTime(clamped);
    } catch {}
  };

  if (err) return <pre style={{ whiteSpace: "pre-wrap" }}>{err}</pre>;
  if (!parsed) return <div>Loading…</div>;

  const albumName = parsed?.albumTitle || "Album";
  const coverUrl = parsed?.coverUrl || "";

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* top title area (no debug text) */}
      <div>
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.4 }}>{albumName}</div>
        <div style={{ fontSize: 13, opacity: 0.75, marginTop: 6 }}>Artist</div>
      </div>

      {/* two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1.85fr 1.15fr", gap: 14 }}>
        {/* LEFT: cover */}
        <Card title="Album Cover" style={{ minHeight: 420 }}>
          <div
            style={{
              height: 340,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(0,0,0,0.22)",
              display: "grid",
              placeItems: "center",
              overflow: "hidden",
            }}
          >
            {coverUrl ? (
              <img
                src={coverUrl}
                alt="Album cover"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div style={{ textAlign: "center", opacity: 0.8 }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>No coverUrl in manifest</div>
              </div>
            )}
          </div>

          {/* keep your local preview upload section (existing behavior) */}
          <div style={{ marginTop: 12, opacity: 0.85, fontSize: 12 }}>
            Cover reads coverUrl from manifest; local preview upload (non-persistent) stays below.
          </div>
        </Card>

        {/* RIGHT: cards */}
        <div style={{ display: "grid", gap: 14 }}>
          <Card title="Album Info">
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ opacity: 0.75 }}>Name</div>
                <div style={{ fontWeight: 800 }}>{albumName}</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ opacity: 0.75 }}>Performer</div>
                <div style={{ fontWeight: 800 }}>—</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ opacity: 0.75 }}>Release Date</div>
                <div style={{ fontWeight: 800 }}>—</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ opacity: 0.75 }}>Total Time</div>
                <div style={{ fontWeight: 800 }}>—</div>
              </div>
            </div>
          </Card>

          <Card title="Purchase">
            <button
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 999,
                border: "1px solid rgba(46, 255, 143, 0.35)",
                background: "rgba(46, 255, 143, 0.10)",
                color: "rgba(46, 255, 143, 1)",
                fontWeight: 900,
                fontSize: 16,
                cursor: "pointer",
              }}
              onClick={() => {}}
            >
              Buy $19.50
            </button>
          </Card>

          <Card title="Included">
            <div style={{ display: "grid", gap: 8, opacity: 0.9 }}>
              <div>• 8 songs</div>
              <div>• Smart Bridge mode</div>
              <div>• Album mode</div>
              <div>• Artist control</div>
              <div>• Over 60 minutes of bonus authored bridge content</div>
              <div>• FREE MP3 album mix download included</div>
            </div>
          </Card>

          <Card title="Tracks" right={String(tracks.length)}>
            <div style={{ display: "grid", gap: 10 }}>
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
                      background: isActive ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.20)",
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
                    <span style={{ fontSize: 12, opacity: 0.7 }}>
                      {t.durationSec ? fmtTime(t.durationSec) : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* audio element (no native controls) */}
      <audio ref={audioRef} data-audio="product" preload="metadata" playsInline />

      {/* bottom player (kept) */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          borderTop: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(10px)",
          padding: "12px 14px",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}>
            {/* left: play */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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

            {/* center: now playing */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, letterSpacing: 1.2, opacity: 0.7 }}>NOW PLAYING</div>
              <div style={{ fontSize: 16, fontWeight: 900, marginTop: 2 }}>
                {activeTrack?.title || "—"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>Preview: {PREVIEW_SECONDS}s max</div>
            </div>

            {/* right: prev/next */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={prev}
                disabled={activeIdx <= 0}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.9)",
                  cursor: "pointer",
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
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.9)",
                  cursor: "pointer",
                }}
              >
                Next
              </button>
            </div>
          </div>

          {/* seek bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, textAlign: "right", fontSize: 12, opacity: 0.75 }}>{fmtTime(curTime)}</div>
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
            <div style={{ width: 48, fontSize: 12, opacity: 0.75 }}>{fmtTime(Math.min(dur || 0, PREVIEW_SECONDS))}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
