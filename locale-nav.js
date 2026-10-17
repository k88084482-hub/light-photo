'use strict';
// Each language has a crawlable HTML page; switching languages follows its URL.
const localeSelect=document.getElementById('language');
if(localeSelect&&document.documentElement.dataset.page){
 localeSelect.value=document.documentElement.dataset.pageLang;
 localeSelect.addEventListener('change',event=>{event.stopImmediatePropagation();const lang=localeSelect.value,page=document.documentElement.dataset.page;if(!['ko','en','vi'].includes(lang))return;try{localStorage.setItem('file-drawer-language',lang);}catch{}const path=lang==='ko'?(page==='index'?'/':'/'+page):'/'+lang+'-'+page;location.assign(path+location.hash);},true);
}
