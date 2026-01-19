// src/lib/manifest.js

const BACKEND = "https://album-backend-kmuo.onrender.com";

export async function fetchManifest(shareId) {
  if (!shareId) throw new Error("MISSING_SHARE_ID");
  const url = `${BACKEND}/publish/${encodeURIComponent(shareId)}.json`;
  const r = await fetch(url, { method: "GET" });
  if (!r.ok) throw new Error(`MANIFEST_HTTP_${r.status}`);
  return r.json();
}

// permissive validator: normalize shape, keep fields we need (meta, coverUrl, tracks[*])
export function validateManifest(m) {
  if (!m || typeof m !== "object") throw new Error("MANIFEST_NOT_OBJECT");

  const tracksIn = Array.isArray(m.tracks) ? m.tracks : [];
  const tracks = tracksIn
    .map((t) => ({
      slot: Number(t?.slot) || 0,
      title: String(t?.title || "").trim(),
      durationSec: Number(t?.durationSec) || 0,
      playbackUrl: String(t?.playbackUrl || "").trim(),
      s3Key: String(t?.s3Key || "").trim(),
    }))
    .filter((t) => t.slot || t.playbackUrl || t.s3Key);

  const metaIn = m?.meta && typeof m.meta === "object" ? m.meta : {};
  const meta = {
    albumTitle: String(metaIn?.albumTitle || "").trim(),
    artistName: String(metaIn?.artistName || "").trim(),
    releaseDate: String(metaIn?.releaseDate || "").trim(),
  };

  return {
    ok: Boolean(m.ok),
    shareId: String(m.shareId || "").trim(),
    projectId: String(m.projectId || "").trim(),
    createdAt: String(m.createdAt || "").trim(),
    snapshotKey: String(m.snapshotKey || "").trim(),

    albumTitle: String(m.albumTitle || meta.albumTitle || "Album").trim(),
    meta,
    coverUrl: String(m.coverUrl || "").trim(),

    tracks,
  };
}
