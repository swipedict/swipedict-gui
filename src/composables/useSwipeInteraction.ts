import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import type { Ref, ComputedRef } from 'vue';

interface SwipeOptions {
  threshold?: number;
  maxRotation?: number;
  longPressDelay?: number; // Milliseconds for long press
}
interface SwipeResult {
  isDragging: Ref<boolean>;
  diffX: ComputedRef<number>;
  transformStyle: ComputedRef<string>;
  transitionStyle: ComputedRef<string>;
  handlePointerDown: (event: PointerEvent) => void;
  resetSwipeState: (immediate?: boolean) => void;
}

const CLICK_THRESHOLD_MS = 250; // Max duration for a click
const CLICK_THRESHOLD_PX = 10;  // Max travel distance for a click
const DRAG_INIT_THRESHOLD_PX = 5; // Min travel to consider starting a drag (not yet isDragging=true)
const MIN_SWIPE_DOMINANCE_PX = 7; // Min X travel to confirm horizontal swipe over vertical scroll
const DEFAULT_LONG_PRESS_DELAY = 700; // Default long press duration
const WATCHDOG_TIMEOUT_MS = 3000; 

export function useSwipeInteraction(
  elementRef: Ref<HTMLElement | null>,
  options: SwipeOptions = {},
  onSwipeLeft: (event: PointerEvent, diffX: number) => void,
  onSwipeRight: (event: PointerEvent, diffX: number) => void,
  onClick: (event: PointerEvent) => void,
  onLongPress?: (event: PointerEvent) => void
): SwipeResult {
  const { threshold = 80, maxRotation = 10, longPressDelay = DEFAULT_LONG_PRESS_DELAY } = options;

  const isPointerDown = ref(false);
  const isDragging = ref(false);
  const startX = ref(0);
  const startY = ref(0);
  const currentX = ref(0);
  const pointerDownTime = ref(0);
  const capturedPointerId = ref<number | null>(null);
  let hasMovedEnoughToDrag = ref(false);
  
  let longPressTimerId: number | null = null;
  let longPressFiredThisInteraction = false;
  let initialPointerDownEvent: PointerEvent | null = null;
  let watchdogTimerId: number | null = null;


  const diffX = computed(() => currentX.value - startX.value);

  const transformStyle = computed(() => {
    if (!isPointerDown.value || (!hasMovedEnoughToDrag.value && !isDragging.value)) {
        return 'translateX(0px) rotate(0deg)';
    }
    const rotation = Math.max(-maxRotation, Math.min(maxRotation, diffX.value / 25));
    return `translateX(${diffX.value}px) rotate(${rotation}deg)`;
  });

  const transitionStyle = computed(() => {
    return (isPointerDown.value || isDragging.value) ? 'none' : 'transform 0.3s ease-out';
  });

  const clearLongPressTimer = () => {
    if (longPressTimerId) {
        clearTimeout(longPressTimerId);
        longPressTimerId = null;
    }
  };

  const clearWatchdogTimer = () => {
    if (watchdogTimerId) {
        clearTimeout(watchdogTimerId);
        watchdogTimerId = null;
    }
  };

  const startWatchdogTimer = () => {
    clearWatchdogTimer();
    watchdogTimerId = window.setTimeout(() => {
        if (isPointerDown.value) { 
            console.warn("SwipeInteraction: Watchdog triggered. Pointer still down after timeout. Forcing reset.");
            resetInteractionState();
        }
    }, WATCHDOG_TIMEOUT_MS);
  };
  
  // --- NEW: Listener for page visibility changes ---
  const handleVisibilityChange = () => {
    if (document.hidden && isPointerDown.value) {
        console.warn("SwipeInteraction: Document became hidden while pointer was down. Resetting interaction state.");
        resetInteractionState();
    }
  };

  const resetInteractionState = () => {
    clearLongPressTimer();
    clearWatchdogTimer();
    // --- NEW: Remove listener on reset ---
    document.removeEventListener('visibilitychange', handleVisibilityChange);

    if (elementRef.value && capturedPointerId.value !== null && elementRef.value.hasPointerCapture(capturedPointerId.value)) {
      try { elementRef.value.releasePointerCapture(capturedPointerId.value); } catch(e) { /* ignore */ }
    }
    if (elementRef.value) {
        elementRef.value.style.cursor = 'grab';
    }

    isPointerDown.value = false;
    isDragging.value = false;
    hasMovedEnoughToDrag.value = false;
    startX.value = 0;
    startY.value = 0;
    currentX.value = 0;
    pointerDownTime.value = 0;
    capturedPointerId.value = null;
    longPressFiredThisInteraction = false;
    initialPointerDownEvent = null;

    window.removeEventListener('pointermove', internalHandlePointerMove);
    window.removeEventListener('pointerup', internalHandlePointerUp);
    window.removeEventListener('pointercancel', internalHandlePointerUp);
    window.removeEventListener('lostpointercapture', internalHandlePointerUp);
  };

  const internalHandlePointerMove = (event: PointerEvent) => {
    if (!isPointerDown.value || event.pointerId !== capturedPointerId.value) return;

    const deltaX = event.clientX - startX.value;
    const deltaY = event.clientY - startY.value;
    currentX.value = event.clientX;

    if (!hasMovedEnoughToDrag.value) {
        if (Math.abs(deltaX) > DRAG_INIT_THRESHOLD_PX || Math.abs(deltaY) > DRAG_INIT_THRESHOLD_PX) {
            hasMovedEnoughToDrag.value = true;
            clearLongPressTimer(); 
        }
    }

    if (hasMovedEnoughToDrag.value && !isDragging.value) {
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > MIN_SWIPE_DOMINANCE_PX) {
            isDragging.value = true;
            if (elementRef.value) elementRef.value.style.cursor = 'grabbing';
        } else if (Math.abs(deltaY) > Math.abs(deltaX)) {
            resetInteractionState(); 
            return;
        }
    }

    if (isDragging.value) {
        event.preventDefault();
    }
    startWatchdogTimer();
  };

  const internalHandlePointerUp = (event: PointerEvent) => {
    if (event.pointerId !== capturedPointerId.value && capturedPointerId.value !== null) return;
    
    clearLongPressTimer(); 
    clearWatchdogTimer();

    const wasDragging = isDragging.value;
    const finalDiffX = diffX.value;
    const timeElapsed = Date.now() - pointerDownTime.value;
    const xTravel = Math.abs(currentX.value - startX.value);
    const yTravel = Math.abs(event.clientY - startY.value);
    
    const originalEvent = initialPointerDownEvent || event; 
    
    const firedLongPress = longPressFiredThisInteraction; 

    resetInteractionState(); 

    if (firedLongPress) {
        return;
    }

    if (wasDragging) {
      if (finalDiffX < -threshold) {
        onSwipeLeft(originalEvent, finalDiffX);
      } else if (finalDiffX > threshold) {
        onSwipeRight(originalEvent, finalDiffX);
      }
    } else {
      if (timeElapsed < CLICK_THRESHOLD_MS && xTravel < CLICK_THRESHOLD_PX && yTravel < CLICK_THRESHOLD_PX) {
        onClick(originalEvent);
      }
    }
  };

  const handlePointerDown = (event: PointerEvent) => {
    if ((event.target as HTMLElement)?.closest('[data-no-swipe="true"]')) {
      return;
    }
    if (event.button !== 0 || !event.isPrimary || !elementRef.value) return;
    if (isPointerDown.value) return; 

    initialPointerDownEvent = event; 
    isPointerDown.value = true;
    hasMovedEnoughToDrag.value = false;
    isDragging.value = false;
    longPressFiredThisInteraction = false; 
    startX.value = event.clientX;
    startY.value = event.clientY;
    currentX.value = event.clientX;
    pointerDownTime.value = Date.now();
    capturedPointerId.value = event.pointerId;

    try {
      elementRef.value.setPointerCapture(event.pointerId);
    } catch (e) {
      console.warn("SwipeInteraction: Failed to set pointer capture:", e);
      resetInteractionState();
      return;
    }
    
    if(elementRef.value) elementRef.value.style.cursor = 'grab';

    if (onLongPress) {
        clearLongPressTimer(); 
        longPressTimerId = window.setTimeout(() => {
            if (isPointerDown.value && !hasMovedEnoughToDrag.value && !isDragging.value && initialPointerDownEvent) {
                onLongPress(initialPointerDownEvent); 
                longPressFiredThisInteraction = true;
                resetInteractionState(); 
            }
        }, longPressDelay);
    }

    startWatchdogTimer();
    // --- NEW: Add visibility listener on interaction start ---
    document.addEventListener('visibilitychange', handleVisibilityChange);

    window.addEventListener('pointermove', internalHandlePointerMove, { passive: false });
    window.addEventListener('pointerup', internalHandlePointerUp, { once: true });
    window.addEventListener('pointercancel', internalHandlePointerUp, { once: true });
    window.addEventListener('lostpointercapture', internalHandlePointerUp, { once: true });
  };

  const resetSwipeState = (immediate = false) => {
    resetInteractionState(); 
    if (immediate && elementRef.value) {
        elementRef.value.style.transition = 'none';
        elementRef.value.style.transform = 'translateX(0px) rotate(0deg)';
        nextTick(() => {
            if (elementRef.value) elementRef.value.style.transition = '';
        });
    }
  };
  
  onUnmounted(() => {
    if(isPointerDown.value) {
        resetInteractionState();
    } else {
        clearLongPressTimer();
        clearWatchdogTimer();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  });

  return {
    isDragging,
    diffX,
    transformStyle,
    transitionStyle,
    handlePointerDown,
    resetSwipeState,
  };
}