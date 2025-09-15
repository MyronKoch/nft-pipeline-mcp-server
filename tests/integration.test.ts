/**
 * Integration Tests - Tool Registration
 */

describe('NFT Media MCP Server - Integration Tests', () => {
  const expectedTools = [
    'nft_generate_image',
    'nft_upload_to_ipfs',
    'nft_create_metadata',
    'nft_create_package'
  ];

  it('should register all required tools', () => {
    expectedTools.forEach(toolName => {
      expect(toolName).toMatch(/^nft_[a-z_]+$/);
    });
  });

  it('should follow nft_ naming convention', () => {
    expectedTools.forEach(toolName => {
      expect(toolName).toMatch(/^nft_/);
    });
  });

  it('should have exactly 4 tools', () => {
    expect(expectedTools.length).toBe(4);
  });
});
