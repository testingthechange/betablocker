// src/pages/Product.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchManifest, validateManifest } from "../lib/manifest.js";

const PREVIEW_SECONDS = 40;

function fmtTime(sec) {
  const n = Number(sec);
  if (!Number.isFinite(n) || n <= 0) return "—";
  const m = Math.floor(n / 60);
  const s = Math.floor(n % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
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
    fetchManifest(shareId)
      .then((m) => setParsed(validateManifest(m)))
      .catch((e) => setErr(String(e?.message || e)));
  }, [shareId]);

  const tracks = useMemo(() => parsed?.tracks || [], [parsed]);
  const activeTrack = tracks[activeIdx] || null;

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !activeTrack?.playbackUrl) return;

    a.pause();
    a.currentTime = 0;
    a.src = activeTrack.playbackUrl;
    a.load();
  }, [activeTrack?.playbackUrl]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onTime = () => {
      setCurTime(a.currentTime || 0);
      if (a.currentTime >= PREVIEW_SECONDS) {
        a.pause();
        a.currentTime = 0;
        setPlaying(false);
        setActiveIdx((i) => Math.min(tracks.length - 1, i + 1));
      }
    };

    const onMeta = () => setDur(a.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);

    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
    };
  }, [tracks.length]);

  const playIndex = (i) => {
    setActiveIdx(i);
    setTimeout(() => audioRef.current?.play().catch(() => {}), 0);
  };

  if (err) return <pre>{err}</pre>;
  if (!parsed) return <div>Loading…</div>;

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at top, #241132, #000)" }}>
      {/* HEADER */}
      <header style={{ padding: "16px 24px", display: "flex", alignItems: "center", gap: 24 }}>
        <strong>Block Radius</strong>
        <nav style={{ margin: "0 auto", display: "flex", gap: 18 }}>
          <Link to="/">Home</Link>
          <Link to="/shop">Shop</Link>
          <Link to="/account">Account</Link>
        </nav>
        <Link to="/login">Login</Link>
      </header>

      {/* BODY */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px", display: "grid", gridTemplateColumns: "2fr 1fr", gap: 32 }}>
        <div>
          <h1>{parsed.albumTitle}</h1>
        </div>

        <div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>
            Tracks <span style={{ opacity: 0.6, fontSize: 14 }}>{tracks.length}</span>
          </div>

          {tracks.map((t, i) => {
            const isActive = i === activeIdx;
            return (
              <button
                key={i}
                onClick={() => playIndex(i)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: isActive ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.18)",
                  color: "#fff",
                  cursor: "pointer",
                  marginBottom: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 18, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.title}
                  </div>
                  <div style={{ fontSize: 14, opacity: 0.75, flexShrink: 0 }}>
                    {fmtTime(t.durationSec)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {/* PLAYER */}
      <audio ref={audioRef} preload="metadata" />

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: 16, background: "rgba(0,0,0,0.85)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}>
          <div />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 600 }}>{activeTrack?.title || "—"}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {fmtTime(curTime)} / {fmtTime(PREVIEW_SECONDS)}
            </div>
            <button
              onClick={() => (playing ? audioRef.current.pause() : audioRef.current.play())}
              style={{ marginTop: 8, width: 52, height: 52, borderRadius: "50%" }}
            >
              {playing ? "❚❚" : "▶"}
            </button>
          </div>
          <div style={{ textAlign: "right" }}>
            <button onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}>Prev</button>
            <button onClick={() => setActiveIdx((i) => Math.min(tracks.length - 1, i + 1))}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
