import webpush from 'web-push';
import type {NotificationType} from '@prisma/client';
import {db} from '@/lib/db';
import {notificationAllowed} from '@/lib/notification-rules';
const categoryFor:Record<NotificationType,'commitments'|'events'|'financial'|'groups'|null>={COMMITMENT:'commitments',EVENT:'events',FINANCIAL:'financial',GROUP:'groups',SYSTEM:null};
export async function createNotification(input:{userId:string;type:NotificationType;title:string;message:string;entityId?:string;groupId?:string;dedupeKey?:string}){
 const category=categoryFor[input.type];
 if(category){const pref=await db.notificationPreference.upsert({where:{userId:input.userId},create:{userId:input.userId},update:{}});if(!notificationAllowed(input.type,pref))return null;}
 try{const notification=await db.notification.create({data:input});if(category){const pref=await db.notificationPreference.findUnique({where:{userId:input.userId}});if(pref?.pushEnabled&&await pushToUser(input.userId,{title:input.title,body:input.message,url:'/?section=Notificações'}))await db.notification.update({where:{id:notification.id},data:{pushedAt:new Date()}});}return notification;}catch(e){if(input.dedupeKey)return null;throw e;}
}
export async function pushToUser(userId:string,payload:{title:string;body:string;url?:string}):Promise<boolean>{
 const {VAPID_PUBLIC_KEY,VAPID_PRIVATE_KEY,VAPID_SUBJECT}=process.env;if(!VAPID_PUBLIC_KEY||!VAPID_PRIVATE_KEY||!VAPID_SUBJECT)return false;
 webpush.setVapidDetails(VAPID_SUBJECT,VAPID_PUBLIC_KEY,VAPID_PRIVATE_KEY);
 const subscriptions=await db.pushSubscription.findMany({where:{userId}});
 const results=await Promise.all(subscriptions.map(async sub=>{try{await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify(payload));return true;}catch(err){if(typeof err==='object'&&err&&'statusCode'in err&&((err as {statusCode:number}).statusCode===404||(err as {statusCode:number}).statusCode===410))await db.pushSubscription.delete({where:{id:sub.id}});return false;}}));return results.some(Boolean);
}
