import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

/**
 * RECEIVER (handoff-only)
 * Truth source: public S3 manifest
 *   https://block-7306-player.s3.us-west-1.amazonaws.com/public/players/<shareId>/manifest.json
 *
 * No backend dependency.
 */

const BUILD_STAMP = "RECEIVER-2026-01-19-A";

// === CONFIG: receiver truth ===
const S3_MANIFEST_BASE =
  "https://block-7306-player.s3.us-west-1.amazonaws.com/public/players";

function s3ManifestUrl(shareId) {
  return `${S3_MANIFEST_BASE}/${encodeURIComponent(shareId)}/manifest.json`;
}

function fmtTime(sec) {
  const s = Math.max(0, Number(sec || 0));
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}

export default function Product() {
  const { shareId } = useParams();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [manifest, setManifest] = useState(null);

  const tracks = useMemo(() => {
    const t = Array.isArray(manifest?.tracks) ? manifest.tracks : [];
    // stable ordering by slot
    return [...t].sort((a, b) => (Number(a?.slot || 0) - Number(b?.slot || 0)));
  }, [manifest]);

  const [activeIdx, setActiveIdx] = useState(0);
  const activeTrack = tracks[activeIdx] || null;

  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [curTime, setCurTime] = useState(0);
  const [dur, setDur] = useState(0);

  // Load manifest (S3 only)
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setErr("");
        setManifest(null);

        if (!shareId) throw new Error("Missing shareId");

        const url = s3ManifestUrl(shareId);

        // Avoid stale caches in browsers/CDNs
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`Manifest HTTP ${res.status}`);

        const json = await res.json();
        if (!json || typeof json !== "object") throw new Error("Invalid manifest JSON");

        if (!cancelled) {
          setManifest(json);
          setActiveIdx(0);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setErr(String(e?.message || e));
          setLoading(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [shareId]);

  // When track changes, load into audio and optionally autoplay
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const url = activeTrack?.playbackUrl || "";
    if (!url) return;

    // set src + load
    a.src = url;
    a.load();

    // attempt autoplay if user already hit play
    if (isPlaying) {
      a.play().catch(() => {
        // autoplay may be blocked; keep UI as paused
        setIsPlaying(false);
      });
    }

    // reset timers
    setCurTime(0);
    setDur(0);
  }, [activeTrack?.playbackUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Wire audio events
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTime = () => setCurTime(a.currentTime || 0);
    const onMeta = () => setDur(a.duration || 0);
    const onEnded = () => {
      // auto-next
      if (tracks.length > 0) {
        const next = Math.min(activeIdx + 1, tracks.length - 1);
        if (next !== activeIdx) setActiveIdx(next);
        else setIsPlaying(false);
      } else {
        setIsPlaying(false);
      }
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
  }, [activeIdx, tracks.length]);

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;

    if (isPlaying) {
      a.pause();
      return;
    }

    // If no src yet but we have a track, set it.
    if (!a.src && activeTrack?.playbackUrl) {
      a.src = activeTrack.playbackUrl;
      a.load();
    }

    a.play().catch(() => {
      setIsPlaying(false);
    });
  }

  function prev() {
    if (tracks.length === 0) return;
    setActiveIdx((i) => Math.max(0, i - 1));
  }

  function next() {
    if (tracks.length === 0) return;
    setActiveIdx((i) => Math.min(tracks.length - 1, i + 1));
  }

  function onScrub(e) {
    const a = audioRef.current;
    if (!a) return;
    const v = Number(e.target.value || 0);
    a.currentTime = v;
    setCurTime(v);
  }

  const albumTitle = manifest?.albumTitle || manifest?.meta?.albumTitle || "Album";
  const artistName = manifest?.meta?.artistName || "";
  const releaseDate = manifest?.meta?.releaseDate || "";
  const coverUrl = manifest?.coverUrl || "";

  // ====== UI ======
  return (
    <div style={{ padding: 24 }}>
      {/* BUILD STAMP (visible, small) */}
      <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 8 }}>
        BUILD: {BUILD_STAMP}
      </div>

      {loading && (
        <div style={{ fontSize: 28, fontWeight: 700, opacity: 0.9 }}>
          Loading album...
        </div>
      )}

      {!loading && err && (
        <div style={{ maxWidth: 900 }}>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            Failed to load manifest
          </div>
          <div style={{ opacity: 0.85, marginBottom: 8 }}>{err}</div>
          <div style={{ fontSize: 12, opacity: 0.65 }}>
            Expected S3 manifest:
            <div>{shareId ? s3ManifestUrl(shareId) : "(missing shareId)"}</div>
          </div>
        </div>
      )}

      {!loading && !err && (
        <>
          <div style={{ fontSize: 44, fontWeight: 800, marginBottom: 12 }}>
            {albumTitle}
          </div>

          {/* Two-column layout */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(480px, 1fr) 420px",
              gap: 18,
              alignItems: "start",
              paddingBottom: 120, // room for bottom player
            }}
          >
            {/* LEFT COLUMN: COVER CARD */}
            <div
              style={{
                borderRadius: 18,
                overflow: "hidden",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                minHeight: 520,
              }}
            >
              <div style={{ padding: 14, fontSize: 18, fontWeight: 700 }}>Album</div>
              <div style={{ padding: 14, paddingTop: 0 }}>
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "16 / 9",
                    borderRadius: 14,
                    overflow: "hidden",
                    background: "rgba(0,0,0,0.35)",
                    border: "1px solid rgba(255,255,255,0.10)",
                  }}
                >
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt="cover"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover", // FULL SIZE IN CARD
                        display: "block",
                      }}
                      onError={() => {
                        // keep page stable; no crash
                        // eslint-disable-next-line no-console
                        console.warn("cover image failed to load", coverUrl);
                      }}
                    />
                  ) : (
                    <div style={{ padding: 16, opacity: 0.7 }}>
                      No coverUrl in manifest.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: ALBUM INFO (TOP) + TRACKS */}
            <div style={{ display: "grid", gap: 14 }}>
              {/* Album Info card at TOP of column 2 */}
              <div
                style={{
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>
                  Album Info
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Album name</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{albumTitle}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Performer</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>
                      {artistName || "—"}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Release date</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>
                      {releaseDate || "—"}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Total album time</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>
                      {dur ? fmtTime(dur) : "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tracks card */}
              <div
                style={{
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>
                  Tracks
                </div>

                {tracks.length === 0 ? (
                  <div style={{ opacity: 0.7 }}>No tracks in manifest.</div>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {tracks.map((t, idx) => {
                      const isActive = idx === activeIdx;
                      return (
                        <button
                          key={`${t.slot}-${idx}`}
                          onClick={() => setActiveIdx(idx)}
                          style={{
                            textAlign: "left",
                            borderRadius: 12,
                            padding: "10px 12px",
                            border: "1px solid rgba(255,255,255,0.10)",
                            background: isActive
                              ? "rgba(255,255,255,0.14)"
                              : "rgba(0,0,0,0.22)",
                            color: "inherit",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ fontWeight: 800 }}>
                            {t.slot}. {t.title || `Track ${t.slot}`}
                          </div>
                          <div style={{ fontSize: 12, opacity: 0.7 }}>
                            {t.durationSec ? fmtTime(t.durationSec) : ""}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom player */}
          <div
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              padding: "14px 18px",
              background: "rgba(0,0,0,0.60)",
              backdropFilter: "blur(10px)",
              borderTop: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <div
              style={{
                maxWidth: 1200,
                margin: "0 auto",
                display: "grid",
                gridTemplateColumns: "120px 1fr 220px",
                gap: 14,
                alignItems: "center",
              }}
            >
              <button
                onClick={togglePlay}
                style={{
                  height: 44,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.10)",
                  color: "inherit",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {isPlaying ? "Pause" : "Play"}
              </button>

              <div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Now Playing</div>
                <div style={{ fontSize: 18, fontWeight: 900 }}>
                  {activeTrack ? activeTrack.title : "—"}
                </div>

                <input
                  type="range"
                  min={0}
                  max={Math.max(0, dur || 0)}
                  step="0.25"
                  value={Math.min(curTime, dur || 0)}
                  onChange={onScrub}
                  style={{ width: "100%" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.7 }}>
                  <span>{fmtTime(curTime)}</span>
                  <span>{fmtTime(dur)}</span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  onClick={prev}
                  style={{
                    height: 44,
                    padding: "0 14px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.08)",
                    color: "inherit",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Prev
                </button>
                <button
                  onClick={next}
                  style={{
                    height: 44,
                    padding: "0 14px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.08)",
                    color: "inherit",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Next
                </button>
              </div>

              {/* Hidden audio element */}
              <audio ref={audioRef} preload="metadata" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
