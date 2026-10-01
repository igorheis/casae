import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {createHash,randomBytes} from 'node:crypto';
export async function GET(){
 const clientId=process.env.APPLE_CLIENT_ID,redirectUri=process.env.APPLE_REDIRECT_URI;
 if(!clientId||!redirectUri)return NextResponse.redirect(new URL('/?oauth=apple-config',process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000'));
 const state=randomBytes(24).toString('base64url'),nonce=randomBytes(24).toString('base64url'),jar=await cookies(),secure=process.env.NODE_ENV==='production';
 jar.set('oauth_apple_state',state,{httpOnly:true,secure:true,sameSite:'none',path:'/',maxAge:600});jar.set('oauth_apple_nonce',nonce,{httpOnly:true,secure:true,sameSite:'none',path:'/',maxAge:600});
 const url=new URL('https://appleid.apple.com/auth/authorize');url.searchParams.set('client_id',clientId);url.searchParams.set('redirect_uri',redirectUri);url.searchParams.set('response_type','code id_token');url.searchParams.set('response_mode','form_post');url.searchParams.set('scope','name email');url.searchParams.set('state',state);url.searchParams.set('nonce',createHash('sha256').update(nonce).digest('hex'));
 return NextResponse.redirect(url);
}
