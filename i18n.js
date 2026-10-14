'use strict';
// Korean source strings and their English equivalents. Add new UI copy here.
const translations = [
['File Drawer 파일서랍 — 사진 용량 줄이기','File Drawer — Photo Compressor'],
['File Drawer 파일서랍, 이미지 도구를 한곳에. 사진을 서버에 보내지 않고 브라우저에서 압축하고 JPG·WebP로 저장하세요.','Compress photos in your browser with File Drawer. No uploads, no signup. Save smaller JPG or WebP images.'],
['● 사진은 내 기기 안에서만','● Your photos stay on your device'],
['사진의 무게만,','Keep the memories,'],['가볍게 덜어내세요.','lighten the file.'],
['소중한 순간은 그대로, 파일은 더 가볍게.','Your favorite moments. Smaller files.'],['설치도 가입도 없이 사진 한 장으로 시작해요.','Start with a photo. No installation or signup.'],
['사진 용량 줄이기 시작하기','Compress a photo'],['이미지와 음악 파일 카드가 담긴 초록색 서랍','A green drawer holding image and music file cards'],
['사진 용량 줄이기','Photo compressor'],['사진의 크기는 그대로, 파일의 무게만 가볍게.','Keep the pixel dimensions. Reduce the file size.'],['무료 · 가입 없이','Free · No signup'],['사진 압축 도구','Photo compression tool'],
['사진 선택','Choose a photo'],['사진을 여기로 끌어오세요','Drop your photo here'],['또는 눌러서 파일 선택','or click to choose a file'],['JPG · PNG · WebP / 최대 30MB','JPG · PNG · WebP / Up to 30 MB'],['선택한 원본 사진','Selected original photo'],['다른 사진 선택 ↗','Choose another photo ↗'],['⌁ 서버에 저장하지 않아요. 모든 처리는 이 브라우저에서 이루어져요.','⌁ No server uploads. Everything happens in your browser.'],
['가볍게 만들기','Make it smaller'],['이미지 품질','Image quality'],['작은 용량','Smaller file'],['선명한 화질','Higher quality'],['저장 형식','Output format'],['JPG — 사진에 추천','JPG — Recommended for photos'],['WebP — 투명 배경 지원','WebP — Supports transparency'],['투명한 영역은 흰색으로 바뀌어요.','Transparent areas will turn white.'],['투명한 배경을 유지할 수 있어요.','Transparent backgrounds are preserved.'],['사진을 먼저 선택해주세요','Choose a photo first'],['용량 줄이기','Compress photo'],['사진을 선택하면 원본 크기를 확인할 수 있어요.','Choose a photo to see its original size.'],['압축 결과','Compression result'],['압축한 사진 미리보기','Compressed photo preview'],['사진 다운로드 ↓','Download photo ↓'],['다운로드 전 미리보기로 화질을 확인해보세요.','Check the preview before downloading.'],
['내 사진은 내 기기에','Your photos stay yours'],['사진을 서버로 보내지 않아','Your photos never leave your device.'],['개인적인 사진도 직접 관리해요.','You stay in control of your files.'],['복잡한 설정 없이','Simple from the start'],['사진을 고르고 품질만 조절하면','Choose a photo and adjust the quality.'],['바로 저장할 수 있어요.','Then download your smaller file.'],['가볍게, 부담 없이','Free and easy'],['설치도 회원가입도 없이','No installation or account needed.'],['브라우저에서 바로 사용하세요.','Use it right in your browser.'],
['알아두면 좋아요','Good to know'],['압축하면 사진 크기도 작아지나요?','Will the pixel dimensions change?'],['가로·세로 픽셀 수는 유지하고 저장 품질과 형식을 바꿔 파일 용량을 줄여요. 원본이 이미 잘 압축되어 있다면 결과가 더 커질 수 있어요.','The width and height stay the same. We change the encoding quality and format to reduce file size. An already optimized image may produce a larger file.'],['어떤 사진을 사용할 수 있나요?','Which images are supported?'],['30MB 이하의 JPG, PNG, WebP 정지 이미지를 지원해요. 큰 이미지는 기기 메모리 보호를 위해 최대 2,400만 화소, 한 변 12,000픽셀까지만 처리해요. 움직이는 WebP는 정지 이미지로 저장돼요.','Use JPG, PNG, or WebP images up to 30 MB. To protect device memory, images are limited to 24 megapixels and 12,000 pixels per side. Animated WebP files are saved as still images.'],['원본 사진이 바뀌나요?','Will my original photo change?'],['원본 파일은 수정하지 않아요. 압축한 사진은 새로운 파일로 다운로드해요. 저장 과정에서 촬영 정보 등 메타데이터가 제거될 수 있어요.','Your original file is unchanged. The compressed image downloads as a new file. Metadata, such as camera information, may be removed.'],['필요한 파일 도구를 한곳에.','A little home for your file tools.'],
['JPG, PNG, WebP 사진을 선택해주세요.','Please choose a JPG, PNG, or WebP image.'],['30MB 이하의 사진을 선택해주세요.','Please choose an image up to 30 MB.'],['사진을 읽고 있어요…','Reading your photo…'],['사진이 너무 커요. 2,400만 화소 이하, 한 변 12,000픽셀 이하의 사진을 선택해주세요.','This image is too large. Choose an image up to 24 megapixels and 12,000 pixels per side.'],['준비됐어요. 품질을 선택하고 용량을 줄여보세요.','Ready! Choose the quality and compress your photo.'],['사진을 읽지 못했어요. 다른 이미지 파일로 시도해주세요.','Could not read this photo. Please try another image.'],['설정을 바꿨어요. 용량 줄이기를 다시 눌러주세요.','Settings changed. Press Compress photo again.'],['가볍게 만드는 중…','Compressing…'],['사진 크기에 따라 잠시 걸릴 수 있어요.','This may take a moment, depending on the image size.'],['이 브라우저에서는 이미지 처리를 사용할 수 없어요.','Image processing is unavailable in this browser.'],['선택한 형식을 지원하지 않아요. JPG로 다시 시도해주세요.','This format is not supported. Please try JPG.'],['원본이 더 효율적이에요','The original is more efficient'],['완료됐어요! 아래에서 사진을 저장하세요.','Done! Download your photo below.'],['이미 압축된 사진일 수 있어요. 품질을 낮추거나 WebP로 바꿔보세요.','This photo may already be compressed. Try lower quality or WebP.'],['처리하지 못했어요. 더 작은 사진으로 시도해주세요.','Could not process this image. Please try a smaller photo.']
];
translations.push(['사이트 소개','About'],['사용 가이드','Guide'],['문의','Contact'],['개인정보 처리방침','Privacy'],['← 사진 용량 줄이기','← Photo compressor'],['사이트 소개 — File Drawer','About — File Drawer'],['사진 압축 사용 가이드 — File Drawer','Photo compression guide — File Drawer'],['개인정보 처리방침 — File Drawer','Privacy notice — File Drawer'],['문의 — File Drawer','Contact — File Drawer']);
const toEnglish = new Map(translations), toKorean = new Map(translations.map(([ko,en])=>[en,ko]));
let language = navigator.language.toLowerCase().startsWith('ko') ? 'ko' : 'en';
try { const saved = localStorage.getItem('file-drawer-language'); if (saved === 'ko' || saved === 'en') language = saved; } catch {}
function localize(value) {
  const text = value.trim();
  let translated = (language === 'en' ? toEnglish : toKorean).get(text);
  const percent = text.match(/^(\d+(?:\.\d+)?)% (?:가벼워졌어요|smaller)$/);
  if (percent) translated = `${percent[1]}% ${language === 'en' ? 'smaller' : '가벼워졌어요'}`;
  return translated ? value.replace(text, translated) : value;
}
function translateTree(root) {
  if (root.nodeType === Node.TEXT_NODE) {
    if (root.parentElement?.closest('script,style,#language')) return;
    const value = localize(root.nodeValue); if (root.nodeValue !== value) root.nodeValue = value;
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE || root.matches('script,style,#language')) return;
  for (const attr of ['alt','aria-label','content']) {
    if (root.hasAttribute(attr)) { const old = root.getAttribute(attr), value = localize(old); if (old !== value) root.setAttribute(attr,value); }
  }
  for (const child of root.childNodes) translateTree(child);
}
const languageSelect = document.getElementById('language');
function applyLanguage() { document.documentElement.lang = language; languageSelect.value = language; translateTree(document.documentElement); }
applyLanguage();
languageSelect.addEventListener('change', () => { language = languageSelect.value; try {localStorage.setItem('file-drawer-language', language);} catch {} applyLanguage(); });
// Also translate asynchronous status messages without interrupting image processing.
new MutationObserver(records => { for (const record of records) { if (record.type === 'characterData') translateTree(record.target); else for (const node of record.addedNodes) translateTree(node); } }).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
