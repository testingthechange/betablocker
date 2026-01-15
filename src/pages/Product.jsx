import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchManifest, validateManifest } from "../lib/manifest.js";

export default function Product() {
  const { shareId } = useParams();
  const [raw, setRaw] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setErr(null);
    setRaw(null);
    setParsed(null);

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

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <h1 style={{ margin: 0 }}>Product</h1>
      <div style={{ opacity: 0.6, marginTop: 8 }}>
        shareId: <code>{shareId}</code>
      </div>

      {loading && <p style={{ marginTop: 16 }}>Loading manifest…</p>}

      {err && (
        <div style={{ marginTop: 16 }}>
          <div style={{ color: "crimson", fontWeight: 600 }}>Manifest error</div>
          <div style={{ marginTop: 6 }}>{err}</div>
        </div>
      )}

      {parsed && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ marginTop: 0 }}>{parsed.albumTitle}</h2>
          <ol style={{ paddingLeft: 18 }}>
            {parsed.tracks.map((t, i) => {
              const title = t.title ?? t.name ?? `Track ${i + 1}`;
              return (
                <li key={t.id ?? `${i}-${title}`} style={{ marginBottom: 8 }}>
                  {title} <button disabled style={{ marginLeft: 12 }}>Play</button>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {raw && (
        <details style={{ marginTop: 16 }}>
          <summary>Raw manifest (debug)</summary>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(raw, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}
