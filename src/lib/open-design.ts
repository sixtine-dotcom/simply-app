import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

export class OpenDesignError extends Error {}

function localUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.username || url.password) {
    throw new OpenDesignError("Open Design moet op deze computer draaien. Gebruik een lokaal http-adres.");
  }
  return url.origin;
}

/** Resolve the desktop's changing ports rather than saving yesterday's port. */
async function desktopUrls() {
  if (process.platform !== "darwin") return [];
  try {
    const { stdout } = await run("/usr/sbin/lsof", ["-nP", "-iTCP", "-sTCP:LISTEN", "-Fpcn"], { timeout: 5000, maxBuffer: 512 * 1024 });
    const urls = new Set<string>();
    let isOpenDesign = false;
    for (const line of stdout.split("\n")) {
      if (line.startsWith("p")) isOpenDesign = false;
      if (line.startsWith("c")) isOpenDesign = line.slice(1).startsWith("Open Design");
      if (isOpenDesign && /^n127\.0\.0\.1:\d+$/.test(line)) urls.add(`http://${line.slice(1)}`);
    }
    return Array.from(urls);
  } catch {
    return [];
  }
}

export type OpenDesignConnection = { daemonUrl: string; webUrl: string | null };

export async function connectOpenDesign(): Promise<OpenDesignConnection> {
  // A hosted server cannot reach a user's desktop. No network addresses from request bodies are accepted.
  if (process.env.VERCEL) throw new OpenDesignError("Open Design werkt hier via je Mac. Open Simply op localhost op diezelfde Mac.");
  const configured = process.env.OPENDESIGN_DAEMON_URL?.trim();
  const candidates = configured ? [localUrl(configured)] : [...await desktopUrls(), "http://127.0.0.1:7456"];
  const results = await Promise.all(candidates.map(async (url) => {
    try {
      const res = await fetch(`${url}/api/daemon/status`, { cache: "no-store", signal: AbortSignal.timeout(1500) });
      const data = res.ok ? await res.json() : null;
      if (data?.ok && Number.isInteger(data.port) && typeof data.version === "string") {
        return { url, daemonUrl: localUrl(`http://127.0.0.1:${data.port}`) };
      }
    } catch { /* A desktop port may belong to the web server rather than the daemon. */ }
    return null;
  }));
  const daemonUrl = results.find(Boolean)?.daemonUrl;
  if (!daemonUrl) throw new OpenDesignError("Open Design is niet bereikbaar. Open de app op deze Mac en klik op Opnieuw verbinden.");
  let webUrl = process.env.OPENDESIGN_WEB_URL?.trim() ? localUrl(process.env.OPENDESIGN_WEB_URL.trim()) : null;
  if (!webUrl) {
    // The desktop's web sidecar proxies /api/daemon/status to the same daemon.
    webUrl = results.find((r) => r?.daemonUrl === daemonUrl && r.url !== daemonUrl)?.url ?? null;
  }
  return { daemonUrl, webUrl };
}

export async function openDesignRequest(connection: OpenDesignConnection, path: string, body?: unknown, timeout = 15000) {
  const res = await fetch(`${connection.daemonUrl}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    const message = typeof error?.error?.message === "string" ? error.error.message : `HTTP ${res.status}`;
    throw new OpenDesignError(`Open Design: ${message}`);
  }
  return res;
}

export function openDesignProjectUrl(connection: OpenDesignConnection, projectId: string) {
  return connection.webUrl ? `${connection.webUrl}/projects/${encodeURIComponent(projectId)}` : null;
}

export type OpenDesignRun = { id: string; status: string; error: string | null; needsCredit: boolean };

export async function openDesignRunForProject(connection: OpenDesignConnection, projectId: string, runId?: string | null): Promise<OpenDesignRun | null> {
  let run;
  if (runId) {
    run = await (await openDesignRequest(connection, `/api/runs/${encodeURIComponent(runId)}`)).json();
  } else {
    const data = await (await openDesignRequest(connection, `/api/runs?projectId=${encodeURIComponent(projectId)}`)).json();
    run = data.runs?.[0];
  }
  if (!run || run.projectId !== projectId) return null;
  const needsCredit = run.errorCode === "AMR_INSUFFICIENT_BALANCE";
  return {
    id: run.id,
    status: run.status,
    needsCredit,
    error: needsCredit
      ? "Open Design kan het ontwerp niet maken: er is onvoldoende AMR-tegoed. Vul het tegoed aan in Open Design en start het ontwerp opnieuw."
      : run.status === "failed" ? "Open Design heeft het ontwerp niet kunnen afronden. Open het project om de fout te bekijken en opnieuw te proberen." : null,
  };
}
