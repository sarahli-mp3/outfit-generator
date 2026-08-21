import { useState, useCallback, useEffect, useRef } from 'react';

// Types
interface UseCarouselReturn {
  index: number;
  next: () => void;
  prev: () => void;
  setRandom: () => void;
  setIndex: (index: number) => void;
}

// Constants
const STORAGE_PREFIX = 'outfit98.';

export function useCarousel(itemsLength: number, storageKey: string): UseCarouselReturn {
  const storageKeyFull = `${STORAGE_PREFIX}${storageKey}`;

  const [index, setIndexState] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKeyFull);
      if (saved) {
        const parsedIndex = parseInt(saved, 10);
        if (!isNaN(parsedIndex)) {
          return Math.max(0, Math.min(parsedIndex, itemsLength - 1));
        }
      }
    } catch (error) {
      console.warn('Failed to load carousel state from localStorage:', error);
    }
    return 0;
  });

  // itemsLength is often 0 on first render (data still loading async), so the
  // initializer above can't restore the saved index yet. Retry once the items
  // actually arrive.
  const didRestoreRef = useRef(false);
  useEffect(() => {
    if (didRestoreRef.current || itemsLength <= 0) return;
    didRestoreRef.current = true;
    try {
      const saved = localStorage.getItem(storageKeyFull);
      if (saved) {
        const parsedIndex = parseInt(saved, 10);
        if (!isNaN(parsedIndex)) {
          setIndexState(Math.max(0, Math.min(parsedIndex, itemsLength - 1)));
        }
      }
    } catch (error) {
      console.warn('Failed to load carousel state from localStorage:', error);
    }
  }, [itemsLength, storageKeyFull]);

  const setIndex = useCallback((newIndex: number) => {
    const clampedIndex = Math.max(0, Math.min(newIndex, itemsLength - 1));
    setIndexState(clampedIndex);
    
    try {
      localStorage.setItem(storageKeyFull, clampedIndex.toString());
    } catch (error) {
      console.warn('Failed to save carousel state to localStorage:', error);
    }
  }, [itemsLength, storageKeyFull]);

  const next = useCallback(() => {
    setIndex((index + 1) % itemsLength);
  }, [index, itemsLength, setIndex]);

  const prev = useCallback(() => {
    setIndex((index - 1 + itemsLength) % itemsLength);
  }, [index, itemsLength, setIndex]);

  const setRandom = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * itemsLength);
    setIndex(randomIndex);
  }, [itemsLength, setIndex]);

  // Update localStorage when index changes (redundant but ensures consistency)
  useEffect(() => {
    try {
      localStorage.setItem(storageKeyFull, index.toString());
    } catch (error) {
      console.warn('Failed to update carousel state in localStorage:', error);
    }
  }, [index, storageKeyFull]);

  return {
    index,
    next,
    prev,
    setRandom,
    setIndex
  };
}
