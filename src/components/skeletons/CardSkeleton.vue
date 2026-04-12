<template>
  <div class="w-full h-full bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col justify-between animate-pulse">
    <!-- Top Section (Source Language Placeholder) -->
    <div class="flex flex-col items-center space-y-2 pt-2">
      <div class="h-6 bg-gray-200 rounded w-1/3"></div>
      <div class="h-3 bg-gray-100 rounded w-1/4"></div>
    </div>

    <!-- Divider -->
    <div class="w-2/3 h-px bg-gray-100 mx-auto my-2"></div>

    <!-- Bottom Section (Target Language Placeholder) -->
    <div class="flex flex-col items-center space-y-2 pb-2">
      <div class="h-5 bg-gray-200 rounded w-1/2"></div>
      <div class="h-3 bg-gray-100 rounded w-1/5"></div>
    </div>

    <!-- Bottom Icons Placeholder -->
    <div class="absolute bottom-2 left-2 flex gap-2">
        <div class="w-6 h-6 bg-gray-100 rounded-full"></div>
        <div class="w-6 h-6 bg-gray-100 rounded-full"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Skeleton component - purely presentational
</script>