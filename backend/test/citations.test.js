const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  extractCitationNumbers,
  normalizeCitationMarkers,
} = require('../dist/src/common/parsers/citations/citation-marker.parser.js');

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

test('normalizeCitationMarkers expands valid citation ranges', () => {
  assert.equal(
    normalizeCitationMarkers('Sources were not relevant [1-5].', [
      1, 2, 3, 4, 5,
    ]),
    'Sources were not relevant [1][2][3][4][5].',
  );
});

test('extractCitationNumbers expands valid citation ranges', () => {
  assert.deepEqual(
    extractCitationNumbers('Use [1-3], then [2] again.', [1, 2, 3]),
    [1, 2, 3],
  );
});

test('extractCitationNumbers supports grouped citation markers', () => {
  assert.deepEqual(
    extractCitationNumbers('Use [1, 3] and ignore [99].', [1, 2, 3]),
    [1, 3],
  );
});
