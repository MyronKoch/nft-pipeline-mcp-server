/**
 * AI Image Generation for NFTs
 * Supports multiple truly free image generation APIs
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

export interface ImageGenerationRequest {
  prompt: string;
  style?: 'realistic' | 'artistic' | 'cartoon' | 'fantasy' | 'cyberpunk' | 'minimalist';
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  quality?: 'standard' | 'high' | 'ultra';
  seed?: number;
  model?: string; // Allow specifying model like flux, turbo, etc.
}

export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  localPath?: string;
  prompt: string;
  model: string;
  cost?: number;
  error?: string;
}

export interface ImageGenerationService {
  name: string;
  generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult>;
  isAvailable(): Promise<boolean>;
  getDailyCost(): number;
}

/**
 * Pollinations.ai - Truly free, no API key required
 */
export class PollinationsService implements ImageGenerationService {
  name = 'Pollinations.ai';
  
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    try {
      // Enhance prompt with style
      const enhancedPrompt = this.enhancePrompt(request.prompt, request.style);
      
      // URL encode the prompt
      const encodedPrompt = encodeURIComponent(enhancedPrompt);
      
      // Determine model to use (default to flux for best quality)
      const model = request.model || 'flux';
      
      // Construct dimensions based on aspect ratio
      const dimensions = this.getDimensions(request.aspectRatio);
      
      // Build URL with parameters
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=${model}&width=${dimensions.width}&height=${dimensions.height}&nologo=true&enhance=true`;

      // Pollinations.ai generates images on-the-fly, so URL is immediately valid
      // Skip health check to avoid 405 errors from HEAD requests
      return {
        success: true,
        imageUrl,
        prompt: enhancedPrompt,
        model: `Pollinations.ai (${model})`,
        cost: 0 // Completely free
      };
      
    } catch (error: any) {
      return {
        success: false,
        prompt: request.prompt,
        model: 'Pollinations.ai',
        error: error.message
      };
    }
  }
  
  async isAvailable(): Promise<boolean> {
    // Always available - no API key needed
    return true;
  }
  
  getDailyCost(): number {
    return 0; // Completely free
  }
  
  private enhancePrompt(prompt: string, style?: string): string {
    let enhanced = prompt;
    
    // Add style modifiers
    switch (style) {
      case 'realistic':
        enhanced += ', photorealistic, high detail, professional photography, 8k';
        break;
      case 'artistic':
        enhanced += ', digital art, artistic, creative, beautiful composition, trending on artstation';
        break;
      case 'cartoon':
        enhanced += ', cartoon style, animated, colorful, fun, pixar style';
        break;
      case 'fantasy':
        enhanced += ', fantasy art, magical, ethereal, mystical, epic';
        break;
      case 'cyberpunk':
        enhanced += ', cyberpunk, neon lights, futuristic, sci-fi, digital rain';
        break;
      case 'minimalist':
        enhanced += ', minimalist, clean, simple, elegant, modern design';
        break;
    }
    
    return enhanced;
  }
  
  private getDimensions(aspectRatio?: string): { width: number; height: number } {
    switch (aspectRatio) {
      case '1:1': return { width: 1024, height: 1024 };
      case '16:9': return { width: 1344, height: 768 };
      case '9:16': return { width: 768, height: 1344 };
      case '4:3': return { width: 1152, height: 896 };
      case '3:4': return { width: 896, height: 1152 };
      default: return { width: 1024, height: 1024 }; // Square default for NFTs
    }
  }
}

/**
 * FLUX.1 Schnell - Best free open source model (requires API key)
 */
export class FluxImageService implements ImageGenerationService {
  name = 'FLUX.1 Schnell';
  private apiKey: string;
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.FLUX_API_KEY || '';
  }
  
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    try {
      const enhancedPrompt = this.enhancePrompt(request.prompt, request.style);
      
      const fluxVersion = process.env.FLUX_MODEL_VERSION;
      if (!fluxVersion) {
        throw new Error('FLUX_MODEL_VERSION environment variable is required for FLUX image generation');
      }

      const response = await axios.post('https://api.replicate.com/v1/predictions', {
        version: fluxVersion,
        input: {
          prompt: enhancedPrompt,
          width: this.getWidth(request.aspectRatio),
          height: this.getHeight(request.aspectRatio),
          num_outputs: 1,
          guidance_scale: 3.5,
          num_inference_steps: 4, // Fast generation
          seed: request.seed
        }
      }, {
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Poll for completion
      const result = await this.pollForCompletion(response.data.id);
      
      return {
        success: true,
        imageUrl: result.output[0],
        prompt: enhancedPrompt,
        model: 'FLUX.1 Schnell',
        cost: 0 // Free with Apache 2.0 license
      };
      
    } catch (error: any) {
      return {
        success: false,
        prompt: request.prompt,
        model: 'FLUX.1 Schnell',
        error: error.message
      };
    }
  }
  
  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey && process.env.FLUX_MODEL_VERSION);
  }
  
  getDailyCost(): number {
    return 0; // Free open source
  }
  
  private enhancePrompt(prompt: string, style?: string): string {
    let enhanced = prompt;
    
    // Add style modifiers
    switch (style) {
      case 'realistic':
        enhanced += ', photorealistic, high detail, professional photography';
        break;
      case 'artistic':
        enhanced += ', digital art, artistic, creative, beautiful composition';
        break;
      case 'fantasy':
        enhanced += ', fantasy art, magical, ethereal, mystical';
        break;
      case 'cyberpunk':
        enhanced += ', cyberpunk, neon, futuristic, sci-fi, digital';
        break;
      case 'minimalist':
        enhanced += ', minimalist, clean, simple, elegant';
        break;
    }
    
    // Add NFT-specific enhancements
    enhanced += ', high quality, suitable for NFT, digital collectible';
    
    return enhanced;
  }
  
  private getWidth(aspectRatio?: string): number {
    switch (aspectRatio) {
      case '1:1': return 1024;
      case '16:9': return 1344;
      case '9:16': return 768;
      case '4:3': return 1152;
      case '3:4': return 896;
      default: return 1024; // Square default for NFTs
    }
  }
  
  private getHeight(aspectRatio?: string): number {
    switch (aspectRatio) {
      case '1:1': return 1024;
      case '16:9': return 768;
      case '9:16': return 1344;
      case '4:3': return 896;
      case '3:4': return 1152;
      default: return 1024;
    }
  }
  
  private async pollForCompletion(predictionId: string): Promise<any> {
    while (true) {
      const response = await axios.get(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { 'Authorization': `Token ${this.apiKey}` }
      });
      
      if (response.data.status === 'succeeded') {
        return response.data;
      } else if (response.data.status === 'failed') {
        throw new Error('Image generation failed');
      }
      
      // Wait 1 second before polling again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

/**
 * Stable Diffusion via Hugging Face
 */
export class StableDiffusionService implements ImageGenerationService {
  name = 'Stable Diffusion';
  private apiKey: string;
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.HUGGINGFACE_API_KEY || '';
  }
  
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    try {
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1',
        {
          inputs: request.prompt,
          parameters: {
            width: this.getWidth(request.aspectRatio),
            height: this.getHeight(request.aspectRatio),
            num_inference_steps: 20
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      );
      
      // Save image locally
      const imagePath = path.join('/tmp', `generated-${Date.now()}.png`);
      fs.writeFileSync(imagePath, response.data);
      
      return {
        success: true,
        localPath: imagePath,
        prompt: request.prompt,
        model: 'Stable Diffusion 2.1',
        cost: 0 // Free tier available
      };
      
    } catch (error: any) {
      return {
        success: false,
        prompt: request.prompt,
        model: 'Stable Diffusion',
        error: error.message
      };
    }
  }
  
  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }
  
  getDailyCost(): number {
    return 0; // Free tier
  }
  
  private getWidth(aspectRatio?: string): number {
    return 512; // Standard SD resolution
  }
  
  private getHeight(aspectRatio?: string): number {
    return 512;
  }
}

/**
 * Playground AI Service
 */
export class PlaygroundAIService implements ImageGenerationService {
  name = 'Playground AI';
  private apiKey: string;
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.PLAYGROUND_API_KEY || '';
  }
  
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    try {
      const response = await axios.post('https://api.playground.ai/v1/images/generate', {
        prompt: request.prompt,
        width: this.getWidth(request.aspectRatio),
        height: this.getHeight(request.aspectRatio),
        guidance_scale: 7.5,
        scheduler: "K_EULER_ANCESTRAL",
        steps: 25
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      return {
        success: true,
        imageUrl: response.data.images[0].url,
        prompt: request.prompt,
        model: 'Playground AI',
        cost: 0.02 // Approximate cost per image
      };
      
    } catch (error: any) {
      return {
        success: false,
        prompt: request.prompt,
        model: 'Playground AI',
        error: error.message
      };
    }
  }
  
  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }
  
  getDailyCost(): number {
    return 1.0; // ~50 images * $0.02
  }
  
  private getWidth(aspectRatio?: string): number {
    return 512;
  }
  
  private getHeight(aspectRatio?: string): number {
    return 512;
  }
}

/**
 * Image Generation Manager
 * Automatically selects the best available service
 */
export class ImageGenerationManager {
  private services: ImageGenerationService[] = [];
  
  constructor() {
    // Initialize services in order of preference
    // Pollinations.ai first since it's truly free and requires no API key
    this.services = [
      new PollinationsService(),  // Always available, no API key needed
      new FluxImageService(),      // Requires API key
      new StableDiffusionService(), // Requires API key
      new PlaygroundAIService()     // Requires API key
    ];
  }
  
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    // Try services in order until one works
    for (const service of this.services) {
      if (await service.isAvailable()) {
        const result = await service.generateImage(request);

        if (result.success) {
          return result;
        }
      }
    }
    
    return {
      success: false,
      prompt: request.prompt,
      model: 'none',
      error: 'No image generation services available. Please configure API keys.'
    };
  }
  
  async getAvailableServices(): Promise<string[]> {
    const available = [];
    for (const service of this.services) {
      if (await service.isAvailable()) {
        available.push(service.name);
      }
    }
    return available;
  }
  
  getTotalDailyCost(): Promise<number> {
    return Promise.resolve(
      this.services.reduce((total, service) => total + service.getDailyCost(), 0)
    );
  }
}

// Export singleton instance
export const imageGenerator = new ImageGenerationManager();
