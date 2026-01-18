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
    if (!a) return;

    const url = activeTrack?.playbackUrl;
    try {
      a.pause();
      a.currentTime = 0;
      if (url) {
        a.src = url;
        a.load();
      }
    } catch {}
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
  }, []);

  const playIndex = (i) => {
    setActiveIdx(i);
    setTimeout(() => audioRef.current?.play().catch(() => {}), 0);
  };

  if (err) return <pre>{err}</pre>;
  if (!parsed) return <div>Loading…</div>;

  return (
    <>
      {/* GLOBAL HEADER */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "#111",
          color: "#fff",
          borderBottom: "1px solid #333",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <strong>Block Radius</strong>

          <nav style={{ display: "flex", gap: 14 }}>
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

          <div style={{ marginLeft: "auto" }}>
            <Link to="/login" style={{ color: "#fff", textDecoration: "none" }}>
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* PAGE */}
      <div style={{ padding: 24, paddingBottom: 120 }}>
        <h1>{parsed.albumTitle}</h1>

        {tracks.map((t, i) => (
          <button
            key={i}
            onClick={() => playIndex(i)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "10px",
              marginBottom: 8,
            }}
          >
            {t.title}
          </button>
        ))}

        <audio ref={audioRef} data-audio="product" preload="metadata" />

        {/* BOTTOM PLAYER */}
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "#222",
            color: "#fff",
            borderTop: "1px solid #333",
            padding: 12,
          }}
        >
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div>{activeTrack?.title || "—"}</div>
            <div style={{ fontSize: 12 }}>
              {fmtTime(curTime)} / {fmtTime(Math.min(dur, PREVIEW_SECONDS))}
            </div>
            <button onClick={() => audioRef.current?.play()} disabled={playing}>
              Play
            </button>
            <button onClick={() => audioRef.current?.pause()} disabled={!playing}>
              Pause
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
