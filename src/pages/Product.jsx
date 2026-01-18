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
  const [error, setError] = useState(null);

  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    fetchManifest(shareId)
      .then((m) => setParsed(validateManifest(m)))
      .catch((e) => setError(String(e)));
  }, [shareId]);

  const tracks = useMemo(() => parsed?.tracks || [], [parsed]);
  const track = tracks[active];

  /* sync audio src */
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !track?.playbackUrl) return;
    a.pause();
    a.currentTime = 0;
    a.src = track.playbackUrl;
    a.load();
  }, [track?.playbackUrl]);

  /* preview + playlist logic */
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onTime = () => {
      setTime(a.currentTime || 0);
      if (a.currentTime >= PREVIEW_SECONDS) {
        a.pause();
        a.currentTime = 0;
        setPlaying(false);
        setActive((i) => Math.min(i + 1, tracks.length - 1));
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

  useEffect(() => {
    if (playing && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, [active]);

  if (error) return <pre>{error}</pre>;
  if (!parsed) return <div style={{ padding: 40 }}>Loading…</div>;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0b0614, #120b1f)",
        color: "#fff",
      }}
    >
      {/* CENTERED ROOT */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "48px 24px 140px",
        }}
      >
        {/* TWO COLUMN LAYOUT */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "65% 35%",
            gap: 32,
            alignItems: "start",
          }}
        >
          {/* LEFT COLUMN */}
          <div>
            <h1 style={{ fontSize: 34, marginBottom: 18 }}>
              {parsed.albumTitle}
            </h1>

            <div
              style={{
                height: 360,
                borderRadius: 18,
                background: "linear-gradient(135deg,#2a163a,#0b0b0f)",
                border: "1px solid rgba(255,255,255,.08)",
              }}
            />
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: "grid", gap: 18 }}>
            {/* BUY CARD */}
            <div
              style={{
                border: "1px solid rgba(255,255,255,.15)",
                borderRadius: 16,
                padding: 18,
              }}
            >
              <button
                style={{
                  width: "100%",
                  padding: "14px 0",
                  fontSize: 18,
                  fontWeight: 700,
                  borderRadius: 12,
                  border: "none",
                  background: "#2dd36f",
                  cursor: "pointer",
                }}
              >
                Buy Album — $19.50
              </button>
            </div>

            {/* MARKETING CARD */}
            <div
              style={{
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: 16,
                padding: 18,
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              8 songs • Smart Bridge mode • Album mode • Artist control<br />
              Over 60 minutes of bonus authored bridge content<br />
              FREE MP3 album mix download included
            </div>

            {/* TRACK LIST */}
            <div
              style={{
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: 16,
                padding: 18,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Tracks</div>

              {tracks.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    marginBottom: 6,
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,.08)",
                    background: i === active ? "#20162f" : "transparent",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  {t.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AUDIO */}
      <audio ref={audioRef} preload="metadata" />

      {/* BOTTOM PLAYER */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#120b1f",
          borderTop: "1px solid rgba(255,255,255,.12)",
          padding: "12px 16px",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: 16,
          }}
        >
          {/* PLAY */}
          <button
            onClick={() =>
              playing
                ? audioRef.current.pause()
                : audioRef.current.play()
            }
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "#fff",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
            }}
          >
            {playing ? "❚❚" : "▶"}
          </button>

          {/* NOW PLAYING */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 600 }}>{track?.title}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {fmt(time)} / {fmt(Math.min(dur, PREVIEW_SECONDS))}
            </div>
            <input
              type="range"
              min={0}
              max={PREVIEW_SECONDS}
              value={Math.min(time, PREVIEW_SECONDS)}
              onChange={(e) =>
                (audioRef.current.currentTime = e.target.value)
              }
              style={{ width: "100%" }}
            />
          </div>

          {/* PREV / NEXT */}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              onClick={() => setActive((i) => Math.max(i - 1, 0))}
            >
              Prev
            </button>
            <button
              onClick={() =>
                setActive((i) => Math.min(i + 1, tracks.length - 1))
              }
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
