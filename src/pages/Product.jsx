import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchManifest, validateManifest } from "../lib/manifest.js";

const PREVIEW_SECONDS = 40;

function fmtTime(sec) {
  const n = Number(sec);
  if (!Number.isFinite(n) || n < 0) return "0:00";
  const m = Math.floor(n / 60);
  const s = Math.floor(n % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtHMS(totalSec) {
  const n = Number(totalSec);
  if (!Number.isFinite(n) || n <= 0) return "";
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const s = Math.floor(n % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
    document.body.style.background = "#07070a";
    document.body.style.margin = "0";
    document.body.style.minHeight = "100vh";
  }, []);

  useEffect(() => {
    fetchManifest(shareId)
      .then((m) => setParsed(validateManifest(m)))
      .catch((e) => setErr(String(e?.message || e)));
  }, [shareId]);

  const tracks = useMemo(() => parsed?.tracks || [], [parsed]);
  const activeTrack = tracks[activeIdx] || null;

  const totalAlbumTimeSec = useMemo(
    () => tracks.reduce((a, t) => a + (Number(t?.durationSec) || 0), 0),
    [tracks]
  );

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

    const onMeta = () => setDur(a.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    const onTime = () => {
      setCurTime(a.currentTime || 0);
      if (a.currentTime >= PREVIEW_SECONDS) {
        a.pause();
        a.currentTime = 0;
        setPlaying(false);
        if (activeIdx < tracks.length - 1) {
          setActiveIdx((i) => i + 1);
          setTimeout(() => audioRef.current?.play().catch(() => {}), 0);
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
  }, [tracks.length, activeIdx]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  const prev = () => setActiveIdx((i) => Math.max(0, i - 1));
  const next = () => setActiveIdx((i) => Math.min(tracks.length - 1, i + 1));

  const onSeek = (e) => {
    const a = audioRef.current;
    if (!a) return;
    const v = Math.min(Number(e.target.value), PREVIEW_SECONDS);
    a.currentTime = v;
    setCurTime(v);
  };

  if (err) return <pre style={{ color: "#fff", padding: 24 }}>{err}</pre>;
  if (!parsed) return <div style={{ color: "#fff", padding: 24 }}>Loading…</div>;

  return (
    <div style={{ width: "100vw", minHeight: "100vh", background: "#07070a", color: "#fff" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* HEADER */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ padding: "14px 16px", display: "grid", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <strong>Block Radius</strong>
              <div style={{ marginLeft: "auto" }}>
                <Link
                  to="/login"
                  style={{
                    background: "#fff",
                    color: "#111",
                    padding: "8px 14px",
                    borderRadius: 999,
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  Login
                </Link>
              </div>
            </div>

            {/* CENTERED NAV */}
            <nav style={{ display: "flex", justifyContent: "center", gap: 18 }}>
              <Link to="/" style={{ color: "#fff", textDecoration: "none" }}>Home</Link>
              <Link to="/shop" style={{ color: "#fff", textDecoration: "none" }}>Shop</Link>
              <Link to="/account" style={{ color: "#fff", textDecoration: "none" }}>Account</Link>
            </nav>

            {/* SEARCH BELOW */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <input
                type="search"
                placeholder="Search (Directus placeholder)…"
                style={{
                  width: 420,
                  maxWidth: "90%",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 999,
                  padding: "10px 14px",
                  color: "#fff",
                }}
              />
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <div style={{ padding: "20px 16px 140px", display: "grid", gridTemplateColumns: "65% 35%", gap: 18 }}>
          <div>
            <h1>{parsed.albumTitle}</h1>
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Album info</div>
            <div>Total length: {fmtHMS(totalAlbumTimeSec)}</div>
          </div>
        </div>

        <audio ref={audioRef} data-audio="product" preload="metadata" playsInline />
      </div>

      {/* PLAYER */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.7)",
          borderTop: "1px solid rgba(255,255,255,0.12)",
          padding: "10px",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 160px", alignItems: "center" }}>
            <button onClick={togglePlay} style={{ width: 48, height: 48, borderRadius: 999 }}>
              {playing ? "⏸" : "▶︎"}
            </button>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>NOW PLAYING</div>
              <div style={{ fontWeight: 800 }}>{activeTrack?.title || "—"}</div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={prev}>Prev</button>
              <button onClick={next}>Next</button>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
            <div style={{ width: 48, textAlign: "right" }}>{fmtTime(curTime)}</div>
            <input
              type="range"
              min={0}
              max={Math.min(dur || 0, PREVIEW_SECONDS)}
              step="0.01"
              value={Math.min(curTime, PREVIEW_SECONDS)}
              onChange={onSeek}
              style={{ width: "min(720px, 90vw)" }}
            />
            <div style={{ width: 48 }}>{fmtTime(Math.min(dur || 0, PREVIEW_SECONDS))}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
