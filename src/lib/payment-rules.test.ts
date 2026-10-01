import {describe,it,expect} from 'vitest';
import {canConfirmPayment,canRejectPayment} from './payment-rules';
describe('confirmação de pagamentos',()=>{
 it('permite confirmação apenas ao recebedor e quando pendente',()=>{expect(canConfirmPayment('PENDING','igor','igor')).toBe(true);expect(canConfirmPayment('PENDING','joao','igor')).toBe(false);expect(canConfirmPayment('CONFIRMED','igor','igor')).toBe(false)});
 it('permite rejeição somente ao recebedor enquanto pendente',()=>{expect(canRejectPayment('PENDING','igor','igor')).toBe(true);expect(canRejectPayment('PENDING','joao','igor')).toBe(false)});
});
