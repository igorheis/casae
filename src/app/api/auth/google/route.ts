import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {createHash,randomBytes} from 'node:crypto';
export async function GET(){
 const clientId=process.env.GOOGLE_CLIENT_ID,redirectUri=process.env.GOOGLE_REDIRECT_URI;
 if(!clientId||!redirectUri)return NextResponse.redirect(new URL('/?oauth=google-config',process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000'));
 const state=randomBytes(24).toString('base64url'),verifier=randomBytes(48).toString('base64url'),nonce=randomBytes(24).toString('base64url');
 const challenge=createHash('sha256').update(verifier).digest('base64url'),jar=await cookies(),secure=process.env.NODE_ENV==='production';
 for(const [name,value] of [['oauth_google_state',state],['oauth_google_verifier',verifier],['oauth_google_nonce',nonce]] as const)jar.set(name,value,{httpOnly:true,secure,sameSite:'lax',path:'/',maxAge:600});
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');url.searchParams.set('client_id',clientId);url.searchParams.set('redirect_uri',redirectUri);url.searchParams.set('response_type','code');url.searchParams.set('scope','openid email profile');url.searchParams.set('state',state);url.searchParams.set('nonce',nonce);url.searchParams.set('code_challenge',challenge);url.searchParams.set('code_challenge_method','S256');
 return NextResponse.redirect(url);
}
