'use strict';
(() => {
const el=id=>document.getElementById(id), sliders=['brightness','contrast','saturation'];
let photo=null,file=null,source=null,resultUrl=null,version=0,frame=0;
const status=(ko,en,error=false)=>{el('edit-status').textContent=document.documentElement.lang==='en'?en:ko;el('edit-status').dataset.ko=ko;el('edit-status').dataset.en=en;el('edit-status').classList.toggle('error',error);};
el('language').addEventListener('change',()=>{const s=el('edit-status');if(s.dataset.ko)s.textContent=s.dataset[el('language').value];});
function clearDownload(){if(resultUrl)URL.revokeObjectURL(resultUrl);resultUrl=null;el('edit-download').hidden=true;el('edit-download').removeAttribute('href');}
function process(canvas,original=false,white=false){
 const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('canvas');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(photo,0,0,canvas.width,canvas.height);
 if(!original){const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),d=pixels.data;
 const b=Number(el('brightness').value)*2.55,c=1+Number(el('contrast').value)/100,s=1+Number(el('saturation').value)/100,p=el('preset').value;
 for(let i=0;i<d.length;i+=4){let r=d[i],g=d[i+1],bl=d[i+2];if(p==='warm'){r+=16;g+=4;bl-=12;}if(p==='cool'){r-=10;g+=3;bl+=17;}if(p==='soft'){r=r*.88+22;g=g*.88+22;bl=bl*.88+22;}const gray=.2126*r+.7152*g+.0722*bl;const sat=p==='mono'?0:s;r=gray+(r-gray)*sat;g=gray+(g-gray)*sat;bl=gray+(bl-gray)*sat;d[i]=(r-128)*c+128+b;d[i+1]=(g-128)*c+128+b;d[i+2]=(bl-128)*c+128+b;}ctx.putImageData(pixels,0,0);}
 if(white){ctx.globalCompositeOperation='destination-over';ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalCompositeOperation='source-over';}
}
function render(){if(!photo)return;cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{try{process(el('edit-canvas'),el('compare').checked);}catch{status('미리보기를 만들지 못했어요. 더 작은 사진을 선택해주세요.','Could not create the preview. Choose a smaller image.',true);}});}
function reset(){for(const id of sliders){el(id).value=0;el(id+'-value').textContent='0';}el('preset').value='none';el('compare').checked=false;}
function changed(){version++;clearDownload();render();status('설정을 적용했어요. 저장 준비를 눌러주세요.','Adjustments applied. Prepare your download.');}
async function load(f){if(!f)return;const ticket=++version;clearDownload();el('edit-controls').disabled=true;
 if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>30*1024*1024){status('30MB 이하의 JPG, PNG, WebP를 선택해주세요.','Choose a JPG, PNG, or WebP up to 30 MB.',true);el('edit-controls').disabled=!photo;return;}
 const url=URL.createObjectURL(f),img=new Image();img.src=url;
 try{await img.decode();if(ticket!==version){URL.revokeObjectURL(url);return;}if(!img.naturalWidth||img.naturalWidth*img.naturalHeight>12000000||Math.max(img.naturalWidth,img.naturalHeight)>8000)throw Error('size');
 if(source)URL.revokeObjectURL(source);source=url;photo=img;file=f;reset();const ratio=Math.min(1,1200/Math.max(img.naturalWidth,img.naturalHeight));el('edit-canvas').width=Math.max(1,Math.round(img.naturalWidth*ratio));el('edit-canvas').height=Math.max(1,Math.round(img.naturalHeight*ratio));el('edit-name').textContent=f.name;el('edit-preview').hidden=false;el('edit-drop').hidden=true;el('edit-controls').disabled=false;render();status('필터와 슬라이더로 색감을 조절해보세요.','Try a filter and fine-tune the sliders.');
 }catch(e){URL.revokeObjectURL(url);if(ticket!==version)return;el('edit-controls').disabled=!photo;status(e.message==='size'?'1,200만 화소, 한 변 8,000픽셀 이하의 사진을 선택해주세요.':'사진을 읽지 못했어요. 다른 사진을 선택해주세요.',e.message==='size'?'Choose an image up to 12 megapixels and 8,000 pixels per side.':'Could not read this image. Choose another photo.',true);}}
el('edit-file').addEventListener('change',e=>{load(e.target.files[0]);e.target.value='';});el('edit-replace').addEventListener('click',()=>el('edit-file').click());
for(const name of ['dragover','drop'])el('edit-drop').addEventListener(name,e=>{e.preventDefault();if(name==='drop')load(e.dataTransfer.files[0]);});
for(const id of sliders)el(id).addEventListener('input',()=>{el(id+'-value').textContent=el(id).value;changed();});el('preset').addEventListener('change',changed);el('edit-format').addEventListener('change',changed);el('compare').addEventListener('change',render);el('edit-reset').addEventListener('click',()=>{reset();changed();});
el('edit-export').addEventListener('click',async()=>{if(!photo)return;clearDownload();const ticket=++version;el('edit-controls').disabled=true;status('원본 해상도로 저장하는 중…','Preparing the full-resolution image…');const canvas=document.createElement('canvas');
 try{await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));if(ticket!==version)return;canvas.width=photo.naturalWidth;canvas.height=photo.naturalHeight;const type=el('edit-format').value;process(canvas,false,type==='image/jpeg');const blob=await new Promise(resolve=>canvas.toBlob(resolve,type,.92));if(ticket!==version)return;if(!blob||blob.type!==type)throw Error('format');resultUrl=URL.createObjectURL(blob);el('edit-download').href=resultUrl;el('edit-download').download=file.name.replace(/\.[^.]+$/,'')+'-edited.'+({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[type]);el('edit-download').hidden=false;status('준비됐어요. 아래 버튼으로 저장하세요.','Ready! Use the download button below.');
 }catch{if(ticket===version)status('저장하지 못했어요. JPG 또는 더 작은 사진으로 시도해주세요.','Could not export. Try JPG or a smaller image.',true);}finally{canvas.width=0;canvas.height=0;if(ticket===version)el('edit-controls').disabled=false;}});
})();
