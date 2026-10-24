import backend from '../../lib/backend.js';

export default async function(request) {
  const body=await request.json().catch(()=>({}));
  if(!body.next_run)return new Response('Scheduled invocation only.',{status:403});
  try { await backend.getBackend().deliverFeedback();return new Response(null,{status:204}); }
  catch { console.error('Hotel email queue retry failed; messages remain saved.');return new Response('Retry pending.',{status:503}); }
}
