const enc = new TextEncoder();
const json = (body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export const SCHEMA = `CREATE TABLE IF NOT EXISTS youtube_requests (request_id TEXT PRIMARY KEY, day TEXT NOT NULL, created INTEGER NOT NULL, video_hash TEXT NOT NULL, job_id TEXT, status TEXT NOT NULL DEFAULT 'reserved')`;
// One atomic write enforces the global daily limit and reserves up to five credits per unfinished job.
const pendingCost = "COALESCE(SUM(CASE WHEN status IN ('ready','failed') THEN 0 WHEN status LIKE 'reserved:%' THEN CAST(substr(status,10) AS INTEGER) ELSE 5 END),0)";
export const CATALOG = {"youtube:download":{"platform":"youtube","operation":"download","path":"/v2/youtube/download","input":"url","cost":5},"youtube:transcript":{"platform":"youtube","operation":"transcript","path":"/youtube/transcript","input":"url","cost":1},"youtube:summarize":{"platform":"youtube","operation":"summarize","path":"/youtube/summarize","input":"url","cost":2},"youtube:stats":{"platform":"youtube","operation":"stats","path":"/youtube/stats","input":"url","cost":1},"youtube:comments":{"platform":"youtube","operation":"comments","path":"/youtube/comments","input":"url","cost":1},"youtube:channel-stats":{"platform":"youtube","operation":"channel-stats","path":"/youtube/channel-stats","input":"url","cost":1},"tiktok:download":{"platform":"tiktok","operation":"download","path":"/v2/tiktok/download","input":"url","cost":5},"tiktok:transcript":{"platform":"tiktok","operation":"transcript","path":"/tiktok/transcript","input":"url","cost":1},"tiktok:summarize":{"platform":"tiktok","operation":"summarize","path":"/tiktok/summarize","input":"url","cost":2},"tiktok:stats":{"platform":"tiktok","operation":"stats","path":"/tiktok/stats","input":"url","cost":1},"tiktok:comments":{"platform":"tiktok","operation":"comments","path":"/tiktok/comments","input":"url","cost":1},"tiktok:channel-stats":{"platform":"tiktok","operation":"channel-stats","path":"/tiktok/channel-stats","input":"url","cost":1},"instagram:download":{"platform":"instagram","operation":"download","path":"/v2/instagram/download","input":"url","cost":5},"instagram:transcript":{"platform":"instagram","operation":"transcript","path":"/instagram/transcript","input":"url","cost":"balance"},"instagram:summarize":{"platform":"instagram","operation":"summarize","path":"/instagram/summarize","input":"url","cost":2},"instagram:stats":{"platform":"instagram","operation":"stats","path":"/instagram/stats","input":"url","cost":1},"instagram:comments":{"platform":"instagram","operation":"comments","path":"/instagram/comments","input":"url","cost":1},"instagram:channel-stats":{"platform":"instagram","operation":"channel-stats","path":"/instagram/channel-stats","input":"url","cost":1},"facebook:download":{"platform":"facebook","operation":"download","path":"/v2/facebook/download","input":"url","cost":5},"facebook:transcript":{"platform":"facebook","operation":"transcript","path":"/facebook/transcript","input":"url","cost":"balance"},"facebook:summarize":{"platform":"facebook","operation":"summarize","path":"/facebook/summarize","input":"url","cost":2},"facebook:stats":{"platform":"facebook","operation":"stats","path":"/facebook/stats","input":"url","cost":1},"facebook:comments":{"platform":"facebook","operation":"comments","path":"/facebook/comments","input":"url","cost":1},"facebook:channel-stats":{"platform":"facebook","operation":"channel-stats","path":"/facebook/channel-stats","input":"url","cost":1},"youtube:search":{"platform":"youtube","operation":"search","path":"/youtube/search","input":"query","cost":1},"youtube:videos":{"platform":"youtube","operation":"videos","path":"/youtube/videos","input":"url","cost":1},"tiktok:search":{"platform":"tiktok","operation":"search","path":"/tiktok/search","input":"query","cost":1},"tiktok:hashtag-search":{"platform":"tiktok","operation":"hashtag-search","path":"/tiktok/hashtag-search","input":"hashtag","cost":1},"tiktok:channel-videos":{"platform":"tiktok","operation":"channel-videos","path":"/tiktok/channel-videos","input":"url","cost":1},"instagram:channel-posts":{"platform":"instagram","operation":"channel-posts","path":"/instagram/channel-posts","input":"url","cost":1},"instagram:channel-reels":{"platform":"instagram","operation":"channel-reels","path":"/instagram/channel-reels","input":"url","cost":1},"instagram:reels-search":{"platform":"instagram","operation":"reels-search","path":"/instagram/reels-search","input":"query","cost":1}};
export const RESULT_SCHEMA = 'CREATE TABLE IF NOT EXISTS social_results (request_id TEXT PRIMARY KEY, created INTEGER NOT NULL, result TEXT NOT NULL)';
export const SOCIAL_RESERVE_SQL = `INSERT OR IGNORE INTO youtube_requests (request_id,day,created,video_hash,status) SELECT ?1,?2,?3,?4,?6 WHERE (SELECT COUNT(*) FROM youtube_requests WHERE day=?2)<3 AND (SELECT ${pendingCost} FROM youtube_requests)+?7<=?5`;
export function socialInput(body){
 const tool=CATALOG[body.tool];if(!tool)throw Error('INPUT');
 let payload;
 if(tool.input==='url'){
  const u=new URL(body.input);const hosts={youtube:['youtube.com','www.youtube.com','m.youtube.com','youtu.be'],tiktok:['tiktok.com','www.tiktok.com','vm.tiktok.com','vt.tiktok.com'],instagram:['instagram.com','www.instagram.com'],facebook:['facebook.com','www.facebook.com','m.facebook.com','fb.watch']};
  if(u.protocol!=='https:'||u.username||u.password||u.port||!hosts[tool.platform].includes(u.hostname)||u.href.length>2048)throw Error('URL');
  u.hash='';payload={url:u.href};
 }else{const text=String(body.input||'').trim().replace(tool.input==='hashtag'?/^#/:/^$/,'');if(!text||text.length>100)throw Error('INPUT');payload={[tool.input]:text};}
 if(tool.operation==='download'){if(!['mp3','m4a','wav','ogg','mp4','webm','avi'].includes(body.format))throw Error('INPUT');Object.assign(payload,{format:body.format,quality:'480p',max_duration:300});}
 if(['comments','search','videos','channel-videos','hashtag-search','channel-posts','channel-reels','reels-search'].includes(tool.operation))payload.limit=20;
 return {tool,payload};
}
export const RESERVE_SQL = `INSERT OR IGNORE INTO youtube_requests (request_id,day,created,video_hash) SELECT ?1,?2,?3,?4 WHERE (SELECT COUNT(*) FROM youtube_requests WHERE day=?2)<3 AND (SELECT ${pendingCost} FROM youtube_requests)+5<=?5`;
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
 if(!['quota','start','status','execute','social-quota'].includes(action))return fail('NOT_FOUND',404);
 if(request.method!=='POST')return fail('METHOD',405);
 if(request.headers.get('Origin')!==u.origin)return fail('ORIGIN',403);
 if(!env.SOCIALKIT_API_KEY||!env.TRIAL_ACCESS_CODE||!env.YOUTUBE_LIMITS)return fail('UNAVAILABLE',503);
 let body;try{const raw=await request.text();if(raw.length>4096)return fail('INPUT');body=JSON.parse(raw);if(!body||typeof body!=='object'||Array.isArray(body))return fail('INPUT');}catch{return fail('INPUT');}
 const db=env.YOUTUBE_LIMITS;
 async function api(path,payload){
  const opts={method:payload?'POST':'GET',redirect:'manual',headers:{'x-access-key':env.SOCIALKIT_API_KEY,'Content-Type':'application/json'},signal:AbortSignal.timeout(payload?90000:25000)};
  if(payload)opts.body=JSON.stringify(payload);
  const res=await send('https://api.socialkit.dev'+path,opts);
  if(!res.ok){const error=Error('UPSTREAM');error.definitive=res.status>=400&&res.status<500;error.code=res.status===404?'NOT_AVAILABLE':res.status===403?'CREDITS':res.status===422?'UNSUPPORTED':'SERVICE';throw error;}
  const value=await res.json();if(value.success!==true||!value.data)throw Error('UPSTREAM');return value.data;
 }
 async function credits(){const c=await api('/credits');if(c.monthly?.limit!==20||c.purchased?.total!==0||!Number.isFinite(c.totalRemaining))throw Error('PLAN');return c.totalRemaining;}
 async function ticket(row){
  const stored=await db.prepare('SELECT result FROM social_results WHERE request_id=?1').bind(row.request_id||'').first();
  if(stored){if(row.created+86400000<now)return fail('EXPIRED',410);return json(JSON.parse(stored.result));}
 if(row.created+86400000<now)return fail('EXPIRED',410);if(!row.job_id)return json({pending:true,code:'PENDING'},202);const expires=row.created+86400000;return json({jobId:row.job_id,expires,signature:await sign(row.job_id+':'+expires,env.TRIAL_ACCESS_CODE)});}
 try{
  await db.prepare(SCHEMA).run();
  await db.prepare(RESULT_SCHEMA).run();
  await db.prepare('DELETE FROM social_results WHERE created<?1').bind(now-86400000).run();
  if(action==='social-quota'){
   let selected;try{selected=socialInput(body);}catch{selected={tool:CATALOG[body.tool]};}
   if(!selected.tool)return fail('INPUT');
   const total=await credits(),day=dayAt(now);
   const used=await db.prepare('SELECT COUNT(*) AS n FROM youtube_requests WHERE day=?1').bind(day).first();
   const pending=await db.prepare(`SELECT ${pendingCost} AS n FROM youtube_requests`).first();
   const cost=selected.tool.cost==='balance'?Math.max(2,total):selected.tool.cost;
   const remaining=Math.max(0,3-used.n);
   return json({dailyLimit:3,remaining,credits:total,cost: selected.tool.cost,available:remaining>0&&total-pending.n>=cost,reason:remaining===0?'DAILY_LIMIT':total-pending.n<cost?'CREDITS':'OK'});
  }
  if(action==='execute'){
   let selected;try{selected=socialInput(body);}catch(e){return fail(e.message==='URL'?'URL':'INPUT');}
   if(body.rights!==true)return fail('RIGHTS');
   if(!/^[a-f0-9]{32}$/.test(body.requestId||''))return fail('INPUT');
   const {tool,payload}=selected,hash=await sign(body.tool+JSON.stringify(payload),env.TRIAL_ACCESS_CODE);
   const previous=await db.prepare('SELECT * FROM youtube_requests WHERE request_id=?1').bind(body.requestId).first();
   if(previous){if(previous.video_hash!==hash)return fail('INPUT');return ticket(previous);}
   const balance=await credits(),cost=tool.cost==='balance'?Math.max(2,balance):tool.cost;
   if(balance<cost)return fail('CREDITS',429);
   const reserved=await db.prepare(SOCIAL_RESERVE_SQL).bind(body.requestId,dayAt(now),now,hash,balance,'reserved:'+cost,cost).run();
   if(!reserved.meta.changes){const raced=await db.prepare('SELECT * FROM youtube_requests WHERE request_id=?1').bind(body.requestId).first();if(raced&&raced.video_hash===hash)return ticket(raced);return fail('LIMIT',429);}
   let result;
   try{
    const data=await api(tool.path,payload);
    if(tool.operation==='download'){
     if(!/^[a-f0-9]{24}$/.test(data.jobId||''))throw Error('UPSTREAM');
     await db.prepare("UPDATE youtube_requests SET job_id=?1,status='queued' WHERE request_id=?2").bind(data.jobId,body.requestId).run();
     return ticket({job_id:data.jobId,created:now});
    }
    result={status:'ready',data};
    if(JSON.stringify(result).length>500000)result={status:'failed',code:'RESULT_TOO_LARGE'};
   }catch(error){
    if(!error.definitive)return fail('UNCERTAIN',503);
    result={status:'failed',code:error.code};
   }
   await db.prepare('INSERT OR REPLACE INTO social_results (request_id,created,result) VALUES (?1,?2,?3)').bind(body.requestId,now,JSON.stringify(result)).run();
   await db.prepare("UPDATE youtube_requests SET status='ready' WHERE request_id=?1").bind(body.requestId).run();
   return json(result);
  }
  if(action==='quota'){
   const total=await credits(),day=dayAt(now);
   const used=await db.prepare('SELECT COUNT(*) AS n FROM youtube_requests WHERE day=?1').bind(day).first();
   const pending=await db.prepare(`SELECT ${pendingCost} AS n FROM youtube_requests`).first();
   const remaining=Math.max(0,3-used.n),available=Math.max(0,total-pending.n);
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
