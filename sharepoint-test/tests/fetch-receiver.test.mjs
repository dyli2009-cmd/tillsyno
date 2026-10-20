import test from 'node:test';
import assert from 'node:assert/strict';
import { ReadOnlySharePoint } from '../src/read-only.mjs';

// Node's built-in fetch and the original arrow-function mocks do not enforce
// Window's receiver check. These normal functions intentionally do.
test('default Graph fetch keeps the global receiver instead of the client', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async function (url, options) {
    assert.equal(this, globalThis, 'Window.fetch must be called on the global object');
    calls.push({ url, options });
    return Response.json({ value: [] });
  });
  const client = new ReadOnlySharePoint({ getToken: async () => 'test-token' });
  assert.deepEqual(await client.all('/v1.0/sites/test/drives'), []);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, 'GET');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-token');
});

test('default PDF fetch keeps the global receiver and never forwards the token', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async function (url, options) {
    assert.equal(this, globalThis, 'PDF download must also keep the global receiver');
    calls.push({ url, options });
    if (calls.length === 1) return Response.json({
      id: 'pdf', name: 'test.pdf', size: 8, file: {},
      '@microsoft.graph.downloadUrl': 'https://tillsyno.sharepoint.com/download-test'
    });
    return new Response('%PDF-1.7');
  });
  const client = new ReadOnlySharePoint({ getToken: async () => 'test-token' });
  const result = await client.pdf('drive', 'pdf');
  assert.equal(await result.blob.text(), '%PDF-1.7');
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.method, 'GET');
  assert.equal(calls[1].options.headers, undefined);
});
