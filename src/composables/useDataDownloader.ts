import { ref, computed } from 'vue';

const isDownloading = ref(false);
const progress = ref(0);
const total = ref(0);
const currentAction = ref('');
let activeController: AbortController | null = null;

export function useDataDownloader() {
    
    function startDownload(actionLabel: string, totalItems: number) {
        if (isDownloading.value) {
            console.warn("Download already in progress.");
            return null; // Indicate that a new download cannot start
        }
        isDownloading.value = true;
        progress.value = 0;
        total.value = totalItems;
        currentAction.value = actionLabel;
        activeController = new AbortController();
        return activeController.signal;
    }

    function updateProgress(current: number) {
        progress.value = current;
    }

    function finishDownload() {
        isDownloading.value = false;
        progress.value = 0;
        total.value = 0;
        currentAction.value = '';
        activeController = null;
    }

    function abortDownload() {
        if (activeController) {
            activeController.abort();
            finishDownload();
        }
    }

    return {
        isDownloading: computed(() => isDownloading.value),
        progressPercentage: computed(() => total.value > 0 ? Math.round((progress.value / total.value) * 100) : 0),
        currentAction: computed(() => currentAction.value),
        startDownload,
        updateProgress,
        finishDownload,
        abortDownload,
    };
}