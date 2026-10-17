const fs=require('node:fs'),path=require('node:path');
function versionAssets(html,version){
 if(!/^[a-f0-9]{40}$/.test(version||''))throw Error('A full Git commit SHA is required for asset versioning.');
 return html.replace(/((?:src|href)=")([^"?]+\.(?:js|css))(?:\?[^"#]*)?"/g,(original,prefix,url)=>/^(?:https?:)?\/\//.test(url)?original:prefix+url+'?v='+version+'"');
}
if(require.main===module){const file=path.join(__dirname,'..','dist','index.html');fs.writeFileSync(file,versionAssets(fs.readFileSync(file,'utf8'),process.env.GITHUB_SHA));}
module.exports={versionAssets};
