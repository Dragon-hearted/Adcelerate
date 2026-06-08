// Fastify inject tests for the Phase 7A route surface (files + github).
// Validates wiring, validation, and JSON shapes the frontend panels read.
import { describe, it, expect, beforeAll } from 'bun:test';
import Fastify from 'fastify';
import { runMigrations } from '../../src/db/migrate';
import { fileRoutes } from '../../src/routes/files';
import { githubRoutes } from '../../src/routes/github';

beforeAll(() => {
  runMigrations();
});

async function buildApp() {
  const app = Fastify();
  await app.register(fileRoutes);
  await app.register(githubRoutes);
  await app.ready();
  return app;
}

describe('/api/files', () => {
  it('GET /api/files/changes returns an array', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/files/changes' });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
    await app.close();
  });

  it('GET /api/files/diff without path → 400', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/files/diff' });
    expect(res.statusCode).toBe(400);
    expect(res.body).toBe('path is required');
    await app.close();
  });

  it('GET /api/files/diff with traversal path → 400', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/files/diff?path=../../etc/passwd' });
    expect(res.statusCode).toBe(400);
    expect(res.body).toBe('path escapes repo root');
    await app.close();
  });
});

describe('/api/github', () => {
  it('GET /api/github/commits returns an array', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/github/commits' });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
    await app.close();
  });

  it('GET /api/github/branches returns an array', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/github/branches' });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
    await app.close();
  });

  it('GET /api/github/prs returns an array', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/github/prs' });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
    await app.close();
  });

  it('GET /api/github/activity returns the GitHubActivity shape', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/github/activity' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.commits)).toBe(true);
    expect(Array.isArray(body.branches)).toBe(true);
    expect(Array.isArray(body.pullRequests)).toBe(true);
    expect(typeof body.fetchedAt).toBe('number');
    await app.close();
  });
});
