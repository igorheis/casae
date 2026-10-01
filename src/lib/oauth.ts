import {db} from '@/lib/db';
import {createSession} from '@/lib/auth';
import type {OAuthProvider} from '@prisma/client';

export async function finishOAuth(provider:OAuthProvider,providerAccountId:string,email:string,name:string){
  const user=await db.$transaction(async tx=>{
    const existing=await tx.oAuthAccount.findUnique({where:{provider_providerAccountId:{provider,providerAccountId}},include:{user:true}});
    if(existing)return existing.user;
    const normalized=email.toLowerCase();
    const accountUser=await tx.user.findUnique({where:{email:normalized}});
    const target=accountUser??await tx.user.create({data:{email:normalized,name,passwordHash:null}});
    await tx.oAuthAccount.create({data:{provider,providerAccountId,userId:target.id}});
    return target;
  });
  await createSession(user.id);
}
