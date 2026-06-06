const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  extractCitationNumbers,
} = require('../dist/src/citations/citation-marker.parser.js');

test('extractCitationNumbers keeps valid markers in first-seen order', () => {
  assert.deepEqual(
    extractCitationNumbers('Use [2] before [1], then [2] again.', [1, 2]),
    [2, 1],
  );
});

test('extractCitationNumbers ignores invalid and missing source markers', () => {
  assert.deepEqual(
    extractCitationNumbers('Use [1], ignore [99], [0], and text [abc].', [1, 2]),
    [1],
  );
});

test('extractCitationNumbers returns an empty list when no markers exist', () => {
  assert.deepEqual(extractCitationNumbers('No citations here.', [1]), []);
});
