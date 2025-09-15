import { z } from 'zod';
import { imageGenerator } from '../../utils/ai-image-generation.js';
import { handleUploadToIPFS } from '../ipfs/nft_upload_to_ipfs.js';
import { handleCreateMetadata } from '../ipfs/nft_create_metadata.js';

const attributeSchema = z.object({
  trait_type: z.string(),
  value: z.union([z.string(), z.number()])
});

const schema = z.object({
  // Image source (one required)
  prompt: z.string().optional().describe('Generate image from this prompt'),
  imageUrl: z.string().url().optional().describe('Use existing image URL'),
  imagePath: z.string().optional().describe('Use local image file'),

  // Image generation options (if using prompt)
  style: z.enum(['realistic', 'artistic', 'cartoon', 'fantasy', 'cyberpunk', 'minimalist']).optional(),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).optional().default('1:1'),
  quality: z.enum(['standard', 'high', 'ultra']).optional().default('high'),

  // NFT metadata (required)
  name: z.string().describe('NFT name'),
  description: z.string().describe('NFT description'),
  external_url: z.string().url().optional().describe('External URL'),
  attributes: z.array(attributeSchema).optional().describe('NFT traits'),
  properties: z.record(z.any()).optional().describe('Custom properties'),

  // Service configuration
  ipfsService: z.enum(['pinata', 'nftStorage', 'web3Storage']).optional(),
  ipfsApiKey: z.string().optional()
}).refine(data => data.prompt || data.imageUrl || data.imagePath, {
  message: 'Must provide either prompt, imageUrl, or imagePath'
});

export async function handleCreatePackage(
  args: any
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const parsed = schema.parse(args);

    let finalImageUrl: string | undefined;
    let finalImagePath: string | undefined;
    let generatedPrompt: string | undefined;

    // Step 1: Get or generate image
    if (parsed.prompt) {
      const imageResult = await imageGenerator.generateImage({
        prompt: parsed.prompt,
        style: parsed.style,
        aspectRatio: parsed.aspectRatio,
        quality: parsed.quality
      });

      if (!imageResult.success || (!imageResult.imageUrl && !imageResult.localPath)) {
        throw new Error(imageResult.error || 'Image generation failed');
      }

      finalImageUrl = imageResult.imageUrl;
      finalImagePath = imageResult.localPath;
      generatedPrompt = imageResult.prompt;

    } else if (parsed.imageUrl) {
      finalImageUrl = parsed.imageUrl;

    } else if (parsed.imagePath) {
      finalImagePath = parsed.imagePath;

    } else {
      throw new Error('No image source provided');
    }

    // Step 2: Upload image to IPFS with meaningful filename
    // Generate filename based on NFT name or prompt
    const baseFileName = parsed.name || parsed.prompt || 'nft-image';
    const sanitizedFileName = baseFileName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
    const fileName = `${sanitizedFileName}-${Date.now()}.png`;

    const uploadResult = await handleUploadToIPFS({
      imageUrl: finalImageUrl || undefined,
      imagePath: finalImagePath || parsed.imagePath,
      fileName: fileName,
      service: parsed.ipfsService,
      apiKey: parsed.ipfsApiKey
    });

    const uploadData = JSON.parse(uploadResult.content[0].text);
    if (!uploadData.success) {
      throw new Error(`Image upload to IPFS failed: ${uploadResult.content[0].text}`);
    }

    const imageCid = uploadData.cid;
    if (!imageCid) {
      throw new Error(`No CID returned from IPFS upload. Response: ${uploadResult.content[0].text}`);
    }

    // Step 3: Create and upload metadata
    const metadataResult = await handleCreateMetadata({
      name: parsed.name,
      description: parsed.description,
      imageHash: imageCid,
      external_url: parsed.external_url,
      attributes: parsed.attributes,
      properties: parsed.properties,
      service: parsed.ipfsService,
      apiKey: parsed.ipfsApiKey
    });

    const metadataData = JSON.parse(metadataResult.content[0].text);
    if (!metadataData.success) {
      throw new Error('Metadata upload to IPFS failed');
    }

    const metadataCid = metadataData.metadataCid;

    // Return complete package
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          imageCid,
          metadataCid,
          imageUrl: uploadData.gatewayUrl,
          metadataUrl: metadataData.gatewayUrl,
          ipfsImageUrl: `ipfs://${imageCid}`,
          ipfsMetadataUrl: `ipfs://${metadataCid}`,
          metadata: metadataData.metadata,
          generatedPrompt,
          service: parsed.ipfsService || process.env.IPFS_SERVICE || 'pinata',
          message: 'NFT package created successfully! Ready for minting.',
          nextSteps: [
            'Use the metadataCid or ipfsMetadataUrl for NFT minting',
            'The metadata contains the image reference automatically'
          ]
        }, null, 2)
      }]
    };

  } catch (error: any) {
    throw new Error(`NFT package creation failed: ${error.message}`);
  }
}
