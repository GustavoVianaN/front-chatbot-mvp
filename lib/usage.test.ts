import { describe, expect, it } from 'vitest';
import { usagePercentage } from './usage';
describe('usagePercentage',()=>{
  it('calcula e limita o percentual do plano',()=>{expect(usagePercentage(25,100)).toBe(25);expect(usagePercentage(150,100)).toBe(100)});
  it('trata plano sem cota ativa',()=>{expect(usagePercentage(0,0)).toBe(0);expect(usagePercentage(1,0)).toBe(100)});
});
