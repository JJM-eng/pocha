'use strict';
// ====================================================================
//  ULTIMATE SHOWS — storyboard-driven cinematic effects
// ====================================================================
const UFX = [];          // timed custom effects {k, t, life, ...}
const uf = o => { o.t = 0; UFX.push(o); return o; };
function baseCast(m, sk, ox, mult){ window._noShow = 1; try { cast(m, sk, true, ox, mult); } finally { window._noShow = 0; } }
const ultAt = (m, mult) => m.s.atk * atkMul() * awMul(m, true) * (mult || 1);
const later = (ms, f) => setTimeout(() => { if (B && !B.over) f(); }, ms);

function ultShow(m, sk, ox, mult){ if (window._noShow) return false; UFX.length = 0;
  const id = m.id, at = ultAt(m, mult), f = B.face;
  switch (id){
    case 'karin': {   // snap → gear wave, monochrome → afterimage barrage → clock hits 12 → shatter
      B.hold = 1; B.mono = 4.6; uf({ k:'gear', x:B.x, y:B.y - 40, life:1.2, col:m.c.col });
      uf({ k:'clock12', x:B.x, y:B.y - 40, life:4.4, col:m.c.col });
      baseCast(m, sk, ox, mult); B.freeze = 4.4;
      for (let i = 0; i < 6; i++) later(400 + i * 600, () => fx({ k:'after', x:B.x + (R() - .5) * 160, y:clamp(B.y + (R() - .5) * 60, GY0, GY1), id, face:R() < .5 ? 1 : -1, life:.5 }));
      return true; }
    case 'layton': {
      const cx = B.x + f * 130, cy = clamp(B.y, GY0 + 20, GY1 - 20);
      uf({ k:'gsphere', x:cx, y:cy - 40, life:3.2, col:'#4aa8ff' }); baseCast(m, sk, ox, mult);
      later(3000, () => { B.shake = .5; fx({ k:'flash', col:'rgba(120,190,255,.45)', life:.3 }); alive().filter(e => Math.hypot(e.x - cx, e.y - cy) < 120).forEach(e => damage(e, at * 1.2, { kb:40 })); SFX.boom(); });
      return true; }
    case 'sera': {
      const ens = alive(); uf({ k:'wire', life:1.5, col:'#54ffc0', pts:ens.map(e => ({ x:e.x, y:e.y - 30 })), lines:[] });
      B.freeze = Math.max(B.freeze, 1.6); for (let i = 0; i < 10; i++) later(i * 110, () => tone(1800 + R() * 800, .05, 'square', .04));
      later(1500, () => { fx({ k:'flash', col:'rgba(84,255,192,.4)', life:.25 }); B.shake = .4; SFX.slash(); noise(.3, .2, 3000);
        alive().forEach(e => { e.brk = Math.max(e.brk, 6); damage(e, at * sk.p * .32, { kb:10 }); fx({ k:'slash', x:e.x, y:e.y - 30, face:1, r:36, life:.2, col:'#54ffc0', fin:1, arc:1.4 }); }); });
      return true; }
    case 'aria': {
      uf({ k:'turrets', x:B.x - f * 10, y:B.y - 110, life:1.25, f, col:'#ffe2a0' });
      later(1250, () => { const y = B.y; uf({ k:'mega', x:B.x + f * 30, y:y - 40, f, life:.9, col:'#ffe2a0' }); B.shake = .7; SFX.boom(); tone(90, .8, 'sawtooth', .2, 40);
        alive().forEach(e => { const inLine = (e.x - B.x) * f > 0 && Math.abs(e.y - y) < 70; damage(e, at * sk.p * (inLine ? .75 : .3), { kb:24 }); e.dot = 5; e.dotD = at * .4; }); });
      B.iframe = Math.max(B.iframe, 2.2); return true; }
    case 'jin': {
      const x0 = B.x, x1 = clamp(B.x + f * 520, B.segX0 + 20, B.segX0 + SEGW - 20); const hit = alive().filter(e => (e.x - x0) * f > -20 && (e.x - x1) * f < 30 && Math.abs(e.y - B.y) < 50);
      fx({ k:'streak', x0, x1, y:B.y - 30, life:.6, col:'#3b7bff' }); for (let i = 0; i < 5; i++) fx({ k:'after', x:lerp(x0, x1, i / 5), y:B.y, id, face:f, life:.6 }); B.x = x1; B.iframe = 1.4; SFX.slash();
      hit.forEach(e => { e.lock = Math.max(e.lock, 1); });
      later(90, () => { B.hitstop = .5; uf({ k:'silence', life:.55 }); tone(2400, .05, 'square', .12); });
      later(700, () => { uf({ k:'crack', life:.8, col:'#ff2a4a' }); B.shake = .6; SFX.boom(); hit.forEach(e => { e.brk = Math.max(e.brk, 5); e.stun = Math.max(e.stun, 1.2); damage(e, at * sk.p * .55, { kb:40 }); }); alive().filter(e => !hit.includes(e)).forEach(e => damage(e, at * 1.2, { kb:10 })); });
      return true; }
    case 'eve': uf({ k:'nano', x:B.x, y:B.y, life:2.6, col:'#a8f4ff' }); return false;
    case 'leon': {
      const t = nearest(B.x, B.y, 900) || { x:B.x + f * 300, y:B.y }; uf({ k:'scope', tx:t.x, ty:t.y - 40, life:.85 }); B.freeze = Math.max(B.freeze, 1);
      later(850, () => { B.y = clamp(t.y, GY0, GY1); B.face = t.x > B.x ? 1 : -1; baseCast(m, sk, ox, mult); uf({ k:'shock', x:B.x, y:B.y - 40, f:B.face, life:.7, col:'#b08cff' }); tone(60, .6, 'sine', .3, 30); });
      return true; }
    case 'selena': uf({ k:'sanct', x:B.x, y:B.y, life:2.4, col:'#7fc8ff' }); return false;
    case 'noah': uf({ k:'sound', x:B.x, y:B.y - 40, life:1.4, col:'#ffd27a' }); B.party.forEach((q, i) => { if (i !== B.ai && !q.dead) fx({ k:'after', x:B.x - (i + 1) * 22, y:B.y, id:q.id, face:B.face, life:1 }); }); return false;
    case 'luna': uf({ k:'hands', x:B.x, y:B.y - 30, life:1.4, col:'#c07cff' }); later(10, () => alive().forEach(e => e.chop = 6)); return false;
    case 'kai': uf({ k:'orbit', life:1.6, col:'#ff6a4a' }); return false;
    case 'rin': uf({ k:'smoke', x:B.x, y:B.y, life:.6 }); return false;
  }
  return false;
}
// Karin: release held damage when the clock strikes 12
function tickUltFx(dt){
  UFX.forEach(u => u.t += dt); for (let i = UFX.length - 1; i >= 0; i--) if (UFX[i].t >= UFX[i].life) UFX.splice(i, 1);
  B.mono = Math.max(0, (B.mono || 0) - dt);
  if (B.hold && B.freeze <= 0){ B.hold = 0; B.mono = 0; fx({ k:'flash', col:'rgba(255,255,255,.7)', life:.3 }); B.shake = .7; SFX.boom(); noise(.5, .25, 4000);
    uf({ k:'shatter', life:.9, sh:Array.from({ length:26 }, () => ({ x:R() * LW, y:R() * LH, vx:(R() - .5) * 500, vy:(R() - .5) * 400, r:R() * 6, s:6 + R() * 22 })) });
    B.en.forEach(e => { if (e.pend && e.hp > 0){ const d = e.pend; e.pend = 0; e.hp -= d; e.flash = .2; ftxt(e.x, e.y - 70 - e.d.r, Math.round(d), '#3ff0ff', 22, 1.2); if (e.hp <= 0) kill(e); } }); }
}
// choppy low-frame slow (Luna)
const _enemyTick = enemyTick;
enemyTick = function(e, dt){ if (e.chop > 0 && e.hp > 0){ e.chop -= dt; e.chopAcc = (e.chopAcc || 0) + dt; if (e.chopAcc < .16) return; dt = e.chopAcc; e.chopAcc = 0; } _enemyTick(e, dt); };

