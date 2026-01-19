import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

/**
 * Product receiver page (betablocker)
 * Requirements:
 * - NO local/global header here (prevents double header)
 * - 2-column layout: left = cover card, right = Album Info (top) + purchase/benefits
 * - bottom player: Play/Pause + Prev/Next + progress, actually plays audio
 */

const DEFAULT_ALBUM_BACKEND =
  (import.meta?.env?.VITE_ALBUM_BACKEND_URL || "").trim() ||
  "https://album-backend-kmuo.onrender.com";

function fmtTime(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export default function Product() {
  const params = useParams();
  const shareId = params?.shareId || params?.id || "";

  const manifestUrl = useMemo(() => {
    if (!shareId) return "";
    // album-backend exposes /publish/<shareId>.json which returns { coverUrl, tracks[], meta... }
    return `${DEFAULT_ALBUM_BACKEND}/publish/${shareId}.json`;
  }, [shareId]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [manifest, setManifest] = useState(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [curTime, setCurTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef(null);

  const tracks = Array.isArray(manifest?.tracks) ? manifest.tracks : [];
  const activeTrack = tracks[activeIndex] || null;

  // ---- load manifest ----
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr("");
      setManifest(null);

      if (!manifestUrl) {
        setErr("Missing shareId");
        setLoading(false);
        return;
      }

      try {
        const r = await fetch(manifestUrl, { method: "GET" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();

        if (cancelled) return;

        setManifest(j);
        setActiveIndex(0);
        setIsPlaying(false);
        setCurTime(0);
        setDuration(0);
      } catch (e) {
        if (cancelled) return;
        setErr(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [manifestUrl]);

  // ---- ensure audio src stays in sync with active track ----
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const src = String(activeTrack?.playbackUrl || "").trim();
    if (!src) {
      a.removeAttribute("src");
      a.load();
      setIsPlaying(false);
      setCurTime(0);
      setDuration(0);
      return;
    }

    // Only reset if changed
    if (a.src !== src) {
      a.src = src;
      a.load();
      setCurTime(0);
      setDuration(0);
    }

    // If user was already playing, keep playing on track change (user gesture already happened)
    if (isPlaying) {
      a.play().catch(() => {
        // autoplay restrictions: keep UI in paused state
        setIsPlaying(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  // ---- audio event wiring ----
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onLoaded = () => setDuration(a.duration || 0);
    const onTime = () => setCurTime(a.currentTime || 0);
    const onEnded = () => {
      // advance
      if (tracks.length <= 1) {
        setIsPlaying(false);
        return;
      }
      setActiveIndex((i) => {
        const n = (i + 1) % tracks.length;
        return n;
      });
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnded);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);

    return () => {
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
    };
  }, [tracks.length]);

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;

    const src = String(activeTrack?.playbackUrl || "").trim();
    if (!src) return;

    if (a.paused) {
      a.play().catch(() => {
        // autoplay restriction
        setIsPlaying(false);
      });
    } else {
      a.pause();
    }
  }

  function prev() {
    if (!tracks.length) return;
    setActiveIndex((i) => (i - 1 + tracks.length) % tracks.length);
  }

  function next() {
    if (!tracks.length) return;
    setActiveIndex((i) => (i + 1) % tracks.length);
  }

  function seekTo(pct) {
    const a = audioRef.current;
    if (!a || !duration) return;
    const t = Math.max(0, Math.min(duration, duration * pct));
    a.currentTime = t;
    setCurTime(t);
  }

  const albumTitle =
    String(manifest?.albumTitle || manifest?.meta?.albumTitle || "Album").trim() || "Album";
  const artistName = String(manifest?.meta?.artistName || "").trim();
  const releaseDate = String(manifest?.meta?.releaseDate || "").trim();
  const coverUrl = String(manifest?.coverUrl || "").trim();

  return (
    <div className="receiver-product-root">
      <div className="receiver-product-page">
        {/* NO header here (global header is outside this page) */}

        <div className="receiver-product-title">
          <h1 className="receiver-h1">{albumTitle}</h1>

          {/* Build stamp for deploy verification */}
          <div className="receiver-build">BUILD: RECEIVER-2026-01-19-A</div>
        </div>

        {loading ? (
          <div className="receiver-muted">Loading…</div>
        ) : err ? (
          <div className="receiver-error">Error loading manifest: {err}</div>
        ) : (
          <div className="receiver-grid">
            {/* LEFT COLUMN */}
            <div className="receiver-col receiver-left">
              <div className="receiver-card receiver-cover-card">
                <div className="receiver-card-title">Album</div>
                <div className="receiver-cover-frame">
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt="Album cover"
                      className="receiver-cover-img"
                      onError={(e) => {
                        // Avoid broken image icon: hide if it fails
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="receiver-cover-empty">No cover</div>
                  )}
                </div>
              </div>

              <div className="receiver-card receiver-tracks-card">
                <div className="receiver-card-title">Tracks</div>
                {tracks.length ? (
                  <div className="receiver-tracks">
                    {tracks.map((t, idx) => {
                      const isActive = idx === activeIndex;
                      const label = `${t?.slot || idx + 1}. ${String(t?.title || "").trim() || "Untitled"}`;
                      return (
                        <button
                          key={`${t?.slot || idx}-${t?.title || "t"}`}
                          className={`receiver-track-row ${isActive ? "is-active" : ""}`}
                          onClick={() => setActiveIndex(idx)}
                          type="button"
                        >
                          <span className="receiver-track-label">{label}</span>
                          <span className="receiver-track-time">
                            {t?.durationSec ? fmtTime(t.durationSec) : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="receiver-muted">No tracks</div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="receiver-col receiver-right">
              {/* Album Info MUST be top of column two */}
              <div className="receiver-card">
                <div className="receiver-card-title">Album Info</div>

                <div className="receiver-kv">
                  <div className="receiver-k">Album name</div>
                  <div className="receiver-v">{albumTitle}</div>
                </div>

                <div className="receiver-kv">
                  <div className="receiver-k">Performer</div>
                  <div className="receiver-v">{artistName || "—"}</div>
                </div>

                <div className="receiver-kv">
                  <div className="receiver-k">Release date</div>
                  <div className="receiver-v">{releaseDate || "—"}</div>
                </div>

                <div className="receiver-kv">
                  <div className="receiver-k">Total album time</div>
                  <div className="receiver-v">—</div>
                </div>
              </div>

              <div className="receiver-card receiver-buy-card">
                <button className="receiver-buy-btn" type="button">
                  Buy — $19.50
                </button>
              </div>

              <div className="receiver-card">
                <div className="receiver-card-title">What you get</div>
                <ul className="receiver-bullets">
                  <li>{Math.max(0, tracks.length)} songs</li>
                  <li>Smart bridge mode</li>
                  <li>Album mode</li>
                  <li>Artist control</li>
                  <li>Bonus authored bridge content</li>
                  <li>FREE MP3 album mix download included</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Player (must work) */}
        <div className="receiver-player-dock">
          <audio ref={audioRef} preload="metadata" />

          <div className="receiver-player">
            <button className="receiver-play" type="button" onClick={togglePlay}>
              {isPlaying ? "Pause" : "Play"}
            </button>

            <div className="receiver-now">
              <div className="receiver-now-label">Now Playing</div>
              <div className="receiver-now-title">
                {activeTrack ? String(activeTrack.title || "").trim() || "Untitled" : "—"}
              </div>
            </div>

            <div className="receiver-controls">
              <button className="receiver-skip" type="button" onClick={prev}>
                Prev
              </button>
              <button className="receiver-skip" type="button" onClick={next}>
                Next
              </button>
            </div>
          </div>

          <div className="receiver-progress">
            <div className="receiver-time">{fmtTime(curTime)}</div>
            <input
              className="receiver-range"
              type="range"
              min="0"
              max="1000"
              value={duration ? Math.round((curTime / duration) * 1000) : 0}
              onChange={(e) => {
                const v = Number(e.target.value) / 1000;
                seekTo(v);
              }}
            />
            <div className="receiver-time">{fmtTime(duration)}</div>
          </div>
        </div>
      </div>

      {/* Minimal CSS to guarantee layout + cover sizing + player */}
      <style>{`
        .receiver-product-root{
          width: 100%;
          padding: 0 16px 120px;
          box-sizing: border-box;
        }
        .receiver-product-page{
          max-width: 1100px;
          margin: 0 auto;
        }
        .receiver-product-title{ padding: 10px 0 12px; }
        .receiver-h1{ margin: 0; font-size: 44px; line-height: 1.05; font-weight: 800; }
        .receiver-build{ margin-top: 6px; font-size: 12px; opacity: 0.6; }
        .receiver-muted{ opacity: 0.75; padding: 10px 0; }
        .receiver-error{ padding: 10px 0; color: #ffb3b3; }
        .receiver-grid{
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 16px;
          align-items: start;
        }
        @media (max-width: 900px){
          .receiver-grid{ grid-template-columns: 1fr; }
        }
        .receiver-col{ display: flex; flex-direction: column; gap: 16px; }
        .receiver-card{
          border-radius: 14px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          padding: 14px;
          box-sizing: border-box;
        }
        .receiver-card-title{
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 10px;
          opacity: 0.9;
        }

        /* cover card: image must fill whole card */
        .receiver-cover-card{ padding: 14px; }
        .receiver-cover-frame{
          width: 100%;
          height: 520px;
          border-radius: 12px;
          overflow: hidden;
          background: rgba(0,0,0,0.25);
          border: 1px solid rgba(255,255,255,0.08);
        }
        @media (max-width: 900px){
          .receiver-cover-frame{ height: 360px; }
        }
        .receiver-cover-img{
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .receiver-cover-empty{
          width: 100%; height: 100%;
          display: grid; place-items: center;
          opacity: 0.7;
        }

        .receiver-tracks{ display: flex; flex-direction: column; gap: 8px; }
        .receiver-track-row{
          width: 100%;
          text-align: left;
          border-radius: 10px;
          padding: 10px 10px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(0,0,0,0.15);
          color: inherit;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          cursor: pointer;
        }
        .receiver-track-row.is-active{
          outline: 2px solid rgba(90, 240, 210, 0.35);
          background: rgba(90, 240, 210, 0.10);
        }
        .receiver-track-label{ font-weight: 700; }
        .receiver-track-time{ opacity: 0.7; }

        .receiver-kv{ display: grid; grid-template-columns: 1fr; gap: 4px; padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.06); }
        .receiver-kv:first-of-type{ border-top: none; padding-top: 0; }
        .receiver-k{ font-size: 12px; opacity: 0.75; }
        .receiver-v{ font-size: 16px; font-weight: 700; }

        .receiver-buy-card{ padding: 0; overflow: hidden; }
        .receiver-buy-btn{
          width: 100%;
          border: none;
          padding: 14px 16px;
          font-size: 18px;
          font-weight: 800;
          cursor: pointer;
          background: rgba(90, 240, 210, 0.85);
          color: #0b0b0b;
        }

        .receiver-bullets{ margin: 0; padding-left: 18px; opacity: 0.92; }
        .receiver-bullets li{ margin: 6px 0; }

        /* bottom player dock */
        .receiver-player-dock{
          position: sticky;
          bottom: 0;
          padding-top: 12px;
          margin-top: 14px;
          background: linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0));
        }
        .receiver-player{
          display: grid;
          grid-template-columns: 80px 1fr 160px;
          gap: 12px;
          align-items: center;
          padding: 12px 12px;
          border-radius: 14px;
          background: rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(10px);
        }
        @media (max-width: 700px){
          .receiver-player{ grid-template-columns: 80px 1fr; grid-auto-rows: auto; }
          .receiver-controls{ justify-content: flex-start; }
        }
        .receiver-play{
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.08);
          color: inherit;
          padding: 10px 12px;
          cursor: pointer;
          font-weight: 800;
        }
        .receiver-now-label{ font-size: 12px; opacity: 0.7; }
        .receiver-now-title{ font-size: 18px; font-weight: 900; }
        .receiver-controls{ display: flex; justify-content: flex-end; gap: 10px; }
        .receiver-skip{
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.06);
          color: inherit;
          padding: 10px 12px;
          cursor: pointer;
          font-weight: 800;
        }

        .receiver-progress{
          display: grid;
          grid-template-columns: 52px 1fr 52px;
          gap: 10px;
          align-items: center;
          padding: 8px 4px 0;
        }
        .receiver-time{ font-size: 12px; opacity: 0.75; text-align: center; }
        .receiver-range{ width: 100%; }
      `}</style>
    </div>
  );
}
