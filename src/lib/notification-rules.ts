import type {NotificationType} from '@prisma/client';
type Preferences={commitments:boolean;events:boolean;financial:boolean;groups:boolean};
const key:Partial<Record<NotificationType,keyof Preferences>>={COMMITMENT:'commitments',EVENT:'events',FINANCIAL:'financial',GROUP:'groups'};
export function notificationAllowed(type:NotificationType,prefs:Preferences){const pref=key[type];return pref?prefs[pref]:true}
export function reminderDue(startsAt:Date,now:Date,minutes:number){const remindAt=startsAt.getTime()-minutes*60_000;return startsAt.getTime()>now.getTime()&&remindAt<=now.getTime()}
export function commitmentReminderMessage(startsAt:Date,now:Date){const minutes=Math.max(1,Math.round((startsAt.getTime()-now.getTime())/60_000));if(minutes<=15)return 'Seu compromisso começa em '+minutes+' minuto'+(minutes===1?'':'s')+'.';if(minutes<=60)return minutes===60?'Seu compromisso começa em 1 hora.':'Seu compromisso começa em '+minutes+' minutos.';return 'Você tem um compromisso amanhã às '+startsAt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+'.'}
