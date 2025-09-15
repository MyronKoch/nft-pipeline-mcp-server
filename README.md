# NFT Pipeline MCP Server

Complete pre-blockchain NFT preparation workflow. Handles the entire asset pipeline from AI image generation through IPFS storage to metadata creation, providing ready-to-mint NFT packages for any blockchain.

## Features

🎨 **AI Image Generation**
- Pollinations.ai (no API key required)
- FLUX.1 Schnell via Replicate
- Stable Diffusion via Hugging Face
- Playground AI
- Multiple art styles: realistic, artistic, cartoon, fantasy, cyberpunk, minimalist

📦 **IPFS Storage**
- Pinata (1GB free tier - V3 API with JWT authentication)
- NFT.Storage (100% free for NFTs)
- Web3.Storage (free tier)
- Automatic metadata creation
- Public-by-default uploads

🚀 **One-Stop NFT Preparation**
- Generate image → Upload to IPFS → Create metadata → Upload metadata
- Returns ready-to-use metadata CID for minting
- Works with any blockchain

## Quick Start

### Installation

```bash
cd servers/testnet/nft-pipeline-mcp-server
npm install
npm run build
```

### Configuration

For Claude Desktop, configure in `.mcp.json` (see below). The `.env.example` file shows available environment variables for reference.

### Usage with Claude Desktop

Add to `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "nft-pipeline": {
      "command": "node",
      "args": [
        "/path/to/servers/testnet/nft-pipeline-mcp-server/dist/index.js"
      ],
      "env": {
        "IPFS_SERVICE": "pinata",
        "PINATA_API_KEY": "your_pinata_jwt_secret_here"
      }
    }
  }
}
```

**Important:**
- Use your Pinata JWT Secret (NOT the 12-digit API Key number)
- Get JWT from: https://app.pinata.cloud/developers/api-keys
- Required permissions: "Files" Write access (or Admin)

## Available Tools

### 1. `nft_pipeline_generate_image`
Generate AI images for NFTs

```typescript
{
  prompt: "Epic dragon in cyberpunk city",
  style: "cyberpunk",
  aspectRatio: "1:1",
  quality: "high"
}
```

### 2. `nft_pipeline_upload_to_ipfs`
Upload images to IPFS

```typescript
{
  imageUrl: "https://example.com/image.png",
  service: "pinata"
}
```

### 3. `nft_pipeline_create_metadata`
Create and upload NFT metadata

```typescript
{
  name: "Dragon #1",
  description: "Epic cyberpunk dragon",
  imageHash: "QmXxx...",
  attributes: [
    { trait_type: "Type", value: "Dragon" },
    { trait_type: "Rarity", value: "Legendary" }
  ]
}
```

### 4. `nft_pipeline_build_complete` ⭐ **Recommended**
Complete NFT preparation pipeline in one call

```typescript
{
  prompt: "Epic dragon in cyberpunk city",
  style: "cyberpunk",
  name: "Dragon #1",
  description: "Epic cyberpunk dragon",
  attributes: [
    { trait_type: "Type", value: "Dragon" }
  ]
}
```

Returns:
```json
{
  "success": true,
  "imageCid": "QmXxx...",
  "metadataCid": "QmYyy...",
  "imageUrl": "https://gateway.pinata.cloud/ipfs/QmXxx...",
  "metadataUrl": "https://gateway.pinata.cloud/ipfs/QmYyy...",
  "ipfsMetadataUrl": "ipfs://QmYyy..."
}
```

## Using with Blockchain MCPs

### Example: XRP NFT Minting

```typescript
// Step 1: Create NFT package
const package = await nft_pipeline_build_complete({
  prompt: "Space cat warrior",
  name: "Space Cat #1",
  description: "Epic space adventure"
});

// Step 2: Mint on XRP
await xrp_mint_nft({
  privateKey: "...",
  uri: package.ipfsMetadataUrl  // Use metadata CID
});
```

### Example: Ethereum NFT Minting

```typescript
// Step 1: Create NFT package
const package = await nft_pipeline_build_complete({
  imageUrl: "https://mysite.com/art.png",
  name: "My Art #1",
  description: "Digital masterpiece"
});

// Step 2: Mint on Ethereum
await eth_mint_nft({
  contractAddress: "0x...",
  tokenURI: package.ipfsMetadataUrl
});
```

## Environment Variables

### Required (choose one IPFS service)

**Pinata (V3 API with JWT):**
```bash
# Get JWT Secret from https://app.pinata.cloud/developers/api-keys
# Click "New Key" → Copy the JWT Secret (NOT the 12-digit API Key)
# Required permissions: "Files" Write (or Admin for all features)
PINATA_API_KEY=your_pinata_jwt_secret_here
# Note: PINATA_SECRET_KEY is no longer needed with V3 API
```

**NFT.Storage:**
```bash
NFT_STORAGE_API_KEY=xxx
```

**Web3.Storage:**
```bash
WEB3_STORAGE_API_KEY=xxx
```

### Optional (Image Generation)

```bash
# Pollinations.ai works by default (no key needed)

# Optional enhanced services:
FLUX_API_KEY=xxx              # Replicate.com API key
FLUX_MODEL_VERSION=xxx        # Optional: specific FLUX model version
HUGGINGFACE_API_KEY=xxx       # Hugging Face API key
PLAYGROUND_API_KEY=xxx        # Playground AI API key
```

## Development

```bash
# Development mode
npm run dev

# Build
npm run build

# Run tests
npm test

# MCP Inspector
npm run inspect
```

## Architecture

```
nft-pipeline-mcp-server/
├── src/
│   ├── tools/
│   │   ├── image/          # Image generation tools
│   │   ├── ipfs/           # IPFS upload tools
│   │   └── combined/       # Complete pipeline tools
│   ├── utils/
│   │   ├── ai-image-generation.ts
│   │   └── ipfs-nft-tool.ts
│   └── index.ts
└── tests/
```

## API Changes & Migration

### Pinata V3 Migration (Important)
The server now uses Pinata's V3 API which requires JWT authentication:

1. **Old format (deprecated):**
   - Used `PINATA_API_KEY` + `PINATA_SECRET_KEY` pair
   - Endpoint: `https://api.pinata.cloud/pinning/pinFileToIPFS`

2. **New format (current):**
   - Uses JWT token only in `PINATA_API_KEY`
   - Endpoint: `https://uploads.pinata.cloud/v3/files`
   - Response structure: CID is at `response.data.data.cid`

### Getting a Pinata JWT Secret

1. Go to https://app.pinata.cloud/developers/api-keys
2. Click "New Key"
3. Enable "Files" with Write permission (or Admin for all features)
4. Copy the **JWT Secret** (the long token, NOT the 12-digit API Key)
5. Use this JWT Secret as your `PINATA_API_KEY`

**Note:** The confusing naming is due to backward compatibility. Pinata shows:
- **API Key:** 12-digit identifier (we don't use this)
- **JWT Secret:** Long JWT token (this is what we need)

## Why Separate Server?

**Benefits:**
- ✅ Write image/IPFS logic once, use everywhere
- ✅ All blockchain MCPs can use same service
- ✅ Easy to add new generators/storage providers
- ✅ Users configure API keys once
- ✅ Follows MCP composability principles

## License

MIT

## Contributing

This is part of the Blockchain MCP Ecosystem. Contributions welcome!
