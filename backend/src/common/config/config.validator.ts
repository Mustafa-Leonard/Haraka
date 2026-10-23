export function validateConfig(config: Record<string, unknown>) {
  if (!config['NODE_ENV']) config['NODE_ENV'] = 'development';
  const isProduction = config['NODE_ENV'] === 'production';
  const devStaffMfaBypass = config['HARAKA_DEV_STAFF_MFA_BYPASS'];

  if (devStaffMfaBypass !== undefined && !['0', '1'].includes(String(devStaffMfaBypass))) {
    throw new Error('HARAKA_DEV_STAFF_MFA_BYPASS must be 0 or 1');
  }
  if (devStaffMfaBypass === '1' && config['NODE_ENV'] !== 'development') {
    throw new Error('HARAKA_DEV_STAFF_MFA_BYPASS is available only when NODE_ENV=development');
  }

  if (!isProduction) {
    config['API_PORT'] ??= 3000;
    config['CORS_ORIGINS'] ??= 'http://localhost:5173,http://localhost:4173';
    config['JWT_SECRET'] ??= 'dev_jwt_secret_must_be_changed_in_production_32bytes_min';
    config['COOKIE_SECRET'] ??= 'dev_cookie_secret_change_in_production_32bytes_min';
    config['FIELD_ENCRYPTION_KEY'] ??=
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    if (!/^[0-9a-fA-F]{64}$/.test(String(config['FIELD_ENCRYPTION_KEY']))) {
      throw new Error('FIELD_ENCRYPTION_KEY must be a 64-character hexadecimal key');
    }
  } else {
    const requiredInProd = [
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_SECRET',
      'COOKIE_SECRET',
      'FIELD_ENCRYPTION_KEY',
      'CORS_ORIGINS',
      'MPESA_ENV',
      'AT_ENV',
      'RESEND_API_KEY',
      'EMAIL_FROM',
      'WEB_APP_URL',
    ];
    for (const key of requiredInProd) {
      if (!config[key] || String(config[key]).startsWith('dev_')) {
        throw new Error(`Production requires an explicit value for ${key}`);
      }

      for (const [key, value] of [
        ['MPESA_ENV', config['MPESA_ENV']],
        ['AT_ENV', config['AT_ENV']],
      ] as const) {
        if (value !== 'sandbox' && value !== 'production') {
          throw new Error(`${key} must be either sandbox or production`);
        }
      }
    }

    for (const key of ['JWT_SECRET', 'COOKIE_SECRET']) {
      if (String(config[key]).length < 32 || String(config[key]).startsWith('CHANGE_ME')) {
        throw new Error(`Production requires a strong, non-placeholder value for ${key}`);
      }
    }

    if (
      !String(config['RESEND_API_KEY']).startsWith('re_') ||
      String(config['RESEND_API_KEY']).startsWith('re_CHANGE_ME')
    ) {
      throw new Error('Production requires a valid RESEND_API_KEY');
    }
    if (
      !String(config['EMAIL_FROM']).includes('@') ||
      String(config['EMAIL_FROM']).includes('@example.com')
    ) {
      throw new Error('Production requires an EMAIL_FROM address on a verified sending domain');
    }

    if (!/^[0-9a-fA-F]{64}$/.test(String(config['FIELD_ENCRYPTION_KEY']))) {
      throw new Error('FIELD_ENCRYPTION_KEY must be a 64-character hexadecimal key in production');
    }

    if (
      String(config['CORS_ORIGINS'])
        .split(',')
        .some((origin) => origin.trim() === '*')
    ) {
      throw new Error('CORS_ORIGINS must not allow wildcard origins in production');
    }

    try {
      const webUrl = new URL(String(config['WEB_APP_URL']));
      if (
        webUrl.protocol !== 'https:' ||
        webUrl.username ||
        webUrl.password ||
        webUrl.search ||
        webUrl.hash
      ) {
        throw new Error('WEB_APP_URL must use HTTPS in production');
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'WEB_APP_URL must use HTTPS in production') {
        throw error;
      }
      throw new Error('Production requires a valid HTTPS WEB_APP_URL');
    }

    if (config['MPESA_ENV'] === 'production') {
      const requiredMpesa = [
        'MPESA_CONSUMER_KEY',
        'MPESA_CONSUMER_SECRET',
        'MPESA_SHORTCODE',
        'MPESA_PASSKEY',
        'MPESA_CALLBACK_URL',
      ];
      for (const key of requiredMpesa) {
        if (!config[key] || String(config[key]).startsWith('YOUR_')) {
          throw new Error(`Live M-Pesa requires a valid ${key}`);
        }
      }
    }

    if (config['AT_ENV'] === 'production') {
      for (const key of ['AT_API_KEY', 'AT_USERNAME']) {
        if (!config[key] || String(config[key]).startsWith('YOUR_')) {
          throw new Error(`Live SMS requires a valid ${key}`);
        }
      }
    }
  }

  return config;
}
