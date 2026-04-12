<template>
    <div class="border border-gray-300 rounded bg-gray-50 shadow-inner relative overflow-hidden">
       <div class="relative">
           <canvas
             ref="canvasEl"
             class="w-full h-48 md:h-64 block transition-opacity duration-150"             :class="{
                'touch-not-allowed': isTouchDisabled && isTouchDeviceActive && isEditingEnabled,
                'cursor-crosshair': isEditingEnabled,
                'cursor-default opacity-60': !isEditingEnabled
             }"
             @pointerdown="handlePointerDown"
             @pointermove="handlePointerMove"
             @pointerup="handlePointerUp"
             @pointercancel="handlePointerUp"
             @lostpointercapture="handlePointerUp"
             :style="{ 'touch-action': isEditingEnabled ? 'none' : 'auto' }"
           >
           </canvas>
       </div>
      <div class="p-2 border-t bg-gray-100 flex flex-wrap gap-x-4 gap-y-2 items-center justify-between text-sm min-h-[44px]">
         <div class="flex gap-2 items-center">
             <button
                v-if="!isEditingEnabled"
                @click="enableEditing"
                class="px-3 py-1 bg-blue-500 text-white rounded shadow hover:bg-blue-600 transition text-xs font-semibold flex items-center gap-1"
             >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                  <path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" />
                </svg>
                {{ $t('handwritingCanvas.activate') }}
             </button>
             <button @click="toggleTouchDisabled"
                     :class="[
                        'px-3 py-1 rounded transition-colors duration-150 flex items-center gap-1',
                        isTouchDisabled ? 'bg-blue-200 text-blue-800 ring-1 ring-blue-400' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                     ]"
                     aria-label="Toggle Touch Input"
                     :title="isTouchDisabled ? $t('handwritingCanvas.touchEnabledTooltip') : $t('handwritingCanvas.touchDisabledTooltip')">
                 <svg v-if="isTouchDisabled" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"> <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /><path fill-rule="evenodd" d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm10.293-4.293a1 1 0 00-1.414 0l-9 9a1 1 0 000 1.414l9 9a1 1 0 001.414-1.414L3.414 11H16a1 1 0 100-2H3.414l8.879-8.879a1 1 0 000-1.414z" clip-rule="evenodd" /> </svg>
                 <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"> <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /> </svg>
                <span class="sr-only">{{ isTouchDisabled ? 'Touch Disabled' : 'Touch Enabled' }}</span>
            </button>
             <span
               v-if="isEditingEnabled && isTouchDisabled && isTouchDeviceActive"
               class="text-gray-600 text-xs italic font-medium flex items-center"
             >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                {{ $t('handwritingCanvas.stylusMouseOnly') }}
             </span>
         </div>
         <div v-if="isEditingEnabled" class="flex flex-wrap gap-x-4 gap-y-2 items-center">
             <div class="flex gap-1 items-center">
                 <span class="mr-1 font-medium text-xs">{{ $t('handwritingCanvas.color') }}</span>
                 <button
                    v-for="c in availableColors"
                    :key="c"
                    class="w-5 h-5 rounded-full border-2 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 transition-all"
                    :style="{ backgroundColor: c, borderColor: selectedTool === 'pencil' && color === c ? '#3B82F6' : '#D1D5DB' }"
                    :aria-label="`Select ${c} color`"
                    @click="setColor(c)"
                    >
                 </button>
             </div>
             <div class="flex gap-2">
                  <button @click="toggleEraser"
                          :class="[
                              'px-3 py-1 rounded transition-colors duration-150 flex items-center gap-1',
                              selectedTool === 'eraser' ? 'bg-red-500 text-white ring-2 ring-red-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                          ]"
                          aria-label="Toggle Eraser"
                          :title="$t('handwritingCanvas.eraser')"
                          >
                     <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5.338 3.019a4.5 4.5 0 015.145-1.043 4.49 4.49 0 013.06 3.06 4.5 4.5 0 01-1.043 5.145m-2.829-1.427l1.427 2.829a1.5 1.5 0 01-2.12 2.12l-2.83-1.426a1.5 1.5 0 01-2.122-2.121l1.427-2.83c.22-.438.514-.824.857-1.167l.008-.008a4.487 4.487 0 00-.23-.106 4.503 4.503 0 01-4.25-2.286 4.5 4.5 0 014.25-6.714 4.5 4.5 0 014.25 2.286c0 .437-.066.867-.19 1.273l.007.007a4.486 4.486 0 00-.002 3.94zm-.78 4.041a1.5 1.5 0 10-2.122-2.121 1.5 1.5 0 002.122 2.121zM6.857 9.809a.75.75 0 01.429-.429L10.5 8.121a.75.75 0 011.06 1.06l-1.258 3.221c.206.13.398.278.578.44l3.672-1.43a.75.75 0 11.665 1.7l-3.672 1.43c.162.18.314.372.44.578l3.221-1.258a.75.75 0 011.061 1.06l-1.257 3.22c-.13.206-.278.399-.44.578l1.43 3.672a.75.75 0 11-1.7 0l-1.43-3.672c-.18.162-.372.314-.578.44l1.258 3.221a.75.75 0 01-1.06 1.06l-3.22-1.257a.75.75 0 01-.43-.43l-3.22-1.258a.75.75 0 010-1.06l3.22-1.258zM12 10.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/></svg>
                     <span class="sr-only">{{ $t('handwritingCanvas.eraser') }}</span>
                  </button>
                  <button @click="clearCanvas" :title="$t('handwritingCanvas.clearCanvas')" class="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors duration-150" :aria-label="$t('handwritingCanvas.clearCanvas')" >
                       <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline-block" viewBox="0 0 20 20" fill="currentColor"> <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /> </svg>
                      <span class="sr-only">Clear</span>
                  </button>
             </div>
        </div>
         <div v-if="!isEditingEnabled" class="flex-grow"></div>
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Ref } from 'vue';
import type { HandwritingCanvasInstance } from '@/types';

