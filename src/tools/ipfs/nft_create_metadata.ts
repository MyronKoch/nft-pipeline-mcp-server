import { z } from 'zod';
import axios from 'axios';
import FormData from 'form-data';

const attributeSchema = z.object({
  trait_type: z.string(),
  value: z.union([z.string(), z.number()])
});

const schema = z.object({
  name: z.string().describe('NFT name'),
  description: z.string().describe('NFT description'),
  imageHash: z.string().describe('IPFS CID of the image'),
  external_url: z.string().url().optional().describe('External URL for the NFT'),
  attributes: z.array(attributeSchema).optional().describe('NFT attributes/traits'),
  properties: z.record(z.any()).optional().describe('Additional custom properties'),
  service: z.enum(['pinata', 'nftStorage', 'web3Storage']).optional().describe('IPFS service to use'),
  apiKey: z.string().optional().describe('Override API key/JWT (use Pinata JWT for pinata)')
});

export async function handleCreateMetadata(
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

    // Create NFT metadata JSON
    const metadata = {
      name: parsed.name,
      description: parsed.description,
      image: `ipfs://${parsed.imageHash}`,
      external_url: parsed.external_url,
      attributes: parsed.attributes || [],
      properties: parsed.properties || {}
    };

    // Upload metadata to IPFS
    let metadataCid: string;
    let gatewayUrl: string;

    const metadataBuffer = Buffer.from(JSON.stringify(metadata, null, 2));

    if (service === 'pinata') {
      const formData = new FormData();
      formData.append('file', metadataBuffer, 'metadata.json');
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
      metadataCid = response.data.data.cid;
      gatewayUrl = `https://gateway.pinata.cloud/ipfs/${metadataCid}`;

    } else if (service === 'nftStorage') {
      const formData = new FormData();
      formData.append('file', metadataBuffer, 'metadata.json');

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

      metadataCid = response.data.value.cid;
      gatewayUrl = `https://nftstorage.link/ipfs/${metadataCid}`;

    } else if (service === 'web3Storage') {
      const formData = new FormData();
      formData.append('file', metadataBuffer, 'metadata.json');

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

      metadataCid = response.data.cid;
      gatewayUrl = `https://w3s.link/ipfs/${metadataCid}`;

    } else {
      throw new Error(`Unsupported IPFS service: ${service}`);
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          metadataCid,
          ipfsUrl: `ipfs://${metadataCid}`,
          gatewayUrl,
          metadata,
          service,
          message: 'Metadata uploaded to IPFS successfully'
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
        throw new Error(`Metadata upload failed (${status}): ${JSON.stringify(data)}`);
      }
    }

    throw new Error(`Metadata creation failed: ${error.message}`);
  }
}
