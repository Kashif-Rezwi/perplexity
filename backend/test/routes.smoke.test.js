// routes.smoke.test.js
// Verifies registered API routes using AppModule metadata reflection.

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { NestFactory } = require('@nestjs/core');
const { PrismaClient } = require('@prisma/client');

process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/perplexity_test';
process.env.OPENAI_API_KEY ??= 'sk-test-key';
process.env.GROQ_API_KEY ??= 'gsk-test-key';
process.env.TAVILY_API_KEY ??= 'test-tavily-key';

PrismaClient.prototype.$connect = async () => {};
PrismaClient.prototype.$disconnect = async () => {};

const { AppModule } = require('../src/app.module');

// Boots a minimal NestJS application to resolve routes without starting the listener.
async function createRoutedApp() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });
  await app.init();
  return app;
}

// Extracts registered route paths and methods from the NestJS application router.
function getRegisteredRoutes(app) {
  const httpAdapter = app.getHttpAdapter();
  const router = httpAdapter.getInstance().router;

  const routes = [];

  function walkLayer(layer) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).map((m) =>
        m.toUpperCase(),
      );
      for (const method of methods) {
        routes.push({ method, path: layer.route.path });
      }
    } else if (layer.handle && layer.handle.stack) {
      for (const subLayer of layer.handle.stack) {
        walkLayer(subLayer);
      }
    }
  }

  for (const layer of router.stack) {
    walkLayer(layer);
  }

  return routes;
}

test('GET /health route is registered', async () => {
  const app = await createRoutedApp();

  try {
    const routes = getRegisteredRoutes(app);
    const found = routes.some(
      (r) => r.method === 'GET' && r.path === '/health',
    );
    assert.ok(found, `GET /health not found in routes: ${JSON.stringify(routes)}`);
  } finally {
    await app.close();
  }
});

test('POST /perplexity/ask route is registered', async () => {
  const app = await createRoutedApp();

  try {
    const routes = getRegisteredRoutes(app);
    const found = routes.some(
      (r) => r.method === 'POST' && r.path === '/perplexity/ask',
    );
    assert.ok(
      found,
      `POST /perplexity/ask not found in routes: ${JSON.stringify(routes)}`,
    );
  } finally {
    await app.close();
  }
});

test('POST /perplexity/ask/stream route is registered', async () => {
  const app = await createRoutedApp();

  try {
    const routes = getRegisteredRoutes(app);
    const found = routes.some(
      (r) => r.method === 'POST' && r.path === '/perplexity/ask/stream',
    );
    assert.ok(
      found,
      `POST /perplexity/ask/stream not found in routes: ${JSON.stringify(routes)}`,
    );
  } finally {
    await app.close();
  }
});

test('GET /perplexity/sources route is registered', async () => {
  const app = await createRoutedApp();

  try {
    const routes = getRegisteredRoutes(app);
    const found = routes.some(
      (r) => r.method === 'GET' && r.path === '/perplexity/sources',
    );
    assert.ok(
      found,
      `GET /perplexity/sources not found in routes: ${JSON.stringify(routes)}`,
    );
  } finally {
    await app.close();
  }
});

test('GET /perplexity/threads route is registered', async () => {
  const app = await createRoutedApp();

  try {
    const routes = getRegisteredRoutes(app);
    const found = routes.some(
      (r) => r.method === 'GET' && r.path === '/perplexity/threads',
    );
    assert.ok(
      found,
      `GET /perplexity/threads not found in routes: ${JSON.stringify(routes)}`,
    );
  } finally {
    await app.close();
  }
});

test('GET /perplexity/threads/:threadId route is registered', async () => {
  const app = await createRoutedApp();

  try {
    const routes = getRegisteredRoutes(app);
    const found = routes.some(
      (r) =>
        r.method === 'GET' && r.path === '/perplexity/threads/:threadId',
    );
    assert.ok(
      found,
      `GET /perplexity/threads/:threadId not found in routes: ${JSON.stringify(routes)}`,
    );
  } finally {
    await app.close();
  }
});

test('GET /perplexity/threads/pinned route is registered', async () => {
  const app = await createRoutedApp();

  try {
    const routes = getRegisteredRoutes(app);
    const found = routes.some(
      (r) => r.method === 'GET' && r.path === '/perplexity/threads/pinned',
    );
    assert.ok(
      found,
      `GET /perplexity/threads/pinned not found in routes: ${JSON.stringify(routes)}`,
    );
  } finally {
    await app.close();
  }
});

test('PATCH /perplexity/threads/:threadId route is registered', async () => {
  const app = await createRoutedApp();

  try {
    const routes = getRegisteredRoutes(app);
    const found = routes.some(
      (r) =>
        r.method === 'PATCH' && r.path === '/perplexity/threads/:threadId',
    );
    assert.ok(
      found,
      `PATCH /perplexity/threads/:threadId not found in routes: ${JSON.stringify(routes)}`,
    );
  } finally {
    await app.close();
  }
});

test('DELETE /perplexity/threads route is registered', async () => {
  const app = await createRoutedApp();

  try {
    const routes = getRegisteredRoutes(app);
    const found = routes.some(
      (r) => r.method === 'DELETE' && r.path === '/perplexity/threads',
    );
    assert.ok(
      found,
      `DELETE /perplexity/threads not found in routes: ${JSON.stringify(routes)}`,
    );
  } finally {
    await app.close();
  }
});

test('PATCH /perplexity/threads/:threadId/pin route is registered', async () => {
  const app = await createRoutedApp();

  try {
    const routes = getRegisteredRoutes(app);
    const found = routes.some(
      (r) =>
        r.method === 'PATCH' && r.path === '/perplexity/threads/:threadId/pin',
    );
    assert.ok(
      found,
      `PATCH /perplexity/threads/:threadId/pin not found in routes: ${JSON.stringify(routes)}`,
    );
  } finally {
    await app.close();
  }
});

test('DELETE /perplexity/threads/:threadId route is registered', async () => {
  const app = await createRoutedApp();

  try {
    const routes = getRegisteredRoutes(app);
    const found = routes.some(
      (r) =>
        r.method === 'DELETE' && r.path === '/perplexity/threads/:threadId',
    );
    assert.ok(
      found,
      `DELETE /perplexity/threads/:threadId not found in routes: ${JSON.stringify(routes)}`,
    );
  } finally {
    await app.close();
  }
});
