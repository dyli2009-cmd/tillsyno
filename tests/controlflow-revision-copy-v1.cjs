const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..'),dir=path.join(root,'controlflow-revision-test');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'snapshot.json')));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const [name,entry] of Object.entries(manifest.files)){
 const original=execFileSync('git',['show',manifest.sourceCommit+':'+name],{cwd:root,maxBuffer:5*1024*1024});
 assert.equal(hash(original),entry.sourceSha256,name+': source hash');
 assert.equal(hash(fs.readFileSync(path.join(dir,name))),entry.testSha256,name+': test snapshot hash');
}
assert.equal(fs.readFileSync(path.join(dir,'legacy-door-import.js'),'utf8'),execFileSync('git',['show',manifest.sourceCommit+':legacy-door-import.js'],{cwd:root,encoding:'utf8'}),'Legacy importer must be identical');
const html=fs.readFileSync(path.join(dir,'all-in-one.html'),'utf8');
for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
 const ref=match[1].split('?')[0];
 if(!/^(https?:|data:)/.test(ref))assert(fs.existsSync(path.resolve(dir,ref)),ref+' must resolve');
}
const security=fs.readFileSync(path.join(dir,'security.js'),'utf8');
assert(security.includes("APP_WORK_KEY=ALL_IN_ONE?'DoorserviceAllInOneWork'"),'Keep explicit PDF compatibility');
assert(security.includes("APP_STORAGE_PREFIX=ALL_IN_ONE?'tillsyno-revision-test-all-in-one:'"),'Separate local work');
assert(html.includes('../auth/guard.js')&&html.includes('../auth/client.js'),'Keep existing authorization');
assert.equal(path.basename(path.join(dir,'all-in-one.html')),'all-in-one.html');
assert(fs.readFileSync(path.join(root,'auth/guard.js'),'utf8').includes("name==='all-in-one.html'"),'Test page must retain control-module authorization');
assert(!fs.readFileSync(path.join(dir,'sw.js'),'utf8').includes("key.startsWith('tillsyno-offline-')"),'Test worker must not purge ordinary caches');
console.log('PASS TEST v1: pinned snapshot, identical importer, PDF compatibility, isolated storage/cache and original authorization.');
