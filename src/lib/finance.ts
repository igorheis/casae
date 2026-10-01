export type Debt = { from: string; to: string; cents: number };
export function settleDebts(entries: Debt[]): Debt[] {
  const balance = new Map<string, number>();
  for (const { from, to, cents } of entries) {
    balance.set(from, (balance.get(from) ?? 0) - cents);
    balance.set(to, (balance.get(to) ?? 0) + cents);
  }
  const debtors = [...balance].filter(([, v]) => v < 0).map(([id, v]) => ({ id, cents: -v })).sort((a,b)=>a.id.localeCompare(b.id));
  const creditors = [...balance].filter(([, v]) => v > 0).map(([id, v]) => ({ id, cents: v })).sort((a,b)=>a.id.localeCompare(b.id));
  const result: Debt[] = []; let i=0, j=0;
  while (i<debtors.length && j<creditors.length) {
    const cents = Math.min(debtors[i].cents, creditors[j].cents);
    if (cents > 0) result.push({ from: debtors[i].id, to: creditors[j].id, cents });
    debtors[i].cents -= cents; creditors[j].cents -= cents;
    if (debtors[i].cents===0) i++; if (creditors[j].cents===0) j++;
  }
  return result;
}
export function equalShares(totalCents:number, ids:string[]): {userId:string;cents:number}[] {
  if (!ids.length || !Number.isInteger(totalCents) || totalCents < 0) throw new Error('Valor ou participantes inválidos');
  const base=Math.floor(totalCents/ids.length), remainder=totalCents%ids.length;
  return ids.map((userId,i)=>({userId,cents:base+(i<remainder?1:0)}));
}
export function customShares(totalCents:number, ids:string[], values:number[], mode:'VALUE'|'PERCENT'): {userId:string;cents:number}[] {
  if (!ids.length || ids.length!==values.length || !Number.isInteger(totalCents) || totalCents<=0 || values.some(v=>!Number.isFinite(v)||v<0)) throw new Error('Divisão inválida');
  if(mode==='VALUE'){
    const cents=values.map(v=>Math.round(v*100));
    if(cents.reduce((a,b)=>a+b,0)!==totalCents) throw new Error('A soma dos valores precisa ser igual ao total.');
    return ids.map((userId,i)=>({userId,cents:cents[i]}));
  }
  const basis=values.map(v=>Math.round(v*100));
  if(basis.reduce((a,b)=>a+b,0)!==10000) throw new Error('A soma das porcentagens precisa ser 100%.');
  const exact=basis.map(v=>totalCents*v/10000),floors=exact.map(Math.floor);
  let remaining=totalCents-floors.reduce((a,b)=>a+b,0);
  const order=exact.map((v,i)=>({i,remainder:v-floors[i]})).sort((a,b)=>b.remainder-a.remainder);
  for(let i=0;i<remaining;i++)floors[order[i].i]++;
  return ids.map((userId,i)=>({userId,cents:floors[i]}));
}
export function rescaleShares(totalCents:number, shares:{userId:string;cents:number}[]):{userId:string;cents:number}[]{
  const oldTotal=shares.reduce((sum,s)=>sum+s.cents,0);
  if(!shares.length||oldTotal<=0||!Number.isInteger(totalCents)||totalCents<=0)throw new Error('Rateio atual inválido.');
  const exact=shares.map(s=>totalCents*s.cents/oldTotal),cents=exact.map(Math.floor);
  let remaining=totalCents-cents.reduce((a,b)=>a+b,0);
  const order=exact.map((v,i)=>({i,r:v-cents[i]})).sort((a,b)=>b.r-a.r);
  for(let i=0;i<remaining;i++)cents[order[i].i]++;
  return shares.map((s,i)=>({userId:s.userId,cents:cents[i]}));
}
