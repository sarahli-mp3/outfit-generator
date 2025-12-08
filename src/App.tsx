import { useState, useEffect, useCallback } from "react";
import "98.css/dist/98.css";
import { useCarousel } from "./hooks/useCarousel";
import { useOutfitGeneration } from "./hooks/useOutfitGeneration";
import {
  addClothingItem,
  getClothingItems,
  ClothingItem as SupabaseClothingItem,
  getCachedComposite,
  getGeneratedOutfitByUrl,
  setGeneratedOutfitLikedByUrl,
} from "./lib/supabase";
import { rateLimiter } from "./services/rateLimiter";
import { LocalClothingItem, RateLimitResult } from "./types";

// Import components
import { MenuBar } from "./components/MenuBar";
import { Gallery } from "./components/Gallery.tsx";
import { UploadSection } from "./components/UploadSection";
import { ClothingCarousel } from "./components/ClothingCarousel";
import { ControlButtons } from "./components/ControlButtons";
import { OutfitPreview } from "./components/OutfitPreview";
import { NanoWindow } from "./components/NanoWindow";
import { OutfitTransferWindow } from "./components/OutfitTransferWindow";
import { ScreenCropperModal } from "./components/ScreenCropperModal";
import { deleteClothingItem } from "./lib/supabase";

// Debug logger (no-op in production)
const debugLog = (...args: any[]) => {
  if (import.meta.env.DEV) console.log(...args);
};

