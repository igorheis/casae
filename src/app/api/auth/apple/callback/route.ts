import {NextRequest,NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {createRemoteJWKSet,jwtVerify,importPKCS8,SignJWT} from 'jose';
import {finishOAuth} from '@/lib/oauth';
const jwks=createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
const home=()=>new URL('/',process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000');
export async function POST(req:NextRequest){
 const jar=await cookies(),form=await req.formData(),state=String(form.get('state')||''),code=String(form.get('code')||''),postedToken=String(form.get('id_token')||'');
 try{
  if(!state||state!==jar.get('oauth_apple_state')?.value)throw new Error('OAuth state inválido.');
  const clientId=process.env.APPLE_CLIENT_ID!,team=process.env.APPLE_TEAM_ID!,keyId=process.env.APPLE_KEY_ID!,privateKey=process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g,'\n'),redirectUri=process.env.APPLE_REDIRECT_URI!;
  if(!clientId||!team||!keyId||!privateKey||!redirectUri)throw new Error('Apple OAuth não configurado.');
  const idToken=postedToken||await exchangeAppleCode(code,{clientId,team,keyId,privateKey,redirectUri});
  const {payload}=await jwtVerify(idToken,jwks,{issuer:'https://appleid.apple.com',audience:clientId});
  if(!payload.sub||!payload.email||!['true',true].includes(payload.email_verified as string|boolean)||payload.nonce!==createHashNonce(jar.get('oauth_apple_nonce')?.value||''))throw new Error('Identidade Apple não validada.');
  const userRaw=form.get('user');let name=String(payload.email).split('@')[0];if(userRaw)try{const u=JSON.parse(String(userRaw));name=[u.name?.firstName,u.name?.lastName].filter(Boolean).join(' ')||name}catch{}
  await finishOAuth('APPLE',payload.sub,String(payload.email),name);
  const res=NextResponse.redirect(home());res.cookies.delete('oauth_apple_state');res.cookies.delete('oauth_apple_nonce');return res;
 }catch{return NextResponse.redirect(new URL('/?oauth=apple-failed',home()));}
}
import {createHash} from 'node:crypto';
function createHashNonce(value:string){return createHash('sha256').update(value).digest('hex')}
async function exchangeAppleCode(code:string,c:{clientId:string;team:string;keyId:string;privateKey:string;redirectUri:string}){
 if(!code)throw new Error('Apple authorization code ausente.');
 const key=await importPKCS8(c.privateKey,'ES256');
 const secret=await new SignJWT({}).setProtectedHeader({alg:'ES256',kid:c.keyId}).setIssuer(c.team).setSubject(c.clientId).setAudience('https://appleid.apple.com').setIssuedAt().setExpirationTime('5m').sign(key);
 const response=await fetch('https://appleid.apple.com/auth/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:c.clientId,client_secret:secret,code,grant_type:'authorization_code',redirect_uri:c.redirectUri})});
 if(!response.ok)throw new Error('Falha ao trocar código Apple.');const tokens=await response.json() as {id_token?:string};if(!tokens.id_token)throw new Error('Token Apple ausente.');return tokens.id_token;
}
