import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';

test('GET /api/health returns 200 and healthy status', async (t) => {
  const server = app.listen(0);
  const { port } = server.address();

  t.after(() => {
    server.close();
  });

  const res = await fetch(`http://127.0.0.1:${port}/api/health`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.status, 'ok');
  assert.equal(data.service, 'ShopEasy API');
  assert.ok(data.timestamp);
  assert.ok(data.uptime);
});

test('GET /api/unknown returns 404 with standard error format', async (t) => {
  const server = app.listen(0);
  const { port } = server.address();

  t.after(() => {
    server.close();
  });

  const res = await fetch(`http://127.0.0.1:${port}/api/unknown-endpoint`);
  const data = await res.json();

  assert.equal(res.status, 404);
  assert.equal(data.success, false);
  assert.ok(data.message.includes('Resource Not Found'));
});
