/**
 * Embler Analytics MCP Server
 *
 * Custom MCP server for Machine Learning and Analytics operations.
 * Connects with the ML Service (FastAPI) to provide tools for:
 * - Training ML models
 * - Making predictions
 * - Analyzing datasets
 * - Evaluating models
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

class AnalyticsMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'embler-analytics-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // Handler: List Resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'analytics://predictions',
          name: 'ML Predictions',
          description: 'Access to demand prediction results',
          mimeType: 'application/json',
        },
        {
          uri: 'analytics://models',
          name: 'ML Models',
          description: 'Trained machine learning models metadata',
          mimeType: 'application/json',
        },
        {
          uri: 'analytics://training-jobs',
          name: 'Training Jobs',
          description: 'Model training job history and status',
          mimeType: 'application/json',
        },
      ],
    }));

    // Handler: Read Resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri.toString();

      if (uri === 'analytics://predictions') {
        try {
          const response = await axios.get(`${ML_SERVICE_URL}/api/predictions/recent`);
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(response.data, null, 2),
              },
            ],
          };
        } catch (error) {
          throw new Error(`Failed to fetch predictions: ${error.message}`);
        }
      }

      if (uri === 'analytics://models') {
        try {
          const response = await axios.get(`${ML_SERVICE_URL}/api/models`);
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(response.data, null, 2),
              },
            ],
          };
        } catch (error) {
          throw new Error(`Failed to fetch models: ${error.message}`);
        }
      }

      if (uri === 'analytics://training-jobs') {
        try {
          const response = await axios.get(`${ML_SERVICE_URL}/api/training-jobs`);
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(response.data, null, 2),
              },
            ],
          };
        } catch (error) {
          throw new Error(`Failed to fetch training jobs: ${error.message}`);
        }
      }

      throw new Error(`Unknown resource: ${uri}`);
    });

    // Handler: List Tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'train_model',
          description: 'Train a machine learning model on a dataset',
          inputSchema: {
            type: 'object',
            properties: {
              dataset_id: {
                type: 'string',
                description: 'UUID of the dataset to train on',
              },
              model_type: {
                type: 'string',
                enum: ['random_forest', 'gradient_boosting', 'neural_network'],
                description: 'Type of model to train',
              },
              hyperparameters: {
                type: 'object',
                description: 'Model hyperparameters (optional)',
              },
            },
            required: ['dataset_id', 'model_type'],
          },
        },
        {
          name: 'predict_demand',
          description: 'Predict future demand for a product',
          inputSchema: {
            type: 'object',
            properties: {
              numero_parte: {
                type: 'string',
                description: 'Product part number',
              },
              days_ahead: {
                type: 'number',
                description: 'Number of days to predict ahead (default: 30)',
                default: 30,
              },
              model_id: {
                type: 'string',
                description: 'Specific model UUID to use (optional)',
              },
            },
            required: ['numero_parte'],
          },
        },
        {
          name: 'evaluate_model',
          description: 'Evaluate model performance metrics',
          inputSchema: {
            type: 'object',
            properties: {
              model_id: {
                type: 'string',
                description: 'UUID of the model to evaluate',
              },
              test_dataset_id: {
                type: 'string',
                description: 'UUID of test dataset (optional)',
              },
            },
            required: ['model_id'],
          },
        },
        {
          name: 'get_feature_importance',
          description: 'Get feature importance scores for a trained model',
          inputSchema: {
            type: 'object',
            properties: {
              model_id: {
                type: 'string',
                description: 'UUID of the model',
              },
            },
            required: ['model_id'],
          },
        },
        {
          name: 'analyze_dataset',
          description: 'Perform comprehensive statistical analysis on a dataset',
          inputSchema: {
            type: 'object',
            properties: {
              dataset_id: {
                type: 'string',
                description: 'UUID of the dataset',
              },
              analysis_types: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['descriptive', 'correlation', 'outliers', 'trends', 'seasonality'],
                },
                description: 'Types of analysis to perform',
              },
            },
            required: ['dataset_id'],
          },
        },
      ],
    }));

    // Handler: Call Tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'train_model':
            return await this.trainModel(args);
          case 'predict_demand':
            return await this.predictDemand(args);
          case 'evaluate_model':
            return await this.evaluateModel(args);
          case 'get_feature_importance':
            return await this.getFeatureImportance(args);
          case 'analyze_dataset':
            return await this.analyzeDataset(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async trainModel(args) {
    try {
      const response = await axios.post(`${ML_SERVICE_URL}/api/models/train`, args, {
        timeout: 300000, // 5 minutes
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to train model: ${error.message}`);
    }
  }

  async predictDemand(args) {
    try {
      const response = await axios.post(`${ML_SERVICE_URL}/api/predictions/demand`, args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to predict demand: ${error.message}`);
    }
  }

  async evaluateModel(args) {
    try {
      const response = await axios.post(`${ML_SERVICE_URL}/api/models/evaluate`, args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to evaluate model: ${error.message}`);
    }
  }

  async getFeatureImportance(args) {
    try {
      const response = await axios.get(
        `${ML_SERVICE_URL}/api/models/${args.model_id}/feature-importance`
      );
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get feature importance: ${error.message}`);
    }
  }

  async analyzeDataset(args) {
    try {
      const response = await axios.post(`${ML_SERVICE_URL}/api/datasets/analyze`, args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to analyze dataset: ${error.message}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Embler Analytics MCP server running on stdio');
  }
}

// Run server
const server = new AnalyticsMCPServer();
server.run().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
