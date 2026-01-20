import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

/**
 * RECEIVER (LOCKED)
 * Truth: S3 public manifest only
 * Player: audio element is truth; user actions drive playback
 * BUILD: RECEIVER-LOCKED-PLAYER-V2-2026-01-20
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

  // audio truth
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);

  // scrub UI without fighting audio updates
  const [scrubVal, setScrubVal] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);

  const tracks = useMemo(() => {
    const t = Array.isArray(manifest?.tracks) ? manifest.tracks : [];
    return [...t].sort((a, b) => Number(a?.slot || 0) - Number(b?.slot || 0));
  }, [manifest]);

  const active = tracks[activeIdx] || null;

  // load manifest (S3 only)
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

  // audio events (audio is truth)
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => {
      const t = a.currentTime || 0;
      setCur(t);
      if (!scrubbing) setScrubVal(t);
    };
    const onMeta = () => {
      const d = a.duration || 0;
      setDur(d);
      if (!scrubbing) setScrubVal(a.currentTime || 0);
    };
    const onEnded = () => setPlaying(false);

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
  }, [scrubbing]);

  function loadTrack(idx, { autoplay } = { autoplay: false }) {
    const a = audioRef.current;
    const t = tracks[idx];
    if (!a || !t?.playbackUrl) return;

    // deterministic stop+swap
    a.pause();
    a.src = String(t.playbackUrl);
    a.load();

    setCur(0);
    setDur(0);
    setScrubVal(0);

    if (autoplay) {
      a.play().catch(() => setPlaying(false));
    } else {
      setPlaying(false);
    }
  }

  // when active changes: load only (no autoplay)
  useEffect(() => {
    if (!tracks.length) return;
    loadTrack(activeIdx, { autoplay: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx, tracks.length]);

  function play() {
    const a = audioRef.current;
    if (!a) return;
    a.play().catch(() => setPlaying(false));
  }

  function pause() {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
  }

  function toggle() {
    if (playing) pause();
    else play();
  }

  function next() {
    if (!tracks.length) return;
    const wasPlaying = playing;
    const idx = Math.min(tracks.length - 1, activeIdx + 1);
    setActiveIdx(idx);
    // autoplay if currently playing
    setTimeout(() => loadTrack(idx, { autoplay: wasPlaying }), 0);
  }

  function prev() {
    if (!tracks.length) return;
    const wasPlaying = playing;
    const idx = Math.max(0, activeIdx - 1);
    setActiveIdx(idx);
    setTimeout(() => loadTrack(idx, { autoplay: wasPlaying }), 0);
  }

  function onScrubChange(e) {
    const v = Number(e.target.value || 0);
    setScrubVal(v);
  }

  function onScrubStart() {
    setScrubbing(true);
  }

  function onScrubEnd() {
    const a = audioRef.current;
    if (a) a.currentTime = Number(scrubVal || 0);
    setCur(Number(scrubVal || 0));
    setScrubbing(false);
  }

  if (err) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ fontSize: 12, opacity: 0.6 }}>
          BUILD: RECEIVER-LOCKED-PLAYER-V2-2026-01-20
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
    <div style={{ padding: 24, paddingBottom: 130 }}>
      <div style={{ fontSize: 12, opacity: 0.6 }}>
        BUILD: RECEIVER-LOCKED-PLAYER-V2-2026-01-20
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
        {/* LEFT: COVER */}
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

          <div style={{ padding: 16, border: "1px solid #333", borderRadius: 16 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>What you get</div>
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
              <li>Full album access</li>
              <li>Smart bridge playback</li>
              <li>Authored transitions</li>
              <li>MP3 download</li>
            </ul>
          </div>

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

      {/* PLAYER (compact, old layout) */}
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
            gridTemplateColumns: "220px 1fr 140px",
            gap: 12,
            alignItems: "center",
          }}
        >
          {/* LEFT: CONTROLS */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={prev}
              style={{
                height: 42,
                padding: "0 12px",
                borderRadius: 999,
                border: "1px solid #333",
                background: "#111",
                color: "inherit",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Prev
            </button>

            <button
              onClick={toggle}
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
              {playing ? "Pause" : "Play"}
            </button>

            <button
              onClick={next}
              style={{
                height: 42,
                padding: "0 12px",
                borderRadius: 999,
                border: "1px solid #333",
                background: "#111",
                color: "inherit",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Next
            </button>
          </div>

          {/* CENTER: NOW PLAYING + SCRUB */}
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 900,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                textAlign: "center",
                marginBottom: 6,
              }}
            >
              Now Playing: {active?.title || "—"}
            </div>

            <input
              type="range"
              min={0}
              max={Math.max(0, dur || 0)}
              step="0.25"
              value={Math.min(scrubVal, dur || 0)}
              onMouseDown={onScrubStart}
              onTouchStart={onScrubStart}
              onChange={onScrubChange}
              onMouseUp={onScrubEnd}
              onTouchEnd={onScrubEnd}
              style={{ width: "100%" }}
            />
          </div>

          {/* RIGHT: TIME */}
          <div style={{ textAlign: "right", fontWeight: 900 }}>
            {fmt(cur)} / {fmt(dur)}
          </div>

          <audio ref={audioRef} preload="metadata" />
        </div>
      </div>
    </div>
  );
}

cd ~/Desktop/betablocker
git add src/pages/Product.jsx
git commit -m "Receiver: add prev/next/pause + scrub (keep playing on next)"
git push


