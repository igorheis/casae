import {NextResponse} from 'next/server';
import {z} from 'zod';
import {currentUser} from '@/lib/auth';
import {db} from '@/lib/db';
import {customShares,equalShares,rescaleShares,settleDebts} from '@/lib/finance';
import {createNotification} from '@/lib/notifications';
import {audit} from '@/lib/audit';
import {canConfirmPayment,canRejectPayment} from '@/lib/payment-rules';
const fail=(message:string,status=400)=>NextResponse.json({error:message},{status});
async function member(groupId:string,userId:string){return db.groupMember.findUnique({where:{groupId_userId:{groupId,userId}}});}
export async function POST(req:Request){
 const user=await currentUser(); if(!user)return fail('Entre para continuar',401);
 try{
  const body=await req.json(); const action=z.string().parse(body.action);
  if(action==='create-group'){
   const name=z.string().min(2).max(80).parse(body.name);
   const group=await db.group.create({data:{name,description:String(body.description||''),emoji:String(body.emoji||'👋'),members:{create:{userId:user.id,role:'ADMIN'}}}});
   return NextResponse.json(group,{status:201});
  }
  if(action==='join-group'){
   const raw=z.string().min(4).parse(body.code); const code=raw.split('/').filter(Boolean).pop()!; const group=await db.group.findUnique({where:{inviteCode:code}});
   if(!group)return fail('Convite não encontrado',404);
   const existing=await db.groupMember.findUnique({where:{groupId_userId:{groupId:group.id,userId:user.id}}});
   if(!existing){await db.groupMember.create({data:{groupId:group.id,userId:user.id}});const events=await db.event.findMany({where:{groupId:group.id},select:{id:true,title:true}});if(events.length)await db.eventMember.createMany({data:events.map(e=>({eventId:e.id,userId:user.id})),skipDuplicates:true});await audit({groupId:group.id,actorId:user.id,action:'JOIN',entity:'GroupMember',summary:user.name+' entrou no grupo '+group.name});const others=await db.groupMember.findMany({where:{groupId:group.id,userId:{not:user.id}}});await Promise.all([...others.map(m=>createNotification({userId:m.userId,type:'GROUP',title:'Novo participante',message:user.name+' entrou no grupo '+group.name+'.',groupId:group.id,entityId:user.id})),...events.map(e=>createNotification({userId:user.id,type:'EVENT',title:'Você foi adicionado a um evento',message:e.title+' está no grupo '+group.name+'.',groupId:group.id,entityId:e.id}))])}
   return NextResponse.json({ok:true});
  }
  if(action==='invite-member'){
   const email=z.string().email().parse(body.email).toLowerCase(),groupId=z.string().parse(body.groupId);if(!await member(groupId,user.id))return fail('Sem acesso a este grupo',403);
   const target=await db.user.findUnique({where:{email},select:{id:true,name:true}});if(!target)return fail('A pessoa ainda não tem conta. Compartilhe o link do grupo para ela entrar.');
   if(await member(groupId,target.id))return fail('Esta pessoa já faz parte do grupo.');
   const group=await db.group.findUniqueOrThrow({where:{id:groupId}});
   await createNotification({userId:target.id,type:'GROUP',title:'Você foi convidado para um grupo',message:user.name+' convidou você para '+group.name+'.',groupId,entityId:group.inviteCode});
   return NextResponse.json({ok:true});
  }
  if(action==='remove-member'||action==='leave-group'){
   const groupId=z.string().parse(body.groupId),targetId=action==='leave-group'?user.id:z.string().parse(body.userId);
   const membership=await db.groupMember.findUnique({where:{groupId_userId:{groupId,userId:user.id}}});if(!membership)return fail('Sem acesso a este grupo',403);
   if(targetId!==user.id&&membership.role!=='ADMIN')return fail('Apenas administradores podem remover participantes.',403);
   const target=await db.groupMember.findUnique({where:{groupId_userId:{groupId,userId:targetId}},include:{user:{select:{name:true}}}});if(!target)return fail('Participante não encontrado.',404);
   if(target.role==='ADMIN'&&await db.groupMember.count({where:{groupId,role:'ADMIN'}})===1)return fail('Promova outra pessoa administradora antes de sair.');
   await audit({groupId,actorId:user.id,action:targetId===user.id?'LEAVE':'REMOVE_MEMBER',entity:'GroupMember',entityId:target.id,summary:target.user.name+(targetId===user.id?' saiu do grupo':' foi removido do grupo')});
   const events=await db.event.findMany({where:{groupId},select:{id:true}});if(events.length)await db.eventMember.deleteMany({where:{userId:targetId,eventId:{in:events.map(e=>e.id)}}});
   await db.groupMember.delete({where:{id:target.id}});
   if(targetId!==user.id)await createNotification({userId:targetId,type:'GROUP',title:'Atualização de grupo',message:'Você foi removido de um grupo.',groupId});
   return NextResponse.json({ok:true});
  }
  const groupId=z.string().parse(body.groupId);
  if(!await member(groupId,user.id))return fail('Sem acesso a este grupo',403);
  if(action==='availability'){
   const date=new Date(String(body.date)+'T12:00:00'); const status=z.enum(['FREE','BUSY','MAYBE']).parse(body.status);
   return NextResponse.json(await db.availability.upsert({where:{groupId_userId_date:{groupId,userId:user.id,date}},create:{groupId,userId:user.id,date,status},update:{status}}));
  }
  if(action==='commitment'){
   const v=z.object({title:z.string().min(1).max(120),startsAt:z.string(),endsAt:z.string().optional(),allDay:z.boolean().optional(),description:z.string().optional(),location:z.string().optional(),recurrence:z.string().optional()}).parse(body);
   return NextResponse.json(await db.commitment.create({data:{...v,startsAt:new Date(v.startsAt),endsAt:v.endsAt?new Date(v.endsAt):null,groupId,userId:user.id}}),{status:201});
  }
  if(action==='event'){
   const v=z.object({title:z.string().min(2),startsAt:z.string(),endsAt:z.string().optional(),location:z.string().optional(),emoji:z.string().optional()}).parse(body);
   const groupMembers=await db.groupMember.findMany({where:{groupId},select:{userId:true}});
   const event=await db.event.create({data:{...v,startsAt:new Date(v.startsAt),endsAt:v.endsAt?new Date(v.endsAt):null,groupId,members:{create:groupMembers.map(m=>({userId:m.userId}))}}});
   await audit({groupId,eventId:event.id,actorId:user.id,action:'CREATE',entity:'Event',entityId:event.id,summary:user.name+' criou o evento '+event.title});
   const recipients=groupMembers.filter(m=>m.userId!==user.id);await Promise.all(recipients.map(m=>createNotification({userId:m.userId,type:'EVENT',title:'Novo evento',message:user.name+' criou '+event.title+'.',groupId,entityId:event.id})));
   return NextResponse.json(event,{status:201});
  }
  if(action==='expense'){
   const v=z.object({eventId:z.string(),description:z.string().min(1),amountCents:z.number().int().positive(),category:z.enum(['LODGING','TRANSPORT','FOOD','DRINKS','TOURS','TICKETS','FUEL','SHOPPING','OTHER']),spentAt:z.string().optional(),participantIds:z.array(z.string()).min(1)}).parse(body);
   const event=await db.event.findFirst({where:{id:v.eventId,groupId},include:{members:true}});
   if(!event)return fail('Evento não encontrado',404);
   const allowed=new Set(event.members.map(m=>m.userId));
   if(v.participantIds.some(id=>!allowed.has(id))||!allowed.has(user.id))return fail('Participante inválido',403);
   const splitType=body.splitType==='VALUE'||body.splitType==='PERCENT'?body.splitType:'EQUAL';
   if(new Set(v.participantIds).size!==v.participantIds.length)return fail('Há participantes duplicados.');
   const shares=splitType==='EQUAL'?equalShares(v.amountCents,v.participantIds):customShares(v.amountCents,v.participantIds,z.array(z.number()).length(v.participantIds.length).parse(body.shares),splitType);
   const expense=await db.expense.create({data:{eventId:v.eventId,payerId:user.id,description:v.description,amountCents:v.amountCents,category:v.category,splitType,spentAt:v.spentAt?new Date(v.spentAt):new Date(),participants:{create:shares.map(s=>({userId:s.userId,shareCents:s.cents}))}}});
   await audit({groupId,eventId:v.eventId,actorId:user.id,action:'CREATE',entity:'Expense',entityId:expense.id,summary:user.name+' adicionou '+v.description+' por R$ '+(v.amountCents/100).toFixed(2)});
   const recipients=event.members.filter(m=>m.userId!==user.id);await Promise.all(recipients.map(m=>createNotification({userId:m.userId,type:'FINANCIAL',title:'Nova despesa',message:user.name+' adicionou uma nova despesa: '+v.description+'.',groupId,entityId:expense.id})));
   return NextResponse.json(expense,{status:201});
  }
  if(action==='profile'){
   const v=z.object({name:z.string().min(2),whatsapp:z.string().optional(),pixKey:z.string().optional(),pixType:z.enum(['CPF','CNPJ','EMAIL','PHONE','RANDOM']).optional()}).parse(body);
   return NextResponse.json(await db.user.update({where:{id:user.id},data:v,select:{id:true,name:true,email:true,whatsapp:true,pixKey:true,pixType:true}}));
  }
  if(action==='edit-expense'){
   const v=z.object({expenseId:z.string(),description:z.string().min(1).optional(),amountCents:z.number().int().positive().optional()}).parse(body);
   const expense=await db.expense.findFirst({where:{id:v.expenseId,event:{groupId}},include:{event:true,participants:true}});
   if(!expense)return fail('Despesa não encontrada.',404);if(!await db.groupMember.findUnique({where:{groupId_userId:{groupId,userId:user.id}},select:{role:true}})||expense.payerId!==user.id)return fail('Somente quem pagou pode editar esta despesa.',403);
   const newAmount=v.amountCents??expense.amountCents;
   const shares=v.amountCents?rescaleShares(newAmount,expense.participants.map(p=>({userId:p.userId,cents:p.shareCents}))):[];
   const updated=await db.$transaction(async tx=>{const saved=await tx.expense.update({where:{id:expense.id},data:{description:v.description,amountCents:newAmount}});for(const share of shares)await tx.expenseParticipant.update({where:{expenseId_userId:{expenseId:expense.id,userId:share.userId}},data:{shareCents:share.cents}});return saved});
   await audit({groupId,eventId:expense.eventId,actorId:user.id,action:'UPDATE',entity:'Expense',entityId:expense.id,summary:user.name+' alterou '+expense.description+' de R$ '+(expense.amountCents/100).toFixed(2)+' para '+(updated.description===expense.description?'R$ '+(updated.amountCents/100).toFixed(2):updated.description)});
   return NextResponse.json(updated);
  }
  if(action==='delete-expense'){
   const expenseId=z.string().parse(body.expenseId);const expense=await db.expense.findFirst({where:{id:expenseId,event:{groupId}},include:{event:true}});
   if(!expense)return fail('Despesa não encontrada.',404);const role=await db.groupMember.findUnique({where:{groupId_userId:{groupId,userId:user.id}},select:{role:true}});if(expense.payerId!==user.id&&role?.role!=='ADMIN')return fail('Sem permissão para excluir esta despesa.',403);
   await audit({groupId,eventId:expense.eventId,actorId:user.id,action:'DELETE',entity:'Expense',entityId:expense.id,summary:user.name+' excluiu a despesa '+expense.description});
   await db.expense.delete({where:{id:expense.id}});return NextResponse.json({ok:true});
  }
  if(action==='edit-event'){
   const v=z.object({eventId:z.string(),title:z.string().min(2).optional(),location:z.string().optional(),startsAt:z.string().optional(),endsAt:z.string().optional()}).parse(body);const role=await db.groupMember.findUnique({where:{groupId_userId:{groupId,userId:user.id}},select:{role:true}});if(role?.role!=='ADMIN')return fail('Apenas administradores podem alterar eventos.',403);const event=await db.event.findFirst({where:{id:v.eventId,groupId}});if(!event)return fail('Evento não encontrado.',404);
   const updated=await db.event.update({where:{id:event.id},data:{title:v.title,location:v.location,startsAt:v.startsAt?new Date(v.startsAt):undefined,endsAt:v.endsAt?new Date(v.endsAt):undefined}});
   await audit({groupId,eventId:event.id,actorId:user.id,action:'UPDATE',entity:'Event',entityId:event.id,summary:user.name+' alterou o evento '+event.title});return NextResponse.json(updated);
  }
  if(action==='payment'){
   const v=z.object({eventId:z.string(),toUserId:z.string(),amountCents:z.number().int().positive(),note:z.string().optional()}).parse(body);
   const outcome=await db.$transaction(async tx=>{
    const event=await tx.event.findFirst({where:{id:v.eventId,groupId},include:{members:true,expenses:{include:{participants:true}},payments:true}});
    if(!event||!event.members.some(m=>m.userId===user.id)||!event.members.some(m=>m.userId===v.toUserId))return {error:'Participante inválido.'};
    const original=event.expenses.flatMap(e=>e.participants.map(p=>({from:p.userId,to:e.payerId,cents:p.shareCents})));
    const reserved=event.payments.filter(p=>p.status!=='REJECTED').map(p=>({from:p.fromUserId,to:p.toUserId,cents:p.amountCents}));
    const due=settleDebts([...original,...reserved.map(p=>({from:p.to,to:p.from,cents:p.cents}))]).find(d=>d.from===user.id&&d.to===v.toUserId)?.cents||0;
    if(v.amountCents>due)return {error:'O valor excede o saldo em aberto entre estes participantes.'};
    const payment=await tx.payment.create({data:{eventId:v.eventId,fromUserId:user.id,toUserId:v.toUserId,amountCents:v.amountCents,note:v.note,status:'PENDING',markedById:user.id}});
    return {payment};
   },{isolationLevel:'Serializable'});
   if('error'in outcome&&typeof outcome.error==='string')return fail(outcome.error,403);
   if(!('payment'in outcome))return fail('Não foi possível registrar o pagamento.');
   const payment=outcome.payment;
   await audit({groupId,eventId:v.eventId,actorId:user.id,action:'MARK_PAID',entity:'Payment',entityId:payment.id,summary:user.name+' marcou '+(v.amountCents/100).toFixed(2)+' como pago'});
   const recipient=await db.user.findUnique({where:{id:v.toUserId},select:{name:true}});await createNotification({userId:v.toUserId,type:'FINANCIAL',title:'Pagamento informado',message:user.name+' informou um pagamento de R$ '+(v.amountCents/100).toFixed(2)+'. '+(recipient?.name||''),groupId,entityId:payment.id});
   return NextResponse.json(payment,{status:201});
  }
  if(action==='confirm-payment'){
   const paymentId=z.string().parse(body.paymentId);const payment=await db.payment.findFirst({where:{id:paymentId,event:{groupId},toUserId:user.id},include:{event:true,sender:{select:{name:true}}}});
   if(!payment)return fail('Pagamento não encontrado ou sem permissão.',404);if(!canConfirmPayment(payment.status,user.id,payment.toUserId))return fail('Este pagamento não está pendente ou você não é o recebedor.');
   const changed=await db.payment.updateMany({where:{id:payment.id,toUserId:user.id,status:'PENDING'},data:{status:'CONFIRMED',confirmedAt:new Date()}});if(changed.count!==1)return fail('Este pagamento já foi atualizado.');
   const updated=await db.payment.findUniqueOrThrow({where:{id:payment.id}});
   await audit({groupId,eventId:payment.eventId,actorId:user.id,action:'CONFIRM_PAYMENT',entity:'Payment',entityId:payment.id,summary:user.name+' confirmou o pagamento de R$ '+(payment.amountCents/100).toFixed(2)});
   await createNotification({userId:payment.fromUserId,type:'FINANCIAL',title:'Pagamento confirmado',message:user.name+' confirmou seu pagamento de R$ '+(payment.amountCents/100).toFixed(2)+'.',groupId,entityId:payment.id});
   return NextResponse.json(updated);
  }
  if(action==='reject-payment'){
   const paymentId=z.string().parse(body.paymentId);const payment=await db.payment.findFirst({where:{id:paymentId,event:{groupId},toUserId:user.id}});
   if(!payment)return fail('Pagamento não encontrado ou sem permissão.',404);if(!canRejectPayment(payment.status,user.id,payment.toUserId))return fail('Este pagamento já foi atualizado.');
   const changed=await db.payment.updateMany({where:{id:payment.id,toUserId:user.id,status:'PENDING'},data:{status:'REJECTED'}});if(changed.count!==1)return fail('Este pagamento já foi atualizado.');
   await audit({groupId,eventId:payment.eventId,actorId:user.id,action:'REJECT_PAYMENT',entity:'Payment',entityId:payment.id,summary:user.name+' rejeitou o pagamento informado de R$ '+(payment.amountCents/100).toFixed(2)});
   await createNotification({userId:payment.fromUserId,type:'FINANCIAL',title:'Pagamento não confirmado',message:user.name+' não confirmou o pagamento registrado. Verifique com a pessoa.',groupId,entityId:payment.id});
   return NextResponse.json({ok:true});
  }
  return fail('Ação desconhecida');
 }catch(e){return fail(e instanceof Error?e.message:'Dados inválidos');}
}
