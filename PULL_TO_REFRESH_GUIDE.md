# Pull-to-Refresh Implementation Guide

## Overview
Pull-to-refresh functionality has been added to your mobile app, optimized for Ghana's mobile-first users with limited internet connectivity.

## Files Created/Modified

### 1. **hooks/useRefreshable.ts** (NEW)
Custom React hook that handles touch gestures for pull-to-refresh:
- Touch tracking with resistance for natural feel
- Configurable threshold (default 80px)
- Returns `containerRef`, `isRefreshing`, `pullDistance`, and `pullProgress`

### 2. **components/TimeClock.tsx** (UPDATED)
Added pull-to-refresh to refresh:
- Time punch data
- Adjustment requests

### 3. **components/ManagerDashboard.tsx** (UPDATED)
Added pull-to-refresh to refresh:
- Employee count
- Pending approvals
- Monthly payout stats

### 4. **components/LeaveManagement.tsx** (UPDATED)
Added pull-to-refresh to refresh:
- Leave requests
- Leave balances

## How to Use in Other Components

```tsx
import { useRefreshable } from '../hooks/useRefreshable';

const YourComponent = () => {
  // Define refresh function
  const handleRefresh = async () => {
    // Your data fetching logic here
    await fetchYourData();
  };

  // Initialize hook
  const { containerRef, isRefreshing, pullDistance, pullProgress } = useRefreshable(handleRefresh);

  return (
    <div ref={containerRef} className="h-full overflow-auto">
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div 
          className="flex items-center justify-center transition-all duration-200 bg-gradient-to-b from-primary-light to-transparent"
          style={{ 
            height: isRefreshing ? '60px' : `${pullDistance}px`,
            opacity: Math.min(pullProgress / 100, 1)
          }}
        >
          <div className="flex flex-col items-center text-primary">
            {isRefreshing ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <p className="text-sm mt-2 font-medium">Refreshing...</p>
              </>
            ) : (
              <>
                <div className={`transition-transform ${pullProgress >= 100 ? 'rotate-180' : ''}`}>
                  ↓
                </div>
                <p className="text-sm mt-1 font-medium">
                  {pullProgress >= 100 ? 'Release to refresh' : 'Pull to refresh'}
                </p>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Your content here */}
      <div className="space-y-4">
        {/* ... */}
      </div>
    </div>
  );
};
```

## Customization Options

```tsx
const { containerRef, isRefreshing, pullDistance, pullProgress } = useRefreshable(
  handleRefresh,
  {
    threshold: 100,        // Pull distance to trigger (default: 80px)
    resistance: 2,         // Pull resistance multiplier (default: 2.5)
    maxPullDistance: 150   // Maximum pull distance (default: 120px)
  }
);
```

## Features

✅ **Touch-based** - Works on mobile devices via touch events  
✅ **Resistance** - Natural pull feel with diminishing returns  
✅ **Visual feedback** - Shows arrow and "Pull to refresh" / "Release to refresh"  
✅ **Loading state** - Spinner animation while refreshing  
✅ **Smooth animations** - Transition effects for better UX  
✅ **Offline-friendly** - Works with your existing offline storage  
✅ **Prevents overlap** - Only allows one refresh at a time  

## Ghana Mobile Optimization

This implementation is specifically designed for:
- **Low bandwidth** - Only refreshes when user explicitly pulls
- **Touch-first** - Optimized for mobile touch interactions
- **Visual clarity** - Clear indicators for slow connections
- **Offline support** - Works with your existing offline storage system

## Testing

Test on mobile device or mobile emulator:
1. Navigate to TimeClock, Dashboard, or Leave Management
2. Pull down from top of the screen
3. Release when you see "Release to refresh"
4. Data should reload with spinner animation

## Browser Compatibility

- ✅ Mobile Safari (iOS)
- ✅ Chrome Mobile (Android)
- ✅ Capacitor WebView
- ⚠️ Desktop browsers (works but touch events only)
