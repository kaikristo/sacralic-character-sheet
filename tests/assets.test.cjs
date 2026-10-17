const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {versionAssets}=require('../scripts/version-assets.cjs'),sha='a'.repeat(40),next='b'.repeat(40);
const original=fs.readFileSync(path.join(__dirname,'..','dist','index.html'),'utf8'),first=versionAssets(original,sha);
const refs=[...first.matchAll(/(?:src|href)="([^"?]+\.(?:js|css))\?v=([^"#]+)"/g)];
assert.ok(refs.length>=20);for(const [,file,version] of refs){assert.equal(version,sha);assert.ok(fs.existsSync(path.join(__dirname,'..','dist',file)));}
assert.equal(versionAssets(first,sha),first);assert.equal(versionAssets(first,next).includes('?v='+sha),false);
assert.equal(versionAssets('<script src="https://example.com/lib.js"></script>',sha),'<script src="https://example.com/lib.js"></script>');assert.throws(()=>versionAssets(original,'invalid'));
console.log('Passed: published scripts/styles get a consistent commit version, referenced files exist, repeated builds update versions and external URLs remain unchanged.');
