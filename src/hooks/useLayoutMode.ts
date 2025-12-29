import { useEffect, useState } from "react";

export type LayoutMode = "mobilePortrait" | "mobileLandscape" | "tabletPlus";

export interface LayoutInfo {
  layoutMode: LayoutMode;
  scale: number;
  designWidth: number;
  designHeight: number;
  allowScroll: boolean;
}

const TABLET_WIDTH = 640;
const TABLET_HEIGHT = 640;

const MIN_SCALE = 0.8;

function computeLayoutInfo(viewportWidth: number, viewportHeight: number): LayoutInfo {
  const isPortrait = viewportHeight >= viewportWidth;

  let layoutMode: LayoutMode;
  let designWidth: number;
  let designHeight: number;

  if (viewportWidth < TABLET_WIDTH) {
    if (isPortrait) {
      layoutMode = "mobilePortrait";
      // On mobile portrait, let the design canvas match the viewport
      // so the UI can use the full width and height.
      designWidth = viewportWidth;
      designHeight = viewportHeight;
    } else {
      layoutMode = "mobileLandscape";
      // Same idea for mobile landscape: fill the screen.
      designWidth = viewportWidth;
      designHeight = viewportHeight;
    }
  } else {
    layoutMode = "tabletPlus";
    designWidth = TABLET_WIDTH;
    designHeight = TABLET_HEIGHT;
  }

  const rawScale = Math.min(
    viewportWidth / designWidth,
    viewportHeight / designHeight
  );

  // Never scale above 1 (design size) to avoid zoomed-in clipping
  const cappedScale = Math.min(rawScale, 1);

  // If we'd need to go below MIN_SCALE, allow scrolling instead of shrinking further
  const allowScroll = cappedScale < MIN_SCALE;
  const scale = allowScroll ? MIN_SCALE : cappedScale;

  return {
    layoutMode,
    scale,
    designWidth,
    designHeight,
    allowScroll,
  };
}

export function useLayoutMode(): LayoutInfo {
  const [info, setInfo] = useState<LayoutInfo>(() =>
    computeLayoutInfo(
      typeof window !== "undefined" ? window.innerWidth : TABLET_WIDTH,
      typeof window !== "undefined" ? window.innerHeight : TABLET_HEIGHT
    )
  );

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === "undefined") return;
      setInfo(computeLayoutInfo(window.innerWidth, window.innerHeight));
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return info;
}
