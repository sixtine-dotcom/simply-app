/** Use a dedicated, unpooled connection for migrations; leave app traffic pooled. */
export function migrationConnection(databaseUrl, directUrl) {
  if (directUrl) return directUrl;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  const url = new URL(databaseUrl);
  if (url.hostname.endsWith('.neon.tech') && url.hostname.includes('-pooler.')) {
    url.hostname = url.hostname.replace('-pooler.', '.');
    url.searchParams.delete('pgbouncer');
  }
  return url.toString();
}
