/**
 * Minimal cookie helpers for the consent banner — the app's only cookie use.
 * Replaces the unmaintained vue-cookie-next dependency (last released 2021).
 */

export function hasCookie(name: string): boolean {
    return document.cookie.split('; ').some(c => c.startsWith(`${name}=`));
}

export function setCookie(name: string, value: string, maxAgeDays: number): void {
    const maxAge = Math.round(maxAgeDays * 24 * 60 * 60);
    document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`;
}
