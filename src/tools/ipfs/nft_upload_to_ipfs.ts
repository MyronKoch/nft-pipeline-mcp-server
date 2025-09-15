import { z } from 'zod';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const schema = z.object({
  imageUrl: z.string().url().optional().describe('URL of image to upload'),
  imagePath: z.string().optional().describe('Local path to image file'),
  fileName: z.string().optional().default('image.png').describe('Filename for the upload'),
  service: z.enum(['pinata', 'nftStorage', 'web3Storage']).optional().describe('IPFS service to use'),
  apiKey: z.string().optional().describe('Override API key/JWT for the service (use Pinata JWT for pinata)')
}).refine(data => data.imageUrl || data.imagePath, {
  message: 'Either imageUrl or imagePath must be provided'
});

export async function handleUploadToIPFS(
  args: any
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const parsed = schema.parse(args);

    const service = parsed.service || (process.env.IPFS_SERVICE as any) || 'pinata';

    // Map service names to env var keys with proper naming
    const serviceEnvMap: Record<string, string> = {
      'pinata': 'PINATA_API_KEY',
      'nftStorage': 'NFT_STORAGE_API_KEY',
      'web3Storage': 'WEB3_STORAGE_API_KEY'
    };

    const apiKey = parsed.apiKey || process.env[serviceEnvMap[service]] || '';

    if (!apiKey) {
      throw new Error(`API key/JWT required for ${service}. Set ${serviceEnvMap[service]} in environment or pass as apiKey parameter.`);
    }

    let imageBuffer: Buffer;
    let fileName = parsed.fileName;

    // Get image data
    if (parsed.imageUrl) {
      const response = await axios.get(parsed.imageUrl, { responseType: 'arraybuffer' });
      imageBuffer = Buffer.from(response.data);

      // Try to infer filename from URL
      const urlPath = new URL(parsed.imageUrl).pathname;
      const urlFileName = urlPath.split('/').pop();
      if (urlFileName && urlFileName.includes('.')) {
        fileName = urlFileName;
      }
    } else if (parsed.imagePath) {
      imageBuffer = fs.readFileSync(parsed.imagePath);
      fileName = parsed.imagePath.split('/').pop() || fileName;
    } else {
      throw new Error('No image source provided');
    }

    // Upload based on service
    let cid: string;
    let gatewayUrl: string;

    if (service === 'pinata') {
      const formData = new FormData();
      formData.append('file', imageBuffer, fileName);
      formData.append('network', 'public');

      const response = await axios.post(
        'https://uploads.pinata.cloud/v3/files',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            ...formData.getHeaders()
          }
        }
      );

      // Pinata V3 API response structure has CID nested under data.data
      cid = response.data.data.cid;
      gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;

    } else if (service === 'nftStorage') {
      const formData = new FormData();
      formData.append('file', imageBuffer, fileName);

      const response = await axios.post(
        'https://api.nft.storage/upload',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            ...formData.getHeaders()
          }
        }
      );

      cid = response.data.value.cid;
      gatewayUrl = `https://nftstorage.link/ipfs/${cid}`;

    } else if (service === 'web3Storage') {
      const formData = new FormData();
      formData.append('file', imageBuffer, fileName);

      const response = await axios.post(
        'https://api.web3.storage/upload',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            ...formData.getHeaders()
          }
        }
      );

      cid = response.data.cid;
      gatewayUrl = `https://w3s.link/ipfs/${cid}`;

    } else {
      throw new Error(`Unsupported IPFS service: ${service}`);
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          cid,
          ipfsUrl: `ipfs://${cid}`,
          gatewayUrl,
          service,
          fileName,
          message: 'Image uploaded to IPFS successfully'
        }, null, 2)
      }]
    };

  } catch (error: any) {
    // Enhanced error handling for debugging
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 403) {
        throw new Error(`Pinata authentication failed (403): Ensure your JWT has "Files" Write permission enabled. Response: ${JSON.stringify(data)}`);
      } else if (status === 401) {
        throw new Error(`Invalid Pinata JWT (401): Check that your JWT is correct and not expired. Response: ${JSON.stringify(data)}`);
      } else {
        throw new Error(`IPFS upload failed (${status}): ${JSON.stringify(data)}`);
      }
    }

    throw new Error(`IPFS upload failed: ${error.message}`);
  }
}
