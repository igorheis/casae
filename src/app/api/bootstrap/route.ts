import {NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {db} from '@/lib/db';
export async function GET(){
 const user=await currentUser();
 if(!user)return NextResponse.json({error:'Entre para continuar'},{status:401});
 const start=new Date(new Date().getFullYear(),new Date().getMonth(),1),end=new Date(start.getFullYear()+1,start.getMonth(),1);
 const memberships=await db.groupMember.findMany({where:{userId:user.id},include:{group:{include:{
  members:{include:{user:{select:{id:true,name:true,email:true,photoUrl:true}}}},
  events:{orderBy:{startsAt:'asc'},take:100,include:{members:{include:{user:{select:{id:true,name:true}}}},expenses:{orderBy:{spentAt:'desc'},take:100,include:{payer:{select:{id:true,name:true}},participants:{include:{user:{select:{id:true,name:true}}}}}},payments:{orderBy:{paidAt:'desc'},include:{sender:{select:{id:true,name:true}},receiver:{select:{id:true,name:true}}}}}},
  commitments:{where:{startsAt:{gte:start,lt:end}},take:500,orderBy:{startsAt:'asc'},include:{user:{select:{id:true,name:true}}}},
  availability:{where:{date:{gte:start,lt:end}},take:5000},
  auditLogs:{orderBy:{createdAt:'desc'},take:30,include:{actor:{select:{id:true,name:true}}}}
}}}});
 const group=memberships[0]?.group??null;
 return NextResponse.json({user,groups:memberships.map(m=>({id:m.group.id,name:m.group.name,emoji:m.group.emoji,description:m.group.description,inviteCode:m.group.inviteCode,memberCount:m.group.members.length})),group});
}
