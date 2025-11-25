/**
 * MCP Client Manager for Embler GenAI Platform
 *
 * Manages connections to MCP (Model Context Protocol) servers:
 * - Supabase MCP Server (database operations)
 * - Filesystem MCP Server (file operations)
 * - Analytics MCP Server (ML operations)
 *
 * This provides a robust, decoupled architecture where services
 * communicate through standardized MCP protocol.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';

interface MCPServerConfig {
  command: string;
  args: string[];
  env: Record<string, string>;
}

interface MCPClientInfo {
  name: string;
  client: Client;
  transport: StdioClientTransport;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

export class MCPClientManager {
  private clients: Map<string, MCPClientInfo> = new Map();
  private isShuttingDown = false;
  private reconnectDelay = 5000; // 5 seconds
  private maxReconnectAttempts = 3;

  /**
   * Initialize all MCP clients defined in configuration
   */
  async initializeClients(): Promise<void> {
    console.log('🔗 Initializing MCP clients...');

    try {
      // Initialize Supabase MCP Server
      if (process.env.MCP_SUPABASE_ENABLED === 'true') {
        await this.initializeClient('supabase', {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-supabase'],
          env: {
            SUPABASE_URL: process.env.SUPABASE_URL!,
            SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
            SUPABASE_SCHEMA: process.env.SUPABASE_SCHEMA || 'public',
          },
        });
      }

      // Initialize Filesystem MCP Server
      if (process.env.MCP_FILESYSTEM_ENABLED === 'true') {
        const dataPath = path.join(process.cwd(), '../../data');
        await this.initializeClient('filesystem', {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem', dataPath],
          env: {},
        });
      }

      // Initialize Analytics MCP Server
      if (process.env.MCP_ANALYTICS_ENABLED === 'true') {
        const analyticsServerPath = path.join(
          process.cwd(),
          '../../mcp-servers/analytics-server.js'
        );
        await this.initializeClient('analytics', {
          command: 'node',
          args: [analyticsServerPath],
          env: {
            ML_SERVICE_URL: process.env.ML_API_URL || 'http://localhost:8001',
          },
        });
      }

      console.log('✅ MCP clients initialized successfully');
      this.listClients();
    } catch (error) {
      console.error('❌ Failed to initialize MCP clients:', error);
      throw error;
    }
  }

  /**
   * Initialize a single MCP client
   */
  private async initializeClient(
    name: string,
    config: MCPServerConfig
  ): Promise<void> {
    try {
      console.log(`  Initializing MCP client '${name}'...`);

      // Create transport with command, args, and env
      // Filter out undefined values from process.env
      const envVars: Record<string, string> = {};
      for (const [key, value] of Object.entries({ ...process.env, ...config.env })) {
        if (value !== undefined) {
          envVars[key] = value;
        }
      }

      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: envVars,
      });

      // Create client
      const client = new Client(
        {
          name: `embler-api-gateway-${name}`,
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      // Connect client
      await client.connect(transport);

      // Store client info
      this.clients.set(name, {
        name,
        client,
        transport,
        reconnectAttempts: 0,
        maxReconnectAttempts: this.maxReconnectAttempts,
      });

      console.log(`  ✅ MCP client '${name}' connected`);
    } catch (error) {
      console.error(`  ❌ Failed to initialize MCP client '${name}':`, error);
      throw error;
    }
  }

  /**
   * Handle client disconnect and attempt reconnection
   */
  private async handleClientDisconnect(name: string): Promise<void> {
    const clientInfo = this.clients.get(name);
    if (!clientInfo || this.isShuttingDown) {
      return;
    }

    clientInfo.reconnectAttempts++;

    if (clientInfo.reconnectAttempts <= clientInfo.maxReconnectAttempts) {
      console.log(
        `  🔄 Attempting to reconnect MCP client '${name}' (attempt ${clientInfo.reconnectAttempts}/${clientInfo.maxReconnectAttempts})...`
      );

      setTimeout(async () => {
        try {
          // TODO: Implement reconnection logic
          console.log(`  ⚠️  Reconnection for '${name}' not yet implemented`);
        } catch (error) {
          console.error(`  ❌ Failed to reconnect MCP client '${name}':`, error);
        }
      }, this.reconnectDelay);
    } else {
      console.error(
        `  ❌ MCP client '${name}' exceeded max reconnect attempts, giving up`
      );
      this.clients.delete(name);
    }
  }

  /**
   * Get a specific MCP client by name
   */
  getClient(name: string): Client {
    const clientInfo = this.clients.get(name);
    if (!clientInfo) {
      throw new Error(`MCP client '${name}' not found or not connected`);
    }
    return clientInfo.client;
  }

  /**
   * Call a tool on an MCP server
   */
  async callTool(serverName: string, toolName: string, args: any): Promise<any> {
    try {
      const client = this.getClient(serverName);
      const result = await client.callTool({
        name: toolName,
        arguments: args,
      });
      return result;
    } catch (error: any) {
      console.error(`Error calling tool '${toolName}' on server '${serverName}':`, error);
      throw new Error(`MCP tool call failed: ${error.message}`);
    }
  }

  /**
   * List available resources from an MCP server
   */
  async listResources(serverName: string): Promise<any> {
    try {
      const client = this.getClient(serverName);
      const resources = await client.listResources();
      return resources;
    } catch (error: any) {
      console.error(`Error listing resources from server '${serverName}':`, error);
      throw new Error(`MCP list resources failed: ${error.message}`);
    }
  }

  /**
   * Read a specific resource from an MCP server
   */
  async readResource(serverName: string, uri: string): Promise<any> {
    try {
      const client = this.getClient(serverName);
      const resource = await client.readResource({ uri });
      return resource;
    } catch (error: any) {
      console.error(`Error reading resource '${uri}' from server '${serverName}':`, error);
      throw new Error(`MCP read resource failed: ${error.message}`);
    }
  }

  /**
   * List all available tools from an MCP server
   */
  async listTools(serverName: string): Promise<any> {
    try {
      const client = this.getClient(serverName);
      const tools = await client.listTools();
      return tools;
    } catch (error: any) {
      console.error(`Error listing tools from server '${serverName}':`, error);
      throw new Error(`MCP list tools failed: ${error.message}`);
    }
  }

  /**
   * List all connected clients
   */
  listClients(): void {
    console.log('\n📋 Connected MCP clients:');
    for (const [name, info] of this.clients.entries()) {
      console.log(`  - ${name} (reconnect attempts: ${info.reconnectAttempts})`);
    }
    console.log('');
  }

  /**
   * Check if a specific client is connected
   */
  isClientConnected(name: string): boolean {
    return this.clients.has(name);
  }

  /**
   * Get status of all clients
   */
  getStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    for (const [name] of this.clients.entries()) {
      status[name] = true;
    }
    return status;
  }

  /**
   * Shutdown all MCP clients gracefully
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    console.log('🛑 Shutting down MCP clients...');

    for (const [name, clientInfo] of this.clients.entries()) {
      try {
        console.log(`  Closing MCP client '${name}'...`);
        await clientInfo.client.close();
        console.log(`  ✅ MCP client '${name}' closed`);
      } catch (error) {
        console.error(`  ❌ Error closing MCP client '${name}':`, error);
      }
    }

    this.clients.clear();
    console.log('✅ All MCP clients shut down');
  }
}

// Singleton instance
export const mcpClientManager = new MCPClientManager();
