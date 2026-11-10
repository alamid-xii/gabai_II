import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSchoolQuery, prefersFilipino } from './chatLanguage.js';

test('Filipino and Taglish terms map to school retrieval vocabulary', () => {
  assert.equal(normalizeSchoolQuery('Mga papeles sa pagpapatala'), 'mga documents sa enrollment');
  assert.equal(normalizeSchoolQuery('Paano mag-enroll?'), 'paano enroll?');
  assert.equal(normalizeSchoolQuery('Ano ang kursong inaalok?'), 'ano ang course offered?');
  assert.equal(normalizeSchoolQuery('Iskedyul ng asignatura'), 'schedule ng subject');
  assert.equal(prefersFilipino('Ano ang requirements po?'), true);
  assert.equal(prefersFilipino('Please answer in Tagalog'), true);
  assert.equal(prefersFilipino('What are the requirements?'), false);
});
