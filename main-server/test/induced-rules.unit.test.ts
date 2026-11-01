/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { type PlaceDto } from '../src/places/dto/place.dto.js';
import {
  checkPattern,
  checkReplace,
  type CompiledRule,
  compileRule,
  compileRules,
  formOf,
  rewriteOf,
} from '../src/places/induced-rules.js';
import { PlaceIndex } from '../src/places/place-index.js';

// The language of the induced rules (P07 ticket 07): what it refuses, what a rule may write, and the tier the index
// gives their hits, on hand-made Places.

const places: PlaceDto[] = [
  { id: 'hall', number: '63', name: '학생회관', latitude: 0, longitude: 0 },
  { id: 'business', number: '58', name: '경영대학', latitude: 0, longitude: 0 },
  { id: 'science', number: '25', name: '자연과학대학', latitude: 0, longitude: 0 },
  { id: 'library', number: '62', name: '중앙도서관 본관', latitude: 0, longitude: 0 },
];

function rule(kind: 'name' | 'words', pattern: string, replace: string): CompiledRule {
  const compiled = compileRule(`${kind}:${pattern}`, { kind, pattern, replace });
  if ('refusal' in compiled) {
    throw new Error(compiled.refusal);
  }
  return compiled.rule;
}

describe('The pattern check', () => {
  it.each([
    '^(.{1,3}?)(?:과학|과|학)?대학$',
    '^윗(.+)$',
    '[가-힣]+관',
    '^(공|자연)?대$',
    '\\d+동',
    'a+?b',
    '^(?:중앙|관정)도서관$',
  ])('allows %s', (pattern) => {
    expect(checkPattern(pattern)).toBeNull();
  });

  it.each([
    ['(.)\\1', 'a backreference'],
    ['(?=학)관', 'a lookahead'],
    ['(?<!학)관', 'a lookbehind'],
    ['(가-힣)+', 'a quantified group'],
    ['(가-힣)*', 'a quantified group'],
    ['a**', 'a nested quantifier'],
    ['a{2,99}', 'a wide bound'],
    ['a{3,2}', 'bounds in the wrong order'],
    ['(관', 'an open group'],
    ['관)', 'a stray close'],
    ['|관', 'a bar at the start'],
    ['관|', 'a bar at the end'],
    ['[]', 'an empty class'],
    ['[관', 'an open class'],
    ['*관', 'a quantifier at the start'],
    ['^*', 'a quantifier after an anchor'],
    ['((((a))))', 'groups too deep'],
    ['\\p{L}', 'an escape outside the list'],
    ['', 'nothing'],
  ])('refuses %s, %s', (pattern) => {
    expect(checkPattern(pattern)).toBe('pattern not allowed');
  });

  it('refuses a pattern over 80 characters', () => {
    expect(checkPattern('가'.repeat(81))).toBe('pattern too long');
  });
});

describe('The replacement check and the compile', () => {
  it('allows literals and $1 to $9, and refuses the rest', () => {
    expect(checkReplace('$1대')).toBeNull();
    expect(checkReplace('상부$1')).toBeNull();
    expect(checkReplace('$&')).toBe('replacement not allowed');
    expect(checkReplace('$0')).toBe('replacement not allowed');
    expect(checkReplace('a\\b')).toBe('replacement not allowed');
    expect(checkReplace('')).toBe('replacement not allowed');
    expect(checkReplace('가'.repeat(41))).toBe('replacement not allowed');
  });

  it('compiles an allowed rule and reports the refusal of another', () => {
    expect(compileRule('r', { kind: 'words', pattern: '^윗(.+)$', replace: '상부$1' })).toMatchObject({
      rule: { id: 'r', kind: 'words' },
    });
    expect(compileRule('r', { kind: 'words', pattern: '(.)\\1', replace: '$1' })).toEqual({
      refusal: 'pattern not allowed',
    });
    expect(
      compileRules([
        { id: 'a', kind: 'name', pattern: '^(.)$', replace: '$1$1' },
        { id: 'b', kind: 'name', pattern: '(', replace: 'x' },
      ]),
    ).toMatchObject({
      rules: [{ id: 'a' }],
      refused: [{ id: 'b', refusal: 'pattern not allowed' }],
    });
  });
});

