import {db} from '@/lib/db';
export async function audit(input:{groupId:string;eventId?:string;actorId?:string;action:string;entity:string;entityId?:string;summary:string;metadata?:unknown}){
 return db.auditLog.create({data:{...input,metadata:input.metadata as object|undefined}});
}
