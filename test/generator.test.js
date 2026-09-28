import { describe, it, expect } from 'vitest';
import { generatePasswordOptions, calculateStrength, CHAR_SETS } from './script.js';

describe('Password & PIN Generator Core Logic', () => {
  it('should generate password of default length 10', () => {
    const pwd = generatePasswordOptions({
      length: 10,
      includeNumbers: true,
      includeUppercase: true,
      includeLowercase: true,
      includeSymbols: true,
      mode: 'custom'
    });
    expect(pwd).toHaveLength(10);
  });

  it('should generate PIN with only numbers of length 6', () => {
    const pin = generatePasswordOptions({
      length: 6,
      includeNumbers: true,
      includeUppercase: false,
      includeLowercase: false,
      includeSymbols: false,
      mode: 'pin'
    });
    expect(pin).toHaveLength(6);
    expect(/^\d+$/.test(pin)).toBe(true);
  });

  it('should respect selected character sets (numbers only)', () => {
    const pwd = generatePasswordOptions({
      length: 12,
      includeNumbers: true,
      includeUppercase: false,
      includeLowercase: false,
      includeSymbols: false,
      mode: 'custom'
    });
    expect(/^\d+$/.test(pwd)).toBe(true);
  });

  it('should respect selected character sets (letters only)', () => {
    const pwd = generatePasswordOptions({
      length: 15,
      includeNumbers: false,
      includeUppercase: true,
      includeLowercase: true,
      includeSymbols: false,
      mode: 'custom'
    });
    expect(/^[a-zA-Z]+$/.test(pwd)).toBe(true);
  });

  it('should calculate password strength correctly', () => {
    const weak = calculateStrength('1234', 'pin');
    expect(weak.score).toBeLessThanOrEqual(2);

    const strong = calculateStrength('A!9k#Lp2$mZ9', 'custom');
    expect(strong.score).toBeGreaterThanOrEqual(3);
  });
});
