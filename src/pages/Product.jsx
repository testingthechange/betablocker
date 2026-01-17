import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchManifest, validateManifest } from "../lib/manifest.js";

const PREVIEW_SECONDS = 40;
export default function Product() {
  const { shareId } = useParams();

  const [parsed, setParsed] = useState(null);
  const [err, setErr] = useState(null);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);

  const audioRef = useRef(null);

  useEffect(() => {
    fetchManifest(shareId)
      .then((m) => setParsed(validateManifest(m)))
      .catch((e) => setErr(String(e?.message || e)));
  }, [shareId]);

  const tracks = parsed?.tracks || [];

  const play = (i) => {
    const a = audioRef.current;
    const url = tracks[i]?.playbackUrl;
    if (!a || !url) return;

    a.pause();
    a.currentTime = 0;
    a.src = url;
    a.play().catch(console.error);

    setActiveIdx(i);
    setPlaying(true);
  };

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const cut = () => {
      if (a.currentTime >= PREVIEW_SECONDS) {
        a.pause();
        a.currentTime = 0;
        setPlaying(false);
      }
    };

    a.addEventListener("timeupdate", cut);
    return () => a.removeEventListener("timeupdate", cut);
  }, []);

  if (err) return <pre>{err}</pre>;
  if (!parsed) return <div>Loading…</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1>{parsed.albumTitle}</h1>

      {tracks.map((t, i) => (
        <div key={i}>
          {t.title}
          <button onClick={() => play(i)}>Play</button>
        </div>
      ))}

      <audio ref={audioRef} data-audio="product" controls />
    </div>
  );
}
