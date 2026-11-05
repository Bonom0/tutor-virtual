import { describe, expect, it } from 'vitest';
import { formatLevel, formatPercentage } from './format';

describe('formatadores de progresso', () => {
  it('formata percentual e nível', () => {
    expect(formatPercentage(0.756)).toBe('76%');
    expect(formatLevel(-0.1234)).toBe('-0.12');
  });
});
