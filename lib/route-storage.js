const storage=require('./storage');
const guard=require('./admin-api');
function read(callback){return storage.read(callback).catch(guard.errorResponse);}
function write(callback){return storage.write(callback).catch(guard.errorResponse);}
async function limit(request,operation,maximum){try{return await storage.rateLimited(request,operation,maximum)?Response.json({error:'Too many requests. Please try again in 15 minutes.'},{status:429,headers:{'Cache-Control':'no-store'}}):null;}catch(error){return guard.errorResponse(error);}}
function emailAfterResponse(){const {after}=require('next/server');after(async()=>{try{await require('./backend').getBackend().deliverFeedback();}catch{console.error('Hotel email retry remains queued.');}});}
module.exports={read,write,limit,emailAfterResponse};
