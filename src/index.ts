#!/usr/bin/env node

/**
 * NFT Pipeline MCP Server
 * Pre-blockchain NFT asset preparation and metadata creation service
 *
 * Provides AI image generation, IPFS storage, and metadata creation
 * as a complete pipeline for NFT preparation before on-chain minting.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js';

// Tool handlers
import { handleGenerateImage } from './tools/image/nft_generate_image.js';
import { handleUploadToIPFS } from './tools/ipfs/nft_upload_to_ipfs.js';
import { handleCreateMetadata } from './tools/ipfs/nft_create_metadata.js';
import { handleCreatePackage } from './tools/combined/nft_create_package.js';

const SERVER_NAME = 'nft-pipeline-mcp-server';
const SERVER_VERSION = '1.0.0';

// Tool registry
const toolHandlers: Record<string, Function> = {
  'nft_pipeline_generate_image': handleGenerateImage,
  'nft_pipeline_upload_to_ipfs': handleUploadToIPFS,
  'nft_pipeline_create_metadata': handleCreateMetadata,
  'nft_pipeline_build_complete': handleCreatePackage,
};

// Tool definitions
const tools = [
  {
    name: 'nft_pipeline_generate_image',
    description: 'Generate AI image for NFT using free APIs (Pollinations.ai, FLUX.1, Stable Diffusion)',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Text description of the image to generate'
        },
        style: {
          type: 'string',
          enum: ['realistic', 'artistic', 'cartoon', 'fantasy', 'cyberpunk', 'minimalist'],
          description: 'Art style for the image'
        },
        aspectRatio: {
          type: 'string',
          enum: ['1:1', '16:9', '9:16', '4:3', '3:4'],
          description: 'Image aspect ratio',
          default: '1:1'
        },
        quality: {
          type: 'string',
          enum: ['standard', 'high', 'ultra'],
          description: 'Generation quality',
          default: 'high'
        },
        seed: {
          type: 'number',
          description: 'Random seed for reproducible generation'
        },
        model: {
          type: 'string',
          description: 'Specific model to use (flux, turbo, etc.)'
        }
      },
      required: ['prompt']
    }
  },
  {
    name: 'nft_pipeline_upload_to_ipfs',
    description: 'Upload image to IPFS using Pinata, NFT.Storage, or Web3.Storage',
    inputSchema: {
      type: 'object',
      properties: {
        imageUrl: {
          type: 'string',
          description: 'URL of image to upload'
        },
        imagePath: {
          type: 'string',
          description: 'Local path to image file'
        },
        fileName: {
          type: 'string',
          description: 'Filename for the upload',
          default: 'image.png'
        },
        service: {
          type: 'string',
          enum: ['pinata', 'nftStorage', 'web3Storage'],
          description: 'IPFS service to use'
        },
        apiKey: {
          type: 'string',
          description: 'Override API key for the service'
        }
      }
    }
  },
  {
    name: 'nft_pipeline_create_metadata',
    description: 'Create NFT metadata JSON and upload to IPFS',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'NFT name'
        },
        description: {
          type: 'string',
          description: 'NFT description'
        },
        imageHash: {
          type: 'string',
          description: 'IPFS CID of the image'
        },
        external_url: {
          type: 'string',
          description: 'External URL for the NFT'
        },
        attributes: {
          type: 'array',
          description: 'NFT attributes/traits',
          items: {
            type: 'object',
            properties: {
              trait_type: { type: 'string' },
              value: { type: ['string', 'number'] }
            },
            required: ['trait_type', 'value']
          }
        },
        properties: {
          type: 'object',
          description: 'Additional custom properties'
        },
        service: {
          type: 'string',
          enum: ['pinata', 'nftStorage', 'web3Storage'],
          description: 'IPFS service to use'
        },
        apiKey: {
          type: 'string',
          description: 'Override API key'
        }
      },
      required: ['name', 'description', 'imageHash']
    }
  },
  {
    name: 'nft_pipeline_build_complete',
    description: 'Complete NFT preparation pipeline: generate/upload image, create metadata, upload to IPFS. Full workflow solution.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Generate image from this prompt'
        },
        imageUrl: {
          type: 'string',
          description: 'Use existing image URL'
        },
        imagePath: {
          type: 'string',
          description: 'Use local image file'
        },
        style: {
          type: 'string',
          enum: ['realistic', 'artistic', 'cartoon', 'fantasy', 'cyberpunk', 'minimalist'],
          description: 'Image generation style'
        },
        aspectRatio: {
          type: 'string',
          enum: ['1:1', '16:9', '9:16', '4:3', '3:4'],
          description: 'Image aspect ratio',
          default: '1:1'
        },
        quality: {
          type: 'string',
          enum: ['standard', 'high', 'ultra'],
          description: 'Image quality',
          default: 'high'
        },
        name: {
          type: 'string',
          description: 'NFT name'
        },
        description: {
          type: 'string',
          description: 'NFT description'
        },
        external_url: {
          type: 'string',
          description: 'External URL'
        },
        attributes: {
          type: 'array',
          description: 'NFT traits',
          items: {
            type: 'object',
            properties: {
              trait_type: { type: 'string' },
              value: { type: ['string', 'number'] }
            }
          }
        },
        properties: {
          type: 'object',
          description: 'Custom properties'
        },
        ipfsService: {
          type: 'string',
          enum: ['pinata', 'nftStorage', 'web3Storage'],
          description: 'IPFS service'
        },
        ipfsApiKey: {
          type: 'string',
          description: 'Override IPFS API key'
        }
      },
      required: ['name', 'description']
    }
  }
];

// Initialize server
const server = new Server(
  {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool listing handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const { name, arguments: args } = request.params;

  const handler = toolHandlers[name];
  if (!handler) {
    throw new Error(`Unknown tool: ${name}`);
  }

  try {
    return await handler(args || {});
  } catch (error: any) {
    throw new Error(`Tool execution failed: ${error.message}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  process.exit(1);
});
