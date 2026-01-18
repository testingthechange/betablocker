// src/pages/Product.jsx
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

export default function Product() {
  const { shareId } = useParams();

  const [parsed, setParsed] = useState(null);
  const [err, setErr] = useState(null);

  // local-only cover preview (does not persist)
  const [localCoverUrl, setLocalCoverUrl] = useState("");

  // player state
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

  const coverSrc = localCoverUrl || parsed?.coverUrl || "";

  // keep audio src aligned with active track
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

  // wire audio events + enforce preview cap + countdown UI
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onMeta = () => setDur(a.duration || 0);

    const onTime = () => {
      const t = a.currentTime || 0;
      setCurTime(t);

      // preview cap
      if (t >= PREVIEW_SECONDS) {
        try {
          a.pause();
          a.currentTime = 0;
        } catch {}
        setPlaying(false);
        setCurTime(0);
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
  }, []);

  const playIndex = (i) => {
    if (!tracks[i]?.playbackUrl) return;
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

  const prev = () => setActiveIdx((i) => Math.max(0, i - 1));
  const next = () => setActiveIdx((i) => Math.min(tracks.length - 1, i + 1));

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
    try {
      if (!file) return;
      const url = URL.createObjectURL(file);
      setLocalCoverUrl(url);
    } catch {}
  };

  if (err) return <pre style={{ padding: 24 }}>{err}</pre>;
  if (!parsed) return <div style={{ padding: 24, color: "#fff" }}>Loading…</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#121212", color: "#fff" }}>
      {/* CENTERED GLOBAL HEADER */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(18,18,18,0.9)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid #2a2a2a",
        }}
      >
        <div style={{ position: "relative", maxWidth: 1100, margin: "0 auto", padding: "14px 16px" }}>
          {/* center cluster */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 18 }}>
            <Link to="/" style={{ color: "#fff", textDecoration: "none", fontWeight: 700, letterSpacing: 0.2 }}>
              Block Radius
            </Link>

            <nav style={{ display: "flex", gap: 14, opacity: 0.9 }}>
              <Link to="/" style={{ color: "#fff", textDecoration: "none" }}>Home</Link>
              <Link to="/shop" style={{ color: "#fff", textDecoration: "none" }}>Shop</Link>
              <Link to="/account" style={{ color: "#fff", textDecoration: "none" }}>Account</Link>
            </nav>

            <input
              placeholder="Search (Directus placeholder)…"
              style={{
                width: 380,
                maxWidth: "42vw",
                padding: "10px 12px",
                borderRadius: 999,
                border: "1px solid #2a2a2a",
                background: "#0e0e0e",
                color: "#fff",
                outline: "none",
              }}
              onChange={() => {}}
            />
          </div>

          {/* right: Clerk placeholder */}
          <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)" }}>
            <button
              type="button"
              onClick={() => alert("Clerk placeholder: wire later")}
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid #2a2a2a",
                background: "#ffffff",
                color: "#111",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Login
            </button>
          </div>

          <div style={{ marginTop: 10, textAlign: "center", fontSize: 12, opacity: 0.7 }}>
            Search is a placeholder; Shop will later query Directus.
          </div>
        </div>
      </header>

      {/* 65/35 body */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 18, paddingBottom: 140 }}>
        <div style={{ display: "grid", gridTemplateColumns: "65% 35%", gap: 18 }}>
          {/* Left column */}
          <div
            style={{
              border: "1px solid #222",
              borderRadius: 18,
              background: "linear-gradient(180deg, #161616, #101010)",
              padding: 16,
              display: "grid",
              gridTemplateColumns: "280px 1fr",
              gap: 16,
              minHeight: 320,
            }}
          >
            {/* cover */}
            <div
              style={{
                borderRadius: 14,
                border: "1px solid #2a2a2a",
                background: "#0e0e0e",
                display: "grid",
                placeItems: "center",
                overflow: "hidden",
                height: 280,
              }}
            >
              {coverSrc ? (
                <img
                  src={coverSrc}
                  alt="cover"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{ fontSize: 12, opacity: 0.6 }}>No coverUrl found in manifest</div>
              )}
            </div>

            {/* album meta */}
            <div>
              <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.1 }}>Album</div>
              <div style={{ marginTop: 8, fontSize: 13, opacity: 0.7 }}>
                shareId: {parsed.shareId || shareId}
              </div>
              <div style={{ marginTop: 8, fontSize: 13, opacity: 0.7 }}>
                Preview cap: {PREVIEW_SECONDS}s
              </div>

              <div style={{ marginTop: 18, fontSize: 12, opacity: 0.85 }}>Cover</div>

              <div
                style={{
                  marginTop: 8,
                  padding: 12,
                  borderRadius: 12,
                  border: "1px dashed #2f2f2f",
                  background: "#0f0f0f",
                  fontSize: 13,
                }}
              >
                <div style={{ opacity: 0.85 }}>
                  Reads coverUrl from manifest. Local preview upload below (does not persist).
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onPickCover(e.target.files?.[0])}
                    style={{ color: "#fff" }}
                  />
                  <button
                    type="button"
                    onClick={() => setLocalCoverUrl("")}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid #2a2a2a",
                      background: "#141414",
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

          {/* Right column */}
          <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
            {/* now playing */}
            <div
              style={{
                border: "1px solid #222",
                borderRadius: 18,
                background: "linear-gradient(180deg, #161616, #101010)",
                padding: 16,
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.7 }}>Now Playing</div>
              <div style={{ marginTop: 6, fontSize: 20, fontWeight: 800 }}>
                {activeTrack?.title || "—"}
              </div>
              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}>
                {fmtTime(curTime)} / {fmtTime(Math.min(dur || 0, PREVIEW_SECONDS))} · remaining {fmtTime(remaining)}
              </div>
            </div>

            {/* tracks */}
            <div
              style={{
                border: "1px solid #222",
                borderRadius: 18,
                background: "linear-gradient(180deg, #161616, #101010)",
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
                        border: "1px solid #2a2a2a",
                        background: isActive ? "#1f1f1f" : "#121212",
                        cursor: "pointer",
                        color: "#fff",
                      }}
                    >
                      <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.title}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                        {t.durationSec ? fmtTime(t.durationSec) : ""}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* audio element (no native controls; no 3-dot menu) */}
        <audio ref={audioRef} data-audio="product" preload="metadata" playsInline />
      </div>

      {/* bottom player */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          borderTop: "1px solid #2a2a2a",
          background: "rgba(10,10,10,0.92)",
          backdropFilter: "blur(8px)",
          padding: "10px 12px",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Now Playing</div>
              <div style={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {activeTrack ? activeTrack.title : "—"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Preview cap: {PREVIEW_SECONDS}s</div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={prev}
                disabled={activeIdx <= 0}
                style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #2a2a2a", background: "#141414", color: "#fff" }}
              >
                Prev
              </button>
              <button
                onClick={togglePlay}
                disabled={!activeTrack?.playbackUrl}
                style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #2a2a2a", background: "#fff", color: "#111", fontWeight: 800 }}
              >
                {playing ? "Pause" : "Play"}
              </button>
              <button
                onClick={next}
                disabled={activeIdx >= tracks.length - 1}
                style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #2a2a2a", background: "#141414", color: "#fff" }}
              >
                Next
              </button>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 52, textAlign: "right", fontSize: 12, opacity: 0.75 }}>
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
            <div style={{ width: 52, fontSize: 12, opacity: 0.75 }}>
              {fmtTime(Math.min(dur || 0, PREVIEW_SECONDS))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
