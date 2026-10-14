'use strict';
const $ = (id) => document.getElementById(id);
const state = { image: null, file: null, sourceUrl: null, resultUrl: null, version: 0 };
const bytes = (n) => n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(2)} MB`;
function status(message, error = false) { $('status').textContent = message; $('status').classList.toggle('error', error); }
function clearResult() { $('result').hidden = true; if (state.resultUrl) URL.revokeObjectURL(state.resultUrl); state.resultUrl = null; $('processed').removeAttribute('src'); $('download').removeAttribute('href'); }
function ready() { $('compress').disabled = !state.image; $('compress').innerHTML = state.image ? '용량 줄이기 <span>→</span>' : '사진을 먼저 선택해주세요 <span>→</span>'; }
async function selectFile(file) {
  if (!file) return;
  const version = ++state.version;
  clearResult(); state.image = null; state.file = null; ready();
  $('preview').hidden = true; $('dropzone').hidden = false;
  $('original').removeAttribute('src');
  if (state.sourceUrl) URL.revokeObjectURL(state.sourceUrl);
  state.sourceUrl = null;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { status('JPG, PNG, WebP 사진을 선택해주세요.', true); return; }
  if (file.size > 30 * 1024 * 1024) { status('30MB 이하의 사진을 선택해주세요.', true); return; }
  status('사진을 읽고 있어요…');
  const url = URL.createObjectURL(file);
  const img = new Image(); img.src = url;
  try {
    await img.decode();
    if (version !== state.version) { URL.revokeObjectURL(url); return; }
    if (!img.naturalWidth || img.naturalWidth * img.naturalHeight > 24000000 || Math.max(img.naturalWidth, img.naturalHeight) > 12000) throw new Error('사진이 너무 커요. 2,400만 화소 이하, 한 변 12,000픽셀 이하의 사진을 선택해주세요.');
    state.image = img; state.file = file; state.sourceUrl = url;
    $('original').src = url; $('filename').textContent = file.name;
    $('original-info').textContent = `${bytes(file.size)} · ${img.naturalWidth.toLocaleString()} × ${img.naturalHeight.toLocaleString()} px`;
    $('dropzone').hidden = true; $('preview').hidden = false; ready(); status('준비됐어요. 품질을 선택하고 용량을 줄여보세요.');
  } catch (error) {
    URL.revokeObjectURL(url);
    if (version !== state.version) return;
    status(error.message.startsWith('사진이 너무') ? error.message : '사진을 읽지 못했어요. 다른 이미지 파일로 시도해주세요.', true);
  }
}
$('file').addEventListener('change', (event) => { selectFile(event.target.files[0]); event.target.value = ''; });
$('replace').addEventListener('click', () => $('file').click());
for (const name of ['dragenter', 'dragover']) $('dropzone').addEventListener(name, (event) => { event.preventDefault(); $('dropzone').classList.add('dragging'); });
for (const name of ['dragleave', 'drop']) $('dropzone').addEventListener(name, (event) => { event.preventDefault(); $('dropzone').classList.remove('dragging'); });
$('dropzone').addEventListener('drop', (event) => selectFile(event.dataTransfer.files[0]));
function settingsChanged() { ++state.version; clearResult(); ready(); if (state.image) status('설정을 바꿨어요. 용량 줄이기를 다시 눌러주세요.'); }
$('quality').addEventListener('input', () => { $('quality-value').textContent = `${$('quality').value}%`; settingsChanged(); });
$('format').addEventListener('change', () => { $('format-note').textContent = $('format').value === 'image/jpeg' ? '투명한 영역은 흰색으로 바뀌어요.' : '투명한 배경을 유지할 수 있어요.'; settingsChanged(); });
$('compress').addEventListener('click', async () => {
  if (!state.image) return;
  const version = ++state.version, file = state.file, img = state.image;
  clearResult(); $('compress').disabled = true; $('compress').textContent = '가볍게 만드는 중…'; status('사진 크기에 따라 잠시 걸릴 수 있어요.');
  const canvas = document.createElement('canvas');
  try {
    const type = $('format').value, quality = Number($('quality').value) / 100;
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('이 브라우저에서는 이미지 처리를 사용할 수 없어요.');
    if (type === 'image/jpeg') { context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); }
    context.drawImage(img, 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
    if (version !== state.version) return;
    if (!blob || blob.type !== type) throw new Error('선택한 형식을 지원하지 않아요. JPG로 다시 시도해주세요.');
    state.resultUrl = URL.createObjectURL(blob);
    const reduction = (1 - blob.size / file.size) * 100;
    $('saving').textContent = reduction > 0 ? `${reduction.toFixed(1)}% 가벼워졌어요` : '원본이 더 효율적이에요';
    $('before-size').textContent = bytes(file.size); $('after-size').textContent = bytes(blob.size);
    $('processed').src = state.resultUrl; $('download').href = state.resultUrl;
    $('download').download = `${file.name.replace(/\.[^.]+$/, '')}-light.${type === 'image/jpeg' ? 'jpg' : 'webp'}`;
    $('result').hidden = false;
    status(reduction > 0 ? '완료됐어요! 아래에서 사진을 저장하세요.' : '이미 압축된 사진일 수 있어요. 품질을 낮추거나 WebP로 바꿔보세요.');
  } catch (error) { if (version === state.version) status(error.message || '처리하지 못했어요. 더 작은 사진으로 시도해주세요.', true); }
  finally { canvas.width = 0; canvas.height = 0; if (version === state.version) ready(); }
});
