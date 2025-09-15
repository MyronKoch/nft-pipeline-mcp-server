import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function main() {
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', 'tsx', 'src/index.ts'],
  });

  const client = new Client({ name: 'tester', version: '0.1' });
  await client.connect(transport);

  const tools = await client.listTools();
  console.log('Tools:', JSON.stringify(tools, null, 2));

  const generateResp = await client.callTool({
    name: 'nft_generate_image',
    arguments: {
      prompt: 'Retro pixel art robot mascot standing on floating island',
      style: 'artistic',
    },
  });
  console.log('Generate image response:', JSON.stringify(generateResp, null, 2));

  try {
    const uploadResp = await client.callTool({
      name: 'nft_upload_to_ipfs',
      arguments: {
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Placeholder_view_vector.svg/512px-Placeholder_view_vector.svg.png',
        service: 'pinata',
      },
    });
    console.log('Upload response:', JSON.stringify(uploadResp, null, 2));
  } catch (error) {
    console.error('Expected upload failure (missing API key):', error);
  }

  await client.close();
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
