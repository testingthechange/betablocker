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

  // player
  const audioRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [curTime, setCurTime] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setParsed(null);
    setErr(null);

    fetchManifest(shareId)
      .then((m) => {
        if (cancelled) return;
        const v = validateManifest(m);
        setParsed(v);
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

  // keep audio src aligned
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    setCurTime(0);
    setDur(0);

    const url = activeTrack?.playbackUrl;
    try {
      a.pause();
      a.currentTime = 0;
      if (url) {
        a.src = url;
        a.load();
      } else {
        a.removeAttribute("src");
      }
    } catch {}
  }, [activeTrack?.playbackUrl]);

  // events + preview cap + autoplay next track on cap/end
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onMeta = () => setDur(a.duration || 0);

    const goNext = () => {
      setActiveIdx((i) => {
        const next = i + 1;
        if (next >= tracks.length) return i;
        return next;
      });
      // if we were playing, continue
      setTimeout(() => {
        if (!a) return;
        if (tracks.length && playing) a.play().catch(() => {});
      }, 0);
    };

    const onTime = () => {
      const t = a.currentTime || 0;
      setCurTime(t);

      if (t >= PREVIEW_SECONDS) {
        try {
          a.pause();
          a.currentTime = 0;
        } catch {}
        setCurTime(0);

        // continue playlist if there is a next
        if (activeIdx < tracks.length - 1) {
          goNext();
        } else {
          setPlaying(false);
        }
      }
    };

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    const onEnded = () => {
      setCurTime(0);
      if (activeIdx < tracks.length - 1) {
        goNext();
      } else {
        setPlaying(false);
      }
    };

    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);

    return () => {
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks.length, activeIdx, playing]);

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

  const prev = () => {
    setActiveIdx((i) => Math.max(0, i - 1));
    setTimeout(() => {
      const a = audioRef.current;
      if (a && playing) a.play().catch(() => {});
    }, 0);
  };

  const next = () => {
    setActiveIdx((i) => Math.min(tracks.length - 1, i + 1));
    setTimeout(() => {
      const a = audioRef.current;
      if (a && playing) a.play().catch(() => {});
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

  const coverUrl = parsed?.coverUrl || "";

  if (err) return <pre style={{ color: "#fff", padding: 24 }}>{err}</pre>;
  if (!parsed) return <div style={{ color: "#fff", padding: 24 }}>Loading…</div>;

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#07070a",
        color: "#fff",
      }}
    >
      {/* single root width controller */}
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* header */}
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
          <div
            style={{
              padding: "14px 16px",
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ justifySelf: "start", fontWeight: 800 }}>Block Radius</div>

            <div style={{ justifySelf: "center", display: "flex", gap: 14, alignItems: "center" }}>
              <Link to="/" style={{ color: "#fff", textDecoration: "none", opacity: 0.9 }}>
                Home
              </Link>
              <Link to="/shop" style={{ color: "#fff", textDecoration: "none", opacity: 0.9 }}>
                Shop
              </Link>
              <Link to="/account" style={{ color: "#fff", textDecoration: "none", opacity: 0.9 }}>
                Account
              </Link>

              <input
                type="search"
                placeholder="Search (Directus placeholder)…"
                style={{
                  width: 420,
                  maxWidth: "45vw",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 999,
                  padding: "10px 14px",
                  color: "#fff",
                  outline: "none",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    // placeholder: later route to /shop?query=...
                  }
                }}
              />
            </div>

            <div style={{ justifySelf: "end" }}>
              <Link
                to="/login"
                style={{
                  color: "#111",
                  background: "#fff",
                  textDecoration: "none",
                  padding: "9px 14px",
                  borderRadius: 999,
                  fontWeight: 700,
                  display: "inline-block",
                }}
              >
                Login
              </Link>
              <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6, textAlign: "right" }}>
                Login will be Clerk.
              </div>
            </div>
          </div>
        </header>

        <div style={{ padding: "18px 16px 120px" }}>
          <div style={{ fontSize: 44, fontWeight: 900, margin: "10px 0 6px" }}>{parsed.albumTitle}</div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>
            shareId: {parsed.shareId} · tracks: {tracks.length} · preview cap: {PREVIEW_SECONDS}s
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "65% 35%",
              gap: 18,
              marginTop: 18,
              alignItems: "start",
            }}
          >
            {/* left column */}
            <div
              style={{
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
                boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
                padding: 16,
                minHeight: 420,
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>Album Cover</div>
              <div
                style={{
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(0,0,0,0.25)",
                  height: 380,
                  display: "grid",
                  placeItems: "center",
                  overflow: "hidden",
                }}
              >
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt="cover"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ textAlign: "center", opacity: 0.8 }}>
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>No cover in published manifest</div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>Add coverUrl to publish output to render it here.</div>
                  </div>
                )}
              </div>
            </div>

            {/* right column */}
            <div style={{ display: "grid", gap: 14 }}>
              {/* card 1: purchase */}
              <div
                style={{
                  borderRadius: 18,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.04)",
                  boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>Purchase</div>
                <button
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(46, 204, 113, 0.45)",
                    background: "transparent",
                    color: "#2ecc71",
                    fontWeight: 900,
                    fontSize: 16,
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    // placeholder
                    alert("Buy flow placeholder");
                  }}
                >
                  Buy · $19.50
                </button>
              </div>

              {/* card 2: marketing */}
              <div
                style={{
                  borderRadius: 18,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.04)",
                  boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>What you get</div>
                <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.9 }}>
                  • 8 songs
                  <br />• Smart Bridge mode
                  <br />• Album mode
                  <br />• Artist control
                  <br />• Over 60 minutes of bonus authored bridge content
                  <br />• FREE MP3 album mix download included
                </div>
              </div>

              {/* card 3: tracks */}
              <div
                style={{
                  borderRadius: 18,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.04)",
                  boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
                  padding: 14,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>Tracks</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{tracks.length}</div>
                </div>

                <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                  {tracks.map((t, i) => {
                    const isActive = i === activeIdx;
                    return (
                      <button
                        key={i}
                        onClick={() => playIndex(i)}
                        style={{
                          textAlign: "left",
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: "1px solid rgba(255,255,255,0.10)",
                          background: isActive ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)",
                          cursor: "pointer",
                          color: "#fff",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
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
            </div>
          </div>
        </div>

        {/* hidden audio (no native controls) */}
        <audio ref={audioRef} data-audio="product" preload="metadata" playsInline />
      </div>

      {/* bottom player (outside maxWidth so it spans full viewport) */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          borderTop: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(10px)",
          padding: "10px 12px",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 8, color: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Now Playing</div>
              <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {activeTrack ? activeTrack.title : "—"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Preview cap: {PREVIEW_SECONDS}s max</div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={prev}
                disabled={activeIdx <= 0}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  cursor: "pointer",
                  opacity: activeIdx <= 0 ? 0.45 : 1,
                }}
              >
                Prev
              </button>
              <button
                onClick={togglePlay}
                disabled={!activeTrack?.playbackUrl}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "#fff",
                  color: "#111",
                  cursor: "pointer",
                  fontWeight: 800,
                  opacity: !activeTrack?.playbackUrl ? 0.45 : 1,
                }}
              >
                {playing ? "Pause" : "Play"}
              </button>
              <button
                onClick={next}
                disabled={activeIdx >= tracks.length - 1}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  cursor: "pointer",
                  opacity: activeIdx >= tracks.length - 1 ? 0.45 : 1,
                }}
              >
                Next
              </button>
            </div>
          </div>

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
