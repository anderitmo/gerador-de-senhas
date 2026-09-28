import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generatePasswordOptions, calculateStrength, addToHistory, getHistory, clearAllHistory } from '../script.js';

// Simple localStorage polyfill/mock for test environment
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
});

describe('Password & PIN Generator Core Logic', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

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

  it('should generate PIN with only numbers of default length 4', () => {
    const pin = generatePasswordOptions({
      length: 4,
      includeNumbers: true,
      includeUppercase: false,
      includeLowercase: false,
      includeSymbols: false,
      mode: 'pin'
    });
    expect(pin).toHaveLength(4);
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

  it('should calculate password strength correctly', () => {
    const weak = calculateStrength('1234', 'pin');
    expect(weak.score).toBeLessThanOrEqual(2);

    const strong = calculateStrength('A!9k#Lp2$mZ9', 'custom');
    expect(strong.score).toBeGreaterThanOrEqual(3);
  });

  it('should add entry to history on copy action', () => {
    expect(getHistory()).toHaveLength(0);
    addToHistory('MySuperPassword123!', 'Senha');
    const history = getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].value).toBe('MySuperPassword123!');
  });
});
