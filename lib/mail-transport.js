const nodemailer = require('nodemailer');
const storage = require('./storage');
const { fetch: rawFetch } = require('undici');

function createMailTransport(environment=process.env, fetcher=rawFetch) {
  if(environment.RESEND_API_KEY && environment.EMAIL_FROM && environment.FEEDBACK_TO){
    return { provider:'resend', async sendMail(message){
      const response=await fetcher('https://api.resend.com/emails',{
        method:'POST',signal:AbortSignal.timeout(8000),
        headers:{Authorization:`Bearer ${environment.RESEND_API_KEY}`,'Content-Type':'application/json',...(message.idempotencyKey?{'Idempotency-Key':message.idempotencyKey}:{})},
        body:JSON.stringify({from:environment.EMAIL_FROM,to:message.to,subject:message.subject,text:message.text,...(message.replyTo?{reply_to:typeof message.replyTo==='string'?message.replyTo:message.replyTo.address}:{})})
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok||!result.id)throw Object.assign(new Error('The email provider rejected this message.'),{code:response.status===429?'EMAIL_RATE_LIMIT':response.status===401||response.status===403?'EAUTH':'EMAIL_REJECTED',responseCode:response.status});
      return {accepted:[message.to],messageId:result.id};
    },close(){}};
  }
  if(storage.isCloud(environment))return null;
  if(!(environment.SMTP_HOST&&environment.SMTP_FROM&&environment.FEEDBACK_TO&&(!environment.SMTP_USER||environment.SMTP_PASS)))return null;
  const transport=nodemailer.createTransport({host:environment.SMTP_HOST,port:Number(environment.SMTP_PORT)||587,secure:environment.SMTP_SECURE==='true',auth:environment.SMTP_USER?{user:environment.SMTP_USER,pass:environment.SMTP_PASS}:undefined,connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000});
  transport.provider='smtp';return transport;
}
function configured(environment=process.env){return Boolean(environment.RESEND_API_KEY&&environment.EMAIL_FROM&&environment.FEEDBACK_TO)||(!storage.isCloud(environment)&&Boolean(environment.SMTP_HOST&&environment.SMTP_FROM&&environment.FEEDBACK_TO&&(!environment.SMTP_USER||environment.SMTP_PASS)));}
module.exports={createMailTransport,configured};
