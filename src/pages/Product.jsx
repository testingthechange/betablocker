import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

/**
 * RECEIVER (LOCKED)
 * - Truth: S3 public manifest only
 * - Player: click track = select+load, click Play = audio.play()
 * BUILD: RECEIVER-FINAL-2026-01-20
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

  // UI derives from audio element; React does not "drive" playback.
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);

  // ===== Load manifest (S3 only) =====
  useEffect(() => {
    let cancel = false;
    async function run() {
      try {
        setErr("");
        setManifest(null);

        const r = await fetch(manifestUrl(shareId), { cache: "no-store" });
        if (!r.ok) throw new Error(`Manifest HTTP ${r.status}`);
        const j = await r.json();

        if (!cancel) {
          setManifest(j);
          setActiveIdx(0);
        }
      } catch (e) {
        if (!cancel) setErr(String(e?.message || e));
      }
    }
    if (shareId) run();
    return () => {
      cancel = true;
    };
  }, [shareId]);

  const tracks = useMemo(() => {
    const t = Array.isArray(manifest?.tracks) ? manifest.tracks : [];
    return [...t].sort((a, b) => (Number(a?.slot || 0) - Number(b?.slot || 0)));
  }, [manifest]);

  const active = tracks[activeIdx] || null;

  // ===== Load track on selection (NO autoplay) =====
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const url = String(active?.playbackUrl || "");
    if (!url) return;

    a.pause(); // stop current audio deterministically
    a.src = url;
    a.load();

    setPlaying(false);
    setCur(0);
    setDur(0);
  }, [active?.playbackUrl]);

  // ===== Audio element events (single source of truth for play state) =====
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setCur(a.currentTime || 0);
    const onMeta = () => setDur(a.duration || 0);
    const onEnded = () => {
      // optional: stay on same track; require explicit play again
      setPlaying(false);
    };

    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnded);

    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnded);
    };
  }, []);

  function play() {
    const a = audioRef.current;
    if (!a) return;
    a.play().catch(() => {
      // If browser blocks autoplay, user can click again; UI stays paused.
      setPlaying(false);
    });
  }

  function pause() {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
  }

  function scrub(e) {
    const a = audioRef.current;
    if (!a) return;
    const v = Number(e.target.value || 0);
    a.currentTime = v;
    setCur(v);
  }

  if (err) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ fontSize: 12, opacity: 0.6 }}>
          BUILD: RECEIVER-FINAL-2026-01-20
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, marginTop: 10 }}>
          Failed to load
        </div>
        <div style={{ opacity: 0.85, marginTop: 6 }}>{err}</div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 12 }}>
          Expected manifest:
          <div>{shareId ? manifestUrl(shareId) : "(missing shareId)"}</div>
        </div>
      </div>
    );
  }

  if (!manifest) return <div style={{ padding: 24 }}>Loading…</div>;

  const album = manifest?.albumTitle || manifest?.meta?.albumTitle || "Album";
  const artist = manifest?.meta?.artistName || "—";
  const date = manifest?.meta?.releaseDate || "—";
  const cover = String(manifest?.coverUrl || "");

  return (
    <div style={{ padding: 24, paddingBottom: 120 }}>
      <div style={{ fontSize: 12, opacity: 0.6 }}>
        BUILD: RECEIVER-FINAL-2026-01-20
      </div>

      <h1 style={{ fontSize: 36, fontWeight: 800, margin: "10px 0 16px" }}>
        {album}
      </h1>

      {/* TWO COLUMN LAYOUT (locked) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* LEFT: COVER CARD (full bleed image) */}
        <div
          style={{
            borderRadius: 16,
            overflow: "hidden",
            background: "#111",
            minHeight: 520,
          }}
        >
          {cover ? (
            <img
              src={cover}
              alt="cover"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <div style={{ padding: 16, opacity: 0.7 }}>No coverUrl.</div>
          )}
        </div>

        {/* RIGHT: INFO + BUY + MARKETING + TRACKS */}
        <div style={{ display: "grid", gap: 12 }}>
          {/* Album Info (top right) */}
          <div style={{ padding: 16, border: "1px solid #333", borderRadius: 16 }}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Album Info</div>
            <div style={{ display: "grid", gap: 8 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Album name</div>
                <div style={{ fontWeight: 800 }}>{album}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Performer</div>
                <div style={{ fontWeight: 800 }}>{artist}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Release date</div>
                <div style={{ fontWeight: 800 }}>{date}</div>
              </div>
            </div>
          </div>

          {/* Buy button */}
          <button
            style={{
              padding: 14,
              fontSize: 18,
              fontWeight: 900,
              borderRadius: 14,
              background: "#6ee7b7",
              color: "#000",
              border: "none",
              cursor: "pointer",
            }}
          >
            Buy — $19.50
          </button>

          {/* Marketing card under Buy */}
          <div style={{ padding: 16, border: "1px solid #333", borderRadius: 16 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>What you get</div>
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
              <li>Full album access</li>
              <li>Smart bridge playback</li>
              <li>Authored transitions</li>
              <li>MP3 download</li>
            </ul>
          </div>

          {/* Tracks list (right column) */}
          <div style={{ padding: 16, border: "1px solid #333", borderRadius: 16 }}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Tracks</div>

            {tracks.length === 0 ? (
              <div style={{ opacity: 0.7 }}>No tracks in manifest.</div>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                {tracks.map((t, i) => {
                  const isActive = i === activeIdx;
                  return (
                    <button
                      key={`${t?.slot || i}-${i}`}
                      onClick={() => setActiveIdx(i)}
                      style={{
                        textAlign: "left",
                        borderRadius: 12,
                        padding: "10px 12px",
                        border: "1px solid #333",
                        background: isActive ? "#222" : "transparent",
                        color: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontWeight: 900 }}>
                        {t?.slot || i + 1}. {t?.title || "Track"}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PLAYER (locked to old compact bar layout) */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          padding: 14,
          background: "rgba(0,0,0,0.90)",
          borderTop: "1px solid #333",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "140px 1fr 140px",
            gap: 12,
            alignItems: "center",
          }}
        >
          {/* LEFT: PLAY/PAUSE */}
          <div>
            {!playing ? (
              <button
                onClick={play}
                style={{
                  height: 42,
                  padding: "0 16px",
                  borderRadius: 999,
                  border: "1px solid #333",
                  background: "#111",
                  color: "inherit",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Play
              </button>
            ) : (
              <button
                onClick={pause}
                style={{
                  height: 42,
                  padding: "0 16px",
                  borderRadius: 999,
                  border: "1px solid #333",
                  background: "#111",
                  color: "inherit",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Pause
              </button>
            )}
          </div>

          {/* CENTER: TITLE + SCRUB */}
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 900,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                textAlign: "center",
              }}
            >
              {active?.title || "—"}
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(0, dur || 0)}
              step="0.25"
              value={Math.min(cur, dur || 0)}
              onChange={scrub}
              style={{ width: "100%" }}
            />
          </div>

          {/* RIGHT: TIME */}
          <div style={{ textAlign: "right", fontWeight: 900 }}>
            {fmt(cur)} / {fmt(dur)}
          </div>

          {/* Hidden audio element (single) */}
          <audio ref={audioRef} preload="metadata" />
        </div>
      </div>
    </div>
  );
}

