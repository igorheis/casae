import {NextRequest,NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {createRemoteJWKSet,jwtVerify} from 'jose';
import {finishOAuth} from '@/lib/oauth';
const jwks=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const home=()=>new URL('/',process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000');
export async function GET(req:NextRequest){
 const jar=await cookies(),code=req.nextUrl.searchParams.get('code'),state=req.nextUrl.searchParams.get('state');
 try{
  if(!code||!state||state!==jar.get('oauth_google_state')?.value)throw new Error('OAuth state inválido.');
  const clientId=process.env.GOOGLE_CLIENT_ID!,clientSecret=process.env.GOOGLE_CLIENT_SECRET!,redirectUri=process.env.GOOGLE_REDIRECT_URI!,verifier=jar.get('oauth_google_verifier')?.value;
  if(!clientId||!clientSecret||!redirectUri||!verifier)throw new Error('Google OAuth não configurado.');
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:clientId,client_secret:clientSecret,redirect_uri:redirectUri,grant_type:'authorization_code',code_verifier:verifier})});
  if(!response.ok)throw new Error('Falha ao validar login Google.');
  const tokens=await response.json() as {id_token?:string};if(!tokens.id_token)throw new Error('Token do Google ausente.');
  const {payload}=await jwtVerify(tokens.id_token,jwks,{issuer:['https://accounts.google.com','accounts.google.com'],audience:clientId});
  if(payload.nonce!==jar.get('oauth_google_nonce')?.value||payload.email_verified!==true||!payload.email||!payload.sub)throw new Error('Conta Google não verificada.');
  await finishOAuth('GOOGLE',payload.sub,String(payload.email),String(payload.name||payload.email));
  const res=NextResponse.redirect(home());for(const n of ['oauth_google_state','oauth_google_verifier','oauth_google_nonce'])res.cookies.delete(n);return res;
 }catch{return NextResponse.redirect(new URL('/?oauth=google-failed',home()));}
}
