import type {PaymentStatus} from '@prisma/client';
export function canConfirmPayment(status:PaymentStatus,actingUserId:string,recipientId:string){return status==='PENDING'&&actingUserId===recipientId}
export function canRejectPayment(status:PaymentStatus,actingUserId:string,recipientId:string){return status==='PENDING'&&actingUserId===recipientId}
