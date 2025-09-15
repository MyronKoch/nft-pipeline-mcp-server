import { z } from 'zod';
import { imageGenerator, ImageGenerationRequest } from '../../utils/ai-image-generation.js';

const schema = z.object({
  prompt: z.string().describe('Text description of the image to generate'),
  style: z.enum(['realistic', 'artistic', 'cartoon', 'fantasy', 'cyberpunk', 'minimalist']).optional().describe('Art style for the image'),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).optional().default('1:1').describe('Image aspect ratio'),
  quality: z.enum(['standard', 'high', 'ultra']).optional().default('high').describe('Generation quality'),
  seed: z.number().optional().describe('Random seed for reproducible generation'),
  model: z.string().optional().describe('Specific model to use (flux, turbo, etc.)')
});

export async function handleGenerateImage(
  args: any
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const parsed = schema.parse(args);

    const request: ImageGenerationRequest = {
      prompt: parsed.prompt,
      style: parsed.style,
      aspectRatio: parsed.aspectRatio,
      quality: parsed.quality,
      seed: parsed.seed,
      model: parsed.model
    };

    const result = await imageGenerator.generateImage(request);

    if (!result.success || (!result.imageUrl && !result.localPath)) {
      throw new Error(result.error || 'Image generation failed');
    }

    // Generate a filename based on the prompt
    const sanitizedPrompt = parsed.prompt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, '')       // Remove leading/trailing hyphens
      .substring(0, 50);              // Limit length
    const timestamp = Date.now();
    const suggestedFilename = `${sanitizedPrompt}-${timestamp}.png`;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          imageUrl: result.imageUrl,
          localPath: result.localPath,
          prompt: result.prompt,
          model: result.model,
          style: parsed.style,
          aspectRatio: parsed.aspectRatio,
          cost: result.cost || 0,
          suggestedFilename,
          message: result.imageUrl
            ? 'Image generated successfully (URL)'
            : 'Image generated successfully (local file)',
          downloadTip: `To save: Right-click and 'Save as' → Use filename: ${suggestedFilename}`,
          nextSteps: [
            'Use nft_upload_to_ipfs to upload this image',
            'Or use nft_create_package for complete NFT preparation'
          ]
        }, null, 2)
      }]
    };
  } catch (error: any) {
    throw new Error(`Failed to generate image: ${error.message}`);
  }
}
