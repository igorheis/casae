import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata:Metadata={title:'casaê — planos que acontecem',description:'Disponibilidade, eventos e despesas entre amigos.',manifest:'/manifest.webmanifest',icons:{icon:[{url:'/icons/icon-192.svg',type:'image/svg+xml',sizes:'192x192'},{url:'/icons/icon-512.svg',type:'image/svg+xml',sizes:'512x512'}],apple:'/apple-touch-icon.png'},appleWebApp:{capable:true,statusBarStyle:'default',title:'casaê'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#f8f8f4'};
const themeBootstrap="(()=>{try{const t=localStorage.getItem('junto-theme')||'system';const d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch{}})()";
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeBootstrap}}/></head><body>{children}</body></html>}
