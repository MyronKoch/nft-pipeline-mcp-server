/**
 * NFT Media MCP Server Types
 */

export interface ImageGenerationRequest {
  prompt: string;
  style?: 'realistic' | 'artistic' | 'cartoon' | 'fantasy' | 'cyberpunk' | 'minimalist';
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  quality?: 'standard' | 'high' | 'ultra';
  seed?: number;
  model?: string;
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

export interface IPFSUploadRequest {
  imageUrl?: string;
  imagePath?: string;
  metadata?: NFTMetadata;
  service?: 'pinata' | 'nftStorage' | 'web3Storage';
  apiKey?: string;
}

export interface IPFSUploadResult {
  success: boolean;
  imageHash?: string;
  metadataHash?: string;
  imageUrl?: string;
  metadataUrl?: string;
  error?: string;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image?: string;
  external_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties?: Record<string, any>;
}

export interface NFTPackageRequest {
  // Image generation
  prompt?: string;
  imageUrl?: string;
  imagePath?: string;
  style?: string;
  aspectRatio?: string;
  quality?: string;

  // NFT metadata
  name: string;
  description: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  external_url?: string;

  // Service selection
  ipfsService?: 'pinata' | 'nftStorage' | 'web3Storage';
  ipfsApiKey?: string;
}

export interface NFTPackageResult {
  success: boolean;
  imageHash?: string;
  metadataHash?: string;
  imageUrl?: string;
  metadataUrl?: string;
  metadata?: NFTMetadata;
  error?: string;
}
