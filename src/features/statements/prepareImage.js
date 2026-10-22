// Client-side preparation for phone screenshots with large, empty dark borders.
// Extraction only: the selected original document stays untouched for review.
export function findStatementContentBounds(pixels,width,height){
  if(!pixels||width<48||height<64)return null;
  const bright=(x,y)=>{
    const i=(y*width+x)*4;
    return pixels[i+3]>230 && pixels[i]>188 && pixels[i+1]>188 && pixels[i+2]>188;
  };
  const rows=[];
  for(let y=0;y<height;y++){
    let count=0;
    for(let x=0;x<width;x++)if(bright(x,y))count++;
    rows[y]=count>=Math.ceil(width*0.16);
  }
  let best=null;
  for(let i=0;i<height;){
    if(!rows[i]){i++;continue;}
    const start=i;let last=i;let gaps=0;let score=0;
    while(i<height){
      if(rows[i]){last=i;gaps=0;score++;}
      else if(++gaps>2)break;
      i++;
    }
    const end=last+1;
    if(!best||score>best.score)best={top:start,bottom:end,score};
    i=Math.max(i,last+1);
  }
  if(!best||best.score<Math.max(8,height*0.07))return null;
  const colCounts=new Array(width).fill(0);
  for(let y=best.top;y<best.bottom;y++){
    for(let x=0;x<width;x++)if(bright(x,y))colCounts[x]++;
  }
  const floor=Math.max(3,Math.round((best.bottom-best.top)*0.14));
  const left=colCounts.findIndex(v=>v>=floor);
  let right=width;
  while(right>0&&colCounts[right-1]<floor)right--;
  if(left<0||right<=left)return null;
  const marginX=Math.ceil(width*0.035),marginY=Math.ceil(height*0.018);
  const box={
    x:Math.max(0,left-marginX), y:Math.max(0,best.top-marginY),
    width:Math.min(width,right+marginX)-Math.max(0,left-marginX),
    height:Math.min(height,best.bottom+marginY)-Math.max(0,best.top-marginY)
  };
  const area=box.width*box.height/(width*height);
  if(area>=0.80||box.width<width*0.20||box.height<height*0.075)return null;
  return box;
}

export async function prepareStatementImage(file){
  if(typeof createImageBitmap!=='function'||typeof document==='undefined')return null;
  let bitmap;
  try{
    bitmap=await createImageBitmap(file);
    if(bitmap.width*bitmap.height>16_000_000 || bitmap.width<90||bitmap.height<100)return null;
    const w=160, h=Math.min(480,Math.max(64,Math.round(bitmap.height*w/bitmap.width)));
    const sample=document.createElement('canvas');
    sample.width=w;sample.height=h;
    const ctx=sample.getContext('2d',{willReadFrequently:true});
    if(!ctx)return null;
    ctx.drawImage(bitmap,0,0,w,h);
    const bounds=findStatementContentBounds(ctx.getImageData(0,0,w,h).data,w,h);
    if(!bounds)return null;
    const sx=Math.floor(bounds.x*bitmap.width/w),sy=Math.floor(bounds.y*bitmap.height/h);
    const sw=Math.min(bitmap.width-sx,Math.ceil(bounds.width*bitmap.width/w));
    const sh=Math.min(bitmap.height-sy,Math.ceil(bounds.height*bitmap.height/h));
    if(!sw||!sh)return null;
    const canvas=document.createElement('canvas');
    canvas.width=sw;canvas.height=sh;
    const output=canvas.getContext('2d',{alpha:false});
    if(!output)return null;
    output.fillStyle='#ffffff';output.fillRect(0,0,sw,sh);
    output.drawImage(bitmap,sx,sy,sw,sh,0,0,sw,sh);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.93));
    canvas.width=canvas.height=1;
    sample.width=sample.height=1;
    if(!blob || blob.size>8_000_000 || blob.size>Math.max(file.size*2.2,200000))return null;
    return blob;
  }catch(_){
    // An unsupported browser or decoding failure must not block manual upload.
    return null;
  }finally{
    bitmap?.close?.();
  }
}
