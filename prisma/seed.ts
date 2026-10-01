import {PrismaClient} from '@prisma/client';
import bcrypt from 'bcryptjs';
const db=new PrismaClient();
async function main(){
 const names=['Igor','João','Pedro','Lucas','Mariana'],emails=['igor@demo.junto.app','joao@demo.junto.app','pedro@demo.junto.app','lucas@demo.junto.app','mariana@demo.junto.app'];
 const users=[];for(let i=0;i<names.length;i++)users.push(await db.user.upsert({where:{email:emails[i]},update:{},create:{name:names[i],email:emails[i],passwordHash:await bcrypt.hash('Junto2026!',12),...(i===0?{pixType:'EMAIL' as const,pixKey:emails[0]}:{})}}));
 const g=await db.group.upsert({where:{inviteCode:'reveillon-rio-2027'},update:{},create:{name:'Réveillon no Rio 🎆',description:'Uma virada inesquecível com os amigos.',emoji:'🎆',inviteCode:'reveillon-rio-2027'}});
 for(let i=0;i<users.length;i++)await db.groupMember.upsert({where:{groupId_userId:{groupId:g.id,userId:users[i].id}},update:{},create:{groupId:g.id,userId:users[i].id,role:i===0?'ADMIN':'MEMBER'}});
 const event=await db.event.upsert({where:{id:'demo-reveillon-2027'},update:{},create:{id:'demo-reveillon-2027',groupId:g.id,title:'Réveillon no Rio',emoji:'🎆',location:'Rio de Janeiro',startsAt:new Date('2027-01-01T18:00:00-03:00'),endsAt:new Date('2027-01-05T12:00:00-03:00')}});
 for(const u of users)await db.eventMember.upsert({where:{eventId_userId:{eventId:event.id,userId:u.id}},update:{},create:{eventId:event.id,userId:u.id}});
 if(!await db.expense.count({where:{eventId:event.id}})){const rows=[['Hospedagem — sinal',0,150000,'LODGING'],['Jantar de planejamento',1,60000,'FOOD'],['Passeios e transporte',2,40000,'TRANSPORT']] as const;for(const [description,payer,amount,category] of rows)await db.expense.create({data:{eventId:event.id,payerId:users[payer].id,description,amountCents:amount,category,spentAt:new Date('2026-09-20T12:00:00-03:00'),participants:{create:users.map(u=>({userId:u.id,shareCents:amount/5}))}}})}
 if(!await db.commitment.count({where:{groupId:g.id}}))await db.commitment.createMany({data:[{groupId:g.id,userId:users[0].id,title:'Dentista',startsAt:new Date('2026-12-15T14:00:00-03:00'),endsAt:new Date('2026-12-15T15:00:00-03:00'),location:'Centro'},{groupId:g.id,userId:users[1].id,title:'Academia',startsAt:new Date('2026-12-16T18:00:00-03:00'),endsAt:new Date('2026-12-16T19:00:00-03:00')},{groupId:g.id,userId:users[3].id,title:'Almoço em família',startsAt:new Date('2026-12-18T12:00:00-03:00')}]});
 for(const [d,states] of [[10,['FREE','FREE','FREE','FREE','FREE']],[11,['FREE','BUSY','FREE','BUSY','FREE']],[12,['BUSY','BUSY','BUSY','BUSY','BUSY']]] as const)for(let i=0;i<users.length;i++){const date=new Date(`2026-12-${d}T12:00:00.000Z`);await db.availability.upsert({where:{groupId_userId_date:{groupId:g.id,userId:users[i].id,date}},update:{status:states[i]},create:{groupId:g.id,userId:users[i].id,date,status:states[i]}})}
 console.log('Seed concluído. Acesso: igor@demo.junto.app / Junto2026!');
}
main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>db.$disconnect());
