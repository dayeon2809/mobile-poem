const path = require('node:path');
const express = require('express');
const { createApp, createSheetStore, generatePoem } = require('./app-core');

require('dotenv').config({ path: path.join(__dirname, '.env') });
const env = process.env;
const missing = ['OPENAI_API_KEY', 'GCP_CLIENT_EMAIL', 'GCP_PRIVATE_KEY', 'SHEET_ID'].filter(key => !env[key]);
if (missing.length) throw new Error(`서버 환경변수 설정 필요: ${missing.join(', ')}`);

// Vercel detects this exported Express application. Importing it never opens a port.
const app = express();
app.disable('x-powered-by');
const publicBaseUrl = env.PUBLIC_BASE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : `http://localhost:${env.PORT || 3100}`);
app.use(createApp({ store: createSheetStore(env), makePoem: data => generatePoem(data, env), publicBaseUrl }));
module.exports = app;

if (require.main === module) {
  app.listen(Number(env.PORT) || 3100, '0.0.0.0', () => console.log(`몸의 시: http://localhost:${env.PORT || 3100}`));
}
