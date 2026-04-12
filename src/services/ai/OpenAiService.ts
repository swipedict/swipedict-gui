import { type IAiImageService, type AiImageOptions } from './types';

export class OpenAiService implements IAiImageService {
  readonly providerName = 'openai';
  readonly displayName = 'OpenAI';

  async generateImage(apiKey: string, options: AiImageOptions): Promise<string> {
    if (!apiKey) {
        throw new Error("OpenAI API key is missing.");
    }

    const apiURL = 'https://api.openai.com/v1/images/generations';
    const selectedModel = options.model || 'dall-e-2';

    const body: any = {
        prompt: options.prompt,
        model: selectedModel,
        n: 1,
        size: options.size || '1024x1024',
        // --- FIX: Request base64 JSON directly to avoid CORS on the second fetch ---
        response_format: 'b64_json', 
    };

    // Conditionally add 'quality' parameter only for DALL-E 3
    if (selectedModel === 'dall-e-3') {
        body.quality = options.quality || 'standard';
    }

    const response = await fetch(apiURL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
        const errorMsg = data.error?.message || `HTTP Error: ${response.status}`;
        console.error("OpenAI API Error:", data);
        throw new Error(errorMsg);
    }
    
    // --- FIX: Process the b64_json response ---
    const base64Json = data.data[0]?.b64_json;
    if (!base64Json) {
        throw new Error("API response did not contain valid b64_json image data.");
    }

    // Return the complete data URL, ready for use in <img> tags or the cropper
    return `data:image/png;base64,${base64Json}`;
  }
}