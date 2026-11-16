'use strict';
// ====================================================================
//  VISUAL OVERHAUL — camera, depth, motion, particles, HUD
// ====================================================================
const ZOOM = 1.12, FOCUS_Y = 248;
const ds = y => .84 + clamp((y - GY0) / (GY1 - GY0), 0, 1) * .3;           // depth scale
const ATK_ICON = { s:'gun', m:'blade', h:'orb', l:'nade', b:'beam' };

// ---------- particles ----------
function P(o){ if (!B) return; B.pt = B.pt || []; if (B.pt.length > 420) B.pt.shift(); o.t = 0; B.pt.push(o); return o; }
function sparks(x, y, col, n, sp, dir){ for (let i = 0; i < n; i++){ const a = (dir != null ? (dir > 0 ? 0 : Math.PI) : R() * 6.283) + (R() - .5) * (dir != null ? 1.6 : 6.283); const v = sp * (.4 + R() * .8);
  P({ k:'spark', x, y, vx:Math.cos(a) * v, vy:Math.sin(a) * v * .7 - 40, g:300, life:.22 + R() * .25, w:1.5 + R() * 1.5, col }); } }
function glows(x, y, col, n, r){ for (let i = 0; i < n; i++) P({ k:'glow', x:x + (R() - .5) * r, y:y + (R() - .5) * r * .6, vx:(R() - .5) * 60, vy:-20 - R() * 60, g:-10, life:.4 + R() * .5, s:2 + R() * 4, col }); }
function smoke(x, y, n, col){ for (let i = 0; i < n; i++) P({ k:'smoke', x:x + (R() - .5) * 30, y:y + (R() - .5) * 10, vx:(R() - .5) * 50, vy:-15 - R() * 30, g:-5, life:.7 + R() * .6, s:10 + R() * 14, col:col || 'rgba(40,30,60,' }); }
function dust(x, y, f){ for (let i = 0; i < 3; i++) P({ k:'smoke', x:x - f * 6, y:y - 2, vx:-f * (20 + R() * 40), vy:-8 - R() * 12, g:0, life:.35 + R() * .2, s:5 + R() * 5, col:'rgba(150,170,200,' }); }
function updParticles(dt){ if (!B.pt) return; B.pt.forEach(p => { p.t += dt; p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(.2, dt); }); B.pt = B.pt.filter(p => p.t < p.life); }
function drawParticles(add){ const c = ctx; B.pt && B.pt.forEach(p => { const k = p.t / p.life, x = p.x - B.cam;
  if (p.k === 'smoke'){ if (add) return; c.globalAlpha = (1 - k) * .35; c.fillStyle = p.col + '1)'; c.beginPath(); c.arc(x, p.y, p.s * (.6 + k), 0, 7); c.fill(); return; }
  if (!add) return;
  if (p.k === 'spark'){ c.globalAlpha = 1 - k; c.strokeStyle = p.col; c.lineWidth = p.w; c.beginPath(); c.moveTo(x, p.y); c.lineTo(x - p.vx * .035, p.y - p.vy * .035); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = p.w * .4; c.stroke(); }
  else if (p.k === 'glow'){ const r = p.s * (1 - k * .5); const g = c.createRadialGradient(x, p.y, 0, x, p.y, r * 2.4); g.addColorStop(0, '#fff'); g.addColorStop(.3, p.col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.globalAlpha = 1 - k; c.fillStyle = g; c.beginPath(); c.arc(x, p.y, r * 2.4, 0, 7); c.fill(); }
  else if (p.k === 'shard'){ c.globalAlpha = 1 - k; c.fillStyle = p.col; c.save(); c.translate(x, p.y); c.rotate(p.t * 10 + p.vx); c.fillRect(-p.s / 2, -1, p.s, 2.4); c.restore(); }
  else if (p.k === 'ring'){ c.globalAlpha = (1 - k) * .9; c.strokeStyle = p.col; c.lineWidth = 3 * (1 - k) + .5; c.beginPath(); c.ellipse(x, p.y, p.r0 + (p.r1 - p.r0) * k, (p.r0 + (p.r1 - p.r0) * k) * .42, 0, 0, 7); c.stroke(); }
}); c.globalAlpha = 1; }
const glowDisc = (x, y, r, col, a) => { const c = ctx, g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.globalAlpha = a; c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.globalAlpha = 1; };
const hexA = c2 => { const m = /^#?([0-9a-f]{6})$/i.exec(c2); if (!m) return 'rgba(127,231,255,'; const n = parseInt(m[1], 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},`; };

// ---------- hooks into gameplay for juice ----------
const _damage = damage;
damage = function(e, dmg, o){ const hp0 = e.hp, n0 = B.tx.length; _damage(e, dmg, o); const d = hp0 - e.hp; if (d <= 0 && !(e.pend > 0)) return;
  const crit = B.tx.length > n0 && B.tx[B.tx.length - 1].col === '#ffd447'; const hx = e.x, hy = e.y - 26 * ds(e.y) - e.d.r * .6;
  sparks(hx, hy, crit ? '#ffd447' : me().c.col, crit ? 9 : 4, crit ? 340 : 220, e.x > B.x ? 1 : -1); e.hitT = .14; e.hitDir = e.x > B.x ? 1 : -1;
  if (crit){ B.punch = Math.max(B.punch || 0, .035); P({ k:'ring', x:hx, y:hy, r0:4, r1:34, life:.22, col:'#ffd447' }); const t = B.tx[B.tx.length - 1]; t.crit = 1; }
  if (B.tx.length > n0) B.tx[B.tx.length - 1].pop = 1; };
const _kill = kill;
kill = function(e){ _kill(e); const y = e.y - 30 * ds(e.y); glows(e.x, y, e.d.col, e.t === 'boss' ? 40 : 12, e.d.r * 2); sparks(e.x, y, '#fff', 8, 260); smoke(e.x, e.y - 10, e.t === 'boss' ? 14 : 4);
  for (let i = 0; i < (e.t === 'boss' ? 30 : 10); i++) P({ k:'shard', x:e.x, y, vx:(R() - .5) * 320, vy:-80 - R() * 200, g:520, life:.6 + R() * .4, s:4 + R() * 6, col:e.d.col });
  P({ k:'ring', x:e.x, y:e.y, r0:6, r1:e.d.r * 3, life:.35, col:e.d.col }); B.punch = Math.max(B.punch || 0, e.t === 'boss' ? .08 : .015); };
const _explode = explode;
explode = function(x, y, r, dmg){ _explode(x, y, r, dmg); sparks(x, y - 12, '#ffb04a', 14, 320); smoke(x, y - 8, 6, 'rgba(60,40,40,'); glows(x, y - 10, '#ff8a3a', 6, r);
  for (let i = 0; i < 8; i++) P({ k:'shard', x, y:y - 10, vx:(R() - .5) * 360, vy:-100 - R() * 180, g:600, life:.5 + R() * .3, s:3 + R() * 4, col:'#ffcf8a' }); P({ k:'ring', x, y, r0:r * .3, r1:r * 1.5, life:.3, col:'#ffcf5a' }); };
const _perfect = perfectDodge;
perfectDodge = function(){ const was = B.bt; _perfect(); if (B.bt > 0 && !was){ for (let i = 0; i < 3; i++) P({ k:'ring', x:B.x, y:B.y - 30, r0:10 + i * 10, r1:220 + i * 60, life:.5 + i * .12, col:'#7fe7ff' }); glows(B.x, B.y - 40, '#7fe7ff', 14, 60); B.punch = .06; } };
const _tagTo = tagTo;
tagTo = function(i){ const before = B.ai; _tagTo(i); if (B.ai !== before){ const c2 = me().c.col; B.tagFlash = { t:0, col:c2 }; glows(B.x, B.y - 40, c2, 14, 40); P({ k:'ring', x:B.x, y:B.y, r0:6, r1:90, life:.35, col:c2 }); } };
const _hurt = hurtPlayer;
hurtPlayer = function(dmg, src){ const hp0 = me().hp, r2 = _hurt(dmg, src); if (B && me().hp < hp0){ B.hurtV = .45; sparks(B.x, B.y - 40, '#ff4c6a', 6, 200); } return r2; };
const _normal = normalAttack;
normalAttack = function(){ _normal(); const m = me(), a = m.c.atk; B.atkStart = B.t; B.atkKind = a.k;
  if (a.k === 's' || a.k === 'b') { glows(B.x + B.face * 34, B.y - 40 * ds(B.y), m.c.col, 2, 6); } };
const _useSkill = useSkill;
useSkill = function(){ const cd0 = me().skCd; _useSkill(); if (cd0 <= 0 && me().skCd > 0){ glows(B.x, B.y - 50, me().c.col, 18, 50); P({ k:'ring', x:B.x, y:B.y, r0:8, r1:110, life:.45, col:me().c.col }); } };
const _start = startBattle;
startBattle = function(opt){ _start(opt); B.pt = []; B.hpLag = B.party.map(q => q.hp); B.amb = []; B.punch = 0; B.zoomNow = ZOOM; };

// ---------- background ----------
const AMB = { ruins:'rain', lab:'motes', vault:'motes', rift:'embers', abyss:'embers' };
drawBG = function(){ const c = ctx, bg = B.bg, im = img(BGIMG[bg] || BGIMG.ruins);
  if (ok(im)){ const h = LH * 1.06, w = im.naturalWidth / im.naturalHeight * h; let ox = -(B.cam * .3) % w; if (ox > 0) ox -= w; for (let x = ox; x < LW; x += w) c.drawImage(im, x, -h * .04, w, h); }
  else { c.fillStyle = '#0b1630'; c.fillRect(0, 0, LW, LH); }
  // atmosphere haze near horizon
  const col = (BGCOL[bg] || BGCOL.ruins)[2]; const hz = c.createLinearGradient(0, 120, 0, 210); hz.addColorStop(0, 'rgba(0,0,0,0)'); hz.addColorStop(1, hexA(col) + '.12)'); c.fillStyle = hz; c.fillRect(0, 120, LW, 90);
};
function drawFloor(){ const c = ctx, col = (BGCOL[B.bg] || BGCOL.ruins)[2];
  const g = c.createLinearGradient(0, GY0 - 26, 0, LH + 40); g.addColorStop(0, 'rgba(6,10,22,0)'); g.addColorStop(.12, 'rgba(6,10,22,.55)'); g.addColorStop(1, 'rgba(2,4,12,.92)'); c.fillStyle = g; c.fillRect(-60, GY0 - 26, LW + 120, LH);
  // neon reflections on wet floor
  c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 7; i++){ const x = ((i * 137 - B.cam * .9) % 760 + 760) % 760 - 60; const gg = c.createLinearGradient(0, GY0, 0, LH); gg.addColorStop(0, hexA(i % 2 ? col : '#3ff0ff') + '.10)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gg; c.fillRect(x, GY0 - 4, 10 + (i % 3) * 8, LH - GY0 + 20); }
  c.globalCompositeOperation = 'source-over';
  c.strokeStyle = hexA(col) + '.25)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-60, GY0 - 12); c.lineTo(LW + 60, GY0 - 12); c.stroke();
}
function ambient(dt){ const kind = AMB[B.bg] || 'motes'; B.amb = B.amb || []; const want = kind === 'rain' ? 70 : 34;
  while (B.amb.length < want) B.amb.push({ x:R() * 700 - 30, y:R() * LH, v:kind === 'rain' ? 420 + R() * 200 : 10 + R() * 25, s:R(), ph:R() * 6 });
  B.amb.forEach(a => { if (kind === 'rain'){ a.y += a.v * dt; a.x -= a.v * .18 * dt; if (a.y > LH){ a.y = -10; a.x = R() * 700; } } else { a.y -= a.v * dt; a.ph += dt; a.x += Math.sin(a.ph) * 8 * dt; if (a.y < -10){ a.y = LH + 10; a.x = R() * 700; } } }); }
function drawAmbient(front){ const c = ctx, kind = AMB[B.bg] || 'motes'; c.save(); c.globalCompositeOperation = 'lighter';
  B.amb && B.amb.forEach((a, i) => { if ((i % 3 === 0) !== front) return;
    if (kind === 'rain'){ c.strokeStyle = `rgba(160,200,255,${.12 + a.s * .18})`; c.lineWidth = front ? 1.4 : .8; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(a.x + 3, a.y - 14 - a.s * 10); c.stroke(); }
    else { const col = kind === 'embers' ? '255,90,160' : '120,230,255'; c.fillStyle = `rgba(${col},${.25 + a.s * .5})`; c.beginPath(); c.arc(a.x, a.y, front ? 1.8 + a.s * 1.5 : .8 + a.s, 0, 7); c.fill(); } });
  c.restore(); }

// ---------- characters ----------
drawChar = function(id, x, y, face, opt){ const c = ctx, ch = CHM[id]; opt = opt || {}; const sp = img(sprArt(id)); const S = ds(opt.wy != null ? opt.wy : y + (B ? 0 : 0));
  c.save(); c.translate(x, y); if (opt.alpha != null) c.globalAlpha = opt.alpha;
  if (!opt.ghost && !opt.tint){ c.fillStyle = 'rgba(0,0,0,.5)'; c.beginPath(); c.ellipse(0, 0, 22 * S, 6 * S, 0, 0, 7); c.fill(); }
  const t = B ? B.animT : 0; let bob = 0, rot = 0, sx = 1, sy = 1, dx = 0, dy = 0, fr = 0;
  if (opt.skill){ const k = 1 - Math.max(0, B.skAnim) / .35; fr = 3; dy = -Math.sin(k * Math.PI) * 10; sx = 1 + Math.sin(k * Math.PI) * .04; }
  else if (opt.atk){ const k = clamp((B.t - (B.atkStart || 0)) / .2, 0, 1), s2 = Math.sin(k * Math.PI); fr = 2;
    if (B.atkKind === 'm'){ dx = s2 * 12; sx = 1 + s2 * .08; sy = 1 - s2 * .05; rot = s2 * .06; } else { dx = -s2 * 4; rot = -s2 * .04; } }
  else if (opt.anim === 'run'){ fr = Math.floor(t * 10) % 2 ? 1 : 0; bob = Math.abs(Math.sin(t * 13)) * 4; rot = .07; sy = 1 + Math.sin(t * 26) * .02; }
  else { bob = Math.sin(t * 2.6) * 1.2; sy = 1 + Math.sin(t * 2.6) * .014; }
  if (opt.dodge){ sx = 1.18; sy = .9; rot = .16; }
  if (opt.hurt){ rot = -.14; dx = -5; }
  const H = 124 * S;
  c.scale(face, 1); c.translate(dx, dy - bob); c.rotate(rot); c.scale(sx, sy);
  if (ok(sp)){ const fw = sp.naturalWidth / 4, fh = sp.naturalHeight, W = fw / fh * H;
    if (opt.tint) c.filter = opt.tint; else if (opt.hurt) c.filter = 'brightness(1.4) sepia(1) hue-rotate(-40deg) saturate(4)'; else if (opt.rim) c.filter = `drop-shadow(0 0 3px ${ch.col})`;
    c.drawImage(sp, fr * fw, 0, fw, fh, -W / 2, -H + 4, W, H); c.filter = 'none'; }
  else { c.fillStyle = ch.col; c.fillRect(-10, -H * .8, 20, H * .8); }
  c.restore(); };
function drawReflection(id, x, y, face, frame){ const c = ctx, sp = img(sprArt(id)); if (!ok(sp)) return; const S = ds(y), H = 124 * S, fw = sp.naturalWidth / 4, fh = sp.naturalHeight, W = fw / fh * H;
  c.save(); c.globalAlpha = .16; c.translate(x, y + 2); c.scale(face, -.55); c.drawImage(sp, (frame || 0) * fw, 0, fw, fh, -W / 2, -H, W, H); c.restore(); }
// enemies
const _drawEnemyOrig = drawEnemy;
drawEnemy = function(e){ const c = ctx, d = e.d, sx = e.x - B.cam; if (sx < -120 || sx > LW + 120) return; const S = ds(e.y) * (e.t === 'boss' ? 1.15 : 1.05);
  // telegraph (unscaled, world space) — reuse original by drawing a fake invisible body: draw telegraph portion only
  if (e.wind && e.hp > 0){ const w = e.wind, k = w.t / w.dur; c.save(); c.globalCompositeOperation = 'lighter';
    const pulse = .5 + Math.sin(B.t * 30) * .5; c.fillStyle = `rgba(255,40,70,${.1 + k * .22})`; c.strokeStyle = `rgba(255,70,100,${.5 + k * .5})`; c.lineWidth = 2;
    if (w.k === 'slam'){ c.fillRect(w.x - w.w / 2 - B.cam, w.y - w.h / 2, w.w, w.h); c.fillStyle = `rgba(255,60,90,${.25 + pulse * .15})`; c.fillRect(w.x - w.w / 2 - B.cam, w.y - w.h / 2, w.w * k, w.h); c.strokeRect(w.x - w.w / 2 - B.cam, w.y - w.h / 2, w.w, w.h); }
    if (w.k === 'bslam'){ c.beginPath(); c.ellipse(w.x - B.cam, w.y, w.r, w.r / 1.6, 0, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.ellipse(w.x - B.cam, w.y, w.r * k, w.r / 1.6 * k, 0, 0, 7); c.fill(); }
    if (w.k === 'bcharge'){ const x1 = e.x + w.face * 420; c.fillRect(Math.min(e.x, x1) - B.cam, w.y - 30, Math.abs(x1 - e.x), 60); for (let i = 0; i < 6; i++){ const ax = e.x - B.cam + w.face * (40 + i * 60 + (B.t * 200) % 60); c.beginPath(); c.moveTo(ax, w.y - 14); c.lineTo(ax + w.face * 14, w.y); c.lineTo(ax, w.y + 14); c.stroke(); } }
    if (w.k === 'blaser'){ c.fillRect(-60, w.y - 20, LW + 120, 40); c.fillStyle = `rgba(255,255,255,${k * .35})`; c.fillRect(-60, w.y - 2, LW + 120, 4); }
    if (w.k === 'laser'){ c.strokeStyle = `rgba(80,240,255,${.3 + k * .6})`; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(e.x - B.cam, w.y - 52); c.lineTo(e.x - B.cam + w.face * 400, w.y - 52); c.stroke(); c.setLineDash([]); }
    if (w.k === 'shot'){ c.strokeStyle = `rgba(255,80,140,${.3 + k * .5})`; c.beginPath(); c.moveTo(e.x - B.cam + w.face * 16, e.y - 30); c.lineTo(B.x - B.cam, B.y - 30); c.stroke(); }
    if (w.k === 'swipe'){ c.beginPath(); c.ellipse(e.x - B.cam + w.face * 26, e.y, 34, 12, 0, 0, 7); c.fill(); }
    c.restore();
    // charging glow
    glowDisc(sx, e.y - d.r * 2.2 * S, d.r * 2.6 * S * (1 + k * .4), 'rgba(255,40,80,.55)', .3 + k * .4);
    c.fillStyle = '#ff3b5c'; c.font = `900 ${16 + k * 6}px sans-serif`; c.textAlign = 'center'; c.fillText('!', sx, e.y - d.r * 3.4 * S - 14 - Math.sin(e.ph * 20) * 2); }
  if (d.kind === 'core'){ c.save(); c.translate(sx, e.y); glowDisc(0, -40, 40, 'rgba(255,212,71,.7)', .6 + Math.sin(B.t * 6) * .2); c.fillStyle = '#ffe27a'; c.rotate(e.ph * 2); c.beginPath(); c.moveTo(0, -58); c.lineTo(12, -40); c.lineTo(0, -22); c.lineTo(-12, -40); c.closePath(); c.fill(); c.restore(); if (e.hp > 0){ c.fillStyle = '#ffd447'; c.fillRect(sx - 14, e.y - 74, 28 * e.hp / e.maxhp, 3); } return; }
  c.save(); c.translate(sx, e.y);
  let alpha = 1; if (e.st === 'spawn'){ const k = 1 - Math.max(0, e.stT) / .45; alpha = clamp(k, 0, 1); c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = hexA(d.col) + (1 - k) + ')'; c.lineWidth = 3; c.beginPath(); c.ellipse(0, 0, d.r * 2 * (1.2 - k * .4), d.r * .6, 0, 0, 7); c.stroke(); c.restore(); }
  if (e.hp <= 0) alpha = Math.max(0, e.dieT / .45);
  c.globalAlpha = alpha;
  c.fillStyle = 'rgba(0,0,0,.5)'; c.beginPath(); c.ellipse(0, 0, d.r * 1.2 * S, d.r * .32 * S, 0, 0, 7); c.fill();
  const fly = d.fly ? (40 + Math.sin(e.ph * 3) * 5) * S : 0;
  const sp = img(e.t === 'boss' ? `art/e_${B.opt.boss}.webp` : `art/e_${e.t}.webp`); const fr = e.wind ? 1 : 0;
  let rot = 0, sxx = 1, syy = 1 + Math.sin(e.ph * 3) * .02, ox = 0;
  if (e.hitT > 0){ rot = -.12 * e.hitDir * e.face; ox = e.hitDir * 3; e.hitT -= .016; }
  if (e.wind){ const k = e.wind.t / e.wind.dur; ox += Math.sin(B.t * 60) * 1.5 * k; syy *= 1 - k * .05; sxx *= 1 + k * .05; }
  if (e.hp <= 0){ syy *= 1 + (1 - alpha) * .3; sxx *= 1 - (1 - alpha) * .4; }
  c.translate(ox, 0); c.scale(e.face, 1); c.rotate(rot); c.scale(sxx, syy);
  if (e.flash > 0) c.filter = 'brightness(3.2)'; else if (e.lock > 0 || B.freeze > 0) c.filter = 'grayscale(1) brightness(.85) sepia(.7) hue-rotate(170deg)'; else if (e.groggy > 0) c.filter = 'sepia(.6) saturate(2) brightness(1.1)';
  if (ok(sp)){ const fw = sp.naturalWidth / 2, fh = sp.naturalHeight, H = d.r * 4.4 * S, W = fw / fh * H; c.drawImage(sp, fr * fw, 0, fw, fh, -W / 2, -H - fly + 6, W, H); }
  else { c.filter = 'none'; c.restore(); return _drawEnemyOrig(e); }
  c.filter = 'none'; c.restore();
  // reflection
  if (ok(sp) && !d.fly && e.hp > 0){ const fw = sp.naturalWidth / 2, fh = sp.naturalHeight, H = d.r * 4.4 * S, W = fw / fh * H; c.save(); c.globalAlpha = .12 * alpha; c.translate(sx, e.y + 2); c.scale(e.face, -.5); c.drawImage(sp, fr * fw, 0, fw, fh, -W / 2, -H + 6, W, H); c.restore(); }
  // status
  const top = e.y - d.r * 4.2 * S - fly - 4;
  if (e.hp > 0 && e.st !== 'spawn' && e.t !== 'boss' && e.hp < e.maxhp){ const w = d.r * 2.4; c.fillStyle = 'rgba(0,0,0,.65)'; c.fillRect(sx - w / 2 - 1, top - 1, w + 2, 5); c.fillStyle = '#ff4c6a'; c.fillRect(sx - w / 2, top, w * e.hp / e.maxhp, 3); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(sx - w / 2, top, w * e.hp / e.maxhp, 1); }
  if (e.stun > 0 && e.hp > 0){ c.fillStyle = '#ffe25a'; c.font = '800 10px sans-serif'; c.textAlign = 'center'; for (let i = 0; i < 3; i++){ const a = B.t * 5 + i * 2.1; c.fillText('✦', sx + Math.cos(a) * 12, top - 8 + Math.sin(a) * 4); } }
  if (e.lock > 0 && e.hp > 0){ c.strokeStyle = '#ffd447'; c.lineWidth = 2; c.beginPath(); c.arc(sx, e.y - d.r * 1.6 * S, d.r * 1.6 * S, 0, 6.283 * (e.lock / 1.6)); c.stroke(); }
};

// ---------- fx overrides (crescent slashes, layered explosions) ----------
const _drawFx = drawFx;
drawFx = function(f){ const c = ctx, k = f.t / f.life, x = (f.x || 0) - B.cam;
  if (f.k === 'slash'){ c.save(); c.globalCompositeOperation = 'lighter'; c.translate(x, f.y); c.scale(f.face, 1); const a = (f.arc || 1), r = f.r * (f.fin ? 1.25 : 1.05), sw = k * .7;
    const g = c.createLinearGradient(-r, 0, r, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.6, f.col); g.addColorStop(1, '#fff'); c.fillStyle = g; c.globalAlpha = (1 - k) * .95;
    c.beginPath(); c.arc(-r * .3, 0, r, -a + sw, a * .8 + sw); c.arc(-r * .3 + r * .18, 0, r * .74, a * .8 + sw, -a + sw, true); c.closePath(); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = f.fin ? 3 : 2; c.beginPath(); c.arc(-r * .3, 0, r, -a * .7 + sw, a * .7 + sw); c.stroke(); c.restore(); return; }
  if (f.k === 'boom'){ c.save(); c.globalCompositeOperation = 'lighter'; const r = f.r * (.5 + k * .9); glowDisc(x, f.y - 12, r * 1.6, 'rgba(255,140,60,.8)', 1 - k);
    const g = c.createRadialGradient(x, f.y - 12, 0, x, f.y - 12, r); g.addColorStop(0, '#fff'); g.addColorStop(.35, '#ffe08a'); g.addColorStop(.7, 'rgba(255,90,40,.7)'); g.addColorStop(1, 'rgba(255,40,40,0)'); c.globalAlpha = 1 - k * k; c.fillStyle = g; c.beginPath(); c.ellipse(x, f.y - 12, r, r * .78, 0, 0, 7); c.fill(); c.restore(); return; }
  if (f.k === 'muzzle'){ c.save(); c.globalCompositeOperation = 'lighter'; glowDisc(x, f.y, 18, f.col, 1 - k); c.fillStyle = '#fff'; c.globalAlpha = 1 - k; c.beginPath(); c.moveTo(x, f.y - 4); c.lineTo(x + 18 * (f.face || B.face), f.y); c.lineTo(x, f.y + 4); c.closePath(); c.fill(); c.restore(); return; }
  if (f.k === 'ring' || f.k === 'beam' || f.k === 'streak' || f.k === 'burst' || f.k === 'spark'){ c.save(); c.globalCompositeOperation = 'lighter'; _drawFx(f); c.restore(); return; }
  _drawFx(f); };

// ---------- shots with trails ----------
function drawShots(){ const c = ctx; c.save(); c.globalCompositeOperation = 'lighter';
  B.shots.forEach(s => { s.tr = s.tr || []; s.tr.push([s.x, s.y]); if (s.tr.length > 7) s.tr.shift(); const x = s.x - B.cam;
    if (s.tr.length > 1){ for (let i = 1; i < s.tr.length; i++){ const a = i / s.tr.length; c.strokeStyle = hexA(s.col) + (a * .7) + ')'; c.lineWidth = (s.w || 3) * a * 1.6; c.beginPath(); c.moveTo(s.tr[i - 1][0] - B.cam, s.tr[i - 1][1]); c.lineTo(s.tr[i][0] - B.cam, s.tr[i][1]); c.stroke(); } }
    glowDisc(x, s.y, (s.lob ? 12 : s.w * 3.4 + 4), s.col, .9); c.fillStyle = '#fff'; c.beginPath(); c.arc(x, s.y, Math.max(1.5, (s.w || 3) * .6), 0, 7); c.fill(); });
  B.es.forEach(s => { const x = s.x - B.cam; s.tr = s.tr || []; s.tr.push([s.x, s.y]); if (s.tr.length > 6) s.tr.shift();
    for (let i = 1; i < s.tr.length; i++){ c.strokeStyle = hexA(s.col) + (i / s.tr.length * .5) + ')'; c.lineWidth = s.r * i / s.tr.length * 1.4; c.beginPath(); c.moveTo(s.tr[i - 1][0] - B.cam, s.tr[i - 1][1]); c.lineTo(s.tr[i][0] - B.cam, s.tr[i][1]); c.stroke(); }
    glowDisc(x, s.y, s.r * 3.4, s.col, .95); c.fillStyle = '#fff'; c.beginPath(); c.arc(x, s.y, s.r * .5, 0, 7); c.fill(); c.strokeStyle = s.col; c.lineWidth = 1.2; c.beginPath(); c.arc(x, s.y, s.r * (1.3 + Math.sin(B.t * 20) * .2), 0, 7); c.stroke(); });
  B.drones.forEach(d => { const x = B.x - B.cam + Math.cos(d.a) * 44, y = B.y - 78 + Math.sin(d.a) * 14; glowDisc(x, y, 14, d.col, .8); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - 8, y); c.lineTo(x, y - 4); c.lineTo(x + 8, y); c.lineTo(x, y + 3); c.closePath(); c.fill(); });
  c.restore(); }

// ---------- damage numbers ----------
function drawNumbers(){ const c = ctx; c.save(); c.textAlign = 'center';
  B.tx.forEach(t => { const k = t.t / t.life; const pop = t.pop ? (t.t < .1 ? 1.7 - t.t / .1 * .7 : 1) : 1; const a = 1 - Math.max(0, k - .6) / .4; const x = t.x - B.cam, y = t.y;
    c.save(); c.translate(x, y); c.scale(pop, pop); c.globalAlpha = a; const fs = t.size * (t.crit ? 1.15 : 1); c.font = `italic 900 ${fs}px sans-serif`;
    c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,.85)'; c.strokeText(t.s, 0, 0);
    if (t.crit || t.pop){ const g = c.createLinearGradient(0, -fs, 0, 0); g.addColorStop(0, '#fff'); g.addColorStop(1, t.col); c.fillStyle = g; } else c.fillStyle = t.col; c.fillText(t.s, 0, 0);
    if (t.crit){ c.font = '900 8px sans-serif'; c.fillStyle = '#ffd447'; c.fillText('CRITICAL', 0, -fs + 1); }
    c.restore(); }); c.restore(); }

// ---------- HUD ----------
function hexPath(x, y, r){ const c = ctx; c.beginPath(); for (let i = 0; i < 6; i++){ const a = Math.PI / 6 + i * Math.PI / 3; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); }
function skewBar(x, y, w, h, k, c1, c2, lag){ const c = ctx, sk = h * .6; const path = (ww) => { c.beginPath(); c.moveTo(x + sk, y); c.lineTo(x + sk + ww, y); c.lineTo(x + ww, y + h); c.lineTo(x, y + h); c.closePath(); };
  c.fillStyle = 'rgba(0,0,0,.65)'; path(w); c.fill(); if (lag != null && lag > k){ c.fillStyle = 'rgba(255,255,255,.75)'; path(w * lag); c.fill(); }
  const g = c.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, c1); g.addColorStop(1, c2); c.fillStyle = g; path(Math.max(0, w * k)); c.fill();
  c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(x + sk, y, Math.max(0, w * k - sk), 1); c.strokeStyle = 'rgba(160,220,255,.35)'; c.lineWidth = 1; path(w); c.stroke(); }
function icon(kind, x, y, s, col){ const c = ctx; c.save(); c.translate(x, y); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 2.2; c.lineCap = 'round';
  if (kind === 'gun'){ c.beginPath(); c.arc(0, 0, s * .55, 0, 7); c.stroke(); c.beginPath(); c.moveTo(-s, 0); c.lineTo(-s * .3, 0); c.moveTo(s * .3, 0); c.lineTo(s, 0); c.moveTo(0, -s); c.lineTo(0, -s * .3); c.moveTo(0, s * .3); c.lineTo(0, s); c.stroke(); c.beginPath(); c.arc(0, 0, 2, 0, 7); c.fill(); }
  else if (kind === 'blade'){ c.rotate(-.78); c.beginPath(); c.moveTo(0, -s); c.lineTo(s * .22, -s * .1); c.lineTo(0, s * .45); c.lineTo(-s * .22, -s * .1); c.closePath(); c.fill(); c.fillRect(-s * .4, s * .45, s * .8, 3); c.fillRect(-1.5, s * .5, 3, s * .45); }
  else if (kind === 'orb'){ c.beginPath(); c.arc(0, 0, s * .45, 0, 7); c.fill(); c.beginPath(); c.ellipse(0, 0, s, s * .35, .5, 0, 7); c.stroke(); }
  else if (kind === 'nade'){ c.beginPath(); c.arc(0, s * .1, s * .5, 0, 7); c.fill(); c.fillRect(-3, -s * .65, 6, s * .3); c.beginPath(); c.arc(s * .35, -s * .7, s * .25, Math.PI, 0); c.stroke(); }
  else if (kind === 'beam'){ c.beginPath(); c.moveTo(s * .2, -s); c.lineTo(-s * .45, s * .1); c.lineTo(s * .05, s * .1); c.lineTo(-s * .2, s); c.lineTo(s * .5, -s * .15); c.lineTo(0, -s * .15); c.closePath(); c.fill(); }
  else if (kind === 'dash'){ for (let i = 0; i < 2; i++){ c.beginPath(); c.moveTo(-s * .6 + i * s * .55, -s * .6); c.lineTo(s * .0 + i * s * .55, 0); c.lineTo(-s * .6 + i * s * .55, s * .6); c.stroke(); } }
  c.restore(); }
function cardIn(id, x, y, r, clip){ const c = ctx, ci = img(cardArt(id)), fi = img(faceArt(id)); c.save(); clip(); c.clip(); c.fillStyle = '#121a30'; c.fillRect(x - r, y - r, r * 2, r * 2);
  if (ok(fi)) c.drawImage(fi, x - r, y - r, r * 2, r * 2); else if (ok(ci)){ const w = ci.naturalWidth, sz = w * .62; c.drawImage(ci, (w - sz) / 2, w * .02, sz, sz, x - r, y - r, r * 2, r * 2); } c.restore(); }
drawHUD = function(){ const c = ctx, m = me(); c.save(); c.textBaseline = 'alphabetic';
  // --- status panel ---
  const pg = c.createLinearGradient(0, 0, 230, 0); pg.addColorStop(0, 'rgba(6,14,32,.88)'); pg.addColorStop(1, 'rgba(6,14,32,0)'); c.fillStyle = pg; c.beginPath(); c.moveTo(0, 0); c.lineTo(240, 0); c.lineTo(222, 62); c.lineTo(0, 62); c.closePath(); c.fill();
  c.fillStyle = m.c.col; c.fillRect(0, 0, 3, 62);
  cardIn(m.id, 32, 31, 24, () => hexPath(32, 31, 24)); c.strokeStyle = m.c.col; c.lineWidth = 2; hexPath(32, 31, 24); c.stroke();
  const el = ELEM[m.c.el] || { e:'', c:'#fff' }; c.fillStyle = '#0a1426'; c.beginPath(); c.arc(50, 49, 8, 0, 7); c.fill(); c.font = '10px sans-serif'; c.textAlign = 'center'; c.fillText(el.e, 50, 53);
  c.textAlign = 'left'; c.font = '900 13px sans-serif'; c.fillStyle = '#fff'; c.fillText(m.c.name, 62, 18); const nw = c.measureText(m.c.name).width;
  c.font = '800 9px sans-serif'; c.fillStyle = RAR[m.c.r].c; c.fillText(m.c.r, 66 + nw, 18); c.fillStyle = '#8fb6d8'; c.fillText(m.c.role, 66 + nw + c.measureText(m.c.r).width + 5, 18);
  const ai = B.ai; B.hpLag[ai] = B.hpLag[ai] == null ? m.hp : Math.max(m.hp, lerp(B.hpLag[ai], m.hp, .04)); const hk = m.hp / m.maxhp;
  skewBar(62, 24, 150, 9, hk, hk < .3 ? '#ff3b5c' : '#2dffa0', hk < .3 ? '#ff8a6a' : '#2ad8ff', B.hpLag[ai] / m.maxhp);
  if (m.shield > 0){ c.fillStyle = 'rgba(140,210,255,.9)'; c.fillRect(66, 24, Math.min(146, 146 * m.shield / m.maxhp), 2); }
  c.font = '800 8px sans-serif'; c.fillStyle = '#dff'; c.textAlign = 'right'; c.fillText(`${Math.ceil(m.hp)} / ${m.maxhp}`, 210, 31.5);
  // energy cells
  c.textAlign = 'left'; for (let i = 0; i < 5; i++){ const fill = clamp(B.energy / 20 - i, 0, 1), x = 62 + i * 30; c.fillStyle = 'rgba(0,0,0,.6)'; c.beginPath(); c.moveTo(x + 3, 38); c.lineTo(x + 28, 38); c.lineTo(x + 25, 44); c.lineTo(x, 44); c.closePath(); c.fill();
    if (fill > 0){ const g = c.createLinearGradient(x, 0, x + 28, 0); g.addColorStop(0, '#26e0ff'); g.addColorStop(1, B.energy >= 100 ? '#ff5aa0' : '#7a8cff'); c.fillStyle = g; c.beginPath(); c.moveTo(x + 3, 38); c.lineTo(x + 3 + 25 * fill, 38); c.lineTo(x + 25 * fill, 44); c.lineTo(x, 44); c.closePath(); c.fill(); } }
  c.font = '700 8px sans-serif'; c.fillStyle = B.energy >= 100 ? '#ff9ac8' : '#7fd8ff'; c.fillText(B.energy >= 100 ? '궁극기 준비 완료!' : `시공간 에너지 ${Math.floor(B.energy)}%`, 62, 55);
  // --- stage plate ---
  c.textAlign = 'center'; c.fillStyle = 'rgba(6,14,32,.75)'; c.beginPath(); c.moveTo(232, 0); c.lineTo(408, 0); c.lineTo(396, 32); c.lineTo(244, 32); c.closePath(); c.fill(); c.strokeStyle = 'rgba(120,200,255,.3)'; c.stroke();
  c.fillStyle = '#e8f6ff'; c.font = '900 11px sans-serif'; c.fillText(B.opt.title || '', 320, 14); const tt = Math.floor(B.t); c.font = '700 9px sans-serif'; c.fillStyle = '#8fb6d8';
  c.fillText(`⏱ ${Math.floor(tt / 60)}:${String(tt % 60).padStart(2, '0')}`, 296, 27); for (let i = 0; i < B.segs.length; i++){ c.fillStyle = i < B.seg ? '#7fe7ff' : i === B.seg ? '#fff' : 'rgba(255,255,255,.25)'; c.beginPath(); c.moveTo(334 + i * 14, 21); c.lineTo(344 + i * 14, 21); c.lineTo(341 + i * 14, 27); c.lineTo(331 + i * 14, 27); c.closePath(); c.fill(); }
  // --- boss bar ---
  if (B.boss && B.boss.hp > 0){ const b = B.boss; c.fillStyle = 'rgba(30,4,12,.8)'; c.beginPath(); c.moveTo(150, 38); c.lineTo(500, 38); c.lineTo(490, 56); c.lineTo(140, 56); c.closePath(); c.fill();
    skewBar(156, 44, 324, 8, b.hp / b.maxhp, b.groggy > 0 ? '#ffd447' : '#ff1f4f', '#ff7a5a'); c.fillStyle = '#fff'; c.font = '900 10px sans-serif'; c.fillText('☠ ' + b.name + (b.groggy > 0 ? ' — BREAK' : ''), 320, 37.5 + 30); }
  // --- GO ---
  if (B.cleared){ c.save(); c.globalAlpha = .55 + Math.sin(B.t * 8) * .45; c.fillStyle = '#7fe7ff'; c.font = 'italic 900 24px sans-serif'; c.fillText('GO', 540, 186); for (let i = 0; i < 3; i++){ c.beginPath(); c.moveTo(566 + i * 12, 172); c.lineTo(576 + i * 12, 179); c.lineTo(566 + i * 12, 186); c.lineWidth = 3; c.strokeStyle = '#7fe7ff'; c.stroke(); } c.restore(); }
  // --- tag portraits (hex) ---
  others().forEach((i, k) => { const q = B.party[i], b = BTN[k ? 't2' : 't1']; c.save(); c.globalAlpha = q.dead ? .35 : 1;
    if (B.bt > 0 && !q.dead){ glowDisc(b.x, b.y, b.r * 2, 'rgba(255,212,71,.9)', .5 + Math.sin(B.t * 14) * .3); }
    cardIn(q.id, b.x, b.y, b.r, () => hexPath(b.x, b.y, b.r)); c.strokeStyle = B.bt > 0 && !q.dead ? '#ffd447' : q.c.col; c.lineWidth = 2; hexPath(b.x, b.y, b.r); c.stroke();
    if (B.tagCd > 0 && !q.dead){ c.save(); hexPath(b.x, b.y, b.r); c.clip(); c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2 * Math.min(1, B.tagCd / 1.1)); c.restore(); }
    c.fillStyle = 'rgba(0,0,0,.7)'; c.fillRect(b.x - b.r, b.y + b.r + 1, b.r * 2, 3); c.fillStyle = q.hp / q.maxhp < .3 ? '#ff4c6a' : '#2dffa0'; c.fillRect(b.x - b.r, b.y + b.r + 1, b.r * 2 * q.hp / q.maxhp, 3);
    c.font = '9px sans-serif'; c.fillText((ELEM[q.c.el] || {}).e || '', b.x - b.r + 3, b.y - b.r + 8);
    if (B.bt > 0 && !q.dead){ c.fillStyle = '#ffd447'; c.font = 'italic 900 10px sans-serif'; c.fillText('◀ TAG', b.x - b.r - 22, b.y + 4); }
    c.restore(); });
  // --- action buttons ---
  const ring = (b, col, a) => { c.save(); c.translate(b.x, b.y); c.rotate(B.t * .6); c.strokeStyle = col; c.globalAlpha = a; c.lineWidth = 1.2; for (let i = 0; i < 12; i++){ const a1 = i / 12 * 6.283; c.beginPath(); c.arc(0, 0, b.r + 4, a1, a1 + .3); c.stroke(); } c.restore(); };
  const base = (b, hi) => { const g = c.createRadialGradient(b.x, b.y - b.r * .4, 2, b.x, b.y, b.r); g.addColorStop(0, hi ? 'rgba(90,200,255,.85)' : 'rgba(40,80,130,.75)'); g.addColorStop(1, hi ? 'rgba(20,60,120,.85)' : 'rgba(8,18,40,.78)'); c.fillStyle = g; c.beginPath(); c.arc(b.x, b.y, b.r, 0, 7); c.fill();
    c.strokeStyle = 'rgba(150,225,255,.7)'; c.lineWidth = 1.5; c.stroke(); c.strokeStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(b.x, b.y, b.r - 4, 3.6, 5.8); c.stroke(); };
  // attack
  base(BTN.atk, INP.atk); ring(BTN.atk, m.c.col, .7); icon(ATK_ICON[m.c.atk.k] || 'gun', BTN.atk.x, BTN.atk.y - 4, 13, '#fff'); c.fillStyle = '#bfe9ff'; c.font = '800 8px sans-serif'; c.fillText(m.c.wpn, BTN.atk.x, BTN.atk.y + 22);
  // skill
  const sk = BTN.sk; cardIn(m.id, sk.x, sk.y, sk.r, () => { c.beginPath(); c.arc(sk.x, sk.y, sk.r, 0, 7); }); c.fillStyle = 'rgba(4,10,24,.35)'; c.beginPath(); c.arc(sk.x, sk.y, sk.r, 0, 7); c.fill();
  c.strokeStyle = m.skCd > 0 ? 'rgba(120,160,200,.6)' : m.c.col; c.lineWidth = 2; c.stroke(); if (m.skCd <= 0) ring(sk, m.c.col, .9);
  if (m.skCd > 0){ c.fillStyle = 'rgba(0,0,0,.62)'; c.beginPath(); c.moveTo(sk.x, sk.y); c.arc(sk.x, sk.y, sk.r, -1.57, -1.57 + 6.283 * m.skCd / m.skMax); c.fill(); c.fillStyle = '#fff'; c.font = '900 13px sans-serif'; c.fillText(Math.ceil(m.skCd), sk.x, sk.y + 5); }
  else { c.fillStyle = '#fff'; c.font = '900 8px sans-serif'; c.fillText('SKILL', sk.x, sk.y + sk.r - 3); }
  // dodge (glows when an attack is about to land)
  const danger = B.en.some(e => e.wind && e.hp > 0 && e.wind.dur - e.wind.t < .5 && Math.abs(e.x - B.x) < 200); const dg = BTN.dodge;
  if (danger && B.btCool <= 0){ glowDisc(dg.x, dg.y, dg.r * 2, 'rgba(127,231,255,.9)', .5 + Math.sin(B.t * 20) * .3); }
  base(dg, danger); icon('dash', dg.x, dg.y - 2, 10, B.dodgeCd > 0 ? '#6a86a8' : '#fff'); c.fillStyle = '#bfe9ff'; c.font = '800 7px sans-serif'; c.fillText('DODGE', dg.x, dg.y + 15);
  // ult (portrait + liquid fill)
  const u = BTN.ult, ready = B.energy >= 100; if (ready){ glowDisc(u.x, u.y, u.r * 2.1, hexA(m.c.col) + '1)', .55 + Math.sin(B.t * 8) * .25); }
  cardIn(m.id, u.x, u.y, u.r, () => { c.beginPath(); c.arc(u.x, u.y, u.r, 0, 7); });
  c.save(); c.beginPath(); c.arc(u.x, u.y, u.r, 0, 7); c.clip(); const lvl = u.y + u.r - u.r * 2 * B.energy / 100; c.fillStyle = ready ? 'rgba(255,80,160,.0)' : 'rgba(4,8,20,.62)'; c.fillRect(u.x - u.r, u.y - u.r, u.r * 2, lvl - (u.y - u.r));
  if (!ready){ c.fillStyle = 'rgba(255,90,170,.35)'; c.beginPath(); c.moveTo(u.x - u.r, lvl); for (let i = 0; i <= 10; i++) c.lineTo(u.x - u.r + i * u.r * .2, lvl + Math.sin(B.t * 5 + i) * 2); c.lineTo(u.x + u.r, u.y + u.r); c.lineTo(u.x - u.r, u.y + u.r); c.closePath(); c.fill(); }
  c.restore();
  c.save(); c.translate(u.x, u.y); if (ready) c.rotate(B.t * 2); c.strokeStyle = ready ? '#ffd0ea' : '#ff7fb0'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, u.r + 3, -1.57, -1.57 + 6.283 * B.energy / 100); c.stroke(); c.restore();
  c.fillStyle = '#fff'; c.font = `italic 900 ${ready ? 11 : 9}px sans-serif`; c.fillText(ready ? 'ULTIMATE' : 'ULT', u.x, u.y + u.r - 4);
  // pause
  const pz = BTN.pause; c.fillStyle = 'rgba(8,20,40,.75)'; hexPath(pz.x, pz.y, pz.r); c.fill(); c.strokeStyle = 'rgba(150,220,255,.5)'; c.stroke(); c.fillStyle = '#cfe'; c.fillRect(pz.x - 4, pz.y - 5, 3, 10); c.fillRect(pz.x + 1, pz.y - 5, 3, 10);
  // joystick
  if (INP.jid !== null){ const g = c.createRadialGradient(INP.jox, INP.joy, 10, INP.jox, INP.joy, 44); g.addColorStop(0, 'rgba(60,160,255,.0)'); g.addColorStop(1, 'rgba(60,160,255,.22)'); c.fillStyle = g; c.beginPath(); c.arc(INP.jox, INP.joy, 44, 0, 7); c.fill();
    c.strokeStyle = 'rgba(127,231,255,.6)'; c.lineWidth = 1.5; c.beginPath(); c.arc(INP.jox, INP.joy, 42, 0, 7); c.stroke(); glowDisc(INP.jox + INP.jx * 40, INP.joy + INP.jy * 40, 24, 'rgba(127,231,255,.8)', .7); c.fillStyle = '#e8fbff'; c.beginPath(); c.arc(INP.jox + INP.jx * 40, INP.joy + INP.jy * 40, 12, 0, 7); c.fill(); }
  else if (B.t < 6 || B.tut){ c.globalAlpha = .3; c.strokeStyle = '#7fe7ff'; c.lineWidth = 1.5; c.setLineDash([4, 5]); c.beginPath(); c.arc(100, 290, 42, 0, 7); c.stroke(); c.setLineDash([]); c.globalAlpha = 1; }
  c.restore(); };

