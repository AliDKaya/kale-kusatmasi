import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const url='https://kale-kusatmasi.vercel.app/api/leaderboard';const data=await(await fetch(url)).json();
mkdirSync('tmp/evidence',{recursive:true});
if(process.argv[2]==='before'){
 writeFileSync('tmp/evidence/persistence-before.json',JSON.stringify(data,null,2));console.log('Yeniden dağıtım öncesi: HTTP 200,',data.skorlar.length,'skor.');
}else{
 const before=JSON.parse(readFileSync('tmp/evidence/persistence-before.json','utf8'));
 const anchors=before.skorlar.filter(r=>r.ad.startsWith('TestSkorB'));
 if(!anchors.length)throw new Error('Karşılaştırılacak kontrollü skor yok.');
 const persisted=anchors.every(a=>data.skorlar.some(b=>a.ad===b.ad&&a.skor===b.skor&&a.zaman===b.zaman));
 const result={date:new Date().toISOString(),url,anchors:anchors.length,persisted,after:data};
 writeFileSync('tmp/evidence/persistence.json',JSON.stringify(result,null,2));console.log('Yeniden dağıtım sonrası:',anchors.length,'kontrollü skor aynı:',persisted);if(!persisted)process.exitCode=1;
}
