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
    if (!container) return;

    // Only start pull if we're at the top of the scroll
    if (container.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling.current) return;

    const container = containerRef.current;
    if (!container) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;

    // Only pull down when at the top, otherwise allow normal scrolling
    if (distance > 0 && container.scrollTop === 0) {
      // Apply resistance to make it feel natural
      const adjustedDistance = distance / resistance;
      const newPullDistance = Math.min(adjustedDistance, maxPullDistance);
      setPullDistance(newPullDistance);
      
      // Prevent default scroll behavior only when actually pulling to refresh
      if (distance > 10) {
        e.preventDefault();
      }
    } else if (distance < 0 || container.scrollTop > 0) {
      // User is scrolling normally or scrolling up, reset pull state
      isPulling.current = false;
      setPullDistance(0);
    }
  }, [resistance, maxPullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;

    isPulling.current = false;

    // Use a ref to check if currently refreshing to avoid stale closure
    const shouldRefresh = pullDistance >= threshold;

    if (shouldRefresh) {
      setIsRefreshing(true);
      setPullDistance(0);
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    } else {
      // Animate back to 0
      setPullDistance(0);
    }
  }, [onRefresh, pullDistance, threshold]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use these wrapper functions to ensure we always have access to the latest state
    const touchStartHandler = (e: TouchEvent) => {
      handleTouchStart(e);
    };

    const touchMoveHandler = (e: TouchEvent) => {
      handleTouchMove(e);
    };

    const touchEndHandler = () => {
      handleTouchEnd();
    };

    container.addEventListener('touchstart', touchStartHandler, { passive: true });
    container.addEventListener('touchmove', touchMoveHandler, { passive: false });
    container.addEventListener('touchend', touchEndHandler, { passive: true });
    // Also handle touchcancel to properly reset state
    container.addEventListener('touchcancel', touchEndHandler, { passive: true });

    return () => {
      // Ensure we reset the pulling state on cleanup
      isPulling.current = false;
      setPullDistance(0);
      
      container.removeEventListener('touchstart', touchStartHandler);
      container.removeEventListener('touchmove', touchMoveHandler);
      container.removeEventListener('touchend', touchEndHandler);
      container.removeEventListener('touchcancel', touchEndHandler);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Reset pull state when page visibility changes (prevents stuck scrolling)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isPulling.current = false;
        setPullDistance(0);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const pullProgress = Math.min((pullDistance / threshold) * 100, 100);

  return {
    containerRef,
    isRefreshing,
    pullDistance,
    pullProgress
  };
};
