<template>
  <span
    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
    :class="colorClasses"
  >
    <svg v-if="icon === 'language'" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1 -ml-0.5" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.165 2.478A18.87 18.87 0 019.578 11H12a1 1 0 110 2h-1a1 1 0 01-1-1v-1.572a17.351 17.351 0 00-3.363 2.164 1.5 1.5 0 01-2.223-.33L4.01 10.93a1.5 1.5 0 01.33-2.223 17.352 17.352 0 002.164-3.363V4a1 1 0 011-1zm6 0a1 1 0 00-1 1v1h3a1 1 0 100-2h-3zM6 13a1 1 0 011-1h1.578a18.87 18.87 0 011.165-2.478 18.87 18.87 0 01-1.165-2.478H7a1 1 0 110-2h1a1 1 0 011 1v1.572a17.351 17.351 0 003.363-2.164 1.5 1.5 0 012.223.33l1.38 2.36a1.5 1.5 0 01-.33 2.223 17.352 17.352 0 00-2.164 3.363V14a1 1 0 01-1 1h-3z" clip-rule="evenodd" />
    </svg>
    <svg v-else-if="icon === 'source'" xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1 -ml-0.5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10.75 10.75a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0v-4.5z" />
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM3 10a7 7 0 1114 0 7 7 0 01-14 0z" clip-rule="evenodd" />
    </svg>
    {{ text }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type TagColor = 'gray' | 'blue';
type TagIcon = 'language' | 'source' | 'none';

const { text, color = 'gray', icon = 'none' } = defineProps<{
  text: string;
  color?: TagColor;
  icon?: TagIcon;
}>();

const colorClasses = computed(() => {
  switch (color) {
    case 'blue':
      return 'bg-blue-100 text-blue-800';
    case 'gray':
    default:
      return 'bg-gray-100 text-gray-700 border border-gray-200';
  }
});
</script>