// ---------- main render (camera + depth) ----------
render = function(){ const c = ctx; c.setTransform(K, 0, 0, K, 0, 0); c.clearRect(0, 0, LW, LH); if (!B) return;
  const dt = 1 / 60; if (!B.paused && !B.cut){ updParticles(dt * (B.bt > 0 ? .5 : 1)); ambient(dt); }
  B.punch = Math.max(0, (B.punch || 0) - dt * .25); const Z = ZOOM + B.punch + (B.cut ? .05 : 0);
  const sh = B.shake > 0 ? B.shake * 14 : 0; c.save(); if (sh) c.translate((R() - .5) * sh, (R() - .5) * sh);
  if (B.mono > 0) c.filter = 'grayscale(1) contrast(1.3) brightness(.8)';
  drawBG(); drawAmbient(false);
  // world space with zoom
  const fx0 = clamp(B.x - B.cam, 200, 440); c.save(); c.translate(fx0, FOCUS_Y); c.scale(Z, Z); c.translate(-fx0, -FOCUS_Y);
  drawFloor();
  B.zones.forEach(z => { c.save(); c.globalCompositeOperation = 'lighter'; glowDisc(z.x - B.cam, z.y, z.r, hexA(z.col) + '.6)', .55); c.strokeStyle = z.col; c.globalAlpha = .7; c.lineWidth = 2; c.beginPath(); c.ellipse(z.x - B.cam, z.y, z.r, z.r * .4, 0, 0, 7); c.stroke(); c.restore(); });
  const m = me();
  // player ground light + reflection
  c.save(); c.globalCompositeOperation = 'lighter'; glowDisc(B.x - B.cam, B.y - 4, 50, hexA(m.c.col) + '.55)', .45); c.restore();
  const pfr = B.skAnim > 0 ? 3 : B.atkAnim > 0 ? 2 : B.anim === 'run' ? (Math.floor(B.animT * 10) % 2 ? 1 : 0) : 0; drawReflection(m.id, B.x - B.cam, B.y, B.face, pfr);
  drawParticles(false);
  // dodge ghosts
  if (B.dodgeT > 0 && (B.ghT = (B.ghT || 0) + dt) > .03){ B.ghT = 0; fx({ k:'after', x:B.x, y:B.y, id:m.id, face:B.face, life:.25 }); }
  if (B.anim === 'run' && (B.duT = (B.duT || 0) + dt) > .22){ B.duT = 0; dust(B.x, B.y, B.face); }
  const list = B.en.map(e => ({ y:e.y, f:() => drawEnemy(e) }));
  list.push({ y:B.y, f:() => { drawChar(m.id, B.x - B.cam, B.y, B.face, { anim:B.anim, atk:B.atkAnim > 0, skill:B.skAnim > 0, dodge:B.dodgeT > 0, hurt:B.hurtT > 0, rim:1 });
    if (B.skAnim > 0){ c.save(); c.globalCompositeOperation = 'lighter'; glowDisc(B.x - B.cam, B.y - 60, 70, hexA(m.c.col) + '.7)', B.skAnim * 2); c.restore(); }
    if (m.shield > 0){ c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = .45 + Math.sin(B.t * 6) * .15; c.strokeStyle = '#7fd0ff'; c.lineWidth = 2; hexPath(B.x - B.cam, B.y - 56, 58); c.stroke(); c.globalAlpha = .12; c.fillStyle = '#7fd0ff'; c.fill(); c.restore(); }
    if (B.reflect > 0){ c.save(); c.globalCompositeOperation = 'lighter'; glowDisc(B.x - B.cam + B.face * 30, B.y - 50, 40, 'rgba(120,180,255,.8)', .6); c.fillStyle = '#bfe0ff'; c.fillRect(B.x - B.cam + B.face * 28, B.y - 96, 4, 84); c.restore(); } } });
  list.sort((a, b) => a.y - b.y).forEach(o => o.f());
  c.filter = 'none';
  c.save(); c.globalCompositeOperation = 'lighter'; drawParticles(true); c.restore();
  drawShots();
  B.fx.forEach(drawFx);
  if (window.drawUltFx) drawUltFx();
  drawNumbers();
  c.restore(); // world
  drawAmbient(true);
  // foreground debris silhouettes (depth)
  c.save(); c.fillStyle = 'rgba(2,4,10,.85)'; for (let i = 0; i < 4; i++){ const x = ((i * 260 - B.cam * 1.35) % 1040 + 1040) % 1040 - 200; c.beginPath(); c.moveTo(x, LH); c.lineTo(x + 20, LH - 22 - (i % 2) * 14); c.lineTo(x + 60, LH - 30); c.lineTo(x + 110, LH - 12); c.lineTo(x + 130, LH); c.closePath(); c.fill(); } c.restore();
  c.restore(); // shake
  // grading + vignette
  const vg = c.createRadialGradient(320, 200, 160, 320, 200, 430); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,8,.55)'); c.fillStyle = vg; c.fillRect(0, 0, LW, LH);
  if (B.hurtV > 0){ B.hurtV -= dt; const hv = c.createRadialGradient(320, 180, 140, 320, 180, 400); hv.addColorStop(0, 'rgba(0,0,0,0)'); hv.addColorStop(1, `rgba(255,20,50,${B.hurtV})`); c.fillStyle = hv; c.fillRect(0, 0, LW, LH); }
  if (m.hp / m.maxhp < .25){ const hv = c.createRadialGradient(320, 180, 170, 320, 180, 420); hv.addColorStop(0, 'rgba(0,0,0,0)'); hv.addColorStop(1, `rgba(255,20,50,${.18 + Math.sin(B.t * 6) * .08})`); c.fillStyle = hv; c.fillRect(0, 0, LW, LH); }
  if (B.tagFlash){ B.tagFlash.t += dt; const k = B.tagFlash.t / .3; if (k >= 1) B.tagFlash = null; else { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = (1 - k) * .4; c.fillStyle = B.tagFlash.col; c.fillRect(0, 0, LW, LH); c.restore(); } }
  // bullet time
  if (B.bt > 0 || B.freeze > 0){ const a = Math.min(1, (B.bt || B.freeze) * 2); c.save(); c.globalAlpha = .3 * a; c.fillStyle = B.freeze > 0 ? '#3a2a6a' : '#0a3a5a'; c.globalCompositeOperation = 'multiply'; c.fillRect(0, 0, LW, LH); c.restore();
    const g = c.createRadialGradient(320, 180, 110, 320, 180, 420); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(40,200,255,${.4 * a})`); c.fillStyle = g; c.fillRect(0, 0, LW, LH);
    c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(127,231,255,${.18 * a})`; c.lineWidth = 1; for (let i = 0; i < 18; i++){ const an = i / 18 * 6.283 + B.t * .3; c.beginPath(); c.moveTo(320 + Math.cos(an) * 260, 180 + Math.sin(an) * 170); c.lineTo(320 + Math.cos(an) * 420, 180 + Math.sin(an) * 280); c.stroke(); } c.restore();
    if (B.bt > 0){ c.save(); c.textAlign = 'center'; c.fillStyle = '#7fe7ff'; c.font = 'italic 900 13px sans-serif'; c.shadowColor = '#7fe7ff'; c.shadowBlur = 10; c.fillText(`BULLET TIME  ${B.bt.toFixed(1)}`, 320, 112); c.restore(); } }
  if (B.ban){ const k = B.ban.t / 1.6, a = k < .15 ? k / .15 : k > .8 ? (1 - k) / .2 : 1; c.save(); c.globalAlpha = a; const bg = c.createLinearGradient(0, 0, LW, 0); bg.addColorStop(0, 'rgba(0,0,0,0)'); bg.addColorStop(.5, 'rgba(0,0,0,.7)'); bg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = bg; c.fillRect(0, 128, LW, 58);
    c.fillStyle = B.ban.col; c.fillRect(120, 129, 400 * a, 1.5); c.fillRect(520 - 400 * a, 184, 400 * a, 1.5); c.font = 'italic 900 28px sans-serif'; c.textAlign = 'center'; c.shadowColor = B.ban.col; c.shadowBlur = 18; c.fillText(B.ban.main, 320 + (1 - a) * 50, 164); c.shadowBlur = 0; if (B.ban.sub){ c.fillStyle = '#fff'; c.font = '800 11px sans-serif'; c.fillText(B.ban.sub, 320, 179); } c.restore(); }
  drawHUD(); if (window.drawBossExtra) drawBossExtra(); if (window.drawSay) drawSay(); drawTut();
  // ult cut-in (diagonal split panels)
  if (B.cut){ const k = B.cut.t / B.cut.life, m2 = B.cut.m; c.save(); c.fillStyle = `rgba(0,0,0,${.7 * Math.min(1, k * 5)})`; c.fillRect(0, 0, LW, LH);
    const sl = k < .18 ? 1 - k / .18 : k > .86 ? -(k - .86) / .14 : 0; c.translate(sl * 700, 0);
    c.save(); c.beginPath(); c.moveTo(0, 74); c.lineTo(LW, 40); c.lineTo(LW, 300); c.lineTo(0, 330); c.closePath(); c.clip();
    const g = c.createLinearGradient(0, 0, LW, LH); g.addColorStop(0, m2.c.col); g.addColorStop(.55, '#151a33'); g.addColorStop(1, '#06080f'); c.fillStyle = g; c.fillRect(0, 0, LW, LH);
    c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 26; i++){ c.fillStyle = `rgba(255,255,255,${.06 + (i % 3) * .04})`; c.fillRect(((i * 97 + k * 2600) % 760) - 60, 50 + i * 10, 90 + (i % 4) * 30, 1.5); } c.globalCompositeOperation = 'source-over';
    const ci = img(cardArt(m2.id)); if (ok(ci)){ const h = 470, w = ci.naturalWidth / ci.naturalHeight * h; c.drawImage(ci, 300 - k * 50, -60 + Math.sin(k * 3) * 4, w, h); }
    c.restore();
    c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 74); c.lineTo(LW, 40); c.moveTo(0, 330); c.lineTo(LW, 300); c.stroke();
    c.textAlign = 'left'; c.fillStyle = '#fff'; c.font = 'italic 900 34px sans-serif'; c.shadowColor = m2.c.col; c.shadowBlur = 22; c.fillText(m2.c.ult.n, 30, 196); c.shadowBlur = 0;
    c.font = '800 13px sans-serif'; c.fillStyle = m2.c.col; c.fillText(m2.c.name + ' — ' + m2.c.en.toUpperCase(), 32, 220);
    if (window.ULT_CAP && ULT_CAP[m2.id]){ c.font = 'italic 700 11px sans-serif'; c.fillStyle = 'rgba(255,255,255,.75)'; c.fillText(ULT_CAP[m2.id], 32, 240); }
    if (window.drawCutExtra) drawCutExtra(m2, k); c.restore(); }
};
// enemy shots spawn muzzle glow (gunner)
const _resolve = resolveAttack;
resolveAttack = function(e, w){ _resolve(e, w); if (w.k === 'slam' || w.k === 'bslam'){ const x = w.x, y = w.y; for (let i = 0; i < 10; i++) P({ k:'shard', x:x + (R() - .5) * 60, y, vx:(R() - .5) * 220, vy:-120 - R() * 160, g:600, life:.5, s:4, col:'#a08870' }); smoke(x, y, 6, 'rgba(90,80,70,'); P({ k:'ring', x, y, r0:10, r1:(w.w || w.r * 2) * .7, life:.35, col:'#ff8a3a' }); } };
