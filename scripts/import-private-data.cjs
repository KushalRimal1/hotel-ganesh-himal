const fs=require('fs');
const path=require('path');
const {loadEnvConfig}=require('@next/env');
const {getStore}=require('@netlify/blobs');
const {fileType}=require('../lib/media');

loadEnvConfig(process.cwd());
async function main(){
  const directory=process.env.HOTEL_IMPORT_DATA_DIR||path.join(process.cwd(),'data');
  const files={};
  for(const name of ['feedback.json','subscribers.json','reservations.json','site-content.json']){
    const filename=path.join(directory,name);if(fs.existsSync(filename))files[name]=JSON.parse(fs.readFileSync(filename,'utf8'));
  }
  const uploads=path.join(directory,'uploads');
  const photos=fs.existsSync(uploads)?fs.readdirSync(uploads).filter(name=>/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(name)):[];
  console.log(`Private import preview: ${Object.keys(files).length} data files and ${photos.length} uploaded photos. Values are not printed.`);
  if(!process.argv.includes('--apply')){console.log('No data uploaded. Use --apply only after setting your private NETLIFY_SITE_ID and NETLIFY_AUTH_TOKEN.');return;}
  if(!process.env.NETLIFY_SITE_ID||!process.env.NETLIFY_AUTH_TOKEN)throw new Error('Missing private Netlify connection settings.');
  const options={siteID:process.env.NETLIFY_SITE_ID,token:process.env.NETLIFY_AUTH_TOKEN,consistency:'strong'};
  const state=getStore({...options,name:'hotel-private'}),media=getStore({...options,name:'hotel-media'});
  const current=await state.getWithMetadata('state-v1',{type:'json',consistency:'strong'});
  if(current&&!current.etag)throw new Error('Target version could not be verified.');
  if(current&&Object.keys(current.data.files||{}).length)throw new Error('The target already contains data. This importer will not overwrite it.');
  for(const name of photos){const bytes=fs.readFileSync(path.join(uploads,name)),type=fileType(bytes);const saved=await media.set(name,bytes,{onlyIfNew:true,metadata:{type:{jpg:'image/jpeg',png:'image/png',webp:'image/webp'}[type]}});if(!saved.modified)console.log('An existing uploaded photo was retained.');const verified=await media.get(name,{type:'arrayBuffer',consistency:'strong'});if(!verified)throw new Error('Photo import verification failed.');}
  const saved=await state.setJSON('state-v1',{formatVersion:1,files,limits:current?.data.limits||{}},current?{onlyIfMatch:current.etag}:{onlyIfNew:true});
  if(!saved.modified)throw new Error('Target changed during import; no private records were overwritten.');
  const verified=await state.getWithMetadata('state-v1',{type:'json',consistency:'strong'});
  if(JSON.stringify(verified?.data.files)!==JSON.stringify(files))throw new Error('Import verification failed.');
  console.log('Private import completed and verified. Password files and registration/signature assets were not uploaded.');
}
main().catch(error=>{console.error(error.message==='The target already contains data. This importer will not overwrite it.'?error.message:'Private import failed. Check the target, credentials, and connection; no secret values are printed.');process.exitCode=1;});