describe('What a rule writes', () => {
  const college = rule('name', '^(.{1,3}?)(?:과학|과|학)?대학$', '$1대');
  const upper = rule('words', '^윗(.+)$', '상부$1');

  it('makes a form of a name the pattern fits, never of another', () => {
    expect(formOf(college, '경영대학')).toBe('경영대');
    expect(formOf(college, '자연과학대학')).toBe('자연대');
    expect(formOf(college, '학생회관')).toBeNull();
    expect(formOf(upper, '경영대학')).toBeNull();
  });

  it('refuses a form of one character, one as long as the name, or one unlike a name', () => {
    expect(formOf(rule('name', '^(.)(.+)$', '$1'), '경영대학')).toBeNull();
    expect(formOf(rule('name', '^(.+)$', '$1'), '경영대학')).toBeNull();
    expect(formOf(rule('name', '^(.+)$', '$1!'), '경영대학')).toBeNull();
  });

  it('rewrites words the pattern fits into other words, and nothing else', () => {
    expect(rewriteOf(upper, '윗공대')).toBe('상부공대');
    expect(rewriteOf(upper, '아랫공대')).toBeNull();
    expect(rewriteOf(rule('words', '^(.+)$', '$1'), '윗공대')).toBeNull();
    expect(rewriteOf(college, '윗공대')).toBeNull();
  });
});

describe('The induced tier', () => {
  const college = rule('name', '^(.{1,3}?)(?:과학|과|학)?대학$', '$1대');
  const prefix = rule('words', '^뷁(.+)$', '$1');
  const literal = rule('words', '^자대$', '자연과학대학');
  const index = new PlaceIndex(places, [], { rules: [college, prefix, literal], holdbackPercent: 0 });

  it('answers a form a name rule made, after the exact names and before the generated forms', async () => {
    await expect(index.match('자연대', 'u')).resolves.toMatchObject({ tier: 'induced', places: [{ id: 'science' }] });
    await expect(index.match('경대', 'u')).resolves.toMatchObject({ tier: 'generated', places: [{ id: 'business' }] });
    await expect(index.match('경영대학', 'u')).resolves.toMatchObject({ tier: 'exact' });
    const narrowing = new PlaceIndex(places, [], { rules: [rule('words', '^경대$', '경영대학')], holdbackPercent: 0 });
    await expect(narrowing.match('경대', 'u')).resolves.toMatchObject({
      tier: 'induced',
      places: [{ id: 'business' }],
    });
  });

  it('answers the exact, generated and induced forms of what a words rule wrote', async () => {
    await expect(index.match('뷁학생회관', 'u')).resolves.toMatchObject({ tier: 'induced', places: [{ id: 'hall' }] });
    await expect(index.match('뷁경대', 'u')).resolves.toMatchObject({ tier: 'induced', places: [{ id: 'business' }] });
    await expect(index.match('뷁자연대', 'u')).resolves.toMatchObject({ tier: 'induced', places: [{ id: 'science' }] });
    await expect(index.match('뷁없', 'u')).resolves.toMatchObject({ tier: null, places: [] });
  });

  it('comes before the loose tiers', async () => {
    await expect(index.match('자대', 'u')).resolves.toMatchObject({ tier: 'induced', places: [{ id: 'science' }] });
    await expect(new PlaceIndex(places, []).match('자대', 'u')).resolves.toMatchObject({ tier: 'subsequence' });
  });

  it('never answers a held-back account', async () => {
    const heldBack = new PlaceIndex(places, [], { rules: [prefix], holdbackPercent: 100 });
    await expect(heldBack.match('뷁학생회관', 'u')).resolves.toMatchObject({ tier: null });
    await expect(heldBack.match('학생회관', 'u')).resolves.toMatchObject({ tier: 'exact' });
  });
});
