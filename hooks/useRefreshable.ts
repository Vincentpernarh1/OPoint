import { useState, useRef, useEffect, useCallback } from 'react';

interface UseRefreshableOptions {
  threshold?: number;
  resistance?: number;
  maxPullDistance?: number;
}

interface UseRefreshableReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isRefreshing: boolean;
  pullDistance: number;
  pullProgress: number;
}

/**
 * Custom hook for pull-to-refresh functionality optimized for mobile
 * Designed for low-bandwidth scenarios common in Ghana
 */
export const useRefreshable = (
  onRefresh: () => Promise<void>,
  options: UseRefreshableOptions = {}
): UseRefreshableReturn => {
  const {
    threshold = 80,
    resistance = 2.5,
    maxPullDistance = 120
  } = options;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const container = containerRef.current;
    if (!container || isRefreshing) return;

    // Only start pull if we're at the top of the scroll
    if (container.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling.current || isRefreshing) return;

    const container = containerRef.current;
    if (!container) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;

    // Only pull down, not up
    if (distance > 0 && container.scrollTop === 0) {
      // Apply resistance to make it feel natural
      const adjustedDistance = distance / resistance;
      setPullDistance(Math.min(adjustedDistance, maxPullDistance));
      
      // Prevent default scroll behavior when pulling
      if (distance > 10) {
        e.preventDefault();
      }
    }
  }, [isRefreshing, resistance, maxPullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;

    isPulling.current = false;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      // Animate back to 0
      setPullDistance(0);
    }
  }, [onRefresh, isRefreshing, pullDistance, threshold]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const pullProgress = Math.min((pullDistance / threshold) * 100, 100);

  return {
    containerRef,
    isRefreshing,
    pullDistance,
    pullProgress
  };
};
