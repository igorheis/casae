import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {createNotification} from '@/lib/notifications';
import {commitmentReminderMessage,reminderDue} from '@/lib/notification-rules';
export async function POST(req:NextRequest){
 const secret=process.env.CRON_SECRET;if(!secret||req.headers.get('authorization')!=='Bearer '+secret)return NextResponse.json({error:'Não autorizado'},{status:401});
 const now=new Date(),windowEnd=new Date(now.getTime()+8*24*60*60*1000);
 const [commitments,events]=await Promise.all([db.commitment.findMany({where:{startsAt:{gt:now,lte:windowEnd}},include:{group:{select:{id:true}}}}),db.event.findMany({where:{startsAt:{gt:now,lte:windowEnd}},include:{group:{select:{id:true}},members:{select:{userId:true}}}})]);
 let created=0;
 for(const c of commitments){const pref=await db.notificationPreference.upsert({where:{userId:c.userId},create:{userId:c.userId},update:{}});if(!pref.commitments||!reminderDue(c.startsAt,now,pref.reminderMinutes))continue;const message=commitmentReminderMessage(c.startsAt,now);if(await createNotification({userId:c.userId,type:'COMMITMENT',title:c.title,message,entityId:c.id,groupId:c.groupId,dedupeKey:'commitment:'+c.id+':'+pref.reminderMinutes}))created++;}
 for(const e of events){const days=Math.ceil((e.startsAt.getTime()-now.getTime())/86_400_000);for(const m of e.members){const pref=await db.notificationPreference.upsert({where:{userId:m.userId},create:{userId:m.userId},update:{}});if(!pref.events)continue;const reminder=new Date(e.startsAt.getTime()-pref.reminderMinutes*60_000),weekly=days<=7&&days>6;if(reminder>now&&!weekly)continue;const message=weekly?e.title+' começa em 7 dias.':days<=1?'Seu evento começa amanhã.':e.title+' começa em '+days+' dias.';const key=weekly?'7d':'reminder-'+pref.reminderMinutes;if(await createNotification({userId:m.userId,type:'EVENT',title:e.title,message,entityId:e.id,groupId:e.groupId,dedupeKey:'event:'+e.id+':'+m.userId+':'+key}))created++;}}
 return NextResponse.json({created,checked:commitments.length+events.length});
}
