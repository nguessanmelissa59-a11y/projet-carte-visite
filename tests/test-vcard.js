const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildVCard30 } = require('../backend/services/vcard-builder');

const LINKEDIN = 'https://www.linkedin.com/in/ton-profil';
const PORTFOLIO = 'https://example.com/portfolio';

function countOccurrences(haystack, needle) {
  return (String(haystack).match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || [])
    .length;
}

describe('vCard URL uniqueness', () => {
  it('emits LinkedIn URL once (no ITEM*.URL duplicate)', () => {
    const vcf = buildVCard30({
      firstName: 'A',
      lastName: 'B',
      linkedinUrl: LINKEDIN,
      portfolioUrl: ''
    });
    assert.equal(countOccurrences(vcf, LINKEDIN), 1);
    assert.doesNotMatch(vcf, /ITEM\d+\.URL/);
    assert.match(vcf, /^URL:https:\/\/www\.linkedin\.com\/in\/ton-profil$/m);
  });

  it('dedupes when LinkedIn and portfolio are the same URL', () => {
    const vcf = buildVCard30({
      firstName: 'A',
      lastName: 'B',
      linkedinUrl: LINKEDIN,
      portfolioUrl: LINKEDIN
    });
    assert.equal(countOccurrences(vcf, LINKEDIN), 1);
  });

  it('keeps two distinct URLs once each', () => {
    const vcf = buildVCard30({
      firstName: 'A',
      lastName: 'B',
      linkedinUrl: LINKEDIN,
      portfolioUrl: PORTFOLIO
    });
    assert.equal(countOccurrences(vcf, LINKEDIN), 1);
    assert.equal(countOccurrences(vcf, PORTFOLIO), 1);
  });
});
