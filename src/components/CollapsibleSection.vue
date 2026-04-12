<template>
  <div class="border dark:border-slate-700 rounded-md overflow-hidden bg-white dark:bg-slate-800/30 shadow-sm dark:shadow-none" tabindex="0">
    <button @click="toggle"
            class="flex justify-between items-center w-full p-3 text-left font-semibold text-md bg-gray-50 dark:bg-slate-800/60 hover:bg-gray-100 dark:hover:bg-slate-700/60 text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700 focus:ring-inset"
            :class="headerClass"
            :aria-expanded="isOpen.toString()"
            :aria-controls="`collapsible-content-${uid}`">
      <span>{{ title }}</span>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 transition-transform duration-300 transform" :class="{ 'rotate-180': isOpen }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    <transition name="collapse">
        <div v-show="isOpen" :id="`collapsible-content-${uid}`" class="p-3 border-t border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-sm">
        <slot></slot> <!-- Content goes here -->
        </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  startOpen: {
    type: Boolean,
    default: false
  },
  headerClass: {
    type: String,
    default: ''
  }
})

const isOpen = ref(props.startOpen)
// Generate a simple unique ID for aria-controls
const uid = Math.random().toString(36).substring(2, 9);

function toggle() {
  isOpen.value = !isOpen.value
}
</script>

<style scoped>
@reference "../assets/main.css";
/* Using global transition styles from main.css */
/* Add a focus style for when the whole section is focused for pasting */
div[tabindex="0"]:focus-within {
    @apply ring-2 ring-blue-400 ring-offset-1;
}
</style>