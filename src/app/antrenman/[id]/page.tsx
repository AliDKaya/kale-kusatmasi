import Battlefield from '@/components/battlefield';
export default async function TrainingRoom({params}:{params:Promise<{id:string}>}){const {id}=await params;return <Battlefield code={id} training/>;}
