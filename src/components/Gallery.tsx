import { useEffect, useState } from "react";
import { GeneratedOutfit, getLikedGeneratedOutfits } from "../lib/supabase";

export function Gallery() {
  const [items, setItems] = useState<GeneratedOutfit[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      const rows = await getLikedGeneratedOutfits();
      if (!cancelled) {
        setItems(rows);
        setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="field-border"
      style={{
        padding: 8,
        height: "100%",
        overflow: "auto",
      }}
    >
      {isLoading ? (
        <p style={{ margin: 0 }}>Loading liked outfits...</p>
      ) : items.length === 0 ? (
        <p style={{ margin: 0 }}>No liked outfits yet.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {items.map((o) => (
            <div
              key={o.id}
              className="field-border"
              style={{ padding: 8, background: "#ffffff" }}
            >
              <img
                src={o.generated_image_url}
                alt="Generated outfit"
                style={{ width: "100%", height: "auto", display: "block" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.visibility =
                    "hidden";
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
