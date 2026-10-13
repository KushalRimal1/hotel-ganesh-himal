function shouldShowWelcome(info) {
  if (info.forced || info.navigationType === 'reload') return true;
  const intent = info.intent;
  const recentHomeClick = intent && intent.destination === info.pathname && intent.from !== info.pathname && Number.isFinite(intent.at) && Math.abs(info.now - intent.at) < 15000;
  if (recentHomeClick) return false;
  if (info.navigationType === 'back_forward') {
    const actualInternalReturn = (info.homeVisited || info.welcomeSeen) && info.previousPage && info.previousPage.pathname !== info.pathname && info.historyLength > 1;
    return !actualInternalReturn;
  }
  if (!info.storageAvailable && info.internalReferrer && info.historyLength > 1) return false;
  return true;
}

function navigationScript() {
  return `(()=>{
    const choose=${shouldShowWelcome.toString()};
    let storageAvailable=true;
    function read(key){try{const value=sessionStorage.getItem(key);return value?JSON.parse(value):null;}catch{storageAvailable=false;return null;}}
    function write(key,value){try{sessionStorage.setItem(key,JSON.stringify(value));}catch{storageAvailable=false;}}
    function remove(key){try{sessionStorage.removeItem(key);}catch{}}
    function decide(type){
      let ref=null;try{ref=document.referrer?new URL(document.referrer):null;}catch{}
      const seen=read('hotel-welcome-seen')===true;
      const homeVisited=read('hotel-home-visited')===true;
      const previousPage=read('hotel-last-page');
      const intent=read('hotel-home-intent');
      return {show:choose({forced:new URLSearchParams(location.search).get('welcome')==='1',navigationType:type,pathname:location.pathname,previousPage,intent,welcomeSeen:seen,homeVisited,storageAvailable,historyLength:history.length,internalReferrer:ref?.origin===location.origin&&ref.pathname!==location.pathname,now:Date.now()})};
    }
    let type='navigate';try{type=performance.getEntriesByType('navigation')[0]?.type||(performance.navigation?.type===2?'back_forward':performance.navigation?.type===1?'reload':'navigate');}catch{}
    const decision=decide(type);
    document.documentElement.classList.remove('welcome-returning');
    if(location.pathname==='/'&&!decision.show)document.documentElement.classList.add('welcome-returning');
    remove('hotel-home-intent');
    write('hotel-last-page',{pathname:location.pathname,at:Date.now()});
    if(location.pathname==='/')write('hotel-home-visited',true);
    window.HotelWelcomeNavigation={decision};
    document.addEventListener('click',event=>{
      if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      const link=event.target.closest?.('a');if(!link||link.target==='_blank'||link.hasAttribute('download'))return;
      let url;try{url=new URL(link.href,location.href);}catch{return;}
      if(url.origin===location.origin&&url.pathname==='/'&&location.pathname!=='/')write('hotel-home-intent',{from:location.pathname,destination:'/',at:Date.now()});
    },true);
    window.addEventListener('pageshow',event=>{
      if(!event.persisted)return;
      const next=decide('back_forward');
      remove('hotel-home-intent');
      write('hotel-last-page',{pathname:location.pathname,at:Date.now()});
      window.HotelWelcomeNavigation.decision=next;
      if(location.pathname==='/'){
        document.documentElement.classList.toggle('welcome-returning',!next.show);
        document.dispatchEvent(new CustomEvent('hotel:welcome-restored',{detail:next}));
      }
    });
  })();`;
}

module.exports = { shouldShowWelcome, navigationScript };
