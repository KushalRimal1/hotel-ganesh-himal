const fs=require('fs');
const path=require('path');
const excluded=new Set(['coverrr.jpg','signature.jpg','stamp.png']);
const images=fs.readdirSync(path.join(process.cwd(),'public','images')).filter(name=>/\.(jpe?g|png|webp)$/i.test(name)&&!excluded.has(name.toLowerCase())).sort();
fs.writeFileSync(path.join(process.cwd(),'lib','public-images.json'),JSON.stringify(images,null,2)+'\n');
