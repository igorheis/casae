import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from './db';
function signingKey() {
  const secret=process.env.SESSION_SECRET;
  if(process.env.NODE_ENV==='production'&&(!secret||secret.length<32))throw new Error('SESSION_SECRET deve ter pelo menos 32 caracteres em produção.');
  return new TextEncoder().encode(secret||'development-only-secret-change-this-before-deploy-1234');
}
export async function createSession(userId:string) {
  const token=await new SignJWT({sub:userId}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('7d').sign(signingKey());
  (await cookies()).set('junto_session',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*24*7});
}
export async function currentUser() {
  const token=(await cookies()).get('junto_session')?.value; if(!token) return null;
  try { const {payload}=await jwtVerify(token,signingKey()); return db.user.findUnique({where:{id:String(payload.sub)},select:{id:true,name:true,email:true,photoUrl:true,whatsapp:true,pixKey:true,pixType:true}}); } catch { return null; }
}
