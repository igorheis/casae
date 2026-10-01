import {describe,it,expect} from 'vitest';
import {customShares,equalShares,rescaleShares,settleDebts} from './finance';
describe('divisão financeira em centavos',()=>{
 it('divide em partes iguais sem perder centavos',()=>{expect(equalShares(10000,['a','b','c'])).toEqual([{userId:'a',cents:3334},{userId:'b',cents:3333},{userId:'c',cents:3333}])});
 it('compensa dívidas nos dois sentidos',()=>{expect(settleDebts([{from:'João',to:'Igor',cents:10000},{from:'Igor',to:'João',cents:6000}])).toEqual([{from:'João',to:'Igor',cents:4000}])});
 it('equilibra saldos de várias pessoas',()=>{const r=settleDebts([{from:'B',to:'A',cents:10000},{from:'A',to:'B',cents:8000},{from:'C',to:'A',cents:4000}]);expect(r.reduce((s,x)=>s+x.cents,0)).toBe(6000);expect(r).toHaveLength(2)});
 it('rejeita divisão sem participantes',()=>{expect(()=>equalShares(100,[])).toThrow()});
 it('valida rateio personalizado por valor e porcentagem',()=>{expect(customShares(10000,['a','b'],[30,70],'VALUE')).toEqual([{userId:'a',cents:3000},{userId:'b',cents:7000}]);expect(customShares(10000,['a','b'],[25,75],'PERCENT')).toEqual([{userId:'a',cents:2500},{userId:'b',cents:7500}]);expect(()=>customShares(10000,['a','b'],[30,60],'VALUE')).toThrow()});
 it('preserva proporcionalidade e soma ao editar o total',()=>{const result=rescaleShares(165000,[{userId:'a',cents:30000},{userId:'b',cents:70000}]);expect(result.reduce((sum,x)=>sum+x.cents,0)).toBe(165000);expect(result).toEqual([{userId:'a',cents:49500},{userId:'b',cents:115500}])});
 it('cancela ciclos sem gerar transferências',()=>{expect(settleDebts([{from:'A',to:'B',cents:5000},{from:'B',to:'C',cents:5000},{from:'C',to:'A',cents:5000}])).toEqual([])});
});