function drawUltFx(){ const c = ctx;
  UFX.forEach(u => { const k = u.t / u.life; c.save();
    switch (u.k){
      case 'gear': { const x = u.x - B.cam; c.globalAlpha = 1 - k; c.strokeStyle = u.col; c.shadowColor = u.col; c.shadowBlur = 20;
        for (let g = 0; g < 3; g++){ const r = (60 + g * 70) * (0.3 + k * 1.4); c.lineWidth = 4 - g; c.save(); c.translate(x, u.y); c.rotate(k * (g % 2 ? -3 : 3)); c.beginPath();
          for (let i = 0; i <= 24; i++){ const a = i / 24 * 6.283, rr2 = r + (i % 2 ? 8 : 0); c.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2 * .55); } c.stroke(); c.restore(); } break; }
      case 'clock12': { const x = u.x - B.cam; c.globalAlpha = .85; c.strokeStyle = u.col; c.shadowColor = u.col; c.shadowBlur = 14; c.lineWidth = 2; c.translate(x, u.y - 50);
        c.beginPath(); c.arc(0, 0, 46, 0, 7); c.stroke(); for (let i = 0; i < 12; i++){ const a = i / 12 * 6.283; c.beginPath(); c.moveTo(Math.sin(a) * 38, -Math.cos(a) * 38); c.lineTo(Math.sin(a) * 46, -Math.cos(a) * 46); c.stroke(); }
        const a = -6.283 + k * 6.283; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.sin(a) * 40, -Math.cos(a) * 40); c.stroke(); c.font = '900 10px sans-serif'; c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText('XII', 0, -30); break; }
      case 'shatter': { c.globalAlpha = 1 - k; c.strokeStyle = 'rgba(200,250,255,.9)'; c.fillStyle = 'rgba(160,230,255,.25)';
        u.sh.forEach(p => { const px = p.x + p.vx * u.t, py = p.y + p.vy * u.t + 300 * u.t * u.t; c.save(); c.translate(px, py); c.rotate(p.r + u.t * 4); c.beginPath(); c.moveTo(0, -p.s); c.lineTo(p.s * .6, p.s * .3); c.lineTo(-p.s * .5, p.s * .5); c.closePath(); c.fill(); c.stroke(); c.restore(); });
        c.lineWidth = 2; for (let i = 0; i < 8; i++){ const a = i * .8; c.beginPath(); c.moveTo(320, 180); c.lineTo(320 + Math.cos(a) * 400, 180 + Math.sin(a) * 300); c.stroke(); } break; }
      case 'gsphere': { const x = u.x - B.cam, gr = 30 + Math.min(1, k * 4) * 50; const g = c.createRadialGradient(x, u.y, 4, x, u.y, gr); g.addColorStop(0, 'rgba(10,20,60,.95)'); g.addColorStop(.6, 'rgba(60,140,255,.6)'); g.addColorStop(1, 'rgba(120,200,255,0)');
        c.fillStyle = g; c.beginPath(); c.arc(x, u.y, gr, 0, 7); c.fill(); c.strokeStyle = '#9fd4ff'; c.shadowColor = '#4aa8ff'; c.shadowBlur = 24; c.lineWidth = 2; c.beginPath(); c.arc(x, u.y, gr * (.9 + Math.sin(u.t * 12) * .05), 0, 7); c.stroke();
        for (let i = 0; i < 16; i++){ const a = i * .39 + u.t * 3, d = 150 * (1 - ((u.t * 1.5 + i * .13) % 1)); c.fillStyle = '#8fc8ff'; c.fillRect(x + Math.cos(a) * d, u.y + Math.sin(a) * d * .5, 3, 3); } break; }
      case 'wire': { c.fillStyle = `rgba(4,30,26,${.45 * Math.min(1, k * 4)})`; c.fillRect(0, 0, LW, LH); c.strokeStyle = 'rgba(84,255,192,.25)'; c.lineWidth = 1;
        for (let x = 0; x < LW; x += 32){ c.beginPath(); c.moveTo(x, 0); c.lineTo(x, LH); c.stroke(); } for (let y = 0; y < LH; y += 32){ c.beginPath(); c.moveTo(0, y); c.lineTo(LW, y); c.stroke(); }
        const n = Math.floor(k * 22); while (u.lines.length < n){ const a = u.pts.length ? pick(u.pts) : { x:B.x + R() * 300, y:200 }; u.lines.push([a.x - B.cam, a.y, R() < .5 ? (R() < .5 ? 0 : LW) : R() * LW, R() < .5 ? (R() < .5 ? 0 : LH) : R() * LH]); }
        c.strokeStyle = u.col; c.shadowColor = u.col; c.shadowBlur = 10; c.lineWidth = 1.6; u.lines.forEach(l => { c.beginPath(); c.moveTo(l[0], l[1]); c.lineTo(l[2], l[3]); c.stroke(); }); break; }
      case 'turrets': { const x = u.x - B.cam, kk = Math.min(1, k * 1.6);
        for (let i = 0; i < 6; i++){ const a = i / 6 * 6.283 + u.t * 2, hx = x + Math.cos(a) * 34 * kk + (1 - kk) * (i - 2.5) * 40, hy = u.y + Math.sin(a) * 34 * kk + (1 - kk) * 40;
          c.fillStyle = '#fff6dc'; c.shadowColor = u.col; c.shadowBlur = 12; c.fillRect(hx - 9, hy - 4, 18, 8); c.fillStyle = '#ffcf5a'; c.fillRect(hx + 6 * u.f, hy - 2, 6, 4); }
        if (k > .55){ for (let i = 0; i < 30; i++){ const a = i * 1.7 + u.t * 5, d = 140 * (1 - ((u.t * 2 + i * .07) % 1)); c.fillStyle = '#ffe28a'; c.fillRect(x + Math.cos(a) * d, u.y + Math.sin(a) * d * .7, 2.5, 2.5); }
          c.globalAlpha = (k - .55) * 2; const g = c.createRadialGradient(x, u.y, 0, x, u.y, 40); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,220,120,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, u.y, 40, 0, 7); c.fill(); } break; }
      case 'mega': { const x = u.x - B.cam, w = 70 * (1 - k * .7); c.globalAlpha = 1 - k * .6; c.shadowColor = u.col; c.shadowBlur = 40;
        const g = c.createLinearGradient(0, u.y - w, 0, u.y + w); g.addColorStop(0, 'rgba(255,220,120,0)'); g.addColorStop(.35, u.col); g.addColorStop(.5, '#fff'); g.addColorStop(.65, u.col); g.addColorStop(1, 'rgba(255,220,120,0)'); c.fillStyle = g;
        if (u.f > 0) c.fillRect(x, u.y - w, LW - x + 20, w * 2); else c.fillRect(-20, u.y - w, x + 20, w * 2);
        c.globalAlpha = (1 - k) * .5; c.fillStyle = '#fff'; c.fillRect(0, 0, LW, LH); break; }
      case 'silence': { c.fillStyle = `rgba(0,0,0,${.55 * (1 - k * .3)})`; c.fillRect(0, 0, LW, LH); c.fillStyle = '#fff'; c.font = '900 13px sans-serif'; c.textAlign = 'center'; c.globalAlpha = k > .5 ? 1 : k * 2; c.fillText('— 찰칵 —', 320, 186); break; }
      case 'crack': { c.globalAlpha = 1 - k; c.strokeStyle = u.col; c.shadowColor = u.col; c.shadowBlur = 30; c.lineWidth = 14 * (1 - k * .6);
        c.beginPath(); c.moveTo(-20, 340); for (let i = 1; i <= 8; i++) c.lineTo(i * 85 + (i % 2 ? 12 : -12), 340 - i * 44 + (i % 2 ? 10 : -10)); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 4; c.stroke();
        c.globalAlpha = (1 - k) * .3; c.fillStyle = '#ff2a4a'; c.fillRect(0, 0, LW, LH); break; }
      case 'nano': { const x = u.x - B.cam; c.fillStyle = u.col; c.shadowColor = u.col; c.shadowBlur = 10;
        for (let i = 0; i < 80; i++){ const p = ((u.t * .7 + i / 80) % 1), a = i * 2.4 + u.t * 6, r = 20 + p * 70; c.globalAlpha = 1 - p; c.fillRect(x + Math.cos(a) * r, u.y - p * 200 + Math.sin(a) * r * .3, 2, 2); }
        c.globalAlpha = .3 * (1 - k); c.strokeStyle = u.col; c.lineWidth = 2; c.beginPath(); c.ellipse(x, u.y, 260 * Math.min(1, k * 3), 70 * Math.min(1, k * 3), 0, 0, 7); c.stroke(); break; }
      case 'scope': { const tx = u.tx - B.cam, ty = u.ty, r = lerp(260, 70, Math.min(1, k * 1.6)); c.fillStyle = 'rgba(0,0,0,.9)'; c.beginPath(); c.rect(0, 0, LW, LH); c.arc(tx, ty, r, 0, 7, true); c.fill('evenodd');
        c.strokeStyle = '#ff3b3b'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(tx - r, ty); c.lineTo(tx + r, ty); c.moveTo(tx, ty - r); c.lineTo(tx, ty + r); c.stroke(); c.beginPath(); c.arc(tx, ty, r * .3, 0, 7); c.stroke();
        c.strokeStyle = '#b08cff'; c.lineWidth = 3; c.beginPath(); c.arc(tx, ty, r, 0, 7); c.stroke(); c.fillStyle = '#ff3b3b'; c.font = '800 10px monospace'; c.textAlign = 'left'; c.fillText(`DIST ${Math.round(Math.abs(u.tx - B.x) * 4)}m  LOCK ${k > .7 ? 'ON' : '...'}`, tx + r * .4, ty + r * .55); break; }
      case 'shock': { const x = u.x - B.cam; c.strokeStyle = u.col; c.shadowColor = u.col; c.shadowBlur = 16; c.lineWidth = 3; c.globalAlpha = 1 - k;
        for (let i = 0; i < 7; i++){ const px = x + u.f * (60 + i * 90) * (0.4 + k); c.beginPath(); c.ellipse(px, u.y, 12 + k * 20, 34 + k * 30, 0, 0, 7); c.stroke(); } break; }
      case 'sanct': { const x = u.x - B.cam; c.globalAlpha = Math.min(1, (u.life - u.t) * 2) * .8;
        const g = c.createLinearGradient(0, 0, 0, u.y); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(180,230,255,.8)'); c.fillStyle = g; c.beginPath(); c.moveTo(x - 30, 0); c.lineTo(x + 30, 0); c.lineTo(x + 6, u.y - 60); c.lineTo(x + 30, u.y); c.lineTo(x - 30, u.y); c.lineTo(x - 6, u.y - 60); c.closePath(); c.fill();
        const cols = ['#ff7a9a', '#7fc8ff', '#ffd27a', '#9dff9a', '#c07cff', '#7fe7ff']; for (let i = 0; i < 12; i++){ c.fillStyle = cols[i % 6] + '66'; c.beginPath(); c.moveTo(x, u.y); c.ellipse(x, u.y, 150, 46, 0, i / 12 * 6.283, (i + 1) / 12 * 6.283); c.closePath(); c.fill(); }
        c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, u.y, 150, 46, 0, 0, 7); c.stroke();
        for (let i = 0; i < 24; i++){ const p = (u.t * .8 + i / 24) % 1; c.fillStyle = '#fff'; c.globalAlpha = 1 - p; c.fillRect(x + Math.sin(i * 7) * 120, u.y - p * 160, 2, 2); } break; }
      case 'sound': { const x = u.x - B.cam; c.strokeStyle = u.col; c.shadowColor = u.col; c.shadowBlur = 12; for (let i = 0; i < 4; i++){ const p = (k * 1.5 + i * .25) % 1; c.globalAlpha = 1 - p; c.lineWidth = 3; c.beginPath(); c.ellipse(x, u.y, 20 + p * 200, (20 + p * 200) * .45, 0, 0, 7); c.stroke(); } break; }
      case 'hands': { const x = u.x - B.cam; c.strokeStyle = u.col; c.shadowColor = u.col; c.shadowBlur = 14; c.globalAlpha = 1 - k; c.lineWidth = 3;
        for (let i = 0; i < 8; i++){ const a = i / 8 * 6.283 + k * 4, r = 40 + k * 300; c.beginPath(); c.moveTo(x, u.y); c.lineTo(x + Math.cos(a) * r, u.y + Math.sin(a) * r * .45); c.stroke(); } c.beginPath(); c.ellipse(x, u.y, 40 + k * 300, (40 + k * 300) * .45, 0, 0, 7); c.stroke(); break; }
      case 'orbit': { const x = B.x - B.cam, y = B.y - 30; c.strokeStyle = u.col; c.shadowColor = '#ffb04a'; c.shadowBlur = 16; c.lineWidth = 5; c.globalAlpha = 1 - k * .6;
        c.beginPath(); for (let i = 0; i < 40; i++){ const a = u.t * 12 - i * .12; c.lineTo(x + Math.cos(a) * 70, y + Math.sin(a) * 30); } c.stroke(); break; }
      case 'smoke': { const x = u.x - B.cam; c.fillStyle = 'rgba(70,40,110,.5)'; c.globalAlpha = 1 - k; for (let i = 0; i < 8; i++){ c.beginPath(); c.arc(x + Math.cos(i) * 30 * (k + .3), u.y - 20 + Math.sin(i * 2) * 10, 18 * (k + .5), 0, 7); c.fill(); } break; }
    }
    c.restore(); });
}
// cut-in extras (face cut-in, hologram numbers, crosshair…)
function drawCutExtra(m, k){ const c = ctx; c.save(); const id = m.id;
  if (id === 'layton'){ c.fillStyle = 'rgba(120,200,255,.9)'; c.font = '700 10px monospace'; for (let i = 0; i < 10; i++){ c.globalAlpha = .4 + .6 * ((k * 5 + i * .3) % 1); c.fillText(`G=${(9.81 * (1 + i * .37)).toFixed(3)}  Φ ${(R() * 99).toFixed(2)}`, 360 + (i % 3) * 70, 110 + i * 16); } }
  if (id === 'leon'){ c.strokeStyle = '#ff3b3b'; c.lineWidth = 1.5; c.beginPath(); c.arc(470, 170, 50, 0, 7); c.moveTo(410, 170); c.lineTo(530, 170); c.moveTo(470, 110); c.lineTo(470, 230); c.stroke(); }
  if (id === 'karin'){ c.strokeStyle = '#3ff0ff'; c.globalAlpha = .6; c.lineWidth = 2; c.save(); c.translate(500, 170); c.rotate(k * 4); c.beginPath(); for (let i = 0; i <= 24; i++){ const a = i / 24 * 6.283, r = 90 + (i % 2 ? 10 : 0); c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.stroke(); c.restore(); }
  if (id === 'sera'){ c.fillStyle = '#54ffc0'; c.font = '700 9px monospace'; for (let i = 0; i < 14; i++){ c.globalAlpha = .5; c.fillText(Math.random().toString(16).slice(2, 14).toUpperCase(), 330 + (i % 2) * 120, 90 + i * 14); } }
  if (id === 'jin'){ c.strokeStyle = 'rgba(80,140,255,.8)'; c.lineWidth = 3; c.beginPath(); c.moveTo(300, 250); c.lineTo(640, 120); c.stroke(); }
  c.restore(); }
// scripted ult captions (storyboard motions)
const ULT_CAP = { karin:'공중 도약 · 쌍권총 회전 장전 · 핑거 스냅', layton:'안경을 치켜올리며 · 건틀릿 코어 최대 출력', sera:'고글 다운 · 가상 키보드 고속 타이핑', aria:'부유 포대 6기 · 육각 진형 결합', jin:'역수 파지 · 낮은 발도 자세', eve:'부유 · 기계 관절의 푸른 빛 역류', leon:'망토를 젖히고 · 한쪽 무릎 견착', selena:'성물을 높이 들어 올리며 기도', noah:'헤드셋을 누르며 · 홀로그램 턴테이블 역스크래치', luna:'공중 회전 · 예지 수정구 내리꽂기', kai:'부스터 점화 · 아군 주위 고속 선회', rin:'낮게 웅크린 뒤 · 연막 순간 도약' };
