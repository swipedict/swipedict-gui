<template>
  <div class="card-shell-overlays-container pointer-events-none"> <!-- Make container non-interactive by default -->
    <!-- Top Right Icons Container -->
    <div v-if="!showActionButtons" class="absolute top-1.5 right-1.5 z-20 flex flex-col items-center gap-2 pointer-events-auto">
      <!-- "More Details" Icon -->
      <div
        v-if="showDetailsIcon"
        class="p-1.5 rounded-full text-gray-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition-all duration-150 cursor-pointer"
        :title="$t('cardOverlays.showDetails')"
        @click.stop.prevent="handleBookIconClick"
        @mousedown.stop @touchstart.stop
        role="button"
        :aria-label="$t('cardOverlays.showDetails')"
      >
        <BookOpenIcon class="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
    </div>

    <!-- Bottom Left Icons when no action buttons -->
    <div v-if="!showActionButtons" class="absolute bottom-1.5 left-1.5 flex items-center gap-1.5 z-20 pointer-events-auto">
        <!-- Drawing Icon -->
        <div
            v-if="hasUserDrawing"
            class="p-1.5 rounded-full text-gray-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-purple-500 transition-all duration-150 cursor-pointer"
            :title="$t('cardOverlays.showDrawing')"
            @click.stop.prevent="handlePencilIconClick"
            @mousedown.stop @touchstart.stop
            role="button"
            :aria-label="$t('cardOverlays.showDrawing')"
        >
            <PencilSquareIcon class="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <!-- Image Icon -->
        <div
            v-if="hasUserImage"
            class="p-1.5 rounded-full text-gray-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-cyan-500 transition-all duration-150 cursor-pointer"
            :title="$t('cardOverlays.showImage')"
            @click.stop.prevent="handleImageIconClick"
            @mousedown.stop @touchstart.stop
            role="button"
            :aria-label="$t('cardOverlays.showImage')"
        >
            <PhotoIcon class="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
    </div>
    
    <!-- Icons that appear when action buttons ARE shown -->
    <div v-if="showActionButtons" class="absolute top-1.5 right-1.5 z-20 flex flex-col items-center gap-2 pointer-events-auto">
        <div v-if="showDetailsIcon" class="p-1.5 rounded-full text-gray-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all duration-150 cursor-pointer" :title="$t('cardOverlays.showDetails')" @click.stop.prevent="handleBookIconClick" @mousedown.stop @touchstart.stop role="button" :aria-label="$t('cardOverlays.showDetails')">
            <BookOpenIcon class="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div v-if="hasUserDrawing" class="p-1.5 rounded-full text-gray-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-all duration-150 cursor-pointer" :title="$t('cardOverlays.showDrawing')" @click.stop.prevent="handlePencilIconClick" @mousedown.stop @touchstart.stop role="button" :aria-label="$t('cardOverlays.showDrawing')">
            <PencilSquareIcon class="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div v-if="hasUserImage" class="p-1.5 rounded-full text-gray-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-all duration-150 cursor-pointer" :title="$t('cardOverlays.showImage')" @click.stop.prevent="handleImageIconClick" @mousedown.stop @touchstart.stop role="button" :aria-label="$t('cardOverlays.showImage')">
            <PhotoIcon class="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
    </div>


    <!-- Ignore/Keep Buttons -->
    <button
      v-if="showActionButtons"
      @click.stop.prevent="handleIgnoreClick"
      @mousedown.stop @touchstart.stop
      :title="$t('cardOverlays.ignoreWord')"
      :aria-label="$t('cardOverlays.ignoreWord')"
      class="absolute bottom-1.5 left-1.5 p-1.5 rounded-full text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-white/10 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-700 dark:hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-400 transition-all duration-150 cursor-pointer z-20 pointer-events-auto"
    >
      <XCircleIcon class="w-6 h-6" />
    </button>
    
    <button
      v-if="showActionButtons"
      @click.stop.prevent="handleKeepClick"
      @mousedown.stop @touchstart.stop
      :title="$t('cardOverlays.keepWord')"
      :aria-label="$t('cardOverlays.keepWord')"
      class="absolute bottom-1.5 right-1.5 p-1.5 rounded-full text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-white/10 hover:bg-green-100 dark:hover:bg-green-900/50 hover:text-green-700 dark:hover:text-green-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-400 transition-all duration-150 cursor-pointer z-20 pointer-events-auto"
    >
      <CheckCircleIcon class="w-6 h-6" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ComputedRef } from 'vue';
import { BookOpenIcon, PencilSquareIcon, PhotoIcon, XCircleIcon, CheckCircleIcon } from '@heroicons/vue/24/solid';
import type { WordEntry } from '@/types'; 
import { WordItemInjectionKey, IsInSrsInjectionKey } from '@/types/interactiveCard';

const { showDetailsIcon = true, hasUserDrawing = false, hasUserImage = false, showActionButtons = false } = defineProps<{
  showDetailsIcon?: boolean;
  hasUserDrawing?: boolean;
  hasUserImage?: boolean;
  showActionButtons?: boolean;
}>();

const { t } = useI18n();

const wordItem = inject<ComputedRef<WordEntry>>(WordItemInjectionKey);
const isInSrs = inject<ComputedRef<boolean>>(IsInSrsInjectionKey);

if (!wordItem || isInSrs === undefined) {
    throw new Error("CardShellOverlays must be a descendant of a ManagedWordCard");
}

const emit = defineEmits<{
  (e: 'overlay-action', payload: { type: string; details?: any }): void;
}>();

function handleBookIconClick() { emit('overlay-action', { type: 'show-details' }); }
function handlePencilIconClick() { emit('overlay-action', { type: 'show-drawing-hint' }); }
function handleImageIconClick() { emit('overlay-action', { type: 'show-image-hint' }); }
function handleIgnoreClick() { emit('overlay-action', { type: 'mark-ignore' }); }
function handleKeepClick() { emit('overlay-action', { type: 'mark-keep' }); }
</script>

<style scoped>
.card-shell-overlays-container {
  position: absolute; 
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 15; 
}
</style>