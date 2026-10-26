const base=process.env.TEST_BASE_URL??'https://kale-kusatmasi.vercel.app';
for(const path of ['/','/leaderboard','/rapor','/api/leaderboard']){
 const r=await fetch(base+path,{redirect:'manual'});
 console.log(path,r.status,r.headers.get('location')??'');
 if(path==='/api/leaderboard'&&r.ok){const data=await r.json();console.log('API alanları:',Object.keys(data),'satır:',data.skorlar?.length);}
}
