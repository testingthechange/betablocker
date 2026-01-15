export async function fetchManifest(shareId) {
  const base = import.meta.env.VITE_MANIFEST_BASE_URL;
  if (!base) throw new Error("VITE_MANIFEST_BASE_URL missing");

  const res = await fetch(`${base}/publish/${shareId}.json`);
  if (!res.ok) throw new Error(`Manifest not found: ${shareId}`);
  return res.json();
}

export function validateManifest(m) {
  const albumTitle = m?.albumTitle ?? m?.album?.title;
  const tracks = m?.tracks ?? m?.songs ?? m?.album?.tracks;

  if (!albumTitle) throw new Error("Manifest missing albumTitle");
  if (!Array.isArray(tracks) || tracks.length === 0) throw new Error("Manifest missing tracks[]");

  return { albumTitle, tracks };
}
