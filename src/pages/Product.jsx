// FILE: src/pages/Product.jsx
// Product build marker: enforce 40s preview with hard poll (no native controls)

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchManifest, validateManifest } from "../lib/manifest.js";

const PREVIEW_SECONDS = 40;

function safeString(v) {
  return String(v ?? "").trim();
}

export default function Product() {
  const { shareId } = useParams();

  const [raw, setRaw] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeIdx, setActiveIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [previewEnded, setPreviewEnded] = useState(false);

  const audioRef = useRef(null);
  const playingRef = useRef(false);
  const cutRef = useRef(false);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setErr(null);
    setRaw(null);
    setParsed(null);
    setActiveIdx(-1);
    setPlaying(false);
    setPreviewEnded(false);

    fetchManifest(shareId)
      .then((m) => {
        if (cancelled) return;
        setRaw(m);
        setParsed(validateManifest(m));
      })
      .catch((e) => {
        if (cancelled) return;
        setErr(e?.message ?? String(e));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [shareId]);

  const tracks = useMemo(() => (Array.isArray(parsed?.tracks) ? parsed.tracks : []), [parsed]);

  const stopPlayback = () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      a.pause();
      a.currentTime = 0;
    } catch {}
    setPlaying(false);
  };

  const cutPreview = () => {
    if (cutRef.current) return;
    cutRef.current = true;

    const a = audioRef.current;
    if (a) {
      try {
        a.pause();
        a.currentTime = 0;
      } catch {}
    }

    setPlaying(false);
    setPreviewEnded(true);
  };

  const loadAndPlay = (idx) => {
    const t = tracks[idx];
    const url = safeString(t?.playbackUrl);

    if (!url) {
      setErr("Track missing playbackUrl.");
      return;
    }

    const a = audioRef.current;
    if (!a) {
      setErr("Audio element missing in DOM.");
      return;
    }

    cutRef.current = false;
    setPreviewEnded(false);

    setErr(null);
    setActiveIdx(idx);

    try {
      a.preload = "auto";
      a.playsInline = true;

      a.pause();
      a.currentTime = 0;
      a.src = url;

      const p = a.play();
      if (p && typeof p.catch === "function") {
        p.catch((e) => {
          setErr(`play() failed: ${String(e?.message || e)}`);
          setPlaying(false);
        });
      }

      setPlaying(true);
    } catch (e) {
      setErr(String(e?.message || e));
      setPlaying(false);
    }
  };

  // 40s cap: timeupdate + hard poll (catches throttling)
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const check = () => {
      if (!playingRef.current) return;
      if (cutRef.current) return;
      if (a.currentTime >= PREVIEW_SECONDS) cutPreview();
    };

    const onTimeUpdate = () => check();
    const onEnded = () => setPlaying(false);
    const onError = () => {
      const code = a.error?.code;
      setErr(`Audio error (code ${code ?? "?"}). Check Network for the mp3 request.`);
      setPlaying(false);
    };

    const poll = window.setInterval(check, 250);

    a.addEventListener("timeupdate", onTimeUpdate);
    a.addEventListener("ended", onEnded);
    a.addEventListener("error", onError);

    return () => {
      window.clearInterval(poll);
      a.removeEventListener("timeupdate", onTimeUpdate);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("error", onError);
    };
  }, []);

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  if (err) {
    return (
      <div style={{ padding: 24, color: "#991b1b", fontWeight: 800, whiteSpace: "pre-wrap" }}>
        {err}
      </div>
    );
  }

  if (!parsed) return <div style={{ padding: 24 }}>No manifest.</div>;

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <div style={{ fontSize: 42, fontWeight: 900 }}>Product</div>
      <div style={{ marginTop: 6, opacity: 0.7 }}>
        shareId: <code>{shareId}</code>
      </div>

      <h2 style={{ marginTop: 18 }}>{parsed.albumTitle || "Album"}</h2>

      <div style={{ marginTop: 12 }}>
        {tracks.map((t, i) => {
          const isActive = i === activeIdx;
          const disabled = !t?.playbackUrl;

          return (
            <div
              key={String(t?.slot ?? i)}
              style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}
            >
              <div style={{ minWidth: 24, fontWeight: 900 }}>{i + 1}.</div>
              <div style={{ flex: 1, fontWeight: 800 }}>{t?.title || `Track ${i + 1}`}</div>

              <button
                type="button"
                disabled={disabled}
                onClick={() => loadAndPlay(i)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                  background: isActive ? "#111" : "#fff",
                  color: isActive ? "#fff" : "#111",
                  fontWeight: 900,
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.4 : 1,
                  minWidth: 92,
                }}
              >
                {isActive && playing ? "Playing" : "Play"}
              </button>

              {isActive && playing ? (
                <button
                  type="button"
                  onClick={stopPlayback}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    color: "#111",
                    fontWeight: 900,
                    cursor: "pointer",
                    minWidth: 92,
                  }}
                >
                  Stop
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {previewEnded ? (
        <div style={{ marginTop: 12, fontWeight: 900 }}>Preview ended at {PREVIEW_SECONDS}s.</div>
      ) : null}

      <audio ref={audioRef} data-audio="product" preload="auto" playsInline />

      <details style={{ marginTop: 18 }}>
        <summary style={{ cursor: "pointer", fontWeight: 900 }}>Raw manifest (debug)</summary>
        <pre
          style={{
            marginTop: 10,
            background: "#0b1220",
            color: "#e5e7eb",
            borderRadius: 14,
            padding: 14,
            fontSize: 12,
            overflowX: "auto",
            lineHeight: 1.5,
          }}
        >
          {JSON.stringify(raw, null, 2)}
        </pre>
      </details>
    </div>
  );
}
