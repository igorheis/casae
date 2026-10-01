import {NextResponse} from 'next/server';
export async function GET(){const key=process.env.VAPID_PUBLIC_KEY;if(!key)return NextResponse.json({error:'Push não configurado.'},{status:503});return NextResponse.json({key});}
