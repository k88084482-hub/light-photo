const enc = new TextEncoder();
const json = (body, status=200) => Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function videoURL(input) {
  const u = new URL(input); let id;
  if(u.protocol!=='https:' || u.username || u.password || u.port) throw Error('動画URL');
  if(u.hostname==='youtu.be') id=u.pathname.slice(1);
  else if(['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname)) {
    id=u.pathname==='/watch'?u.searchParams.get('v'):/^\/(?:shorts|embed)\/([\w-]{11})$/.exec(u.pathname)?.[1];
  }
  if(!/^[\w-]{11}$/.test(id||'')) throw Error('URL');
  return 'https://www.youtube.com/watch?v='+id;
}
async function sign(value,secret) {
  const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(value))),v=>v.toString(16).padStart(2,'0')).join('');
}
export async function handle(request,env,send=(...args)=>fetch(...args)) {
  const u=new URL(request.url);
  if(!u.pathname.startsWith('/api/youtube-trial/')) return env.ASSETS.fetch(request);
  if(request.method!=='POST') return json({error:'POST만 지원합니다.'},405);
  if(request.headers.get('Origin')!==u.origin) return json({error:'허용되지 않은 요청입니다.'},403);
  if(!env.SOCIALKIT_API_KEY || !env.TRIAL_ACCESS_CODE || env.TRIAL_ACCESS_CODE.length<24) return json({error:'시험 기능 설정 중입니다.'},503);
  if(request.headers.get('Authorization')!=='Bearer '+env.TRIAL_ACCESS_CODE) return json({error:'시험용 접근 코드를 확인하세요.'},401);
  let body;
  try { const raw=await request.text();if(raw.length>4096) return json({error:'요청이 너무 큽니다.'},413);body=JSON.parse(raw); } catch {return json({error:'잘못된 요청입니다.'},400);}
  async function api(path,payload) {
    const res=await send('https://api.socialkit.dev'+path,{method:payload?'POST':'GET',redirect:'error',headers:{'x-access-key':env.SOCIALKIT_API_KEY,'Content-Type':'application/json'},body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(25000)});
    if(!res.ok) throw Error('UPSTREAM_'+res.status); const result=await res.json();if(result.success!==true)throw Error('API');return result.data;
  }
  try {
    if(u.pathname.endsWith('/start')) {
      let video;try{video=videoURL(body.url);}catch{return json({error:'유튜브 영상 한 개의 HTTPS 주소를 입력하세요.'},400);}
      if(body.rights!==true) return json({error:'영상 이용 권한을 확인하세요.'},400);
      const credits=await api('/credits');
      if(credits.monthly?.limit!==20 || credits.purchased?.total!==0) return json({error:'무료 시험 계정만 지원합니다.'},403);
      if(!Number.isFinite(credits.totalRemaining)||credits.totalRemaining<5)return json({error:'시험에 필요한 무료 크레딧이 부족합니다.'},402);
      const job=await api('/v2/youtube/download',{url:video,format:'mp3',max_duration:300});
      if(!/^[a-f0-9]{24}$/.test(job.jobId))throw Error('API');
      const expires=Date.now()+3600000;
      return json({jobId:job.jobId,expires,signature:await sign(job.jobId+':'+expires,env.TRIAL_ACCESS_CODE)});
    }
    if(u.pathname.endsWith('/status')) {
      if(!/^[a-f0-9]{24}$/.test(body.jobId||'')||!Number.isSafeInteger(body.expires)||body.expires<Date.now())return json({error:'시험 작업이 만료됐습니다.'},400);
      if(body.signature!==await sign(body.jobId+':'+body.expires,env.TRIAL_ACCESS_CODE))return json({error:'잘못된 작업입니다.'},403);
      const job=await api('/v2/downloads/'+body.jobId);
      if(job.status==='ready') {
        const link=new URL(job.downloadUrl);
        if(link.protocol!=='https:'||link.username||link.password||!link.hostname.endsWith('.amazonaws.com'))throw Error('API');
        return json({status:'ready',downloadUrl:link.href,title:job.title,creditsCost:job.creditsCost,durationSeconds:job.durationSeconds});
      }
      if(job.status==='failed')return json({status:'failed',error:'추출에 실패했습니다. 비공개·접근 제한·5분 초과 영상인지 확인하세요.'});
      if(!['queued','processing'].includes(job.status))throw Error('API');
      return json({status:job.status});
    }
    return json({error:'없는 경로입니다.'},404);
  }catch(e){const code=/^UPSTREAM_[0-9]{3}$/.test(e.message)?e.message:e.name==='TimeoutError'?'UPSTREAM_TIMEOUT':'UPSTREAM_'+(e.name||'Error')+(/Illegal invocation/i.test(e.message)?'_INVOCATION':/not a function/i.test(e.message)?'_UNSUPPORTED':'');return json({error:'외부 서비스 응답을 확인하지 못했습니다. 새 변환을 반복 요청하지 마세요.',code},502);}
}
export default {fetch(request,env){return handle(request,env);}};
