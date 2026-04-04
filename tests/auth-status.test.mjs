import assert from 'node:assert/strict';
import { getAuthStatus } from '../dist/api/auth-status.js';

const result = await getAuthStatus();
assert.equal(typeof result.ok, 'boolean');
assert.ok('linear' in result || 'error' in result);
console.log('auth-status test passed');
