import { type IAiImageService } from './types';
import { OpenAiService } from './OpenAiService';

// To add another provider, import its service and add it to this map.
const services: Record<string, IAiImageService> = {
  openai: new OpenAiService(),
  // stability: new StabilityAiService(),
};

/**
 * Returns an instance of an AI image service based on the provider name.
 * @param providerName The unique identifier for the provider (e.g., 'openai').
 * @returns An object that implements IAiImageService, or null if not found.
 */
export function getAiImageService(providerName: string): IAiImageService | null {
  return services[providerName] || null;
}

/**
 * Returns a list of all available AI image service providers.
 * @returns An array of available service providers.
 */
export function getAvailableProviders(): IAiImageService[] {
    return Object.values(services);
}