const props = defineProps({
    initialDrawingDataUrl: {
        type: String,
        default: null
    }
});

const { t } = useI18n();

const isEditingEnabled = ref(false); 
const isTouchDisabled = ref(false);
const canvasEl: Ref<HTMLCanvasElement | null> = ref(null);
const ctx: Ref<CanvasRenderingContext2D | null> = ref(null);
const isDrawing = ref(false);
const allowedPointerType = ref<'pen' | 'mouse' | 'touch' | null>(null);
const color = ref('#000000');
const lineWidth = ref(3);
const eraserWidth = ref(20);
const selectedTool = ref<'pencil' | 'eraser'>('pencil');
const capturedPointerId = ref<number | null>(null);

const availableColors: string[] = ['#000000', '#FF0000', '#0000FF', '#008000', '#FFA500'];

let lastX = 0;
let lastY = 0;
let resizeObserver: ResizeObserver | null = null;
let hasUnsavedChanges = ref(false); // Track if drawing has occurred since last load/clear

const isTouchDeviceActive = computed(() => {
    if (typeof window !== 'undefined') {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }
    return false;
});

function enableEditing() {
    isEditingEnabled.value = true;
    if (canvasEl.value) {
        canvasEl.value.style.touchAction = 'none';
    }
}

function initializeCanvasContext(): CanvasRenderingContext2D | null {
    if (!canvasEl.value) return null;
    const context = canvasEl.value.getContext('2d', { willReadFrequently: true });
    if (!context) { console.error("Could not get 2D Context"); return null; }
    ctx.value = context;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    updateContextStyle(context);
    return context;
}

function updateContextStyle(context: CanvasRenderingContext2D) {
    context.lineWidth = selectedTool.value === 'eraser' ? eraserWidth.value : lineWidth.value;
    context.strokeStyle = color.value;
    context.globalCompositeOperation = selectedTool.value === 'eraser' ? 'destination-out' : 'source-over';
}

