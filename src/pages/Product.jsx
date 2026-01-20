import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

/**
 * RECEIVER BUILD
 * BUILD: RECEIVER-2026-01-19-A
 * Purpose: Render published album from S3 manifest
 */

export default function Product() {
  const { shareId } = useParams();

  const [manifest, setManifest] = useState(null);
  const [activeTrack, setActiveTrack] = useState(null);

  const audioRef = useRef(null);

  // ----------------------------
  // Load manifest
  // ----------------------------
  useEffect(() => {
    if (!shareId) return;

    fetch(`/publish/${shareId}.json`)
      .then((r) => {
        if (!r.ok) throw new Error("Manifest not found");
        return r.json();
      })
      .then((data) => {
        setManifest(data);
        if (data?.tracks?.length) {
          setActiveTrack(data.tracks[0]);
        }
      })
      .catch((err) => {
        console.error("PRODUCT LOAD ERROR", err);
      });
  }, [shareId]);

  // ----------------------------
  // Auto-play on track change
  // ----------------------------
  useEffect(() => {
    if (!audioRef.current || !activeTrack?.playbackUrl) return;
    audioRef.current.load();
    audioRef.current.play().catch(() => {});
  }, [activeTrack]);

  if (!manifest) {
    return (
      <div className="p-10 text-sm opacity-60">
        Loading album…
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 pb-32">

      {/* BUILD STAMP */}
      <div className="text-xs opacity-50 mb-3">
        BUILD: RECEIVER-2026-01-19-A
      </div>

      {/* TITLE */}
      <h1 className="text-3xl font-semibold mb-6">
        {manifest.albumTitle || "Album"}
      </h1>

      {/* TWO COLUMN LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* LEFT COLUMN — COVER */}
        <div className="rounded-xl overflow-hidden bg-black">
          {manifest.coverUrl ? (
            <img
              src={manifest.coverUrl}
              alt="Album cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="aspect-square flex items-center justify-center opacity-40">
              No cover
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-6">

          {/* ALBUM INFO (TOP) */}
          <div className="rounded-xl border border-white/10 p-4">
            <div className="text-sm opacity-60 mb-1">Album Info</div>
            <div className="font-medium">{manifest.albumTitle}</div>
            {manifest.meta?.artistName && (
              <div className="opacity-80">{manifest.meta.artistName}</div>
            )}
            {manifest.meta?.releaseDate && (
              <div className="text-sm opacity-60">
                Release date: {manifest.meta.releaseDate}
              </div>
            )}
          </div>

          {/* TRACK LIST */}
          <div className="rounded-xl border border-white/10 p-4">
            <div className="text-sm opacity-60 mb-2">Tracks</div>

            <ul className="space-y-2">
              {manifest.tracks.map((t) => (
                <li
                  key={t.slot}
                  onClick={() => setActiveTrack(t)}
                  className={`cursor-pointer rounded-md px-3 py-2 ${
                    activeTrack?.slot === t.slot
                      ? "bg-white/10"
                      : "hover:bg-white/5"
                  }`}
                >
                  {t.slot}. {t.title}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* PLAYER (BOTTOM, FIXED) */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur border-t border-white/10 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-4">

          <button
            onClick={() => audioRef.current?.play()}
            className="px-3 py-1 border rounded"
          >
            ▶
          </button>

          <div className="flex-1 truncate">
            {activeTrack ? activeTrack.title : "—"}
          </div>

          <audio ref={audioRef} controls className="hidden">
            {activeTrack?.playbackUrl && (
              <source src={activeTrack.playbackUrl} />
            )}
          </audio>

        </div>
      </div>

    </div>
  );
}
