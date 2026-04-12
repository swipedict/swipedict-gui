<template>
    <div class="flex flex-col h-full bg-gray-100">
        <!-- Header -->
        <header class="flex-shrink-0 bg-white shadow-sm z-10">
            <div class="w-full max-w-5xl mx-auto p-3 flex items-center justify-between gap-2">
                <button @click="goBack" class="text-blue-600 hover:underline flex items-center text-sm p-2 -ml-2 rounded-full hover:bg-blue-50 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Zurück
                </button>
                
                <!-- Title is now just a title, not a link -->
                <div class="flex-grow min-w-0 text-center group">
                    <h1 class="text-base font-semibold text-gray-700 truncate">
                        Suche: <span class="text-blue-700">{{ searchTerm }}</span>
                    </h1>
                </div>

                <!-- Open in new tab icon, now as a separate button -->
                <a :href="searchUrl" target="_blank" rel="noopener noreferrer" class="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 transition-colors" title="In neuem Tab öffnen">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-4.5 0V6.375c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125-1.125h-4.5A1.125 1.125 0 0 1 9 10.5Z" />
                    </svg>
                </a>
            </div>
        </header>

        <!-- IFrame Content Wrapper -->
        <main class="flex-grow w-full iframe-container">
            <!-- The iframe itself -->
            <iframe
                ref="iframeRef"
                :src="searchUrl"
                class="w-full h-full border-none"
                title="Externe Suche"
                sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation"
            >
            </iframe>
            
            <!-- Fallback content for browsers that do not support iframes -->
            <p class="iframe-fallback p-4 text-center">
                Ihr Browser unterstützt keine iframes, oder die Zielseite blockiert die Einbettung.
                <a :href="searchUrl" target="_blank" rel="noopener noreferrer" class="font-bold underline">
                    Bitte klicken Sie hier, um die Suche in einem neuen Tab zu öffnen.
                </a>
            </p>
        </main>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const props = defineProps<{
    searchTerm: string;
}>();

const router = useRouter();
const iframeRef = ref<HTMLIFrameElement | null>(null);

// This ref will store the path of the route we came from.
const previousRouteFullPath = ref('/welcome'); // Default fallback

onMounted(() => {
    // Access the router's history state to find the path of the previous entry.
    // The 'back' property holds the full path of the previous location.
    const historyState = router.options.history.state;
    if (historyState.back) {
        previousRouteFullPath.value = historyState.back as string;
    }
});

const searchUrl = computed(() => {
    // Using Google with the igu=1 parameter to help with iframe embedding.
    return `https://www.google.com/search?igu=1&q=${encodeURIComponent(props.searchTerm)}`;
});

function goBack() {
  // Instead of router.back(), we now explicitly push to the path we captured on mount.
  // This bypasses the iframe's history and navigates the Vue app directly.
  router.push(previousRouteFullPath.value);
}
</script>

<style scoped>
/* Ensure the view takes full height if the parent container is set up correctly */
.h-full {
    height: 100%;
}

.iframe-container {
    display: block;
}

.iframe-container > iframe {
    display: block;
}

.iframe-fallback {
    display: none;
}
</style>