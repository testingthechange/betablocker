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

function IconPlay() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 5v14l12-7-12-7z" fill="currentColor" />
    </svg>
  );
}
function IconPause() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 5h4v14H7V5zm6 0h4v14h-4V5z" fill="currentColor" />
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

  // used to decide whether to auto-continue after cap/ended
  const playIntentRef = useRef(false);

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
        playIntentRef.current = false;
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

  // keep audio src aligned with active track
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const url = activeTrack?.playbackUrl;

    setCurTime(0);
    setDur(0);

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

    // if user intended playback, continue automatically on track change
    if (playIntentRef.current && url) {
      setTimeout(() => {
        const ax = audioRef.current;
        if (!ax) return;
        ax.play().catch(() => {});
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrack?.playbackUrl]);

  const goNext = () => setActiveIdx((i) => Math.min(tracks.length - 1, i + 1));
  const goPrev = () => setActiveIdx((i) => Math.max(0, i - 1));

  // audio events + enforce preview cap + auto-continue
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const stopAndReset = () => {
      try {
        a.pause();
        a.currentTime = 0;
      } catch {}
      setPlaying(false);
      setCurTime(0);
    };

    const advanceIfIntent = () => {
      if (!playIntentRef.current) return;
      if (activeIdx >= tracks.length - 1) {
        playIntentRef.current = false;
        return;
      }
      setActiveIdx((i) => Math.min(tracks.length - 1, i + 1));
    };

    const onMeta = () => setDur(a.duration || 0);

    const onTime = () => {
      const t = a.currentTime || 0;
      setCurTime(t);

      // LOCKED preview cap
      if (t >= PREVIEW_SECONDS) {
        stopAndReset();
        advanceIfIntent();
      }
    };

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    const onEnded = () => {
      stopAndReset();
      advanceIfIntent();
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

  const playIndex = (i) => {
    if (!tracks[i]?.playbackUrl) return;
    playIntentRef.current = true;
    setActiveIdx(i);
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a || !activeTrack?.playbackUrl) return;

    if (a.paused) {
      playIntentRef.current = true;
      a.play().catch(() => {});
    } else {
      playIntentRef.current = false;
      a.pause();
    }
  };

  const onSeek = (e) => {
    const a = audioRef.current;
    if (!a) return;
    const v = Number(e.target.value);
    if (!Number.isFinite(v)) return;

    // clamp seeks to preview window (LOCKED)
    const clamped = Math.min(v, PREVIEW_SECONDS);
    try {
      a.currentTime = clamped;
      setCurTime(clamped);
    } catch {}
  };

  const totalAlbumTimeSec = useMemo(() => {
    return (tracks || []).reduce((acc, t) => acc + (Number(t?.durationSec) || 0), 0);
  }, [tracks]);

  if (err) return <pre style={{ whiteSpace: "pre-wrap" }}>{err}</pre>;
  if (!parsed) return <div style={{ padding: 18 }}>Loading…</div>;

  // card styles (page itself does NOT control width)
  const card = {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
  };

  const colGrid = {
    display: "grid",
    gridTemplateColumns: "65% 35%",
    gap: 16,
    alignItems: "start",
  };

  const coverWrap = {
    width: "100%",
    aspectRatio: "1 / 1",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.06)",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "rgba(255,255,255,0.60)",
    fontWeight: 700,
  };

  const buyBtn = {
    width: "100%",
    border: "0",
    borderRadius: 14,
    padding: "14px 16px",
    fontWeight: 900,
    fontSize: 16,
    color: "#08120c",
    background: "#27d06c",
    cursor: "pointer",
  };

  // player bar
  const playerBar = {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    borderTop: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(20,20,28,0.92)",
    backdropFilter: "blur(10px)",
  };

  const playerInner = {
    width: "100%",
    maxWidth: 1200,
    margin: "0 auto",
    padding: "12px 18px 14px",
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    alignItems: "center",
    gap: 12,
  };

  const circleBtn = (disabled) => ({
    width: 48,
    height: 48,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: disabled ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.10)",
    color: "rgba(255,255,255,0.92)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
  });

  const smallBtn = (disabled) => ({
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.92)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
  });

  const maxRange = Math.min(dur || 0, PREVIEW_SECONDS);
  const rangeValue = Math.min(curTime, maxRange);

  const remaining = Math.max(0, PREVIEW_SECONDS - (curTime || 0));

  return (
    <div style={{ paddingBottom: 120 }}>
      {/* Page grid */}
      <div style={colGrid}>
        {/* LEFT: cover + album card */}
        <div style={{ ...card, padding: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, alignItems: "start" }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>Album Cover</div>
              <div style={coverWrap}>
                {parsed.coverUrl ? (
                  <img
                    src={parsed.coverUrl}
                    alt="Album cover"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ textAlign: "center", padding: 12 }}>
                    <div style={{ fontSize: 16, marginBottom: 6 }}>No coverUrl in manifest</div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                      Add <code>coverUrl</code> to publish output to render it here.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: -0.8, marginTop: 4 }}>
                {parsed.albumTitle || "Album"}
              </div>
              <div style={{ marginTop: 6, opacity: 0.7, fontSize: 13 }}>
                shareId: {parsed.shareId || shareId} · tracks: {tracks.length}
              </div>
              <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>
                Preview cap: <strong>{PREVIEW_SECONDS}s</strong>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT column cards */}
        <div style={{ display: "grid", gap: 12 }}>
          {/* Album meta placeholder card */}
          <div style={{ ...card, padding: 16 }}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>Album Info</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
              <div style={{ opacity: 0.75 }}>Name</div>
              <div style={{ fontWeight: 800 }}>{parsed.albumTitle || "Album"}</div>

              <div style={{ opacity: 0.75 }}>Performer</div>
              <div style={{ fontWeight: 800 }}>{parsed?.meta?.artistName || "—"}</div>

              <div style={{ opacity: 0.75 }}>Release Date</div>
              <div style={{ fontWeight: 800 }}>{parsed?.meta?.releaseDate || "—"}</div>

              <div style={{ opacity: 0.75 }}>Total Time</div>
              <div style={{ fontWeight: 800 }}>
                {totalAlbumTimeSec ? fmtTime(totalAlbumTimeSec) : "—"}
              </div>
            </div>
          </div>

          {/* Buy button card */}
          <div style={{ ...card, padding: 12 }}>
            <button style={buyBtn} onClick={() => { /* placeholder */ }}>
              Buy $19.50
            </button>
          </div>

          {/* Marketing card */}
          <div style={{ ...card, padding: 16 }}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>Included</div>
            <div style={{ lineHeight: 1.7, opacity: 0.9 }}>
              • 8 songs<br />
              • Smart Bridge mode<br />
              • Album mode<br />
              • Artist control<br />
              • Over 60 minutes of bonus authored bridge content<br />
              • FREE MP3 album mix download included
            </div>
          </div>

          {/* Tracks card */}
          <div style={{ ...card, padding: 16 }}>
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
                      borderRadius: 14,
                      border: isActive ? "1px solid rgba(255,255,255,0.20)" : "1px solid rgba(255,255,255,0.10)",
                      background: isActive ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.06)",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      color: "rgba(255,255,255,0.92)",
                    }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 700 }}>
                      {t.title || `Track ${i + 1}`}
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

      {/* Bottom player */}
      <div style={playerBar}>
        <div style={playerInner}>
          {/* LEFT: play/pause */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              style={circleBtn(!activeTrack?.playbackUrl)}
              onClick={togglePlay}
              disabled={!activeTrack?.playbackUrl}
              aria-label={playing ? "Pause" : "Play"}
              title={playing ? "Pause" : "Play"}
            >
              {playing ? <IconPause /> : <IconPlay />}
            </button>

            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Preview: {PREVIEW_SECONDS}s max
            </div>
          </div>

          {/* CENTER: now playing + time */}
          <div style={{ textAlign: "center", minWidth: 0 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.2, opacity: 0.65 }}>
              NOW PLAYING
            </div>
            <div style={{ fontWeight: 900, fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {activeTrack?.title || "—"}
            </div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
              {fmtTime(rangeValue)} / {fmtTime(maxRange)} · remaining {fmtTime(remaining)}
            </div>
          </div>

          {/* RIGHT: prev/next */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button style={smallBtn(activeIdx <= 0)} onClick={() => { playIntentRef.current = playIntentRef.current || playing; goPrev(); }} disabled={activeIdx <= 0}>
              Prev
            </button>
            <button style={smallBtn(activeIdx >= tracks.length - 1)} onClick={() => { playIntentRef.current = playIntentRef.current || playing; goNext(); }} disabled={activeIdx >= tracks.length - 1}>
              Next
            </button>
          </div>

          {/* Progress (full width row under grid) */}
          <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, textAlign: "right", fontSize: 12, opacity: 0.75 }}>
              {fmtTime(rangeValue)}
            </div>
            <input
              type="range"
              min={0}
              max={maxRange || 0}
              step="0.01"
              value={rangeValue}
              onChange={onSeek}
              style={{ width: "100%" }}
              disabled={!maxRange}
            />
            <div style={{ width: 44, fontSize: 12, opacity: 0.75 }}>
              {fmtTime(maxRange)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
