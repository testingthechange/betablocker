import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchManifest, validateManifest } from "../lib/manifest.js";

const PREVIEW_SECONDS = 40;

function safeString(v) {
  return String(v ?? "").trim();
}

function fmtTime(sec) {
  const n = Number(sec);
  if (!Number.isFinite(n) || n < 0) return "0:00";
  const m = Math.floor(n / 60);
  const s = Math.floor(n % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function IconPlay({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8 5v14l12-7L8 5z" fill="currentColor" />
    </svg>
  );
}

function IconPause({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M7 5h4v14H7V5zm6 0h4v14h-4V5z" fill="currentColor" />
    </svg>
  );
}

function IconPrev({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 6h2v12H6V6zm3 6l9-6v12l-9-6z" fill="currentColor" />
    </svg>
  );
}

function IconNext({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M16 6h2v12h-2V6zM6 18V6l9 6-9 6z" fill="currentColor" />
    </svg>
  );
}

export default function Product() {
  const { shareId } = useParams();

  const [parsed, setParsed] = useState(null);
  const [err, setErr] = useState(null);

  // player state
  const audioRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [curTime, setCurTime] = useState(0);
  const [dur, setDur] = useState(0);

  // local-only cover override (does not persist)
  const [localCoverUrl, setLocalCoverUrl] = useState("");

  // load manifest
  useEffect(() => {
    let cancelled = false;

    setErr(null);
    setParsed(null);
    setLocalCoverUrl("");

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

  const manifestCoverUrl = safeString(parsed?.coverUrl);
  const coverUrl = localCoverUrl || manifestCoverUrl;

  // set audio src when active track changes
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    setCurTime(0);
    setDur(0);

    const url = safeString(activeTrack?.playbackUrl);
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
    } catch {}
  }, [activeTrack?.playbackUrl]);

  const playFromIndex = (i) => {
    if (!tracks[i]?.playbackUrl) return;
    setActiveIdx(i);
    setTimeout(() => {
      const a = audioRef.current;
      if (!a) return;
      a.play().catch(() => {});
    }, 0);
  };

  const nextIndex = () => Math.min(tracks.length - 1, activeIdx + 1);
  const prevIndex = () => Math.max(0, activeIdx - 1);

  const goNext = (autoplay = false) => {
    const ni = nextIndex();
    if (ni === activeIdx) {
      // end of playlist
      const a = audioRef.current;
      if (a) {
        try {
          a.pause();
          a.currentTime = 0;
        } catch {}
      }
      setPlaying(false);
      setCurTime(0);
      return;
    }
    setActiveIdx(ni);
    if (autoplay) {
      setTimeout(() => {
        const a = audioRef.current;
        if (a) a.play().catch(() => {});
      }, 0);
    }
  };

  const goPrev = (autoplay = false) => {
    const pi = prevIndex();
    setActiveIdx(pi);
    if (autoplay) {
      setTimeout(() => {
        const a = audioRef.current;
        if (a) a.play().catch(() => {});
      }, 0);
    }
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a || !activeTrack?.playbackUrl) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  // wire audio events + enforce preview cap + continuous play
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onMeta = () => setDur(a.duration || 0);

    const onTime = () => {
      const t = a.currentTime || 0;
      setCurTime(t);

      // PREVIEW CAP (locked)
      if (t >= PREVIEW_SECONDS) {
        try {
          a.pause();
          a.currentTime = 0;
        } catch {}
        setCurTime(0);
        setPlaying(false);

        // CONTINUOUS PLAY: advance to next and autoplay
        goNext(true);
      }
    };

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    const onEnded = () => {
      setPlaying(false);
      setCurTime(0);
      // natural end -> next and autoplay
      goNext(true);
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
  }, [activeIdx, tracks.length]);

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

  const onCoverPick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const url = URL.createObjectURL(f);
      setLocalCoverUrl(url);
    } catch {}
  };

  const resetLocalCover = () => {
    try {
      if (localCoverUrl) URL.revokeObjectURL(localCoverUrl);
    } catch {}
    setLocalCoverUrl("");
  };

  if (err) return <pre style={{ color: "#fff", padding: 18 }}>{err}</pre>;
  if (!parsed) return <div style={{ color: "#fff", padding: 18 }}>Loading…</div>;

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background:
          "radial-gradient(1200px 700px at 30% 0%, rgba(120,60,220,0.22), transparent 60%), #07060b",
        color: "rgba(255,255,255,0.92)",
        paddingBottom: 96, // room for player
      }}
    >
      {/* SINGLE WIDTH CONTROLLER */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "22px 18px 0" }}>
        <div style={{ fontSize: 44, fontWeight: 800, margin: "6px 0 18px" }}>
          {safeString(parsed?.albumTitle) || "Album"}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 60%) minmax(0, 40%)",
            gap: 16,
            alignItems: "start",
          }}
        >
          {/* LEFT COLUMN */}
          <div
            style={{
              borderRadius: 18,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: 14, fontSize: 12, opacity: 0.7 }}>Album Cover</div>

            <div
              style={{
                aspectRatio: "1 / 1",
                background: "rgba(255,255,255,0.06)",
                display: "grid",
                placeItems: "center",
                borderTop: "1px solid rgba(255,255,255,0.10)",
                borderBottom: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt="Album cover"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{ opacity: 0.75, fontWeight: 700 }}>No coverUrl in manifest</div>
              )}
            </div>

            <div style={{ padding: 14 }}>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>Cover</div>
              <div
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: "1px dashed rgba(255,255,255,0.18)",
                  background: "rgba(0,0,0,0.15)",
                }}
              >
                <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 8 }}>
                  Reads coverUrl from manifest. Local preview upload below (does not persist).
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <input type="file" accept="image/*" onChange={onCoverPick} />
                  <button
                    onClick={resetLocalCover}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(255,255,255,0.06)",
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

          {/* RIGHT COLUMN */}
          <div style={{ display: "grid", gap: 14 }}>
            {/* Album Info card */}
            <div
              style={{
                borderRadius: 18,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                padding: 14,
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>Album Info</div>

              <div style={{ display: "grid", gap: 8 }}>
                <Row label="Name" value={safeString(parsed?.meta?.albumTitle || parsed?.albumTitle || "Album")} />
                <Row label="Performer" value={safeString(parsed?.meta?.artistName || "—")} />
                <Row label="Release Date" value={safeString(parsed?.meta?.releaseDate || "—")} />
                <Row label="Total Time" value={"—"} />
              </div>
            </div>

            {/* Purchase card */}
            <div
              style={{
                borderRadius: 18,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                padding: 14,
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>Purchase</div>
              <button
                type="button"
                style={{
                  width: "100%",
                  padding: "14px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(46, 204, 113, 0.35)",
                  background: "rgba(46, 204, 113, 0.16)",
                  color: "rgba(120,255,180,0.95)",
                  fontWeight: 800,
                  fontSize: 18,
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
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                padding: 14,
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>Included</div>
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.55, opacity: 0.92 }}>
                <li>8 songs</li>
                <li>Smart Bridge mode</li>
                <li>Album mode</li>
                <li>Artist control</li>
                <li>Over 60 minutes of bonus authored bridge content</li>
                <li>FREE MP3 album mix download included</li>
              </ul>
            </div>

            {/* Tracks card */}
            <div
              style={{
                borderRadius: 18,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
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
                      onClick={() => playFromIndex(i)}
                      style={{
                        textAlign: "left",
                        padding: "12px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: isActive ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)",
                        color: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      {safeString(t?.title) || `Track ${i + 1}`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NO native controls (no 3-dot menu) */}
      <audio ref={audioRef} data-audio="product" preload="metadata" playsInline />

      {/* BOTTOM PLAYER (layout stays) */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          height: 86,
          background: "rgba(18,18,20,0.92)",
          borderTop: "1px solid rgba(255,255,255,0.10)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            height: "100%",
            padding: "10px 18px",
            display: "grid",
            gridTemplateColumns: "220px 1fr 220px",
            alignItems: "center",
            gap: 12,
          }}
        >
          {/* LEFT: Play/Pause */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={togglePlay}
              disabled={!activeTrack?.playbackUrl}
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                cursor: activeTrack?.playbackUrl ? "pointer" : "not-allowed",
              }}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <IconPause size={18} /> : <IconPlay size={18} />}
            </button>
          </div>

          {/* CENTER: Now playing + seek */}
          <div style={{ minWidth: 0 }}>
            <div style={{ textAlign: "center", fontSize: 11, letterSpacing: 1.4, opacity: 0.65 }}>
              NOW PLAYING
            </div>
            <div
              style={{
                textAlign: "center",
                fontWeight: 700,
                fontSize: 16,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                marginTop: 2,
              }}
            >
              {activeTrack ? safeString(activeTrack.title) : "—"}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
              <div style={{ width: 44, textAlign: "right", fontSize: 12, opacity: 0.75 }}>
                {fmtTime(curTime)}
              </div>
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
              <div style={{ width: 44, fontSize: 12, opacity: 0.75 }}>
                {fmtTime(Math.min(dur || 0, PREVIEW_SECONDS))}
              </div>
            </div>
          </div>

          {/* RIGHT: Prev/Next */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              onClick={() => goPrev(true)}
              disabled={activeIdx <= 0}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                opacity: activeIdx <= 0 ? 0.35 : 1,
                cursor: activeIdx <= 0 ? "not-allowed" : "pointer",
              }}
              aria-label="Previous"
            >
              <IconPrev size={18} />
            </button>

            <button
              onClick={() => goNext(true)}
              disabled={activeIdx >= tracks.length - 1}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                opacity: activeIdx >= tracks.length - 1 ? 0.35 : 1,
                cursor: activeIdx >= tracks.length - 1 ? "not-allowed" : "pointer",
              }}
              aria-label="Next"
            >
              <IconNext size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
      <div style={{ opacity: 0.75 }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{value}</div>
    </div>
  );
}
