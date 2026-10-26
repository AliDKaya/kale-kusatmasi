import {spawnSync} from 'node:child_process';
export default function cleanup(){const result=spawnSync(process.execPath,['scripts/cleanup-tests.mjs'],{cwd:process.cwd(),stdio:'inherit',windowsHide:true});if(result.status!==0)throw new Error('Test verisi temizlenemedi; cleanup-tests.mjs kontrol edilmeli.');}
