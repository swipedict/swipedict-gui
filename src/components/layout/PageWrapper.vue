<template>
  <!--
    PageWrapper — single source of truth for all view containers.

    Props:
      size      – max-width of the content column (default 'lg')
                  'sm'  → max-w-sm   (384px)
                  'md'  → max-w-md   (448px)
                  'lg'  → max-w-lg   (512px)  ← default for most views
                  'xl'  → max-w-xl   (576px)
                  '2xl' → max-w-2xl  (672px)
                  '3xl' → max-w-3xl  (768px)  ← stats / learning-summary
                  'full'→ no max-width (word list, SRS review)
      noPadX    – skip horizontal padding (e.g. when a child has its own sticky header)
      noPadY    – skip vertical padding
      centered  – center the column (default true); pass false for edge-to-edge layouts

    NOTE: All class combinations are expressed as static literals in this template so that
    Tailwind's JIT scanner can detect every class without relying on JS-computed strings.
  -->

  <!-- full / uncentered -------------------------------------------------- -->
  <div v-if="!centered || size === 'full'"
    class="w-full"
    :class="[noPadX ? '' : 'px-3 sm:px-4', noPadY ? '' : 'pt-4 sm:pt-6 pb-6 sm:pb-8']"
  ><slot /></div>

  <!-- sm ------------------------------------------------------------------ -->
  <div v-else-if="size === 'sm'"
    class="w-full sm:max-w-sm sm:mx-auto"
    :class="[noPadX ? '' : 'px-3 sm:px-4', noPadY ? '' : 'pt-4 sm:pt-6 pb-6 sm:pb-8']"
  ><slot /></div>

  <!-- md ------------------------------------------------------------------ -->
  <div v-else-if="size === 'md'"
    class="w-full sm:max-w-md sm:mx-auto"
    :class="[noPadX ? '' : 'px-3 sm:px-4', noPadY ? '' : 'pt-4 sm:pt-6 pb-6 sm:pb-8']"
  ><slot /></div>

  <!-- lg (default) --------------------------------------------------------- -->
  <div v-else-if="size === 'lg'"
    class="w-full sm:max-w-lg sm:mx-auto"
    :class="[noPadX ? '' : 'px-3 sm:px-4', noPadY ? '' : 'pt-4 sm:pt-6 pb-6 sm:pb-8']"
  ><slot /></div>

  <!-- xl ------------------------------------------------------------------ -->
  <div v-else-if="size === 'xl'"
    class="w-full sm:max-w-xl sm:mx-auto"
    :class="[noPadX ? '' : 'px-3 sm:px-4', noPadY ? '' : 'pt-4 sm:pt-6 pb-6 sm:pb-8']"
  ><slot /></div>

  <!-- 2xl ----------------------------------------------------------------- -->
  <div v-else-if="size === '2xl'"
    class="w-full sm:max-w-2xl sm:mx-auto"
    :class="[noPadX ? '' : 'px-3 sm:px-4', noPadY ? '' : 'pt-4 sm:pt-6 pb-6 sm:pb-8']"
  ><slot /></div>

  <!-- 3xl (default for stats views) --------------------------------------- -->
  <div v-else
    class="w-full sm:max-w-3xl sm:mx-auto"
    :class="[noPadX ? '' : 'px-3 sm:px-4', noPadY ? '' : 'pt-4 sm:pt-6 pb-6 sm:pb-8']"
  ><slot /></div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
  noPadX?: boolean;
  noPadY?: boolean;
  centered?: boolean;
}>(), {
  size: 'lg',
  noPadX: false,
  noPadY: false,
  centered: true,
});
</script>