function resizeCanvas() {
    const context = ctx.value;
    if (!context || !canvasEl.value) return;
    
    // *** MODIFICATION START: Check canvas dimensions before getImageData ***
    if (canvasEl.value.width === 0 || canvasEl.value.height === 0) {
        // Canvas has no dimensions, likely not visible or styled to be 0x0.
        // Attempting getImageData would error. We can set dimensions here if needed.
        // For now, we'll just prevent the error.
        // console.warn("HandwritingCanvas: resizeCanvas called on a 0x0 canvas. Skipping getImageData.");
    }
    // *** MODIFICATION END ***

    let imageData: ImageData | null = null;
    // *** MODIFICATION START: Only try getImageData if dimensions are valid ***
    if (canvasEl.value.width > 0 && canvasEl.value.height > 0) {
        try { 
            imageData = context.getImageData(0, 0, canvasEl.value.width, canvasEl.value.height); 
        }
        catch (e) { 
            console.warn("HandwritingCanvas: Still could not get ImageData before resize, even with size check:", e); 
            imageData = null; 
        }
    }
    // *** MODIFICATION END ***


    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvasEl.value.offsetWidth;
    const displayHeight = canvasEl.value.offsetHeight;

    if (canvasEl.value.width !== displayWidth * dpr || canvasEl.value.height !== displayHeight * dpr) {
        canvasEl.value.width = displayWidth * dpr;
        canvasEl.value.height = displayHeight * dpr;
        context.scale(dpr, dpr); 
        updateContextStyle(context); 
        if (imageData && hasUnsavedChanges.value) { 
             context.putImageData(imageData, 0, 0); 
        } else if (props.initialDrawingDataUrl && !hasUnsavedChanges.value) {
            _loadDataUrlOntoCanvas(props.initialDrawingDataUrl, context, canvasEl.value);
        } else {
            // Canvas remains clear if no initial data or it was cleared and no new changes
        }
    }
}


