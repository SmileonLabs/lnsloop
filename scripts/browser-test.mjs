import {spawnSync} from 'node:child_process';
const cli=process.platform==='win32'?'pnpm.cmd':'pnpm';
const env={...process.env,EXPO_PUBLIC_API_URL:'http://localhost:4000',EXPO_PUBLIC_ENABLE_TEST_AUTH:'true'};
for(const args of [['--filter','lns-loop-patient-mobile','export:web'],['exec','playwright','test']]){const r=spawnSync(cli,args,{env,stdio:'inherit',shell:process.platform==='win32'});if(r.status!==0)process.exit(r.status??1);}
