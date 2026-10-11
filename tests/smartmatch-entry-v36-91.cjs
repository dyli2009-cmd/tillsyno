const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('project-workspace-smartmatch-test.html','utf8');
assert.equal(html,fs.readFileSync('project-workspace-smartmatch-v36-91.html','utf8'));
assert.match(html,/<script src="smartmatch-da-v36-90-module\.js\?v=36-91"><\/script>/);
assert.doesNotMatch(html,/smartmatch-da-v36-85-module/);
assert.match(html,/project-workspace-smartmatch-v36-91\.js\?v=36-91/);
assert.ok(fs.existsSync('smartmatch-da-v36-90-module.js'));
console.log('Published entry loads the tested DA module.');
