import {spawnSync} from 'node:child_process';
const result=spawnSync('cmd.exe',['/d','/s','/c','npx.cmd --yes vercel api /v2/user --method GET'],{encoding:'utf8',windowsHide:true});
if(result.status!==0)throw new Error('Vercel hesap bilgisi alınamadı.');
const parsed=JSON.parse(result.stdout.slice(result.stdout.indexOf('{')));const user=parsed.user??parsed;
if(!user.email||!user.email.includes('@'))throw new Error('Doğrulanmış hesap e-postası bulunamadı.');
const changed=spawnSync('git',['config','user.email',user.email],{encoding:'utf8',windowsHide:true});
if(changed.status!==0)throw new Error('Yerel Git yapılandırması güncellenemedi.');
console.log('Yalnızca bu deponun Git yazar e-postası Vercel hesabıyla eşleştirildi.');
