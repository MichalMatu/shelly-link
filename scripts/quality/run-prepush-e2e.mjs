import { spawnSync } from 'node:child_process';
import { createServer } from 'node:net';

const command = process.platform === 'darwin' ? 'e2e:visual' : 'e2e:responsive';

const findAvailablePort = () =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Unable to allocate an E2E port.')));
        return;
      }
      const port = address.port;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });

const e2ePort = process.env.LCL_E2E_PORT ?? String(await findAvailablePort());
console.log(`Pre-push E2E mode: ${command} (${process.platform}), port ${e2ePort}`);
const result = spawnSync('pnpm', [command], {
  stdio: 'inherit',
  env: { ...process.env, LCL_E2E_PORT: e2ePort }
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
