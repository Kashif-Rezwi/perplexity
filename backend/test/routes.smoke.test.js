/**
 * routes.smoke.test.js
 *
 * Verifies that the RouterModule wiring in AppModule produces the correct three
 * API routes. Uses the compiled dist output and NestJS metadata reflection so
 * no real database or external API calls are made.
 *
 * Guards against route regressions when controllers or RouterModule config is
 * changed (e.g. the /perplexity prefix being accidentally removed or a route
 * path typo being introduced).
 */

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/src/app.module.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Boot a minimal NestJS application with the real AppModule (including
 * RouterModule). We do NOT call app.listen(), so no port is bound and no
 * network I/O happens. We call app.init() which wires all routes.
 *
 * All injectable services that require external resources (database, OpenAI,
 * Tavily) are never invoked because we only inspect route metadata, not
 * actually make requests. NestJS will throw if DI fails, but since we are
 * using ConfigModule with isGlobal=true and real providers are lazy (they
 * only validate env vars when a method is called, not at construction time),
 * the application boots cleanly even without real credentials.
 */
async function createRoutedApp() {
  const app = await NestFactory.create(AppModule, {
    // Suppress Nest startup logs during tests.
    logger: false,
  });
  await app.init();
  return app;
}

/**
 * Extracts all registered route paths and methods from a booted NestJS
 * application using the internal HttpAdapter + Express router stack.
 *
 * Returns an array of { method, path } objects.
 */
function getRegisteredRoutes(app) {
  const httpAdapter = app.getHttpAdapter();
  // getInstance() returns the Express application instance.
  // .router is the Express application's internal router, populated after init.
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
      // Nested router (e.g. RouterModule sub-routers)
      const prefix = layer.regexp.source
        .replace(/\\\//g, '/')
        .replace(/\^\\\//, '/')
        .replace(/\?(?:\(\?:\(\\\\\?:|\\\(\?:).*$/s, '')
        .replace(/\\/g, '')
        .replace(/\?$/, '');
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

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
