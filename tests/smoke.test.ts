/**
 * Smoke Tests - Server Initialization
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';

describe('NFT Media MCP Server - Smoke Tests', () => {
  it('should initialize server without errors', () => {
    expect(() => {
      new Server(
        { name: 'nft-media-mcp-server', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
    }).not.toThrow();
  });

  it('should have required dependencies', () => {
    expect(() => require('@modelcontextprotocol/sdk')).not.toThrow();
    expect(() => require('axios')).not.toThrow();
    expect(() => require('form-data')).not.toThrow();
    expect(() => require('zod')).not.toThrow();
  });
});
