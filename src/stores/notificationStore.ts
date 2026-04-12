import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { NotificationPayload } from '@/types';

export const useNotificationStore = defineStore('notification', () => {
    const activeNotification = ref<Partial<NotificationPayload>>({});
    const timeoutId = ref<number | null>(null);

    const isVisible = computed(() => !!activeNotification.value.message);
    
    const classes = computed(() => {
        return activeNotification.value.type === 'success' ? 'bg-green-500' : 'bg-red-500';
    });

    function show(payload: NotificationPayload) {
        // Clear existing timeout if a new notification comes in rapidly
        if (timeoutId.value) {
            window.clearTimeout(timeoutId.value);
            timeoutId.value = null;
        }

        activeNotification.value = { 
            message: payload.message, 
            type: payload.type || 'info' 
        };

        const duration = payload.duration ?? 3500;
        
        timeoutId.value = window.setTimeout(() => {
            clear();
        }, duration);
    }

    function clear() {
        activeNotification.value = {};
        if (timeoutId.value) {
            window.clearTimeout(timeoutId.value);
            timeoutId.value = null;
        }
    }

    return {
        activeNotification,
        isVisible,
        classes,
        show,
        clear
    };
});