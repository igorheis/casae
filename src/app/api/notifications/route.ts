import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {currentUser} from '@/lib/auth';
import {db} from '@/lib/db';
export async function GET(){const user=await currentUser();if(!user)return NextResponse.json({error:'Entre para continuar'},{status:401});const [items,unread]=await Promise.all([db.notification.findMany({where:{userId:user.id},orderBy:{createdAt:'desc'},take:100}),db.notification.count({where:{userId:user.id,readAt:null}})]);return NextResponse.json({items,unread});}
export async function PATCH(req:NextRequest){const user=await currentUser();if(!user)return NextResponse.json({error:'Entre para continuar'},{status:401});try{const input=z.discriminatedUnion('action',[z.object({action:z.literal('read-all')}),z.object({action:z.literal('read'),id:z.string()})]).parse(await req.json());if(input.action==='read-all')await db.notification.updateMany({where:{userId:user.id,readAt:null},data:{readAt:new Date()}});else await db.notification.updateMany({where:{id:input.id,userId:user.id,readAt:null},data:{readAt:new Date()}});return NextResponse.json({ok:true});}catch{return NextResponse.json({error:'Ação inválida.'},{status:400});}}
