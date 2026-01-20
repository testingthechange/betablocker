import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

/**
 * RECEIVER (LOCKED)
 * BUILD: RECEIVER-2026-01-20-C
 * Player reset: click → play (no autoplay, no fighting state)
 */

const S3_MANIFEST_BASE =
  "https://block-7306-player.s3.us-west-1.amazonaws.com/public/players";

function manifestUrl(shareId) {
  return `${S3_MANIFEST_BASE}/${shareId}/manifest.json`;
}

function fmt(sec) {
  const s = Math.max(0, Math.floor(Number(sec || 0)));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export default function Product() {
  const { shareId } = useParams();

  const [manifest, setManifest] = useState(null);
  const [err, setErr] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [playing, setPlaying] = useState(false);

  const audioRef = useRef(null);

  const tracks = useMemo(
    () =>
      Array.isArray(manifest?.tracks)
        ? [...manifest.tracks].sort((a, b) => (a.slot || 0) - (b.slot || 0))
        : [],
    [manifest]
  );

  const active = tracks[activeIdx] || null;

  // Load manifest (S3 only)
  useEffect(() => {
    let cancel = false;
    async function run() {
      try {
        setErr("");
        setManifest(null);
        const r = await fetch(manifestUrl(shareId), { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!cancel) setManifest(j);
      } catch (e) {
        if (!cancel) setErr(String(e?.message || e));
      }
    }
    if (shareId) run();
    return () => (cancel = true);
  }, [shareId]);

  // When track changes: load ONLY (no autoplay)
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !active?.playbackUrl) return;
    a.src = active.playbackUrl;
    a.load();
    setPlaying(false);
    setCur(0);
    setDur(0);
  }, [active?.playbackUrl]);

  // Audio events (truth comes from audio element)
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setCur(a.currentTime || 0);
    const onMeta = () => setDur(a.duration || 0);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  function play() {
    const a = audioRef.current;
    if (!a) return;
    a.play().catch(() => {});
  }

  function pause() {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
  }

  if (err) return <div style={{ padding: 24 }}>Error: {err}</div>;
  if (!manifest) return <div style={{ padding: 24 }}>Loading…</div>;

  const album = manifest.albumTitle || "Album";
  const artist = manifest.meta?.artistName || "—";
  const date = manifest.meta?.releaseDate || "—";
  const cover = manifest.coverUrl;

  return (
    <div style={{ padding: 24, paddingBottom: 120 }}>
      <div style={{ fontSize: 12, opacity: 0.6 }}>
        BUILD: RECEIVER-2026-01-20-C
      </div>

      <h1 style={{ fontSize: 36, fontWeight: 800 }}>{album}</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 16,
          marginTop: 16,
        }}
      >
        {/* LEFT */}
        <div style={{ borderRadius: 16, overflow: "hidden" }}>
          <img
            src={cover}
            alt="cover"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        {/* RIGHT */}
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ padding: 16, border: "1px solid #333", borderRadius: 16 }}>
            <strong>Album Info</strong>
            <div>{album}</div>
            <div>{artist}</div>
            <div>{date}</div>
          </div>

          <button
            style={{
              padding: 14,
              fontSize: 18,
              fontWeight: 800,
              borderRadius: 14,
              background: "#6ee7b7",
              color: "#000",
              border: "none",
            }}
          >
            Buy — $19.50
          </button>

          <div style={{ padding: 16, border: "1px solid #333", borderRadius: 16 }}>
            <strong>Tracks</strong>
            {tracks.map((t, i) => (
              <div
                key={t.slot}
                onClick={() => setActiveIdx(i)}
                style={{
                  cursor: "pointer",
                  padding: 6,
                  background: i === activeIdx ? "#222" : "transparent",
                }}
              >
                {t.slot}. {t.title}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SIMPLE PLAYER */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          padding: 16,
          background: "rgba(0,0,0,0.9)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        {!playing ? (
          <button onClick={play}>Play</button>
        ) : (
          <button onClick={pause}>Pause</button>
        )}
        <div>{active?.title || "—"}</div>
        <div style={{ marginLeft: "auto" }}>
          {fmt(cur)} / {fmt(dur)}
        </div>
        <audio ref={audioRef} />
      </div>
    </div>
  );
}

