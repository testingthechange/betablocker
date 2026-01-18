import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchManifest, validateManifest } from "../lib/manifest.js";

const PREVIEW_SECONDS = 40;

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function Product() {
  const { shareId } = useParams();
  const audioRef = useRef(null);

  const [parsed, setParsed] = useState(null);
  const [idx, setIdx] = useState(0);
  const [t, setT] = useState(0);
  const [d, setD] = useState(0);

  useEffect(() => {
    fetchManifest(shareId)
      .then((m) => setParsed(validateManifest(m)));
  }, [shareId]);

  const tracks = useMemo(() => parsed?.tracks || [], [parsed]);
  const track = tracks[idx];

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !track?.playbackUrl) return;
    a.src = track.playbackUrl;
    a.load();
  }, [track?.playbackUrl]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onTime = () => {
      setT(a.currentTime);
      if (a.currentTime >= PREVIEW_SECONDS) {
        a.pause();
        setIdx((i) => Math.min(i + 1, tracks.length - 1));
      }
    };

    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", () => setD(a.duration || 0));
    return () => a.removeEventListener("timeupdate", onTime);
  }, [tracks.length]);

  if (!parsed) return <div style={{ padding: 40 }}>Loading…</div>;

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "40px 24px 140px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "65% 35%",
          gap: 32,
        }}
      >
        <div>
          <h1>{parsed.albumTitle}</h1>
        </div>

        <div>
          {tracks.map((t, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: 10,
                marginBottom: 8,
                background: i === idx ? "#222" : "#111",
                color: "#fff",
                border: "1px solid #333",
              }}
            >
              {t.title}
            </button>
          ))}
        </div>
      </div>

      <audio ref={audioRef} preload="metadata" />

      {/* PLAYER */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: "#111",
          borderTop: "1px solid #222",
          padding: 12,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            alignItems: "center",
            gap: 16,
          }}
        >
          <button onClick={() => audioRef.current?.play()}>▶</button>

          <div style={{ textAlign: "center" }}>
            <div>{track?.title}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {fmt(t)} / {fmt(Math.min(d, PREVIEW_SECONDS))}
            </div>
          </div>

          <div>
            <button onClick={() => setIdx((i) => Math.max(i - 1, 0))}>◀</button>
            <button onClick={() => setIdx((i) => Math.min(i + 1, tracks.length - 1))}>▶</button>
          </div>
        </div>
      </div>
    </div>
  );
}
