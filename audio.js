import { FFmpeg } from './vendor/ffmpeg/index.js';
const $=id=>document.getElementById(id), MAX=100*1024*1024;
let engine,controller,resultURL,busy=false;
const copy={ko:{loading:'처리 도구를 준비하고 있어요. 첫 실행에는 약 31MB를 다운로드합니다.',fetching:'영상 파일을 가져오는 중…',working:'음원을 추출하고 있어요…',done:'완료됐어요. 미리 듣고 다운로드하세요.',cancel:'취소했어요.',error:'처리하지 못했어요. 소리가 있는 영상인지, 형식이 지원되는지 확인하세요.',url:'HTTPS 영상 파일 주소를 입력해주세요. 유튜브·SNS 페이지 주소는 지원하지 않습니다.',fetchError:'영상을 가져오지 못했어요. 직접 파일 주소인지, 해당 서버가 외부 접근(CORS)을 허용하는지 확인하세요. 파일을 기기에 저장한 뒤 선택할 수도 있습니다.',size:'100MB 이하의 파일을 선택해주세요.',choose:'영상 파일을 먼저 선택해주세요.',timeout:'처리 시간이 초과됐어요. 더 짧은 영상으로 시도해주세요.'},en:{loading:'Preparing the tool. The first run downloads about 31 MB.',fetching:'Fetching video…',working:'Extracting audio…',done:'Done. Preview and download your audio.',cancel:'Cancelled.',error:'Could not process this file. Check that it contains audio and uses a supported format.',url:'Enter a direct HTTPS video file URL. YouTube and social media page URLs are not supported.',fetchError:'Could not fetch the video. Check the direct file URL and server CORS permission, or save the file and select it locally.',size:'Choose a file up to 100 MB.',choose:'Choose a video first.',timeout:'Processing timed out. Try a shorter video.'},vi:{loading:'Đang chuẩn bị công cụ. Lần đầu tải khoảng 31 MB.',fetching:'Đang tải video…',working:'Đang trích xuất âm thanh…',done:'Hoàn tất. Nghe thử và tải âm thanh xuống.',cancel:'Đã hủy.',error:'Không xử lý được tệp. Kiểm tra video có âm thanh và định dạng được hỗ trợ.',url:'Nhập URL HTTPS trực tiếp của tệp video. Không hỗ trợ liên kết trang YouTube hoặc mạng xã hội.',fetchError:'Không tải được video. Kiểm tra URL trực tiếp và quyền CORS của máy chủ, hoặc lưu tệp rồi chọn trên thiết bị.',size:'Chọn tệp tối đa 100 MB.',choose:'Hãy chọn video trước.',timeout:'Xử lý quá lâu. Hãy thử video ngắn hơn.'}};
let message='';function say(key){message=key;$('audio-status').textContent=copy[document.documentElement.lang]?.[key]||copy.en[key];}
$('language').addEventListener('change',()=>{if(message)say(message);});
function resetResult(){if(resultURL)URL.revokeObjectURL(resultURL);resultURL=null;$('audio-result').hidden=true;$('audio-preview').removeAttribute('src');$('audio-download').removeAttribute('href');}
function state(on){busy=on;$('audio-inputs').disabled=on;$('extract').disabled=on;$('cancel-audio').hidden=!on;$('audio-progress').hidden=!on;}
function mode(){const link=$('source-mode').value==='url';$('file-source').hidden=link;$('url-source').hidden=!link;resetResult();}
$('source-mode').addEventListener('change',mode);for(const id of ['video-file','video-url','audio-format'])$(id).addEventListener('change',resetResult);
$('cancel-audio').addEventListener('click',()=>{controller?.abort();engine?.terminate();engine=null;});
async function bounded(url,signal){
 let response;try{response=await fetch(url,{signal,credentials:'omit',referrerPolicy:'no-referrer'});}catch(e){if(signal.aborted)throw e;throw Error('fetchError');}
 if(!response.ok||!response.body)throw Error('fetchError');
 if(Number(response.headers.get('content-length'))>MAX)throw Error('size');
 if((response.headers.get('content-type')||'').includes('text/html'))throw Error('url');
 const reader=response.body.getReader(),chunks=[];let length=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>MAX)throw Error('size');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
 const out=new Uint8Array(length);let offset=0;for(const c of chunks){out.set(c,offset);offset+=c.length;}return out;
}
$('extract').addEventListener('click',async()=>{
 if(busy)return;resetResult();controller=new AbortController();const signal=controller.signal;state(true);let timer,timedOut=false;const blobs=[];
 try{
 let bytes,name='video';
 if($('source-mode').value==='url'){
  let url;try{url=new URL($('video-url').value.trim());}catch{throw Error('url');}
  if((url.protocol!=='https:' && !(location.hostname==='127.0.0.1' && url.origin===location.origin))||url.username||url.password||/(^|\.)(youtube\.com|youtu\.be|instagram\.com|facebook\.com|tiktok\.com)$/.test(url.hostname))throw Error('url');
  say('fetching');timer=setTimeout(()=>{timedOut=true;controller.abort();},120000);bytes=await bounded(url.href,signal);clearTimeout(timer);name=url.pathname.split('/').pop()||name;
 }else{const file=$('video-file').files[0];if(!file)throw Error('choose');if(file.size>MAX)throw Error('size');name=file.name;bytes=new Uint8Array(await file.arrayBuffer());}
 if(signal.aborted)throw Error('cancel');if(!bytes.length)throw Error('error');
 say('loading');engine=new FFmpeg();timer=setTimeout(()=>{timedOut=true;controller.abort();},120000);
 signal.addEventListener('abort',()=>{engine?.terminate();engine=null;},{once:true});
 const base='https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
 for(const [file,type] of [['ffmpeg-core.js','text/javascript'],['ffmpeg-core.wasm','application/wasm']]){const data=await bounded(base+'/'+file,signal);blobs.push(URL.createObjectURL(new Blob([data],{type})));}
 if(signal.aborted)throw Error('cancel');await engine.load({coreURL:blobs[0],wasmURL:blobs[1]});clearTimeout(timer);
 say('working');await engine.writeFile('input',bytes);bytes=null;const format=$('audio-format').value;
 const opts=format==='mp3'?['-c:a','libmp3lame','-b:a','192k']:['-c:a','aac','-b:a','192k'];
 const code=await engine.exec(['-i','input','-map','0:a:0','-vn','-map_metadata','-1',...opts,'output.'+format],300000);
 if(code!==0)throw Error(code===1?'error':'timeout');const data=await engine.readFile('output.'+format);if(!data.length)throw Error('error');
 resultURL=URL.createObjectURL(new Blob([data],{type:format==='mp3'?'audio/mpeg':'audio/mp4'}));$('audio-preview').src=resultURL;$('audio-download').href=resultURL;$('audio-download').download=name.replace(/\.[^.]+$/,'').replace(/[^\p{L}\p{N}_ -]/gu,'_')+'.'+format;$('audio-result').hidden=false;say('done');
 }catch(e){say(timedOut?'timeout':signal.aborted?'cancel':copy.en[e.message]?e.message:'error');}
 finally{clearTimeout(timer);engine?.terminate();engine=null;for(const b of blobs)URL.revokeObjectURL(b);state(false);}
});





