const enc = new TextEncoder();
const json = (body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export const SCHEMA = `CREATE TABLE IF NOT EXISTS youtube_requests (request_id TEXT PRIMARY KEY, day TEXT NOT NULL, created INTEGER NOT NULL, video_hash TEXT NOT NULL, job_id TEXT, status TEXT NOT NULL DEFAULT 'reserved')`;
// One atomic write enforces the global daily limit and reserves up to five credits per unfinished job.
export const RESERVE_SQL = `INSERT OR IGNORE INTO youtube_requests (request_id,day,created,video_hash) SELECT ?1,?2,?3,?4 WHERE (SELECT COUNT(*) FROM youtube_requests WHERE day=?2)<3 AND ((SELECT COUNT(*) FROM youtube_requests WHERE status NOT IN ('ready','failed'))+1)*5<=?5`;
export const dayAt = now=>new Date(now+9*3600000).toISOString().slice(0,10);
export function videoURL(input){
 const u=new URL(input);let id;
 if(u.protocol!=='https:'||u.username||u.password||u.port)throw Error('URL');
 if(u.hostname==='youtu.be')id=u.pathname.slice(1);
 else if(['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname))id=u.pathname==='/watch'?u.searchParams.get('v'):/^\/(?:shorts|embed)\/([\w-]{11})$/.exec(u.pathname)?.[1];
 if(!/^[\w-]{11}$/.test(id||''))throw Error('URL');return 'https://www.youtube.com/watch?v='+id;
}
async function sign(value,secret){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(value))),v=>v.toString(16).padStart(2,'0')).join('');}
export async function handle(request,env,send=(...args)=>fetch(...args),now=Date.now()){
 const u=new URL(request.url),prefix='/api/youtube-trial/';
 if(!u.pathname.startsWith(prefix))return env.ASSETS.fetch(request);
 const action=u.pathname.slice(prefix.length),fail=(code,status=400)=>json({code},status);
 if(!['quota','start','status'].includes(action))return fail('NOT_FOUND',404);
 if(request.method!=='POST')return fail('METHOD',405);
 if(request.headers.get('Origin')!==u.origin)return fail('ORIGIN',403);
 if(!env.SOCIALKIT_API_KEY||!env.TRIAL_ACCESS_CODE||!env.YOUTUBE_LIMITS)return fail('UNAVAILABLE',503);
 let body;try{const raw=await request.text();if(raw.length>4096)return fail('INPUT');body=JSON.parse(raw);if(!body||typeof body!=='object'||Array.isArray(body))return fail('INPUT');}catch{return fail('INPUT');}
 const db=env.YOUTUBE_LIMITS;
 async function api(path,payload){
  const opts={method:payload?'POST':'GET',redirect:'manual',headers:{'x-access-key':env.SOCIALKIT_API_KEY,'Content-Type':'application/json'},signal:AbortSignal.timeout(25000)};
  if(payload)opts.body=JSON.stringify(payload);
  const res=await send('https://api.socialkit.dev'+path,opts);if(!res.ok)throw Error('UPSTREAM');const value=await res.json();if(value.success!==true||!value.data)throw Error('UPSTREAM');return value.data;
 }
 async function credits(){const c=await api('/credits');if(c.monthly?.limit!==20||c.purchased?.total!==0||!Number.isFinite(c.totalRemaining))throw Error('PLAN');return c.totalRemaining;}
 async function ticket(row){if(row.created+86400000<now)return fail('EXPIRED',410);if(!row.job_id)return json({pending:true,code:'PENDING'},202);const expires=row.created+86400000;return json({jobId:row.job_id,expires,signature:await sign(row.job_id+':'+expires,env.TRIAL_ACCESS_CODE)});}
 try{
  await db.prepare(SCHEMA).run();
  if(action==='quota'){
   const total=await credits(),day=dayAt(now);
   const used=await db.prepare('SELECT COUNT(*) AS n FROM youtube_requests WHERE day=?1').bind(day).first();
   const pending=await db.prepare("SELECT COUNT(*) AS n FROM youtube_requests WHERE status NOT IN ('ready','failed')").first();
   const remaining=Math.max(0,3-used.n),available=Math.max(0,total-pending.n*5);
   return json({dailyLimit:3,remaining,available:remaining>0&&available>=5,reason:remaining===0?'DAILY_LIMIT':available<5?'CREDITS':'OK',resetAt:new Date(Date.parse(day+'T00:00:00+09:00')+86400000).toISOString()});
  }
  if(action==='start'){
   let url;try{url=videoURL(body.url);}catch{return fail('URL');}
   if(body.rights!==true)return fail('RIGHTS');
   if(!/^[a-f0-9]{32}$/.test(body.requestId||''))return fail('INPUT');
   const hash=await sign(url,env.TRIAL_ACCESS_CODE);
   const previous=await db.prepare('SELECT * FROM youtube_requests WHERE request_id=?1').bind(body.requestId).first();
   if(previous){if(previous.video_hash!==hash)return fail('INPUT');return ticket(previous);}
   const balance=await credits();if(balance<5)return fail('CREDITS',429);
   const reservation=await db.prepare(RESERVE_SQL).bind(body.requestId,dayAt(now),now,hash,balance).run();
   if(!reservation.meta.changes){const raced=await db.prepare('SELECT * FROM youtube_requests WHERE request_id=?1').bind(body.requestId).first();if(raced&&raced.video_hash===hash)return ticket(raced);return fail('LIMIT',429);}
   // Never retry the paid create call automatically. An ambiguous response keeps the reservation.
   const job=await api('/v2/youtube/download',{url,format:'mp3',max_duration:300});
   if(!/^[a-f0-9]{24}$/.test(job.jobId||''))throw Error('UPSTREAM');
   await db.prepare("UPDATE youtube_requests SET job_id=?1,status='queued' WHERE request_id=?2").bind(job.jobId,body.requestId).run();
   return ticket({job_id:job.jobId,created:now});
  }
  if(!/^[a-f0-9]{24}$/.test(body.jobId||'')||!Number.isSafeInteger(body.expires)||body.expires<now)return fail('EXPIRED',410);
  if(body.signature!==await sign(body.jobId+':'+body.expires,env.TRIAL_ACCESS_CODE))return fail('TICKET',403);
  const job=await api('/v2/downloads/'+body.jobId);
  if(job.status==='ready'){
   const link=new URL(job.downloadUrl);if(link.protocol!=='https:'||link.username||link.password||!link.hostname.endsWith('.amazonaws.com'))throw Error('UPSTREAM');
   await db.prepare("UPDATE youtube_requests SET status='ready' WHERE job_id=?1").bind(body.jobId).run();
   return json({status:'ready',downloadUrl:link.href,title:job.title,durationSeconds:job.durationSeconds});
  }
  if(job.status==='failed'){await db.prepare("UPDATE youtube_requests SET status='failed' WHERE job_id=?1").bind(body.jobId).run();return json({status:'failed',code:'FAILED'});}
  if(!['queued','processing'].includes(job.status))throw Error('UPSTREAM');return json({status:job.status});
 }catch(e){return fail(e.message==='PLAN'?'UNAVAILABLE':'SERVICE',503);}
}
export default {fetch(request,env){return handle(request,env);}};
