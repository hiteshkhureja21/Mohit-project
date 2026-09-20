/**
 * Backend Server Listener
 */

import { createApp } from './app.js';
import { env } from './config/env.js';

export const app = createApp();

if (process.env.NODE_ENV !== 'test') {
  app.listen(env.PORT, () => {
    console.log(`[SourceFlow Backend] Express server running on port ${env.PORT}`);
    console.log(`[SourceFlow Backend] Allowed origin: ${env.FRONTEND_URL}`);
  });
}

export default app;
