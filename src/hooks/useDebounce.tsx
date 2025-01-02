import { useCallback, useRef, useEffect } from 'react';

type DebouncedFunction = () => void;

export const useDebouncedSave = (delay: number = 1000): ((fn: DebouncedFunction) => void) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  return useCallback((fn: DebouncedFunction) => {
    try {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(fn, delay);
    } catch (error) {
      console.error('Debounce error:', error);
      timeoutRef.current = null;
    }
  }, [delay]);
};