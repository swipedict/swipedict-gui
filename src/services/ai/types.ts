export interface AiImageOptions {
  prompt: string;
  model?: 'dall-e-2' | 'dall-e-3' | string; // Provider-specific models
  size?: '1024x1024' | '1792x1024' | '1024x1792' | '512x512' | '256x256'; // Allowed sizes
  quality?: 'standard' | 'hd';
  n?: number; // Number of images to generate
}

export interface IAiImageService {
  /** A unique, lowercase identifier for the provider (e.g., 'openai') */
  readonly providerName: string;

  /** The user-friendly display name (e.g., 'OpenAI') */
  readonly displayName: string;
  
  /**
   * Generates an image based on the provided options.
   * @param apiKey The user's API key for this service.
   * @param options The generation parameters like prompt and model.
   * @returns A Promise that resolves to a base64 dataUrl of the generated image.
   */
  generateImage(apiKey: string, options: AiImageOptions): Promise<string>;
}