import {describe,it,expect} from 'vitest';
import {pixPayload} from './pix';
describe('Pix copia e cola',()=>{
 it('gera payload BR Code com valor e CRC16',()=>{const payload=pixPayload({key:'igor@example.com',name:'Igor Heis',city:'São Paulo',amountCents:18000});expect(payload).toContain('br.gov.bcb.pix');expect(payload).toContain('5406180.00');expect(payload.endsWith('6304') ).toBe(false);expect(payload).toMatch(/6304[0-9A-F]{4}$/)});
 it('rejeita chave vazia e valor inválido',()=>{expect(()=>pixPayload({key:'',name:'A',city:'B',amountCents:1})).toThrow();expect(()=>pixPayload({key:'a',name:'A',city:'B',amountCents:0})).toThrow()});
});
