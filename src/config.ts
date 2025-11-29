/**
 * Configuration management for TextDigest.
 * 
 * @semantic-role configuration
 * @purpose Load environment variables and system constants
 * @validation Validates required API keys on startup
 */

/**
 * System configuration constants.
 * 
 * @semantic-role constants
 */
export const CONFIG = {
  // File processing limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  BATCH_SIZE: 20,                   // Files per batch
  MAX_CONCURRENT_BATCHES: 3,        // Parallel batch processing
  
  // Date filtering
  DEFAULT_DAYS_BACK: 6,
  
  // File types
  SUPPORTED_EXTENSIONS: ['.txt', '.md', '.log'] as const,
  
  // LLM configuration
  LLM: {
    primary: {
      provider: 'google' as const,
      model: 'gemini-2.0-flash-exp',
      maxRetries: 2,
      timeout: 30000, // 30s
    },
    fallback: {
      provider: 'openai' as const,
      model: 'gpt-4o-mini',
      maxRetries: 1,
      timeout: 20000, // 20s
    },
  },
  
  // Quality thresholds
  QUALITY_THRESHOLDS: {
    sourceLinked: 0.90,    // 90% facts must have sources
    coverage: 0.80,        // 80% files must be cited
    confidence: 0.75,      // 75% avg confidence
  },
  
  // Output
  DEFAULT_OUTPUT_PATH: './output/digest.md',
} as const;

/**
 * Environment variable configuration.
 * 
 * @semantic-role environment
 * @validation Throws error if required keys missing
 */
export interface EnvConfig {
  GOOGLE_API_KEY?: string;
  OPENAI_API_KEY?: string;
  LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Loads and validates environment configuration.
 * 
 * @semantic-role configuration-loader
 * @throws Error if no API keys configured
 */
export function loadEnvConfig(): EnvConfig {
  const config: EnvConfig = {
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    LOG_LEVEL: (process.env.LOG_LEVEL as any) || 'info',
  };
  
  // Validate at least one API key exists
  if (!config.GOOGLE_API_KEY && !config.OPENAI_API_KEY) {
    throw new Error(
      'Missing API keys. Set GOOGLE_API_KEY or OPENAI_API_KEY environment variable.\n' +
      'Example: export GOOGLE_API_KEY=your_key_here'
    );
  }
  
  return config;
}

/**
 * Simple logger factory with structured JSON output.
 * 
 * @semantic-role observability
 * @purpose Structured logs for MCP Acceptance Expert
 */
export function createLogger(service: string) {
  return {
    info(event: string, data?: Record<string, any>) {
      console.log(JSON.stringify({ level: 'info', service, event, timestamp: new Date().toISOString(), ...data }));
    },
    warn(event: string, data?: Record<string, any>) {
      console.warn(JSON.stringify({ level: 'warn', service, event, timestamp: new Date().toISOString(), ...data }));
    },
    error(event: string, data?: Record<string, any>) {
      console.error(JSON.stringify({ level: 'error', service, event, timestamp: new Date().toISOString(), ...data }));
    },
  };
}
