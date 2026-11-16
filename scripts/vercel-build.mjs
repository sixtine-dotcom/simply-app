import { spawnSync } from 'node:child_process';
import { migrationConnection } from './migration-connection.mjs';

const directUrl = migrationConnection(process.env.DATABASE_URL, process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED);
const migrate = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
  stdio: 'inherit', env: { ...process.env, DATABASE_URL: directUrl },
});
if (migrate.status !== 0) process.exit(migrate.status || 1);
// Build/runtime still use the original pooled DATABASE_URL.
const build = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], { stdio: 'inherit', env: process.env });
process.exit(build.status || (build.error ? 1 : 0));
