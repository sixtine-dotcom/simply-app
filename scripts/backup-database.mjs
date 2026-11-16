import { mkdirSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { migrationConnection } from './migration-connection.mjs';

const url = new URL(migrationConnection(process.env.DATABASE_URL, process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED));
const directory = join(homedir(), 'Library/Application Support/Simply App/Backups');
mkdirSync(directory, { recursive: true, mode: 0o700 });
chmodSync(directory, 0o700);
const file = join(directory, `database-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`);
process.umask(0o077);
const env = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || '5432', PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGSSLMODE: url.searchParams.get('sslmode') || 'require', PGCHANNELBINDING: url.searchParams.get('channel_binding') || 'prefer' };
const bin = process.env.PG_DUMP_BIN || '/opt/homebrew/opt/libpq/bin/pg_dump';
const dump = spawnSync(bin, ['--format=custom', '--no-owner', '--no-acl', '--file', file], { env, stdio: ['ignore', 'ignore', 'pipe'] });
if (dump.status !== 0) { console.error(dump.stderr?.toString() || 'Database backup failed'); process.exit(1); }
chmodSync(file, 0o600);
const verify = spawnSync(bin.replace(/pg_dump$/, 'pg_restore'), ['--list', file], { encoding: 'utf8' });
if (verify.status !== 0) throw new Error('Backup archive could not be read');
console.log(`Database backup created and archive listing verified: ${file}`);
console.log('This backs up database records. Uploaded PDFs, images and videos in object storage need a separate storage backup.');
