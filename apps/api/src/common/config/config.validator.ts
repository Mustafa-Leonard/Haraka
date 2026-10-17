export function validateConfig(config: Record<string, unknown>) {
  const isProduction = config['NODE_ENV'] === 'production';

  // Ensure default fallbacks for development
  if (!config['NODE_ENV']) config['NODE_ENV'] = 'development';
  if (!config['API_PORT']) config['API_PORT'] = 3000;
  if (!config['CORS_ORIGINS']) config['CORS_ORIGINS'] = 'http://localhost:5173,http://localhost:4173';
  if (!config['JWT_SECRET']) config['JWT_SECRET'] = 'dev_jwt_secret_must_be_changed_in_production_32bytes_min';
  if (!config['COOKIE_SECRET']) config['COOKIE_SECRET'] = 'dev_cookie_secret_change_in_production_32bytes_min';
  if (!config['FIELD_ENCRYPTION_KEY']) config['FIELD_ENCRYPTION_KEY'] = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  if (isProduction) {
    const requiredInProd = [
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_SECRET',
      'COOKIE_SECRET',
      'FIELD_ENCRYPTION_KEY',
    ];
    for (const key of requiredInProd) {
      if (!config[key] || String(config[key]).startsWith('dev_')) {
        throw new Error(`Production requires a secure, non-default value for ${key}`);
      }
    }
  }

  return config;
}
