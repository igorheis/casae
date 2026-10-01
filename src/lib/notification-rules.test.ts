import {describe,it,expect} from 'vitest';
import {commitmentReminderMessage,notificationAllowed,reminderDue} from './notification-rules';
describe('preferências e agendamento de notificações',()=>{
 const prefs={commitments:true,events:false,financial:true,groups:true};
 it('respeita preferências por tipo',()=>{expect(notificationAllowed('COMMITMENT',prefs)).toBe(true);expect(notificationAllowed('EVENT',prefs)).toBe(false);expect(notificationAllowed('SYSTEM',prefs)).toBe(true)});
 it('dispara no período de antecedência e nunca depois do compromisso',()=>{const now=new Date('2026-12-10T10:00:00Z');expect(reminderDue(new Date('2026-12-10T11:00:00Z'),now,60)).toBe(true);expect(reminderDue(new Date('2026-12-10T11:01:00Z'),now,60)).toBe(false);expect(reminderDue(now,now,15)).toBe(false)});
 it('formata lembretes de uma hora e quinze minutos',()=>{const now=new Date('2026-12-10T10:00:00Z');expect(commitmentReminderMessage(new Date('2026-12-10T11:00:00Z'),now)).toBe('Seu compromisso começa em 1 hora.');expect(commitmentReminderMessage(new Date('2026-12-10T10:15:00Z'),now)).toBe('Seu compromisso começa em 15 minutos.')});
});
