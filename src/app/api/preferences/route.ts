import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {currentUser} from '@/lib/auth';
import {db} from '@/lib/db';
const schema=z.object({commitments:z.boolean(),events:z.boolean(),financial:z.boolean(),groups:z.boolean(),reminderMinutes:z.union([z.literal(15),z.literal(30),z.literal(60),z.literal(1440)]),theme:z.enum(['LIGHT','DARK','SYSTEM'])});
export async function GET(){const user=await currentUser();if(!user)return NextResponse.json({error:'Entre para continuar'},{status:401});return NextResponse.json(await db.notificationPreference.upsert({where:{userId:user.id},create:{userId:user.id},update:{}}));}
export async function PUT(req:NextRequest){const user=await currentUser();if(!user)return NextResponse.json({error:'Entre para continuar'},{status:401});try{const data=schema.parse(await req.json());return NextResponse.json(await db.notificationPreference.upsert({where:{userId:user.id},create:{userId:user.id,...data},update:data}));}catch{return NextResponse.json({error:'Preferências inválidas.'},{status:400});}}
