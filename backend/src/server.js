import 'dotenv/config';
import { validateEnv } from './config/env.js';

validateEnv();

const { default: app } = await import('./app.js');
const { default: connectDatabase } = await import('./config/database.js');

const port = process.env.PORT || 5000;

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

const start = async () => {
  await connectDatabase();

  const server = app.listen(port, () => {
    console.log(`Vaultrix API running on port ${port}`);
  });

  server.headersTimeout = 20000;
  server.requestTimeout = 30000;

  const shutdown = () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

start();
