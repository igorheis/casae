import {NextRequest,NextResponse} from 'next/server';
import QRCode from 'qrcode';
import {z} from 'zod';
import {currentUser} from '@/lib/auth';
import {db} from '@/lib/db';
import {settleDebts} from '@/lib/finance';
import {pixPayload} from '@/lib/pix';
export async function POST(req:NextRequest){
 const user=await currentUser();if(!user)return NextResponse.json({error:'Entre para continuar'},{status:401});
 try{
  const input=z.object({eventId:z.string(),toUserId:z.string(),amountCents:z.number().int().positive().optional()}).parse(await req.json());
  const event=await db.event.findFirst({where:{id:input.eventId,members:{some:{userId:user.id}}},include:{members:true,expenses:{include:{participants:true}},payments:{where:{status:'CONFIRMED'}}}});
  if(!event||!event.members.some(m=>m.userId===input.toUserId))return NextResponse.json({error:'Evento ou participante inválido.'},{status:403});
  const original=event.expenses.flatMap(e=>e.participants.map(p=>({from:p.userId,to:e.payerId,cents:p.shareCents})));
  const paid=event.payments.map(p=>({from:p.toUserId,to:p.fromUserId,cents:p.amountCents}));
  const due=settleDebts([...original,...paid]).find(d=>d.from===user.id&&d.to===input.toUserId)?.cents||0;
  const amountCents=input.amountCents??due;if(due===0||amountCents>due)return NextResponse.json({error:'Não há saldo Pix em aberto para esse participante ou valor.'},{status:400});
  const receiver=await db.user.findUnique({where:{id:input.toUserId},select:{name:true,pixKey:true}});
  if(!receiver?.pixKey)return NextResponse.json({error:'Este participante ainda não cadastrou uma chave Pix.'},{status:404});
  const payload=pixPayload({key:receiver.pixKey,name:receiver.name,city:'SAO PAULO',amountCents});
  const qrCode=await QRCode.toDataURL(payload,{errorCorrectionLevel:'M',margin:2,width:320});
  return NextResponse.json({receiverName:receiver.name,pixKey:receiver.pixKey,amountCents,payload,qrCode});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Dados Pix inválidos.'},{status:400});}
}
