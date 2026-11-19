// 결제 아이템 복구 (ONE store PNS 연동) — 모든 게임 공용
// 사용: <script src="../pns.js" data-game="td"></script> 를 SDK 모듈 스크립트보다 먼저.
// 게임은 window.__pnsGrant = productId => true/false (지급 성공 여부) 를 정의.
(function(){
  var API = 'https://pocha-pns.gkdlmin56.workers.dev';
  var me = document.currentScript, game = (me && me.dataset.game) || 'g';
  var LS = function(k, v){ try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
  var uk = 'pns:uid:' + game, uid = LS(uk);
  if (!uid){ var a = new Uint8Array(12); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function(_, i){ a[i] = Math.random() * 256; }); uid = game + '_' + Array.from(a, function(b){ return ('0' + b.toString(16)).slice(-2); }).join(''); LS(uk, uid); }
  var gk = 'pns:got:' + game;
  var got = function(){ try { return JSON.parse(LS(gk) || '[]'); } catch (e) { return []; } };
  var mark = function(pid){ var g = got(); if (g.indexOf(pid) < 0){ g.push(pid); if (g.length > 300) g = g.slice(-300); LS(gk, JSON.stringify(g)); } };
  var claim = function(pid, prod){ try { fetch(API + '/claim', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ uid:uid, purchaseId:pid, productId:prod }), keepalive:true }).catch(function(){}); } catch (e) {} };

  function patch(sdk){
    if (!sdk || !sdk.iap || sdk.iap.__pns) return;
    var orig = sdk.iap.purchase;
    var wrapped = function(p){
      return orig.call(sdk.iap, Object.assign({}, p, { developerPayload:uid })).then(function(r){
        var pid = r && (r.purchaseId || r.orderId);
        if (pid){ mark(pid); claim(pid, (r && r.productId) || p.productId); }
        return r;
      });
    };
    try { sdk.iap.purchase = wrapped; sdk.iap.__pns = true; } catch (e) {}
    if (sdk.iap.purchase !== wrapped){ try { Object.defineProperty(sdk.iap, 'purchase', { value:wrapped, configurable:true }); } catch (e) {} }
    setTimeout(function(){ check(); }, 1500);
  }
  var cur;
  try { Object.defineProperty(window, '__osdkSdk', { configurable:true, get:function(){ return cur; }, set:function(v){ cur = v; patch(v); } }); } catch (e) {}

  var busy = false;
  // 미지급 결제를 찾아 지급. 반환: 새로 지급한 개수 (-1 = 서버 연결 실패)
  function check(){
    if (busy) return Promise.resolve(0); busy = true;
    return fetch(API + '/pending?uid=' + encodeURIComponent(uid), { cache:'no-store' }).then(function(r){ return r.json(); }).then(function(d){
      var n = 0, g = got();
      (d.items || []).forEach(function(it){
        if (g.indexOf(it.purchaseId) >= 0){ claim(it.purchaseId, it.productId); return; }
        var ok = false; try { ok = window.__pnsGrant ? window.__pnsGrant(it.productId) !== false : false; } catch (e) {}
        if (ok){ mark(it.purchaseId); claim(it.purchaseId, it.productId); n++; }
      });
      busy = false; return n;
    }).catch(function(){ busy = false; return -1; });
  }
  window.addEventListener('osdk-resume', function(){ check(); });
  document.addEventListener('visibilitychange', function(){ if (!document.hidden) check(); });
  window.PNS = { check:check, uid:uid };
})();
