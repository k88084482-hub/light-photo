'use strict';
function retouchPixels(input, mask, width, height, mode, strength) {
  const count=width*height;
  if(input.length!==count*4||mask.length!==count) throw Error('invalid');
  const output=new Uint8ClampedArray(input);let selected=0;
  for(const v of mask)if(v)selected++;
  if(!selected)throw Error('empty');
  if(selected>count*.25)throw Error('large');
  if(mode==='skin'){
    const amount=Math.max(0,Math.min(1,strength/100));
    for(let p=0;p<count;p++)if(mask[p]){
      const x=p%width,y=Math.floor(p/width),i=p*4;let total=0,r=0,g=0,b=0;
      for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
        const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=width||yy>=height)continue;
        const j=(yy*width+xx)*4;if(!input[j+3])continue;
        const diff=(input[j]-input[i])**2+(input[j+1]-input[i+1])**2+(input[j+2]-input[i+2])**2;
        const weight=Math.exp(-(dx*dx+dy*dy)/10-diff/6000);
        total+=weight;r+=input[j]*weight;g+=input[j+1]*weight;b+=input[j+2]*weight;
      }
      if(total){const a=amount*mask[p]/255;output[i]=input[i]*(1-a)+r/total*a;output[i+1]=input[i+1]*(1-a)+g/total*a;output[i+2]=input[i+2]*(1-a)+b/total*a;}
    }
  }else if(mode==='erase'){
    const known=new Uint8Array(count),queued=new Uint8Array(count),queue=new Int32Array(count);let head=0,tail=0;
    const neighbors=p=>{const x=p%width;return [x>0?p-1:-1,x<width-1?p+1:-1,p>=width?p-width:-1,p<count-width?p+width:-1];};
    for(let p=0;p<count;p++)known[p]=mask[p]?0:1;
    for(let p=0;p<count;p++)if(mask[p]&&neighbors(p).some(q=>q>=0&&known[q])){queue[tail++]=p;queued[p]=1;}
    while(head<tail){const p=queue[head++],ns=neighbors(p).filter(q=>q>=0&&known[q]);if(!ns.length)continue;
      for(let c=0;c<3;c++){let sum=0;for(const q of ns)sum+=output[q*4+c];output[p*4+c]=sum/ns.length;}
      known[p]=1;for(const q of neighbors(p))if(q>=0&&!known[q]&&!queued[q]){queued[q]=1;queue[tail++]=q;}
    }
    if(tail!==selected)throw Error('boundary');
    // Relax the filled region without changing unselected pixels or alpha.
    let a=new Float32Array(output),b=new Float32Array(output);
    for(let iteration=0;iteration<48;iteration++){
      for(let k=0;k<tail;k++){const p=queue[k],ns=neighbors(p).filter(q=>q>=0);for(let c=0;c<3;c++){let sum=0;for(const q of ns)sum+=a[q*4+c];b[p*4+c]=sum/ns.length;}}
      [a,b]=[b,a];
    }
    for(let k=0;k<tail;k++){const p=queue[k];for(let c=0;c<3;c++)output[p*4+c]=a[p*4+c];}
  }else throw Error('mode');
  return output;
}
if(typeof module!=='undefined')module.exports={retouchPixels};
if(typeof self!=='undefined'&&typeof document==='undefined')self.onmessage=event=>{
  const {pixels,mask,width,height,mode,strength}=event.data;
  try{const result=retouchPixels(new Uint8ClampedArray(pixels),new Uint8Array(mask),width,height,mode,strength);self.postMessage({pixels:result.buffer},[result.buffer]);}
  catch(error){self.postMessage({error:error.message});}
};
