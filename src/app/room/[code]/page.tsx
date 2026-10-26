import Battlefield from '@/components/battlefield';
export const dynamic = 'force-dynamic';
export default async function RoomPage({params}:{params:Promise<{code:string}>}) { return <Battlefield code={(await params).code}/>; }
