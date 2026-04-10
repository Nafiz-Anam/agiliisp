const radiusConfig = {
  enabled: process.env.RADIUS_ENABLED === 'true',
  host: process.env.RADIUS_HOST || '0.0.0.0',
  acctPort: parseInt(process.env.RADIUS_ACCT_PORT || '1813', 10),
  sharedSecret: process.env.RADIUS_SHARED_SECRET || 'testing123',
};

export default radiusConfig;