function getCoordinates(event: PointerEvent): { x: number, y: number } {
    if (!canvasEl.value) return { x: 0, y: 0 };
    const rect = canvasEl.value.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function handlePointerDown(event: PointerEvent) {
  if (!isEditingEnabled.value) return;
  event.stopPropagation(); 

  if (!event.isPrimary || event.button !== 0 || !canvasEl.value) return;
  if (isTouchDisabled.value && event.pointerType === 'touch') return;
  const context = ctx.value; if (!context) return;

  allowedPointerType.value = event.pointerType as ('pen' | 'mouse' | 'touch');
  canvasEl.value.setPointerCapture(event.pointerId);
  capturedPointerId.value = event.pointerId;
  isDrawing.value = true;
  const { x, y } = getCoordinates(event);
  [lastX, lastY] = [x, y];
  context.beginPath(); 
  context.arc(x, y, context.lineWidth / 2, 0, Math.PI * 2); 
  if (selectedTool.value === 'pencil') {
    context.fillStyle = context.strokeStyle; 
    context.fill();
  }
  context.beginPath(); 
  context.moveTo(x,y); 
  hasUnsavedChanges.value = true; // Mark changes
}

function handlePointerMove(event: PointerEvent) {
  if (!isEditingEnabled.value || !isDrawing.value || event.pointerId !== capturedPointerId.value || !canvasEl.value ) return;
  event.stopPropagation(); 

  if (isTouchDisabled.value && event.pointerType === 'touch') return;
  const context = ctx.value; if (!context) return;
  updateContextStyle(context); 
  const { x, y } = getCoordinates(event);
  context.lineTo(x, y);
  context.stroke();
  [lastX, lastY] = [x, y]; 
  hasUnsavedChanges.value = true; // Mark changes
}

function handlePointerUp(event: PointerEvent) {
   if (event.pointerId !== capturedPointerId.value || !canvasEl.value) return;

   if (isDrawing.value) { 
       event.stopPropagation();
   }

   if (canvasEl.value.hasPointerCapture(event.pointerId)) {
       try { canvasEl.value.releasePointerCapture(event.pointerId); } catch(e) { /* ignore error */ }
   }
   capturedPointerId.value = null;

   if (!isDrawing.value) return; 
   isDrawing.value = false;
   allowedPointerType.value = null;
}

function setColor(newColor: string) { setColorInternal(newColor); }
function clearCanvas() { clearCanvasInternal(); }
function toggleEraser() {
    selectedTool.value = selectedTool.value === 'eraser' ? 'pencil' : 'eraser';
    if (ctx.value) updateContextStyle(ctx.value);
}
function toggleTouchDisabled() { isTouchDisabled.value = !isTouchDisabled.value; }


function setColorInternal(newColor: string) {
    color.value = newColor;
    selectedTool.value = 'pencil';
    if (ctx.value) updateContextStyle(ctx.value);
}

function _clearCanvasContext(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    const currentTransform = context.getTransform();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(currentTransform);
}

function clearCanvasInternal() {
    const context = ctx.value;
    if (!context || !canvasEl.value) return;
    _clearCanvasContext(context, canvasEl.value);
    hasUnsavedChanges.value = false; // Reset unsaved changes flag
    isEditingEnabled.value = false; 
    if (canvasEl.value) { canvasEl.value.style.touchAction = 'auto'; } 
}

function _loadDataUrlOntoCanvas(dataUrl: string, context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    const img = new Image();
    img.onload = () => {
        _clearCanvasContext(context, canvas); 
        const dpr = window.devicePixelRatio || 1;
        context.drawImage(img, 0, 0, canvas.width / dpr, canvas.height / dpr);
        hasUnsavedChanges.value = false; 
    };
    img.onerror = (err) => {
        console.error("HandwritingCanvas: Failed to load drawing image for canvas:", err);
        _clearCanvasContext(context, canvas); 
        hasUnsavedChanges.value = false;
    };
    img.src = dataUrl;
}

function loadInitialDrawing() {
     nextTick(() => {
         isEditingEnabled.value = false;
         if (canvasEl.value) { canvasEl.value.style.touchAction = 'auto'; }

         const context = ctx.value;
         const canvas = canvasEl.value;

         if (props.initialDrawingDataUrl && canvas && context) {
            _loadDataUrlOntoCanvas(props.initialDrawingDataUrl, context, canvas);
        } else if (context && canvas) { 
             _clearCanvasContext(context, canvas);
             hasUnsavedChanges.value = false;
        }
     });
}

function exportDrawing(): string {
    if (canvasEl.value && ctx.value) {
        if (!hasUnsavedChanges.value && !props.initialDrawingDataUrl) {
            if (canvasEl.value.width > 0 && canvasEl.value.height > 0) { // Check dimensions before getImageData
                try {
                     const pixelBuffer = new Uint32Array(ctx.value.getImageData(0, 0, canvasEl.value.width, canvasEl.value.height).data.buffer);
                     if (!pixelBuffer.some(pixel => pixel !== 0)) {
                         return ""; 
                     }
                } catch (e) {
                    console.warn("HandwritingCanvas: Could not check if canvas is blank for export:", e);
                }
            } else { // Canvas is 0x0, so it's blank
                return "";
            }
        }
        return canvasEl.value.toDataURL('image/png', 0.9);
    }
    return '';
}

onMounted(() => {
    nextTick(() => {
        if (canvasEl.value) {
            const context = initializeCanvasContext();
            if(context) {
                resizeCanvas(); 
                resizeObserver = new ResizeObserver(resizeCanvas);
                resizeObserver.observe(canvasEl.value);
                loadInitialDrawing(); 
                canvasEl.value.style.touchAction = 'auto'; 
            } else { console.error("HandwritingCanvas: Failed to get canvas context on mount."); }
        } else { console.error("HandwritingCanvas: Canvas element not found on mount."); }
    });
});

onUnmounted(() => {
    if (resizeObserver && canvasEl.value) { resizeObserver.unobserve(canvasEl.value); }
    if (resizeObserver) { resizeObserver.disconnect(); }
     if (capturedPointerId.value !== null && canvasEl.value?.hasPointerCapture(capturedPointerId.value)) {
         try { canvasEl.value.releasePointerCapture(capturedPointerId.value); } catch(e){}
     }
});

watch(() => props.initialDrawingDataUrl, (newDataUrl, oldDataUrl) => {
    if (newDataUrl !== oldDataUrl) {
        loadInitialDrawing();
    }
});


defineExpose<HandwritingCanvasInstance>({
  exportDrawing,
  clearCanvas: clearCanvasInternal
});
</script>

<style scoped>
.touch-not-allowed {
    cursor: not-allowed;
}
button {
    transition: background-color 0.2s ease;
}
</style>