function App() {
  const [previewTop, setPreviewTop] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"main" | "gallery">("main");
  const [previewBottom, setPreviewBottom] = useState<number>(0);
  const [topsList, setTopsList] = useState<LocalClothingItem[]>([]);
  const [bottomsList, setBottomsList] = useState<LocalClothingItem[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [showUploadMenu, setShowUploadMenu] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [showNanoWindow, setShowNanoWindow] = useState<boolean>(false);
  const [nanoText, setNanoText] = useState<string>("");
  const [showOutfitTransferWindow, setShowOutfitTransferWindow] =
    useState<boolean>(false);
  // const [showAlreadyWornWindow, setShowAlreadyWornWindow] =
  //   useState<boolean>(false);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [showCropper, setShowCropper] = useState<boolean>(false);
  const [cropCategory, setCropCategory] = useState<"tops" | "bottoms">("tops");
  const [pendingSelect, setPendingSelect] = useState<{
    category: "tops" | "bottoms";
    id: string;
  } | null>(null);

  // Load clothing items from Supabase on component mount
  // This is so that you can do this and then you can styill fo this  and this is other this
  useEffect(() => {
    const loadClothingItems = async () => {
      try {
        debugLog("Loading clothing items from Supabase...");

        const [supabaseTops, supabaseBottoms] = await Promise.all([
          getClothingItems("tops"),
          getClothingItems("bottoms"),
        ]);

        debugLog("Loaded from Supabase:", {
          tops: supabaseTops.length,
          bottoms: supabaseBottoms.length,
        });

        // Convert Supabase items to local format
        const convertedTops: LocalClothingItem[] = supabaseTops.map(
          (item: SupabaseClothingItem) => ({
            id: item.id,
            name: item.name,
            imageUrl: item.image_url,
            offset: {
              x: 0,
              y: -20,
              scale: 1.0,
              zIndex: 10,
            },
            isShopping: Boolean((item as any).is_shopping),
          })
        );

        const convertedBottoms: LocalClothingItem[] = supabaseBottoms.map(
          (item: SupabaseClothingItem) => ({
            id: item.id,
            name: item.name,
            imageUrl: item.image_url,
            offset: {
              x: 0,
              y: 50,
              scale: 1.0,
              zIndex: 9,
            },
            isShopping: Boolean((item as any).is_shopping),
          })
        );

        // Always set the lists, even if empty
        // this is so that you can see this
        setTopsList(convertedTops);
        setBottomsList(convertedBottoms);

        debugLog(
          `Set ${convertedTops.length} tops and ${convertedBottoms.length} bottoms`
        );
      } catch (error) {
        console.error("Error loading clothing items from Supabase:", error);
        // Fall back to empty arrays if database fails
        setTopsList([]);
        setBottomsList([]);
        debugLog("Falling back to empty arrays due to database error");
      }
    };

    loadClothingItems();
  }, []); // Empty dependency array - only run once on mount

  // Configure rate limiter for better user experience
  useEffect(() => {
    // Reduce cooldown to 2 seconds for better user experience
    rateLimiter.updateConfig({
      cooldownMs: 2000, // 2 seconds instead of 10 seconds
      maxCalls: 10, // Increase max calls to 10 per minute
      windowMs: 60000, // Keep 1 minute window
    });
  }, []);

  // Debug logging to identify why tops/bottoms aren't showing
  debugLog("App render - tops:", topsList);
  debugLog("App render - bottoms:", bottomsList);
  debugLog("App render - tops.length:", topsList.length);
  debugLog("App render - bottoms.length:", bottomsList.length);

  const topsCarousel = useCarousel(topsList.length, "tops");
  const bottomsCarousel = useCarousel(bottomsList.length, "bottoms");
  const {
    generatedImage,
    isGenerating,
    error,
    generateOutfit,
    generateNanoOutfit,
    generateOutfitTransfer,
    clearGeneratedImage,
    canGenerate,
    showCachedOutfit,
  } = useOutfitGeneration();

  // Check if API key is configured
  const hasApiKey = Boolean(
    import.meta.env.VITE_GOOGLE_API_KEY &&
      import.meta.env.VITE_GOOGLE_API_KEY !== "your_google_api_key_here"
  );

  // Test connection function

  // Debug data mismatch function

  // Handle file upload
  const handleFileUpload = useCallback(
    async (category: "tops" | "bottoms") => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.multiple = true; // Allow multiple file selection

      input.onchange = async (event) => {
        const files = (event.target as HTMLInputElement).files;
        debugLog("Files selected:", files?.length);

        if (files && files.length > 0) {
          setIsUploading(true);
          setShowUploadMenu(false);

          try {
            const uploadPromises = Array.from(files).map(
              async (file, index) => {
                const nextNumber =
                  (category === "tops" ? topsList.length : bottomsList.length) +
                  index +
                  1;
                const name = `${
                  category === "tops" ? "Top" : "Bottom"
                } ${nextNumber}`;

                debugLog(`Attempting to upload: ${name}`);

                const newItem = await addClothingItem(name, category, file);

                const newClothingItem: LocalClothingItem = {
                  id: newItem.id,
                  name: newItem.name,
                  imageUrl: newItem.image_url,
                  offset: {
                    x: 0,
                    y: category === "tops" ? -20 : 50,
                    scale: 1.0,
                    zIndex: category === "tops" ? 10 : 9,
                  },
                };

                return newClothingItem;
              }
            );

            // Wait for all uploads to complete
            const newItems = await Promise.all(uploadPromises);

            if (category === "tops") {
              setTopsList((prev) => [...prev, ...newItems]);
            } else {
              setBottomsList((prev) => [...prev, ...newItems]);
            }

            debugLog(
              `Added ${newItems.length} new ${category}:`,
              newItems.map((item) => item.name)
            );
          } catch (error) {
            console.error(`Error uploading ${category}:`, error);
            alert(`Failed to upload some ${category}. Please try again.`);
          } finally {
            setIsUploading(false);
          }
        }
      };

      input.click();
    },
    [topsList.length, bottomsList.length]
  );

  // Handle random selection
  const handleRandom = useCallback(() => {
    if (topsList.length === 0 || bottomsList.length === 0) {
      debugLog("Cannot select random outfit - no items available");
      return;
    }

    const randomTop = Math.floor(Math.random() * topsList.length);
    const randomBottom = Math.floor(Math.random() * bottomsList.length);

    // Update the carousel indices to show the random items
    topsCarousel.setIndex(randomTop);
    bottomsCarousel.setIndex(randomBottom);

    debugLog("Random outfit selected:", {
      top: topsList[randomTop].id,
      bottom: bottomsList[randomBottom].id,
    });
  }, [topsList, bottomsList, topsCarousel, bottomsCarousel]);

  // Handle select button - cache-first, then generate with rate limiting
  const handleSelect = useCallback(async () => {
    const topItem = topsList[previewTop];
    const bottomItem = bottomsList[previewBottom];
    if (!topItem || !bottomItem) return;

    // 1) Try Supabase cache first (works even without API key)
    try {
      const existingUrl = await getCachedComposite(topItem.id, bottomItem.id);
      if (existingUrl) {
        debugLog("✅ Loaded cached outfit from Supabase", existingUrl);
        showCachedOutfit(existingUrl);
        return;
      }
    } catch (e) {
      console.warn("Cache lookup failed; will try generation if possible", e);
    }

    // 2) If no cache, only proceed if API key is available and rate limit allows
    if (!hasApiKey) {
      debugLog(
        "API key not configured and no cache found; skipping generation"
      );
      return;
    }

    const rateLimitCheck: RateLimitResult = canGenerate();
    if (!rateLimitCheck.allowed) {
      console.warn("🚫 Rate limit check failed:", rateLimitCheck.reason);
      if (rateLimitCheck.waitTime) {
        debugLog(
          `⏰ Please wait ${Math.ceil(
            rateLimitCheck.waitTime / 1000
          )} seconds before trying again`
        );
      }
      return;
    }

    debugLog("🤖 Generating outfit with:", {
      top: topItem.id,
      bottom: bottomItem.id,
    });
    setGenerationProgress(0);
    await generateOutfit(topItem, bottomItem);
  }, [
    canGenerate,
    generateOutfit,
    hasApiKey,
    previewTop,
    previewBottom,
    topsList,
    bottomsList,
    showCachedOutfit,
  ]);

  // Reset and fetch like state when generated image changes
  useEffect(() => {
    let cancelled = false;
    async function loadLike() {
      setIsLiked(false);
      if (!generatedImage) return;
      const row = await getGeneratedOutfitByUrl(generatedImage);
      if (!cancelled && row) setIsLiked(Boolean(row.is_liked));
    }
    loadLike();
    return () => {
      cancelled = true;
    };
  }, [generatedImage]);

  const handleToggleLike = useCallback(
    async (checked: boolean) => {
      if (!generatedImage) return;
      setIsLiked(checked);
      try {
        await setGeneratedOutfitLikedByUrl(generatedImage, checked);
      } catch (e) {
        console.error("Failed to update like state:", e);
      }
    },
    [generatedImage]
  );

  // Progress animation effect
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isGenerating) {
      setGenerationProgress(0);

      interval = setInterval(() => {
        setGenerationProgress((prev) => {
          // Gradually increase progress, slowing down as it approaches 95%
          const increment = Math.max(1, Math.floor((100 - prev) * 0.1));
          const newProgress = Math.min(prev + increment, 95);
          return newProgress;
        });
      }, 200); // Update every 200ms
    } else {
      // Reset progress when generation stops
      setGenerationProgress(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isGenerating]);

  // Update preview when carousel changes
  useEffect(() => {
    setPreviewTop(topsCarousel.index);
  }, [topsCarousel.index]);

  useEffect(() => {
    setPreviewBottom(bottomsCarousel.index);
  }, [bottomsCarousel.index]);

  // After adding a new item, move carousel to show it
  useEffect(() => {
    if (!pendingSelect) return;
    if (pendingSelect.category === "tops") {
      const idx = topsList.findIndex((i) => i.id === pendingSelect.id);
      if (idx >= 0) {
        topsCarousel.setIndex(idx);
        setPendingSelect(null);
      }
    } else {
      const idx = bottomsList.findIndex((i) => i.id === pendingSelect.id);
      if (idx >= 0) {
        bottomsCarousel.setIndex(idx);
        setPendingSelect(null);
      }
    }
  }, [pendingSelect, topsList, bottomsList, topsCarousel, bottomsCarousel]);

  // Get current rate limit status for button state
  const rateLimitStatus: RateLimitResult = canGenerate();
  const canGenerateNow = hasApiKey && rateLimitStatus.allowed;

  // Log rate limit status periodically
  useEffect(() => {
    if (!hasApiKey) return;
    if (!import.meta.env.DEV) return;

    const logStatus = () => {
      const status: RateLimitResult = canGenerate();
      if (status.allowed) {
        debugLog("✅ API calls available - ready to generate");
      } else {
        debugLog("⏳ API rate limited:", status.reason);
      }
    };

    // Log initial status
    logStatus();

    // Log status every 30 seconds
    const interval = setInterval(logStatus, 30000);

    return () => clearInterval(interval);
  }, [canGenerate, hasApiKey]);

  // Helper function to handle image load errors
  const handleImageError = useCallback((imageUrl: string) => {
    console.error("Failed to load image:", imageUrl);
  }, []);

  // Handle nano banana styling
  const handleNanoStyle = useCallback(async () => {
    if (!nanoText.trim()) {
      alert("Please enter what you want to wear to!");
      return;
    }

    if (!hasApiKey) {
      alert("Google API key required for styling");
      return;
    }

    const rateLimitCheck: RateLimitResult = canGenerate();
    if (!rateLimitCheck.allowed) {
      alert(`Rate limited: ${rateLimitCheck.reason}`);
      return;
    }

    // Close the popup immediately when user clicks "Style Me!"
    setShowNanoWindow(false);
    const occasionText = nanoText;
    setNanoText(""); // Clear the text

    try {
      debugLog("Nano styling with occasion:", occasionText);

      // Use the hook's generateNanoOutfit method
      await generateNanoOutfit(occasionText);
    } catch (error: any) {
      console.error("Error in nano styling:", error);
      // Error handling is already done in the hook
    }
  }, [nanoText, hasApiKey, canGenerate, generateNanoOutfit]);

  // Handle outfit transfer
  const handleOutfitTransfer = useCallback(
    async (file: File) => {
      if (!hasApiKey) {
        alert("Google API key required for outfit transfer");
        return;
      }

      const rateLimitCheck: RateLimitResult = canGenerate();
      if (!rateLimitCheck.allowed) {
        alert(`Rate limited: ${rateLimitCheck.reason}`);
        return;
      }

      try {
        debugLog("Starting outfit transfer with file:", file.name);
        await generateOutfitTransfer(file);
      } catch (error: any) {
        console.error("Error in outfit transfer:", error);
        // Error handling is already done in the hook
      }
    },
    [hasApiKey, canGenerate, generateOutfitTransfer]
  );

  const handleDeleteItem = useCallback(
    async (category: "tops" | "bottoms", id: string) => {
      try {
        await deleteClothingItem(id);
        if (category === "tops") {
          setTopsList((prev) => prev.filter((i) => i.id !== id));
          // Clamp carousel index if needed
          if (topsCarousel.index >= Math.max(0, topsList.length - 1)) {
            topsCarousel.setIndex(Math.max(0, topsCarousel.index - 1));
          }
        } else {
          setBottomsList((prev) => prev.filter((i) => i.id !== id));
          if (bottomsCarousel.index >= Math.max(0, bottomsList.length - 1)) {
            bottomsCarousel.setIndex(Math.max(0, bottomsCarousel.index - 1));
          }
        }
      } catch (e) {
        console.error("Failed to delete clothing item:", e);
        alert("Failed to delete item. Please try again.");
      }
    },
    [topsCarousel, bottomsCarousel, topsList.length, bottomsList.length]
  );
  return (
    <div
      className="window outfit-window"
      style={{ width: "100vw", height: "100vh", margin: 0 }}
    >
      <div className="title-bar">
        <div className="title-bar-text">What should I wear today?</div>
        <div className="title-bar-controls">
          <button aria-label="Minimize"></button>
          <button aria-label="Maximize"></button>
          <button aria-label="Close"></button>
        </div>
      </div>
      <div
        className="window-body"
        style={{
          padding: 0,
          height: "calc(100vh - 36px)",
          background: "#c0c0c0",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <MenuBar activeTab={activeTab} onChangeTab={setActiveTab} />
        <div
          className="window"
          role="tabpanel"
          style={{ flex: 1, margin: "0 8px 8px 8px" }}
        >
          <div className="window-body" style={{ padding: 0, height: "100%" }}>
            {activeTab === "gallery" ? (
              <Gallery />
            ) : (
              <div
                className="main-container"
                style={{ width: "100%", height: "100%" }}
              >
                {/* Left Column - Selection Area */}
                <div className="left-column">
                  <UploadSection
                    isUploading={isUploading}
                    showUploadMenu={showUploadMenu}
                    onToggleUploadMenu={() =>
                      setShowUploadMenu(!showUploadMenu)
                    }
                    onUploadTops={() => handleFileUpload("tops")}
                    onUploadBottoms={() => handleFileUpload("bottoms")}
                    onTryTop={() => {
                      setCropCategory("tops");
                      setShowCropper(true);
                    }}
                    onTryBottom={() => {
                      setCropCategory("bottoms");
                      setShowCropper(true);
                    }}
                  />

                  <ClothingCarousel
                    items={topsList}
                    carousel={topsCarousel}
                    category="tops"
                    onImageError={handleImageError}
                    onDeleteItem={(id) => {
                      // handled below with shared handler
                      handleDeleteItem("tops", id);
                    }}
                  />

                  <ClothingCarousel
                    items={bottomsList}
                    carousel={bottomsCarousel}
                    category="bottoms"
                    onImageError={handleImageError}
                    onDeleteItem={(id) => {
                      handleDeleteItem("bottoms", id);
                    }}
                  />

                  <ControlButtons
                    hasApiKey={hasApiKey}
                    canGenerateNow={canGenerateNow}
                    rateLimitStatus={rateLimitStatus}
                    onRandom={handleRandom}
                    onSelect={handleSelect}
                    onNanoBananify={() => setShowNanoWindow(true)}
                    onOutfitTransfer={() => setShowOutfitTransferWindow(true)}
                  />
                </div>

                <OutfitPreview
                  hasApiKey={hasApiKey}
                  isGenerating={isGenerating}
                  generationProgress={generationProgress}
                  error={error}
                  generatedImage={generatedImage}
                  onClearGeneratedImage={clearGeneratedImage}
                  isLiked={isLiked}
                  onToggleLike={handleToggleLike}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <NanoWindow
        show={showNanoWindow}
        nanoText={nanoText}
        onClose={() => setShowNanoWindow(false)}
        onTextChange={setNanoText}
        onStyle={handleNanoStyle}
      />

      <OutfitTransferWindow
        show={showOutfitTransferWindow}
        onClose={() => setShowOutfitTransferWindow(false)}
        onUploadImage={handleOutfitTransfer}
      />

      <ScreenCropperModal
        open={showCropper}
        category={cropCategory}
        onClose={() => setShowCropper(false)}
        onConfirm={async (file: File) => {
          try {
            const nextNumber =
              cropCategory === "tops"
                ? topsList.length + 1
                : bottomsList.length + 1;
            const name = `${
              cropCategory === "tops" ? "Shop Top" : "Shop Bottom"
            } ${nextNumber}`;
            const newItem = await addClothingItem(name, cropCategory, file, {
              isShopping: true,
            });
            const newClothingItem: LocalClothingItem = {
              id: newItem.id,
              name: newItem.name,
              imageUrl: newItem.image_url,
              offset: {
                x: 0,
                y: cropCategory === "tops" ? -20 : 50,
                scale: 1.0,
                zIndex: cropCategory === "tops" ? 10 : 9,
              },
              isShopping: true,
            };
            if (cropCategory === "tops") {
              setTopsList((prev) => [...prev, newClothingItem]);
              setPendingSelect({ category: "tops", id: newItem.id });
            } else {
              setBottomsList((prev) => [...prev, newClothingItem]);
              setPendingSelect({ category: "bottoms", id: newItem.id });
            }
          } catch (e) {
            console.error("Failed to add clothing item from capture:", e);
            alert("Failed to save captured item. Please try again.");
          }
        }}
      />

      {/* Already worn window removed */}
    </div>
  );
}

export default App;
