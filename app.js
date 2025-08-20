const video = document.getElementById('video');
const capture = document.getElementById('capture');
const takeBtn = document.getElementById('take');
const filtersContainer = document.getElementById('filters');
const filterSelect = { value: 'none' };
const thumbnails = document.getElementById('thumbnails');
const generateBtn = document.getElementById('generate');
const stripCanvas = document.getElementById('stripCanvas');

let photos = [];

// start camera
async function startCamera(){
  try{
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    video.srcObject = stream;
  }catch(e){
    console.error('Camera error', e);
    alert('Unable to access camera. Make sure you are running this from localhost or a secure context.');
  }
}
startCamera();

// preview filter on video
// filter buttons
filtersContainer.addEventListener('click', (e)=>{
  const btn = e.target.closest('.filter-btn');
  if(!btn) return;
  // toggle active
  Array.from(filtersContainer.querySelectorAll('.filter-btn')).forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  filterSelect.value = btn.dataset.filter || 'none';
  video.style.filter = (filterSelect.value === 'none') ? 'none' : filterSelect.value;
});

// take photo
takeBtn.addEventListener('click', takePhoto);

function takePhoto(){
  const w = 480;
  const h = 360;
  capture.width = w;
  capture.height = h;
  const ctx = capture.getContext('2d');
  // mirror back when drawing so final photos are not mirrored
  ctx.save();
  ctx.translate(w, 0);
  ctx.scale(-1,1);

  // apply selected filter to canvas drawing (works in modern browsers)
  ctx.filter = (filterSelect.value === 'none') ? 'none' : filterSelect.value;
  ctx.drawImage(video, 0, 0, w, h);
  ctx.restore();

  const data = capture.toDataURL('image/png');
  photos.push(data);
  addThumbnail(data);

  if(photos.length >= 3){
    generateBtn.hidden = false;
    takeBtn.disabled = true;
  }
}

function addThumbnail(data){
  const img = document.createElement('img');
  img.src = data;
  img.className = 'thumb';
  thumbnails.appendChild(img);
}

// generate strip
generateBtn.addEventListener('click', async ()=>{
  if(photos.length < 3) return;
  const stripData = await generateStrip(photos);

  // store in sessionStorage and go to preview page
  try{
    sessionStorage.setItem('photobooth_strip', stripData);
  }catch(e){
    console.warn('sessionStorage set failed', e);
  }

  // remove all previously taken photos (per requirement)
  photos = [];
  thumbnails.innerHTML = '';
  generateBtn.hidden = true;
  takeBtn.disabled = false;

  window.location.href = 'preview.html';
});

async function generateStrip(dataUrls){
  // polaroid-like strip: three photos stacked vertically with white frames
  const photoW = 480;
  const photoH = 360;
  const frame = 24; // left/right frame
  const bottomPad = 44; // larger bottom pad for polaroid look
  const gap = 18;

  const width = photoW + frame * 2;
  const height = dataUrls.length * (photoH + bottomPad) + gap * (dataUrls.length - 1) + frame;

  stripCanvas.width = width;
  stripCanvas.height = height;
  const ctx = stripCanvas.getContext('2d');

  // white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0,width,height);

  // subtle page shadow
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.14)';
  ctx.shadowBlur = 10;

  let y = frame/2;
  for(let i=0;i<dataUrls.length;i++){
    const data = dataUrls[i];

    // draw white frame for each polaroid
    const x = frame/2;
    const imgX = x + 8;
    const imgY = y + 8;
    const imgW = photoW - 16;
    const imgH = photoH - 16;

    // frame rect (we rely on background white, so just draw image area with slight shadow)
    ctx.shadowColor = 'rgba(0,0,0,0.16)';
    ctx.shadowBlur = 12;
    // draw image
    const img = await loadImage(data);
    // center-crop if needed by drawing into temp canvas
    // draw image mirrored back to normal (we stored mirrored already)
    ctx.drawImage(img, imgX, imgY, imgW, imgH);

    // reset shadow for caption
    ctx.shadowBlur = 0;

    // caption area is bottomPad high; leave it blank (white)
    y += photoH + bottomPad + gap - 2;
  }

  // small footer label
  ctx.fillStyle = '#222';
  ctx.font = '14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Photobooth', width/2, stripCanvas.height - 8);

  return stripCanvas.toDataURL('image/png');
}

function loadImage(src){
  return new Promise((res, rej)=>{
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}
