const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  extractCitationNumbers,
  normalizeCitationMarkers,
} = require('../src/ask/parsers/citation-marker.parser.ts');

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

test('extractCitationNumbers ignores zero and negative numbers', () => {
  assert.deepEqual(
    extractCitationNumbers('Invalid refs [0], [-1], [-99].', [1, 2]),
    [],
  );
});

test('extractCitationNumbers ignores a range where start equals end', () => {
  // [1-1] should resolve to [1] and not crash.
  assert.deepEqual(
    extractCitationNumbers('Degenerate range [1-1].', [1, 2]),
    [1],
  );
});

test('extractCitationNumbers ignores an inverted range', () => {
  // [3-1] is not a valid ascending range — should yield no citations.
  assert.deepEqual(
    extractCitationNumbers('Inverted range [3-1].', [1, 2, 3]),
    [],
  );
});

test('extractCitationNumbers handles whitespace-only bracket [ ] gracefully', () => {
  // "[ ]" contains no parseable number — should yield no citations.
  assert.deepEqual(
    extractCitationNumbers('Empty bracket [ ] here.', [1]),
    [],
  );
});

test('extractCitationNumbers handles double-comma group [1, , 3] gracefully', () => {
  // The empty token between commas must not throw; valid numbers are kept.
  assert.deepEqual(
    extractCitationNumbers('Double comma [1, , 3].', [1, 2, 3]),
    [1, 3],
  );
});

test('extractCitationNumbers returns empty list when source list is empty', () => {
  assert.deepEqual(
    extractCitationNumbers('Valid looking [1].', []),
    [],
  );
});
