// client-side error reporting
(function(){
  const ENDPOINT = '/api/report-error';
  const SECRET = (window.ERROR_REPORT_SECRET || null); // allow injection for testing

  function send(payload){
    try{
      navigator.sendBeacon && typeof navigator.sendBeacon === 'function'
        ? navigator.sendBeacon(ENDPOINT, JSON.stringify(payload))
        : fetch(ENDPOINT, {method:'POST',headers:{'Content-Type':'application/json','X-ERROR-SECRET': SECRET||''},body:JSON.stringify(payload)});
    }catch(e){console.warn('report fail',e)}
  }

  function gatherBase(){
    return {
      url: location.href,
      userAgent: navigator.userAgent,
      time: (new Date()).toISOString()
    };
  }

  window.addEventListener('error', function(ev){
    const p = gatherBase();
    p.type = 'error';
    p.message = ev.message || (ev.error && ev.error.message) || '';
    p.stack = ev.error && ev.error.stack ? ev.error.stack : (ev.filename?`at ${ev.filename}:${ev.lineno}:${ev.colno}`:'');
    send(p);
  });

  window.addEventListener('unhandledrejection', function(ev){
    const p = gatherBase();
    p.type = 'unhandledrejection';
    p.message = (ev.reason && ev.reason.message) || String(ev.reason || '');
    p.stack = (ev.reason && ev.reason.stack) || '';
    send(p);
  });

  // override console.error
  const origConsoleError = console.error;
  console.error = function(){
    try{
      const args = Array.from(arguments).map(a=> (a && a.stack) ? a.stack : (typeof a==='object'?JSON.stringify(a):String(a)) ).join(' ');
      const p = gatherBase(); p.type='console'; p.message=args; send(p);
    }catch(e){}
    origConsoleError.apply(console, arguments);
  };

  // expose small API
  window.__wg20_report = (obj)=> send(Object.assign(gatherBase(), obj));
})();
