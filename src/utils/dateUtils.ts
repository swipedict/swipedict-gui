/**
 * Formats a Unix timestamp (in milliseconds) into a 'DD.MM.YYYY HH:MM' string.
 * @param timestamp The Unix timestamp in milliseconds.
 * @returns The formatted date-time string, or an empty string if the input is invalid.
 */
export function formatUnixTimestamp(timestamp: number | null | undefined): string {
    if (!timestamp || typeof timestamp !== 'number' || timestamp <= 0) {
        return '';
    }

    const date = new Date(timestamp);

    const pad = (num: number) => num.toString().padStart(2, '0');

    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1); // Month is 0-indexed
    const year = date.getFullYear();
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${day}.${month}.${year} ${hours}:${minutes}`;
}