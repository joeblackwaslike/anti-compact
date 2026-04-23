/**
 * Load fixture files by name from tests/fixtures/.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

/**
 * Load a fixture file as a string.
 * @param {string} name - filename (e.g. 'session-precompact.jsonl')
 * @returns {string}
 */
export function loadFixtureText(name) {
  return readFileSync(join(FIXTURES_DIR, name), 'utf8');
}

/**
 * Absolute path to a fixture file.
 * @param {string} name
 * @returns {string}
 */
export function fixturePath(name) {
  return join(FIXTURES_DIR, name);
}
