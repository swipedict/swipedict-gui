import { ref } from 'vue';

/**
 * Shared reactive theme state — module-level so all components see the same value.
 * Initialised synchronously from the DOM (which the blocking script in index.html
 * already set up before first paint).
 */
const isDark = ref(
    typeof document !== 'undefined'
        ? document.documentElement.classList.contains('dark')
        : true
);

export function useTheme() {
    function toggleDarkMode() {
        isDark.value = !isDark.value;
        if (isDark.value) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }

    return { isDark, toggleDarkMode };
}
