function field(id:string,value:string){return id+String(value.length).padStart(2,'0')+value}
function crc16(payload:string){let crc=0xffff;for(const char of payload){crc^=char.charCodeAt(0)<<8;for(let i=0;i<8;i++)crc=(crc&0x8000)?((crc<<1)^0x1021)&0xffff:(crc<<1)&0xffff;}return crc.toString(16).toUpperCase().padStart(4,'0')}
function clean(value:string,max:number){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9 ]/g,' ').trim().replace(/\s+/g,' ').toUpperCase().slice(0,max)||'CASAE'}
export function pixPayload(input:{key:string;name:string;city:string;amountCents:number;txid?:string}){
 if(!input.key||input.key.length>77||!Number.isInteger(input.amountCents)||input.amountCents<1)throw new Error('Dados Pix inválidos.');
 const account=field('00','br.gov.bcb.pix')+field('01',input.key);
 const amount=(input.amountCents/100).toFixed(2);
 const base='000201'+field('01','12')+field('26',account)+field('52','0000')+field('53','986')+field('54',amount)+field('58','BR')+field('59',clean(input.name,25))+field('60',clean(input.city,15))+field('62',field('05',(input.txid||'***').slice(0,25)));
 const withCrc=base+'6304';return withCrc+crc16(withCrc);
}
