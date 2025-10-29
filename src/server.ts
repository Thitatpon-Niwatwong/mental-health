import app from './app.js';
import { env } from './config/env.js';
import { connectToCosmos } from './database/cosmos.js';

const start = async () => {
  try {
    await connectToCosmos();

    app.listen(env.port, () => {
      console.log(`API listening on port ${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start server due to Cosmos DB connection error');
    console.error(error);
    process.exit(1);
  }
};

start();