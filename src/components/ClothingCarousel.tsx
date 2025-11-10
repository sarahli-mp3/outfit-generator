import { LocalClothingItem } from "../types";

interface CarouselControls {
  index: number;
  prev: () => void;
  next: () => void;
}

interface ClothingCarouselProps {
  items: LocalClothingItem[];
  carousel: CarouselControls;
  category: "tops" | "bottoms";
  onImageError: (imageUrl: string) => void;
  onDeleteItem?: (id: string, category: "tops" | "bottoms") => void;
}

export function ClothingCarousel({
  items,
  carousel,
  category,
  onImageError,
  onDeleteItem,
}: ClothingCarouselProps) {
  const isTops = category === "tops";
  const sectionClass = isTops
    ? "section-container"
    : "section-container bottoms-section";
  const emptyMessage = isTops ? "No tops available" : "No bottoms available";

  return (
    <div className={sectionClass}>
      <div className="nav-buttons">
        <button
          className="nav-button left-button"
          onClick={carousel.prev}
          title={`Previous ${category.slice(0, -1)}`}
          aria-label={`Previous ${category.slice(0, -1)}`}
          disabled={items.length === 0}
        />
        <div className="clothes-window">
          {items.length > 0 && items[carousel.index] ? (
            <div
              style={{ position: "relative", width: "100%", height: "100%" }}
            >
              {items[carousel.index].isShopping && onDeleteItem && (
                <button
                  title="Delete this shopping item"
                  aria-label="Delete shopping item"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteItem(items[carousel.index].id, category);
                  }}
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    padding: 0,
                    margin: 0,
                    background: "transparent",
                    border: "none",
                    color: "#000",
                    cursor: "pointer",
                    fontSize: "12px",
                    lineHeight: 1,
                    width: "15px",
                    height: "15px",
                    minWidth: 0,
                    minHeight: 0,
                    WebkitAppearance: "none",
                    appearance: "none",
                    display: "inline-block",
                    zIndex: 2,
                  }}
                >
                  ×
                </button>
              )}
              <img
                src={items[carousel.index].imageUrl}
                alt={items[carousel.index].name}
                className="clothing-item"
                onError={() => onImageError(items[carousel.index].imageUrl)}
                style={{ position: "absolute", inset: 0, margin: "auto" }}
              />
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "#666",
                fontSize: "14px",
                textAlign: "center",
              }}
            >
              {emptyMessage}
              <br />
              Click folder to upload
            </div>
          )}
        </div>
        <button
          className="nav-button right-button"
          onClick={carousel.next}
          title={`Next ${category.slice(0, -1)}`}
          aria-label={`Next ${category.slice(0, -1)}`}
          disabled={items.length === 0}
        />
      </div>
    </div>
  );
}
