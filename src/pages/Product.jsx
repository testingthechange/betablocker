// src/pages/Product.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchManifest, validateManifest } from "../lib/manifest.js";

const PREVIEW_SECONDS = 40;

function fmtTime(sec) {
  const n = Number(sec);
  if (!Number.isFinite(n) || n < 0) return "0:00";
  const m = Math.floor(n / 60);
  const s = Math.floor(n % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function sumTrackSeconds(tracks) {
  return (tracks || []).reduce((acc, t) => acc + (Number(t?.durationSec) || 0), 0);
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

  // cover (published if exists; local fallback preview upload)
  const [localCoverUrl, setLocalCoverUrl] = useState("");

  useEffect(() => {
    let cancelled = false;

    setParsed(null);
    setErr(null);
    setActiveIdx(0);
    setPlaying(false);
    setCurTime(0);
    setDur(0);

    fetchManifest(shareId)
      .then((m) => {
        if (cancelled) return;
        setParsed(validateManifest(m));
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

  const publishedCoverUrl = useMemo(() => {
    const u = String(parsed?.coverUrl || "").trim();
    return u || "";
  }, [parsed]);

  const coverUrl = localCoverUrl || publishedCoverUrl;

  // align audio src with active track
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const url = String(activeTrack?.playbackUrl || "").trim();

    try {
      a.pause();
      a.currentTime = 0;
      setCurTime(0);
      setDur(0);

      if (!url) {
        setPlaying(false);
        return;
      }

      // IMPORTANT: ensure audio is not muted (sound back on)
      a.muted = false;
      a.volume = 1;

      a.src = url;
      a.load();
    } catch {}
    // do not auto-play on track change unless already playing
    // (player behavior/layout stays the same)
  }, [activeTrack?.playbackUrl]);

  // audio events + preview cap
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onMeta = () => setDur(a.duration || 0);

    const onTime = () => {
      const t = a.currentTime || 0;
      setCurTime(t);

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

    // attempt to prevent accidental mute states persisting
    const onVolume = () => {
      // if volume somehow got zeroed, restore to sane default
      if (a.volume === 0) a.volume = 1;
      if (a.muted) a.muted = false;
    };

    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("volumechange", onVolume);

    return () => {
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("volumechange", onVolume);
    };
  }, []);

  const playIndex = (i) => {
    if (!tracks[i]?.playbackUrl) return;
    setActiveIdx(i);
    setTimeout(() => {
      const a = audioRef.current;
      if (!a) return;
      a.muted = false;
      a.volume = 1;
      a.play().catch(() => {});
    }, 0);
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a || !activeTrack?.playbackUrl) return;

    if (a.paused) {
      a.muted = false;
      a.volume = 1;
      a.play().catch(() => {});
    } else {
      a.pause();
    }
  };

  const prev = () => {
    setActiveIdx((i) => Math.max(0, i - 1));
    setTimeout(() => {
      const a = audioRef.current;
      if (a && playing) {
        a.muted = false;
        a.volume = 1;
        a.play().catch(() => {});
      }
    }, 0);
  };

  const next = () => {
    setActiveIdx((i) => Math.min(tracks.length - 1, i + 1));
    setTimeout(() => {
      const a = audioRef.current;
      if (a && playing) {
        a.muted = false;
        a.volume = 1;
        a.play().catch(() => {});
      }
    }, 0);
  };

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

  const onCoverFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      if (localCoverUrl) URL.revokeObjectURL(localCoverUrl);
    } catch {}
    setLocalCoverUrl(URL.createObjectURL(f));
  };

  const resetCover = () => {
    try {
      if (localCoverUrl) URL.revokeObjectURL(localCoverUrl);
    } catch {}
    setLocalCoverUrl("");
  };

  const totalAlbumSeconds = useMemo(() => sumTrackSeconds(tracks), [tracks]);

  if (err) return <pre style={{ padding: 16 }}>{err}</pre>;
  if (!parsed) return <div style={{ padding: 16 }}>Loading…</div>;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, rgba(30,16,46,1) 0%, rgba(10,10,14,1) 55%, rgba(7,7,10,1) 100%)",
        color: "#fff",
      }}
    >
      {/* HEADER (unchanged placement; search below login line; nav centered) */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(0,0,0,0.35)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "14px 16px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontWeight: 800, letterSpacing: 0.2 }}>Block Radius</div>

            <nav style={{ margin: "0 auto", display: "flex", gap: 18 }}>
              <a href="/" style={{ color: "rgba(255,255,255,0.92)", textDecoration: "none" }}>
                Home
              </a>
              <a href="/shop" style={{ color: "rgba(255,255,255,0.92)", textDecoration: "none" }}>
                Shop
              </a>
              <a href="/account" style={{ color: "rgba(255,255,255,0.92)", textDecoration: "none" }}>
                Account
              </a>
            </nav>

            <a
              href="/login"
              style={{
                color: "#111",
                background: "rgba(255,255,255,0.92)",
                borderRadius: 999,
                padding: "8px 14px",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Login
            </a>
          </div>

          {/* search bar lowered one line */}
          <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}>
            <input
              placeholder="Search (Directus placeholder)…"
              style={{
                width: "min(760px, 100%)",
                padding: "11px 14px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.25)",
                color: "#fff",
                outline: "none",
              }}
              onChange={() => {}}
            />
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7, textAlign: "center" }}>
            Search is a placeholder; Shop will later query Directus. Login will be Clerk.
          </div>
        </div>
      </header>

      {/* ROOT centered container: ONLY place width is controlled */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "22px 16px 140px" }}>
        {/* remove the three debug lines the user asked to remove:
            Album
            shareId... tracks...
            Preview cap...
        */}

        <div style={{ display: "grid", gridTemplateColumns: "65% 35%", gap: 18, alignItems: "start" }}>
          {/* LEFT COLUMN */}
          <section
            style={{
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(0,0,0,0.25)",
              boxShadow: "0 18px 55px rgba(0,0,0,0.35) inset, 0 10px 40px rgba(0,0,0,0.25)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: 14, fontSize: 12, opacity: 0.75 }}>Album Cover</div>

            <div
              style={{
                height: 360,
                margin: "0 14px 14px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.06)",
                display: "grid",
                placeItems: "center",
                overflow: "hidden",
              }}
            >
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt="Album cover"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{ textAlign: "center", opacity: 0.85, fontWeight: 600 }}>
                  No coverUrl in manifest
                </div>
              )}
            </div>

            <div style={{ padding: "0 14px 14px" }}>
              <div
                style={{
                  borderRadius: 14,
                  border: "1px dashed rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.18)",
                  padding: 12,
                  display: "grid",
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700 }}>Cover</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  Reads coverUrl from manifest. Local preview upload below (does not persist).
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <input type="file" accept="image/*" onChange={onCoverFile} />
                  <button
                    onClick={resetCover}
                    style={{
                      padding: "7px 10px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.16)",
                      background: "rgba(255,255,255,0.08)",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            <div style={{ padding: "10px 14px 16px", opacity: 0.9 }}>
              <div style={{ fontSize: 12, opacity: 0.65 }}>Album</div>
              <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.05 }}>{parsed.albumTitle}</div>
              <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}>shareId:</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>{parsed.shareId || shareId}</div>
            </div>
          </section>

          {/* RIGHT COLUMN */}
          <aside style={{ display: "grid", gap: 14 }}>
            {/* Card 1: Album Info */}
            <div
              style={{
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(0,0,0,0.25)",
                padding: 14,
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>Album Info</div>

              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ opacity: 0.75 }}>Name</div>
                  <div style={{ fontWeight: 800 }}>{parsed.albumTitle || "—"}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ opacity: 0.75 }}>Performer</div>
                  <div style={{ fontWeight: 800 }}>{parsed?.meta?.artistName || "—"}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ opacity: 0.75 }}>Release Date</div>
                  <div style={{ fontWeight: 800 }}>{parsed?.meta?.releaseDate || "—"}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ opacity: 0.75 }}>Total Time</div>
                  <div style={{ fontWeight: 800 }}>
                    {totalAlbumSeconds ? fmtTime(totalAlbumSeconds) : "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Purchase (button only) */}
            <div
              style={{
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(0,0,0,0.25)",
                padding: 14,
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>Purchase</div>
              <button
                style={{
                  width: "100%",
                  borderRadius: 999,
                  padding: "12px 14px",
                  border: "1px solid rgba(46, 230, 124, 0.40)",
                  background: "rgba(46, 230, 124, 0.10)",
                  color: "rgba(46, 230, 124, 1)",
                  fontWeight: 900,
                  cursor: "pointer",
                  fontSize: 16,
                }}
                onClick={() => {}}
              >
                Buy $19.50
              </button>
            </div>

            {/* Card 3: Marketing */}
            <div
              style={{
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(0,0,0,0.25)",
                padding: 14,
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>Included</div>
              <div style={{ display: "grid", gap: 6, fontSize: 14, lineHeight: 1.35, opacity: 0.92 }}>
                <div>• 8 songs</div>
                <div>• Smart Bridge mode</div>
                <div>• Album mode</div>
                <div>• Artist control</div>
                <div>• Over 60 minutes of bonus authored bridge content</div>
                <div>• FREE MP3 album mix download included</div>
              </div>
            </div>

            {/* Card 4: Tracks */}
            <div
              style={{
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(0,0,0,0.25)",
                padding: 14,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontSize: 18, fontWeight: 900 }}>Tracks</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{tracks.length}</div>
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {tracks.map((t, i) => {
                  const isActive = i === activeIdx;
                  return (
                    <button
                      key={`${t.slot || i}-${t.title || ""}`}
                      onClick={() => playIndex(i)}
                      style={{
                        textAlign: "left",
                        padding: "12px 12px",
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: isActive ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.06)",
                        color: "#fff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.title}
                      </span>
                      <span style={{ fontSize: 12, opacity: 0.7 }}>
                        {t.durationSec ? fmtTime(t.durationSec) : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>

        {/* hidden audio element (no native controls / no 3-dot menu) */}
        <audio ref={audioRef} data-audio="product" preload="metadata" playsInline />
      </main>

      {/* Bottom player (LOCKED layout; only ensuring sound is on) */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          borderTop: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(10px)",
          padding: "10px 12px",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10 }}>
            {/* left: play/pause circle */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={togglePlay}
                disabled={!activeTrack?.playbackUrl}
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  cursor: activeTrack?.playbackUrl ? "pointer" : "not-allowed",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 20,
                  fontWeight: 900,
                }}
                aria-label={playing ? "Pause" : "Play"}
                title={playing ? "Pause" : "Play"}
              >
                {playing ? "❚❚" : "▶"}
              </button>
            </div>

            {/* center: now playing */}
            <div style={{ textAlign: "center", minWidth: 0 }}>
              <div style={{ fontSize: 11, letterSpacing: 1, opacity: 0.7 }}>NOW PLAYING</div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 900,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {activeTrack ? activeTrack.title : "—"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.65 }}>Preview: 40s max</div>
            </div>

            {/* right: prev/next */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={prev}
                disabled={activeIdx <= 0}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  cursor: activeIdx <= 0 ? "not-allowed" : "pointer",
                  opacity: activeIdx <= 0 ? 0.5 : 1,
                }}
              >
                Prev
              </button>
              <button
                onClick={next}
                disabled={activeIdx >= tracks.length - 1}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  cursor: activeIdx >= tracks.length - 1 ? "not-allowed" : "pointer",
                  opacity: activeIdx >= tracks.length - 1 ? 0.5 : 1,
                }}
              >
                Next
              </button>
            </div>
          </div>

          {/* scrub bar row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 48, textAlign: "right", fontSize: 12, opacity: 0.75 }}>
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

            <div style={{ width: 48, fontSize: 12, opacity: 0.75 }}>
              {fmtTime(Math.min(dur || 0, PREVIEW_SECONDS))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
