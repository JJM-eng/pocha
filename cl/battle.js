'use strict';
// ====================================================================
//  BATTLE — Time-Shift Tag Action
// ====================================================================
let B = null;
const GY0 = 196, GY1 = 336;              // ground band
const SEGW = 640;
const BTN = {
  atk:{ x:566, y:290, r:36, l:'공격' },
  sk:{ x:490, y:318, r:25, l:'스킬' },
  dodge:{ x:598, y:206, r:25, l:'회피' },
  ult:{ x:498, y:246, r:28, l:'궁극기' },
  t1:{ x:612, y:92, r:21 }, t2:{ x:612, y:142, r:21 },
  pause:{ x:620, y:18, r:14 },
};

function startBattle(opt){
  // opt: {mode:'story'|'daily'|'abyss', st, lvl, floor, ids}
  audio(); BGM.stop(); BGM.start(opt.boss ? 'boss' : 'battle');
  const ids = opt.ids;
  const party = ids.map(id => { const c = CHM[id], s = opt.trial ? trialStats(id) : stats(id); const o = M.own[id] || { aw:opt.trial ? 1 : 0 };
    return { id, c, s, aw:o.aw || 0, hp:s.hp, maxhp:s.hp, skCd:0, skMax:c.sk.k === 'heal' || c.sk.k === 'sanct' ? 11 : c.sk.k === 'buff' || c.sk.k === 'shield' ? 12 : 7, hist:[], shield:0, dead:false, combo:0, comboT:0 }; });
  B = { opt, party, ai:0, x:120, y:270, face:1, vx:0, vy:0, en:[], shots:[], es:[], fx:[], tx:[], drones:[], zones:[],
    seg:0, segs:opt.segs, segX0:0, cam:0, energy:opt.trial ? 60 : 0, bt:0, btCool:0, freeze:0, cut:null, t:0, over:0, paused:false, hitstop:0,
    atkT:0, dodgeT:0, dodgeCd:0, iframe:0, dodgeStart:-9, tagCd:0, buff:{ atk:0, atkT:0, spd:0, crit:0 }, reflect:0, shake:0, kills:0, ko:0,
    pow:opt.pow, boss:null, cleared:false, tut:opt.tut ? 1 : 0, tutT:0, tutFlags:{}, bg:opt.bg || 'ruins', sprT:0, anim:'idle', animT:0, atkAnim:0, skAnim:0,
    stats:{ bt:0, chain:0, ult:0 }, chainCd:0 };
  const cs = party.map(q => q.c);
  B.synA = cs.length === 3 && cs.every(c => c.agency); B.synR = ['tank', 'dps', 'sup'].every(r => cs.some(c => c.cls === r));
  B.btDur = 3 + (B.synA ? 1 : 0); B.chainMax = 6 * (B.synR ? .85 : 1);
  if (B.synA || B.synR) setTimeout(() => B && banner('파티 시너지', [B.synA && '에이전시 3인: 불릿 타임 +1초', B.synR && '탱커·딜러·서포터: 연계기 쿨 -15%'].filter(Boolean).join(' · '), '#9dff9a'), 400);
  spawnSeg(); showScreen(null);
}
function trialStats(id){ const c = CHM[id], b = RAR[c.r]; const g = 1.2; let hp = b.hp * g, atk = b.atk * g; if (c.tank){ hp *= 1.45; atk *= .78; } if (c.heal){ atk *= .82; } return { hp:Math.round(hp), atk:Math.round(atk), def:30, crit:.15 }; }
const me = () => B.party[B.ai];
function spawnSeg(){
  const list = B.segs[B.seg]; const x0 = B.segX0;
  let k = 0;
  list.forEach(([t, n]) => { for (let i = 0; i < n; i++){ k++;
    const side = t === 'boss' ? 1 : (R() < .78 ? 1 : -1);
    const x = t === 'boss' ? x0 + 520 : side > 0 ? x0 + 560 + R() * 140 + k * 18 : x0 - 40 - R() * 80;
    spawnEnemy(t, x, lerp(GY0 + 10, GY1 - 6, R()), i * .25 + k * .12); } });
}
function spawnEnemy(t, x, y, delay){
  const d = ENEMY[t]; const pw = B.pow;
  let hp = d.hp * pw, atk = d.atk * Math.pow(pw, .8);
  const e = { t, d, x, y, hp, maxhp:hp, el:d.el,  atk, face:-1, st:'spawn', stT:.45 + (delay || 0), cd:1 + R() * 1.2, slow:0, slowF:1, dot:0, dotD:0, mark:0, brk:0, lock:0, stun:0, kbx:0, flash:0, hurtT:0, ph:R() * 6, wind:null };
  if (B.tut && t === 'brute'){ hp *= 3.5; atk *= .6; }
  if (t === 'boss'){ const b = BOSSES[B.opt.boss]; e.b = b; e.name = b.n; e.hp = e.maxhp = d.hp * pw * b.hpm; e.atk = d.atk * Math.pow(pw, .8) * (1 + (b.hpm - 1) * .4); e.pi = 0; e.el = b.el; e.d = Object.assign({}, d, { col:b.col }); e.brkHits = 0; B.boss = e; BGM.mode = 'boss';
    banner(b.n, 'BOSS', '#ff2a5a'); }
  B.en.push(e); return e;
}
// ---------- floating text / fx ----------
function ftxt(x, y, s, col, size, life){ B.tx.push({ x, y, s:String(s), col:col || '#fff', size:size || 14, t:0, life:life || .8, vy:-40 }); }
let bannerT = null;
function banner(main, sub, col){ B.ban = { main, sub, col:col || '#7fe7ff', t:0 }; }
function fx(o){ o.t = 0; B.fx.push(o); return o; }

// ---------- input ----------
const INP = { jx:0, jy:0, jid:null, jox:0, joy:0, atk:false, atkId:null, keys:{} };
function btnHit(x, y){ for (const k in BTN){ const b = BTN[k]; if ((x - b.x) ** 2 + (y - b.y) ** 2 <= (b.r + 8) ** 2) return k; } return null; }
cv.addEventListener('pointerdown', e => { if (!B) return; audio(); const p = toLocal(e.clientX, e.clientY); e.preventDefault();
  if (B.over) return;
  const b = btnHit(p.x, p.y);
  if (b){ press(b, true, e.pointerId); return; }
  if (p.x < 330 && INP.jid === null){ INP.jid = e.pointerId; INP.jox = p.x; INP.joy = p.y; INP.jx = 0; INP.jy = 0; }
  try { cv.setPointerCapture(e.pointerId); } catch(_){}
});
cv.addEventListener('pointermove', e => { if (!B) return; if (e.pointerId === INP.jid){ const p = toLocal(e.clientX, e.clientY); let dx = p.x - INP.jox, dy = p.y - INP.joy; const l = Math.hypot(dx, dy), mx = 40; if (l > mx){ INP.jox += dx * (l - mx) / l; INP.joy += dy * (l - mx) / l; dx = p.x - INP.jox; dy = p.y - INP.joy; } INP.jx = dx / mx; INP.jy = dy / mx; } });
const up = e => { if (e.pointerId === INP.jid){ INP.jid = null; INP.jx = INP.jy = 0; } if (e.pointerId === INP.atkId){ INP.atk = false; INP.atkId = null; } };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
addEventListener('keydown', e => { INP.keys[e.code] = true; if (!B || B.over) return; const m = { KeyJ:'atk', KeyK:'sk', KeyL:'dodge', Space:'dodge', KeyU:'ult', Digit2:'t1', Digit3:'t2', Escape:'pause' }; if (m[e.code] && !e.repeat) press(m[e.code], true, 'kb'); });
addEventListener('keyup', e => { INP.keys[e.code] = false; if (e.code === 'KeyJ'){ INP.atk = false; INP.atkId = null; } });
function press(b, down, id){
  if (B.cut) return;
  if (b === 'pause'){ pauseMenu(); return; }
  if (B.paused) return;
  if (b === 'atk'){ INP.atk = true; INP.atkId = id; return; }
  if (b === 'sk') useSkill();
  if (b === 'dodge') dodge();
  if (b === 'ult') useUlt();
  if (b === 't1' || b === 't2'){ const o = others(); const t = o[b === 't1' ? 0 : 1]; if (t !== undefined) tagTo(t); }
}
const others = () => [0, 1, 2].filter(i => i !== B.ai && i < B.party.length);
function pauseMenu(){ if (!B || B.over) return; B.paused = true;
  modal('<h3>일시정지</h3><p>조작: 왼쪽 드래그 이동 · 공격 · 회피(타이밍 맞추면 불릿 타임) · 요원 교체</p>', [['계속', () => { B.paused = false; }], ['포기', () => { B.paused = false; endBattle(false, true); }, 'gray']]); }

// ---------- player actions ----------
function dodge(){ if (B.dodgeCd > 0) return; const dx = Math.abs(INP.jx) + Math.abs(INP.jy) > .2 ? INP.jx : B.face, dy = Math.abs(INP.jx) + Math.abs(INP.jy) > .2 ? INP.jy * .6 : 0; const l = Math.hypot(dx, dy) || 1;
  B.dvx = dx / l * 430; B.dvy = dy / l * 300; B.dodgeT = .22; B.iframe = .34; B.dodgeStart = B.t; B.dodgeCd = .45; SFX.dodge();
  fx({ k:'after', x:B.x, y:B.y, id:me().id, face:B.face, life:.35 });
  // perfect dodge: an attack about to land on you
  let perf = false;
  B.en.forEach(e => { const w = e.wind; if (!w || e.hp <= 0) return; const rem = w.dur - w.t; if (rem > .38 && !(B.assist > 0)) return; if (threat(e, w)){ perf = true; e.wind = null; e.cd = e.d.cd * (e.t === 'boss' ? .6 : 1); } });
  B.es.forEach(s => { if (Math.abs(s.x - B.x) < 46 && Math.abs(s.y - (B.y - 30)) < 34){ perf = true; s.life = 0; } });
  if (perf) perfectDodge();
}
function threat(e, w){ const dx = B.x - e.x, dy = B.y - e.y;
  switch (w.k){ case 'swipe': return Math.abs(dx) < e.d.rng + 34 && Math.abs(dy) < 36;
    case 'slam': return Math.abs(B.x - w.x) < w.w / 2 + 20 && Math.abs(B.y - w.y) < w.h / 2 + 16;
    case 'bslam': return Math.hypot(B.x - w.x, (B.y - w.y) * 1.6) < w.r + 24;
    case 'bcharge': return Math.abs(B.y - w.y) < 44 && dx * w.face > -30;
    case 'blaser': return Math.abs(B.y - w.y) < 32;
    case 'laser': return Math.abs(B.y - w.y) < 24 && dx * w.face > 0;
    case 'shot': return Math.abs(dx) < 260; }
  return false; }
function perfectDodge(){ if (B.btCool > 0){ return; } B.bt = B.btDur; B.btCool = 4.5; if (window.btAudio) btAudio(B.btDur); B.energy = Math.min(100, B.energy + 20); B.stats.bt++; M.stats.bt++; misAdd('bt'); SFX.bt();
  ftxt(B.x, B.y - 70, 'PERFECT DODGE', '#7fe7ff', 16, 1.2); fx({ k:'ring', x:B.x, y:B.y - 30, life:.6, col:'#7fe7ff', r0:10, r1:160 }); banner('BULLET TIME', '요원을 교체하면 인과 역전 연계기!', '#7fe7ff'); B.hitstop = .08; }
function tagTo(i){ const n = B.party[i]; if (!n || n.dead || B.tagCd > 0 || i === B.ai) return;
  const out = me(), chain = B.bt > 0 && B.chainCd <= 0; B.ai = i; SFX.tag(); B.tagCd = chain ? .25 : 1.1;
  fx({ k:'after', x:B.x - B.face * 26, y:B.y, id:out.id, face:B.face, life:chain ? 1.2 : .4, chain });
  // tag-in strike
  B.en.forEach(e => { if (e.st !== 'spawn' && Math.abs(e.x - B.x) < 90 && Math.abs(e.y - B.y) < 40) damage(e, n.s.atk * 1.1 * atkMul(), { kb:30 }); });
  fx({ k:'ring', x:B.x, y:B.y - 30, life:.35, col:n.c.col, r0:10, r1:80 }); B.iframe = Math.max(B.iframe, .25);
  if (chain){ B.chainCd = B.chainMax; if (B.boss && B.boss.hp > 0) bossBreakHit(B.boss); B.stats.chain++; M.stats.chain++; misAdd('chain'); SFX.chain(); B.energy = Math.min(100, B.energy + 15);
    cast(out, out.c.sk, false, B.x - B.face * 26, 1.2); cast(n, n.c.sk, false, B.x, 1);
    B.en.forEach(e => { if (Math.abs(e.x - B.x) < 260) e.lock = Math.max(e.lock, 1.6); });
    ftxt(B.x, B.y - 86, '인과 역전 연계기!', '#ffd447', 18, 1.4); B.shake = .3; fx({ k:'flash', col:'rgba(255,220,120,.35)', life:.25 });
    if (B.tut && !B.tutFlags.chain){ B.tutFlags.chain = 1; B.energy = 100; } }
  else ftxt(B.x, B.y - 70, n.c.name, n.c.col, 13, .7);
}
function useSkill(){ const m = me(); if (m.skCd > 0) return; m.skCd = m.skMax * (B.buff.spdT > 0 ? .8 : 1); B.skAnim = .35; cast(m, m.c.sk, false, B.x, 1); }
function useUlt(){ if (B.energy < 100) return; B.energy = 0; const m = me(); B.stats.ult++; M.stats.ult++; misAdd('ult'); SFX.ult(); B.cut = { m, t:0, life:1.05 }; say(m.id, 'ult'); }
function say(id, k){ B.say = { id, s:voice(id, k), t:0 }; }
const atkMul = () => 1 + (B.buff.atkT > 0 ? B.buff.atk : 0);
const awMul = (m, ult) => 1 + (ult ? (m.aw >= 3 ? .4 : 0) : (m.aw >= 1 ? .3 : 0));
function nearest(x, y, max){ let b = null, bd = max || 1e9; B.en.forEach(e => { if (e.st === 'spawn' || e.hp <= 0) return; const d = Math.hypot(e.x - x, (e.y - y) * 1.6); if (d < bd){ bd = d; b = e; } }); return b; }
const alive = () => B.en.filter(e => e.hp > 0 && e.st !== 'spawn');

function normalAttack(){ const m = me(), a = m.c.atk, at = m.s.atk * atkMul();
  const cdm = (B.buff.spdT > 0 ? .7 : 1) * (B.bt > 0 ? .7 : 1);
  B.atkT = a.cd * cdm; B.atkAnim = Math.max(.32, a.cd * cdm + .08); B.lastAtk = B.t; B.atkCd = a.cd * cdm;
  const tgt = nearest(B.x, B.y, 520); if (tgt && Math.abs(tgt.x - B.x) > 6) B.face = tgt.x > B.x ? 1 : -1;
  if (a.k === 's'){ const n = a.n || 1; for (let i = 0; i < n; i++){ const ty = tgt ? clamp(tgt.y - B.y, -30, 30) : 0;
      B.shots.push({ x:B.x + B.face * 24, y:B.y - 34 + (i - (n - 1) / 2) * 7, vx:B.face * a.sp, vy:ty * a.sp / Math.max(60, Math.abs((tgt ? tgt.x : B.x + 300) - B.x)), gy:B.y + (i - (n - 1) / 2) * 6 + ty, dmg:at * a.dmg, life:a.rng / a.sp, pierce:a.pierce ? 6 : 0, col:m.c.col, hit:new Set(), w:a.pierce ? 4 : 2.5, len:a.pierce ? 34 : 14 }); }
    a.pierce ? SFX.rail() : SFX.shot(); fx({ k:'muzzle', x:B.x + B.face * 30, y:B.y - 34, life:.08, col:m.c.col }); }
  else if (a.k === 'm'){ m.combo = m.comboT > 0 ? (m.combo + 1) % 3 : 0; m.comboT = .9; const fin = m.combo === 2; const rng = a.rng * (fin ? 1.25 : 1);
    let hitAny = false;
    B.en.forEach(e => { if (e.st === 'spawn' || e.hp <= 0) return; const dx = (e.x - B.x) * B.face; if (dx > -16 && dx < rng + e.d.r && Math.abs(e.y - B.y) < 26 + e.d.r * .4){ damage(e, at * a.dmg * (fin ? 1.7 : 1), { kb:(a.kb || 10) * (fin ? 2 : 1) }); hitAny = true; } });
    SFX.slash(); fx({ k:'slash', x:B.x + B.face * rng * .45, y:B.y - 46, face:B.face, r:rng * .6, life:.24, col:m.c.col, fin, arc:a.arc }); if (hitAny && fin) B.hitstop = .05; }
  else if (a.k === 'h'){ for (let i = 0; i < (a.n || 1); i++) B.shots.push({ x:B.x + B.face * 10, y:B.y - 50 - i * 8, vx:B.face * 80, vy:-60 + i * 50, gy:B.y, home:1, sp:a.sp, dmg:at * a.dmg, life:1.6, col:m.c.col, hit:new Set(), w:5, len:0, dot:a.dot }); SFX.shot(); }
  else if (a.k === 'l'){ const tx = tgt && Math.abs(tgt.x - B.x) < a.rng ? tgt.x : B.x + B.face * a.rng * .7, ty = tgt ? tgt.y : B.y;
    B.shots.push({ lob:1, x0:B.x + B.face * 14, y0:B.y - 40, tx, ty, x:B.x, y:B.y - 40, gy:ty, t:0, dur:.55, dmg:at * a.dmg, aoe:a.aoe || 36, col:m.c.col, life:1, hit:new Set(), dot:a.dot }); tone(300, .12, 'triangle', .07, 160); }
  else if (a.k === 'b'){ const len = a.rng; B.en.forEach(e => { if (e.st === 'spawn' || e.hp <= 0) return; const dx = (e.x - B.x) * B.face; if (dx > 0 && dx < len && Math.abs(e.y - B.y) < 22 + e.d.r * .3) damage(e, at * a.dmg, { kb:8 }); });
    fx({ k:'beam', x:B.x + B.face * 26, y:B.y - 40, len, face:B.face, w:12, life:.22, col:m.c.col }); SFX.rail(); }
}

// ---------- skills / ults ----------
function cast(m, sk, ult, ox, mult){ if (ult && window.ultShow && ultShow(m, sk, ox, mult)) return; const at = m.s.atk * atkMul() * awMul(m, ult) * (mult || 1), k = sk.k, big = ult || sk.big, p = sk.p, x = ox ?? B.x, y = B.y, f = B.face;
  const inRange = (e, r) => e.hp > 0 && e.st !== 'spawn' && Math.hypot(e.x - x, (e.y - y) * 1.4) < r;
  const all = () => alive();
  if (ult) B.shake = .35;
  switch (k){
    case 'barrage': { const n = ult ? 26 : 8; for (let i = 0; i < n; i++) setTimeout(() => { if (!B) return; const ang = (R() - .5) * (ult ? .5 : .35); B.shots.push({ x:x + f * 24, y:y - 34, vx:f * 620 * Math.cos(ang), vy:620 * Math.sin(ang) * .4, gy:y + (R() - .5) * 40, dmg:at * (ult ? 0.55 : .4) * p / 2, life:.6, col:m.c.col, hit:new Set(), w:2.5, len:16 }); SFX.shot(); }, i * (ult ? 35 : 45)); break; }
    case 'freeze': { B.freeze = 5; fx({ k:'clock', x:B.x, y:B.y - 40, life:5, col:m.c.col }); banner('CHRONO FREEZE', '시간 정지', m.c.col);
      for (let i = 0; i < 34; i++) setTimeout(() => { if (!B) return; const t = pick(alive().length ? alive() : [null]); if (!t) return; B.shots.push({ x:B.x + (R() - .5) * 60, y:B.y - 60 - R() * 30, vx:0, vy:0, home:1, sp:900, gy:t.y, dmg:at * .32 * p / 9 * 3, life:1.4, col:m.c.col, hit:new Set(), w:3, len:12, tgt:t }); SFX.shot(); }, 300 + i * 50);
      break; }
    case 'stun': { const r = big ? 999 : 120; (big ? all() : all().filter(e => (e.x - x) * f > -20 && inRange(e, r))).forEach(e => { damage(e, at * p * (big ? .7 : 1), { kb:20 }); e.stun = Math.max(e.stun, big ? 2.5 : 1.5); });
      fx({ k:'ring', x:x + f * 40, y:y - 20, life:.4, col:'#ffe25a', r0:10, r1:big ? 300 : 120 }); SFX.boom(); break; }
    case 'gravity': { const cx = x + f * 130, cy = clamp(y, GY0 + 20, GY1 - 20); all().filter(e => Math.abs(e.x - cx) < 300).forEach(e => { e.pull = { x:cx + (R() - .5) * 30, y:cy + (R() - .5) * 20, t:3 }; e.stun = Math.max(e.stun, 3); });
      B.zones.push({ k:'grav', x:cx, y:cy, t:0, life:3, dps:at * p / 3, r:90, col:m.c.col }); B.party.forEach(q => { if (!q.dead) q.shield = Math.max(q.shield, q.maxhp * .3); }); ftxt(B.x, B.y - 80, '시간 보호막', '#7fd0ff', 13); SFX.boom(); break; }
    case 'slow': { const tg = big ? all() : all().filter(e => inRange(e, 230)); tg.forEach(e => { e.slow = big ? 6 : 4.5; e.slowF = big ? .3 : .45; if (big) e.mark = Math.max(e.mark, 6); if (at) damage(e, at * p * .6, { kb:0 }); });
      fx({ k:'ring', x, y:y - 20, life:.6, col:'#b07cff', r0:20, r1:big ? 400 : 230 }); tone(300, .4, 'sine', .1, 100); break; }
    case 'blink': { const tg = all().sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x)).slice(0, big ? 10 : 5); let i = 0;
      tg.forEach(e => { setTimeout(() => { if (!B || e.hp <= 0) return; B.x = e.x - f * 20; B.y = e.y; fx({ k:'after', x:B.x, y:B.y, id:m.id, face:B.face, life:.3 }); damage(e, at * (ult ? 1.6 : 1.1) * (p / (ult ? 7 : 2.4)) * (ult ? 1.4 : 1), { kb:6 }); e.brk = Math.max(e.brk, 5); SFX.slash(); fx({ k:'slash', x:e.x, y:e.y - 30, face:R() < .5 ? 1 : -1, r:40, life:.15, col:m.c.col, fin:1, arc:1.2 }); }, i++ * (ult ? 90 : 110)); });
      B.iframe = Math.max(B.iframe, i * .11 + .2); break; }
    case 'heal': { B.party.forEach(q => { if (!q.dead){ const h = q.maxhp * p; q.hp = Math.min(q.maxhp, q.hp + h); } }); ftxt(B.x, B.y - 80, '+회복', '#7dff9a', 15); fx({ k:'ring', x:B.x, y:B.y - 30, life:.6, col:'#7dff9a', r0:10, r1:110 }); SFX.heal(); break; }
    case 'rewind': { B.party.forEach(q => { if (q.dead) return; const h = q.hist.length ? q.hist[0] : q.hp; q.hp = Math.min(q.maxhp, Math.max(q.hp, h) + q.maxhp * .2); }); B.buff.spdT = 6; fx({ k:'clock', x:B.x, y:B.y - 40, life:1.4, col:'#ffd27a', rev:1 }); ftxt(B.x, B.y - 86, '리버스 펄스', '#ffd27a', 16); SFX.heal(); break; }
    case 'beam': { banner(sk.n, '', m.c.col); setTimeout(() => { if (!B) return; all().filter(e => Math.abs(e.x - (B.cam + 320)) < 380).forEach(e => { damage(e, at * p * .55, { kb:20 }); e.dot = 4; e.dotD = at * .35; }); fx({ k:'pillar', x:B.cam + 320, life:.7, col:m.c.col, w:640 }); B.shake = .5; SFX.boom(); }, 250); break; }
    case 'dash': { const dist = big ? 520 : 200; const x0 = B.x, x1 = clamp(B.x + f * dist, B.segX0 + 20, B.segX0 + SEGW * (B.cleared ? 2 : 1) - 20);
      all().forEach(e => { if ((e.x - x0) * f > -10 && (e.x - x1) * f < 20 && Math.abs(e.y - B.y) < 40){ damage(e, at * p * (big ? .7 : 1), { kb:30 }); if (big){ e.brk = Math.max(e.brk, 5); e.stun = Math.max(e.stun, 1); } else e.stun = Math.max(e.stun, .5); } });
      fx({ k:'streak', x0, x1, y:B.y - 30, life:.3, col:m.c.col }); B.x = x1; B.iframe = Math.max(B.iframe, .3); SFX.slash(); break; }
    case 'drones': { const n = big ? 5 : 2; for (let i = 0; i < n; i++) B.drones.push({ a:i / n * 6.28, t:0, life:big ? 9 : 8, dmg:at * (big ? .45 : .35), cd:R() * .5, col:m.c.col, boom:big }); if (big){ B.freeze = Math.max(B.freeze, 2.5); fx({ k:'clock', x:B.x, y:B.y - 40, life:2.5, col:m.c.col }); } tone(500, .3, 'square', .08, 900); break; }
    case 'pierce': { const w = big ? 40 : 22; all().forEach(e => { if ((e.x - x) * f > 0 && Math.abs(e.y - y) < w + e.d.r * .3) damage(e, at * p * (big ? 1 : 1), { kb:16, pierce:1 }); }); fx({ k:'beam', x:x + f * 26, y:y - 40, len:800, face:f, w:big ? 26 : 10, life:big ? .5 : .3, col:m.c.col }); SFX.rail(); if (big) B.shake = .4; break; }
    case 'sanct': { B.party.forEach(q => { if (q.dead && big){ q.dead = false; q.hp = q.maxhp * .3; } if (!q.dead) q.hp = Math.min(q.maxhp, q.hp + q.maxhp * .15); }); B.zones.push({ k:'heal', x:B.x, y:B.y, t:0, life:6, r:120, rate:p * .2, col:m.c.col }); ftxt(B.x, B.y - 80, sk.n, '#9fe8ff', 14); SFX.heal(); break; }
    case 'buff': { B.buff.atk = big ? .4 : .25; B.buff.atkT = 8; if (big){ B.buff.spdT = 8; B.buff.critT = 8; } ftxt(B.x, B.y - 80, big ? '오버드라이브!' : '공격력 UP', '#ff8a5a', 15); fx({ k:'ring', x:B.x, y:B.y - 30, life:.5, col:'#ff8a5a', r0:10, r1:100 }); tone(400, .3, 'square', .1, 1200); break; }
    case 'bomb': { const n = big ? 5 : 1; for (let i = 0; i < n; i++) setTimeout(() => { if (!B) return; const t = big ? pick(alive().length ? alive() : [{ x:x + f * 100, y }]) : nearest(x, y, 300) || { x:x + f * 100, y }; explode(t.x + (big ? (R() - .5) * 30 : 0), t.y, big ? 70 : 80, at * p * (big ? .45 : .6)); }, i * 140); break; }
    case 'meteor': { for (let i = 0; i < 9; i++) setTimeout(() => { if (!B) return; const t = pick(alive().length ? alive() : [{ x:B.cam + 320, y:270 }]); fx({ k:'fall', x:t.x, y:t.y, life:.3, col:m.c.col }); setTimeout(() => B && explode(t.x + (R() - .5) * 40, t.y, 60, at * p * .35), 280); }, i * 110); break; }
    case 'shield': { B.party.forEach(q => { if (!q.dead) q.shield = Math.max(q.shield, q.maxhp * (big ? .4 : .25)); }); if (ult) B.reflect = 4; ftxt(B.x, B.y - 80, ult ? '이지스 월' : '보호막', '#7fb0ff', 14); fx({ k:'ring', x:B.x, y:B.y - 30, life:.5, col:'#7fb0ff', r0:30, r1:60 }); tone(500, .3, 'triangle', .1, 900); break; }
    case 'dot': { (big ? all() : all().filter(e => inRange(e, 190))).forEach(e => { e.dot = big ? 6 : 4; e.dotD = at * p * .25; }); fx({ k:'ring', x, y:y - 20, life:.6, col:'#7dff5a', r0:20, r1:big ? 400 : 190 }); noise(.3, .1, 0, 800); break; }
    case 'mark': { all().filter(e => inRange(e, 340)).forEach(e => { e.mark = Math.max(e.mark, 6); damage(e, at * p * .5, { kb:0 }); }); fx({ k:'ring', x, y:y - 20, life:.5, col:'#ffe25a', r0:20, r1:340 }); tone(1200, .2, 'square', .06); break; }
  }
}
function explode(x, y, r, dmg){ B.en.forEach(e => { if (e.hp > 0 && e.st !== 'spawn' && Math.hypot(e.x - x, (e.y - y) * 1.5) < r + e.d.r) damage(e, dmg, { kb:20 }); }); fx({ k:'boom', x, y, r, life:.4 }); SFX.boom(); B.shake = Math.max(B.shake, .15); }

function damage(e, dmg, o){ if (e.hp <= 0) return; const m = me();
  const crit = R() < m.s.crit + (B.buff.critT > 0 ? .3 : 0) + (e.mark > 0 ? .1 : 0);
  const em = elMul(m.c.el, e.el || e.d.el); let d = dmg * em * (e.groggy > 0 ? 2 : 1) * (crit ? 1.8 : 1) * (e.mark > 0 ? 1.25 : 1) * (e.brk > 0 ? 1.6 : 1) * (B.bt > 0 ? 1.25 : 1) * (.9 + R() * .2);
  if (e.t === 'boss' && e.shieldUp) d *= .5;
  if (B.hold && B.freeze > 0){ e.pend = (e.pend || 0) + d; ftxt(e.x + (R() - .5) * 26, e.y - 40 - e.d.r - R() * 20, Math.round(d), '#bfc6d0', 10, .5); return; }
  e.hp -= d; e.flash = .1; if (o && o.kb && e.t !== 'boss' && e.t !== 'brute') e.kbx = (e.x > B.x ? 1 : -1) * o.kb * 6; else if (o && o.kb && e.t === 'brute') e.kbx = (e.x > B.x ? 1 : -1) * o.kb * 1.2;
  B.energy = Math.min(100, B.energy + .9); SFX.hit();
  ftxt(e.x + (R() - .5) * 20, e.y - 46 - e.d.r, Math.round(d) + (em > 1 ? '▲' : ''), crit ? '#ffd447' : em > 1 ? '#7dff9a' : '#fff', crit ? 17 : 12);
  if (e.hp <= 0) kill(e);
}
function kill(e){ e.hp = 0; e.dieT = .45; B.kills++; M.stats.kills++; fx({ k:'burst', x:e.x, y:e.y - 20, life:.45, col:e.d.col, r:e.d.r * 2 }); if (e.t === 'boss'){ B.shake = .8; banner('BOSS 토벌!', '', '#ffd447'); B.slowmo = 1.2; } if (e.t === 'brute') B.shake = .25; }

function hurtPlayer(dmg, src){ if (B.over) return;
  const m = me();
  if (B.iframe > 0){ if (B.t - B.dodgeStart < .4) perfectDodge(); return false; }
  if (B.reflect > 0 && src && src.proj){ return 'reflect'; }
  const ae = src && (src.el || (src.e && (src.e.el)));
  let d = dmg * (100 / (100 + m.s.def * 2)) * (.9 + R() * .2) * (ae && BEATS[m.c.el] === ae ? .85 : 1) * (ae && BEATS[ae] === m.c.el ? 1.15 : 1);
  if (m.shield > 0){ const a = Math.min(m.shield, d); m.shield -= a; d -= a; }
  m.hp -= d; B.energy = Math.min(100, B.energy + 2.5); SFX.hurt(); B.hurtT = .25; B.shake = Math.max(B.shake, .12);
  if (d > 0) ftxt(B.x, B.y - 70, '-' + Math.round(d), '#ff5a6a', 13);
  if (m.hp < m.maxhp * .35 && !m.hurtSaid){ m.hurtSaid = 1; say(m.id, 'hurt'); }
  if (m.hp <= 0){ m.hp = 0; m.dead = true; B.ko++; const o = others().find(i => !B.party[i].dead);
    if (o === undefined){ endBattle(false); return true; }
    ftxt(B.x, B.y - 90, m.c.name + ' 전투 불능', '#ff5a6a', 13, 1.2); B.ai = o; B.tagCd = .5; B.iframe = 1.2; fx({ k:'ring', x:B.x, y:B.y - 30, life:.4, col:B.party[o].c.col, r0:10, r1:80 }); }
  return true;
}

// ---------- enemy AI ----------
function enemyTick(e, dt){
  if (e.hp <= 0){ e.dieT -= dt; return; }
  e.flash -= dt; e.ph += dt;
  if (e.st === 'spawn'){ e.stT -= dt; if (e.stT <= 0) e.st = 'move'; return; }
  if (e.dot > 0){ e.dot -= dt; e.dotT = (e.dotT || 0) + dt; if (e.dotT > .5){ e.dotT = 0; e.hp -= e.dotD * .5; ftxt(e.x, e.y - 50, Math.round(e.dotD * .5), '#9dff6a', 11, .6); if (e.hp <= 0) kill(e); } }
  if (e.lock > 0){ e.lock -= dt; return; }       // time-lock ignores bt scale
  let sdt = dt * (B.bt > 0 ? .18 : 1) * (B.freeze > 0 ? 0 : 1) * (e.slow > 0 ? e.slowF : 1);
  if (B.tut && !B.tutFlags.bt && e.wind && e.t === 'brute' && e.wind.t > e.wind.dur - .4 && Math.abs(B.x - e.x) < 160){ sdt *= .12; B.assist = .1; }
  e.slow -= dt; e.mark -= dt; e.brk -= dt;
  if (e.kbx){ e.x += e.kbx * dt; e.kbx *= Math.pow(.02, dt); if (Math.abs(e.kbx) < 4) e.kbx = 0; }
  if (e.pull){ e.x = lerp(e.x, e.pull.x, 1 - Math.pow(.02, dt)); e.y = lerp(e.y, e.pull.y, 1 - Math.pow(.02, dt)); e.pull.t -= dt; if (e.pull.t <= 0) e.pull = null; }
  if (e.stun > 0){ e.stun -= sdt; e.wind = null; return; }
  if (sdt <= 0) return;
  const d = e.d, dx = B.x - e.x, dy = B.y - e.y, dist = Math.abs(dx);
  e.cd -= sdt;
  if (e.wind){ e.wind.t += sdt; const w = e.wind;
    if (w.t >= w.dur){ resolveAttack(e, w); e.wind = null; e.cd = d.cd * (.8 + R() * .4) * (e.t === 'boss' ? 1 : 1); }
    return; }
  e.face = dx > 0 ? 1 : -1;
  if (e.t === 'core') return;
  if (e.t === 'boss') return bossTick(e, sdt);
  const want = d.kind === 'ranged' || d.kind === 'drone' ? d.rng * .75 : d.rng * .8;
  let mvx = 0, mvy = 0;
  if (d.kind === 'ranged' || d.kind === 'drone'){ if (dist > want) mvx = Math.sign(dx); else if (dist < want * .55) mvx = -Math.sign(dx); mvy = Math.sign(dy) * (Math.abs(dy) > 8 ? 1 : 0); }
  else { if (dist > want) mvx = Math.sign(dx); mvy = Math.abs(dy) > 6 ? Math.sign(dy) : 0; }
  // separation
  B.en.forEach(o => { if (o !== e && o.hp > 0 && Math.abs(o.x - e.x) < 22 && Math.abs(o.y - e.y) < 14){ e.y += (e.y > o.y ? 1 : -1) * 20 * sdt; } });
  e.x += mvx * d.sp * sdt; e.y += mvy * d.sp * .6 * sdt; e.y = clamp(e.y, GY0, GY1);
  e.x = clamp(e.x, B.segX0 - 60, B.segX0 + SEGW + 160);
  if (e.cd <= 0 && dist < d.rng + 10 && Math.abs(dy) < (d.kind === 'ranged' || d.kind === 'drone' ? 60 : 30)){
    if (d.kind === 'melee') e.wind = { k:'swipe', t:0, dur:.42, face:e.face };
    else if (d.kind === 'heavy') e.wind = { k:'slam', t:0, dur:.95, face:e.face, x:e.x + e.face * 46, y:e.y, w:110, h:56 };
    else if (d.kind === 'ranged') e.wind = { k:'shot', t:0, dur:.6, face:e.face };
    else if (d.kind === 'drone') e.wind = { k:'laser', t:0, dur:.75, face:e.face, y:e.y };
  }
}
function resolveAttack(e, w){
  const inBox = (x, y, wd, h) => Math.abs(B.x - x) < wd / 2 && Math.abs(B.y - y) < h / 2;
  if (w.k === 'swipe'){ if ((B.x - e.x) * w.face > -12 && Math.abs(B.x - e.x) < e.d.rng + 18 && Math.abs(B.y - e.y) < 26) hurtPlayer(e.atk, { e }); fx({ k:'eslash', x:e.x + w.face * 22, y:e.y - 24, face:w.face, life:.15 }); }
  else if (w.k === 'slam'){ if (inBox(w.x, w.y, w.w, w.h)) hurtPlayer(e.atk, { e }); fx({ k:'shock', x:w.x, y:w.y, w:w.w, life:.35 }); B.shake = Math.max(B.shake, .18); noise(.25, .2, 0, 500); }
  else if (w.k === 'shot'){ const ty = B.y; B.es.push({ x:e.x + w.face * 18, y:e.y - 30, gy:e.y, vx:w.face * 240, vy:(ty - e.y) * .6, dmg:e.atk, life:2, col:'#ff4c8a', r:5, el:e.el }); tone(500, .08, 'square', .05, 200); }
  else if (w.k === 'laser'){ const y0 = w.y; if (Math.abs(B.y - y0) < 16 && (B.x - e.x) * w.face > 0) hurtPlayer(e.atk); fx({ k:'elaser', x:e.x, y:y0 - 52, face:w.face, life:.2 }); tone(1400, .12, 'sawtooth', .05, 300); }
  else if (w.k === 'bslam'){ if (Math.hypot(B.x - w.x, (B.y - w.y) * 1.6) < w.r) hurtPlayer(e.atk * 1.6); fx({ k:'shock', x:w.x, y:w.y, w:w.r * 2, life:.4 }); B.shake = .3; SFX.boom(); }
  else if (w.k === 'bcharge'){ const x1 = clamp(e.x + w.face * 420, B.segX0 + 40, B.segX0 + SEGW - 40); if (Math.abs(B.y - w.y) < 34 && (B.x - e.x) * w.face > -20 && (B.x - x1) * w.face < 20) hurtPlayer(e.atk * 1.4); fx({ k:'streak', x0:e.x, x1, y:e.y - 40, life:.3, col:'#ff2a5a' }); e.x = x1; B.shake = .25; SFX.slash(); }
  else if (w.k === 'bring'){ const n = 16; for (let i = 0; i < n; i++){ const a = i / n * 6.283 + e.ph; B.es.push({ x:e.x, y:e.y - 40, gy:e.y, vx:Math.cos(a) * 170, vy:Math.sin(a) * 100, dmg:e.atk * .7, life:3, col:e.d.col, r:6, flat:1 }); } tone(300, .3, 'square', .08, 900); }
  else if (w.k === 'blaser'){ if (Math.abs(B.y - w.y) < 22) hurtPlayer(e.atk * 1.3); fx({ k:'elaser', x:B.cam - 40, y:w.y - 40, face:1, life:.35, big:1 }); B.shake = .3; tone(800, .4, 'sawtooth', .1, 100); }
  else if (w.k === 'bsummon'){ for (let i = 0; i < 3; i++) spawnEnemy(R() < .5 ? 'shade' : 'drone', e.x + (R() - .5) * 200, lerp(GY0, GY1, R()), i * .2); }
}
function bossTick(e, sdt){ const dx = B.x - e.x; const b = e.b;
  if (e.groggy > 0){ e.groggy -= sdt; return; }
  if (!e.raged && e.hp / e.maxhp < .3){ e.raged = 1; startRage(e); }
  if (Math.abs(dx) > 150) e.x += Math.sign(dx) * e.d.sp * sdt; e.y += Math.sign(B.y - e.y) * (Math.abs(B.y - e.y) > 8 ? 1 : 0) * 26 * sdt; e.y = clamp(e.y, GY0 + 16, GY1 - 10);
  e.x = clamp(e.x, B.segX0 + 60, B.segX0 + SEGW - 60);
  const rage = e.hp / e.maxhp < .5;
  if (e.cd > 0) return;
  const p = b.pat[e.pi++ % b.pat.length];
  const sp = rage ? .8 : 1;
  if (p === 'slam') e.wind = { k:'bslam', t:0, dur:1.1 * sp, x:B.x, y:B.y, r:78 };
  else if (p === 'charge') e.wind = { k:'bcharge', t:0, dur:1 * sp, face:e.face, y:e.y };
  else if (p === 'ring') e.wind = { k:'bring', t:0, dur:.8 * sp };
  else if (p === 'laser') e.wind = { k:'blaser', t:0, dur:1.15 * sp, y:B.y };
  else if (p === 'summon') e.wind = { k:'bsummon', t:0, dur:.7 };
  e.cd = 0;
}

// ---------- main update ----------
function update(dt){
  if (!B || B.paused) return;
  if (B.cut){ B.cut.t += dt; if (B.cut.t >= B.cut.life){ const m = B.cut.m; B.cut = null; cast(m, m.c.ult, true, B.x, 1); } return; }
  if (B.hitstop > 0){ B.hitstop -= dt; return; }
  if (B.slowmo > 0){ B.slowmo -= dt; dt *= .35; }
  B.t += dt; B.animT += dt;
  if (B.over){ B.fx.forEach(f => f.t += dt); B.tx.forEach(t => t.t += dt); return; }
  const m = me();
  // timers
  B.bt = Math.max(0, B.bt - dt); B.btCool -= dt; B.freeze = Math.max(0, B.freeze - dt); B.tagCd -= dt; B.chainCd -= dt; B.dodgeCd -= dt; B.iframe -= dt; B.atkT -= dt; B.atkAnim -= dt; B.skAnim -= dt; B.hurtT -= dt;
  B.buff.atkT -= dt; B.buff.spdT -= dt; B.buff.critT -= dt; B.reflect -= dt; B.shake = Math.max(0, B.shake - dt);
  B.party.forEach((q, i) => { q.skCd = Math.max(0, q.skCd - dt * (B.rage ? .55 : 1)); q.comboT -= dt; if (!q.dead && i !== B.ai) q.hp = Math.min(q.maxhp, q.hp + q.maxhp * .006 * dt);
    q.histT = (q.histT || 0) + dt; if (q.histT > .25){ q.histT = 0; q.hist.push(q.hp); if (q.hist.length > 12) q.hist.shift(); } });
  // movement
  let jx = INP.jx, jy = INP.jy; const kk = INP.keys;
  if (kk.KeyA || kk.ArrowLeft) jx = -1; if (kk.KeyD || kk.ArrowRight) jx = 1; if (kk.KeyW || kk.ArrowUp) jy = -1; if (kk.KeyS || kk.ArrowDown) jy = 1;
  if (kk.KeyJ) INP.atk = true;
  const spd = 150 * (B.buff.spdT > 0 ? 1.3 : 1);
  if (B.dodgeT > 0){ B.dodgeT -= dt; B.x += B.dvx * dt; B.y += B.dvy * dt; }
  else { const l = Math.min(1, Math.hypot(jx, jy)); if (l > .15){ B.x += jx / Math.max(1, Math.hypot(jx, jy)) * spd * dt; B.y += jy / Math.max(1, Math.hypot(jx, jy)) * spd * .65 * dt; if (Math.abs(jx) > .2 && !INP.atk) B.face = jx > 0 ? 1 : -1; B.anim = 'run'; } else B.anim = 'idle'; }
  const maxX = B.cleared ? B.segX0 + SEGW * 2 - 30 : B.segX0 + SEGW - 24;
  B.x = clamp(B.x, B.segX0 + 20, maxX); B.y = clamp(B.y, GY0, GY1);
  // advance segment
  if (B.cleared && B.x > B.segX0 + SEGW + 40){ B.seg++; B.segX0 += SEGW; B.cleared = false; spawnSeg(); }
  // camera
  const tc = clamp(B.x - 260, B.segX0, B.cleared ? B.segX0 + SEGW : B.segX0); B.cam = lerp(B.cam, tc, 1 - Math.pow(.001, dt));
  // attacks
  if (INP.atk && B.atkT <= 0 && B.dodgeT <= 0) normalAttack();
  // shots
  B.shots.forEach(s => { s.life -= dt;
    if (s.lob){ s.t += dt; const k = Math.min(1, s.t / s.dur); s.x = lerp(s.x0, s.tx, k); s.y = lerp(s.y0, s.ty - 10, k) - Math.sin(k * Math.PI) * 70; if (k >= 1){ explode(s.tx, s.ty, s.aoe, s.dmg); if (s.dot) B.en.forEach(e => { if (Math.hypot(e.x - s.tx, e.y - s.ty) < s.aoe + 10){ e.dot = 3; e.dotD = s.dmg * .3; } }); s.life = 0; } return; }
    if (s.home){ const t = (s.tgt && s.tgt.hp > 0) ? s.tgt : nearest(s.x, s.gy, 500); if (t){ const ax = t.x - s.x, ay = (t.y - 30) - s.y, l = Math.hypot(ax, ay) || 1; s.vx = lerp(s.vx, ax / l * s.sp, 1 - Math.pow(.002, dt)); s.vy = lerp(s.vy, ay / l * s.sp, 1 - Math.pow(.002, dt)); s.gy = lerp(s.gy, t.y, .2); } }
    s.x += s.vx * dt; s.y += s.vy * dt; if (!s.home) s.gy += s.vy * dt;
    for (const e of B.en){ if (e.hp <= 0 || e.st === 'spawn' || s.hit.has(e)) continue; if (Math.abs(e.x - s.x) < e.d.r + 6 && Math.abs((e.y - 30) - s.y) < e.d.r + 18){ s.hit.add(e); damage(e, s.dmg, { kb:s.pierce ? 10 : 4 }); if (s.dot){ e.dot = 3; e.dotD = s.dmg * .3; } if (s.pierce > 0) s.pierce--; else { s.life = 0; fx({ k:'spark', x:s.x, y:s.y, life:.15, col:s.col }); break; } } }
  });
  B.shots = B.shots.filter(s => s.life > 0);
  // drones
  B.drones.forEach(d => { d.t += dt; d.a += dt * 2; d.cd -= dt; if (d.cd <= 0){ d.cd = .5; const t = nearest(B.x, B.y, 420); if (t){ const dx0 = B.x + Math.cos(d.a) * 40, dy0 = B.y - 70 + Math.sin(d.a) * 14; B.shots.push({ x:dx0, y:dy0, vx:(t.x - dx0) * 3, vy:(t.y - 30 - dy0) * 3, gy:t.y, dmg:d.dmg, life:.4, col:d.col, hit:new Set(), w:2, len:8 }); } }
    if (d.t >= d.life && d.boom){ const t = nearest(B.x, B.y, 500); if (t) explode(t.x, t.y, 60, d.dmg * 4); } });
  B.drones = B.drones.filter(d => d.t < d.life);
  // zones
  B.zones.forEach(z => { z.t += dt; if (z.k === 'grav') B.en.forEach(e => { if (e.hp > 0 && Math.hypot(e.x - z.x, e.y - z.y) < z.r){ e.hp -= z.dps * dt; if (e.hp <= 0) kill(e); } });
    if (z.k === 'heal'){ B.party.forEach(q => { if (!q.dead) q.hp = Math.min(q.maxhp, q.hp + q.maxhp * z.rate * dt); }); z.x = B.x; z.y = B.y; } });
  B.zones = B.zones.filter(z => z.t < z.life);
  // enemies
  B.en.forEach(e => enemyTick(e, dt));
  B.en = B.en.filter(e => e.hp > 0 || e.dieT > 0);
  // enemy shots
  const esdt = dt * (B.bt > 0 ? .18 : 1) * (B.freeze > 0 ? 0 : 1);
  B.es.forEach(s => { s.life -= esdt; s.x += s.vx * esdt; s.y += s.vy * esdt; s.gy += s.vy * esdt;
    if (Math.abs(s.x - B.x) < 14 && Math.abs(s.y - (B.y - 30)) < 26 && !s.done){ const r = hurtPlayer(s.dmg, { proj:1, el:s.el }); if (r === 'reflect'){ s.vx *= -1.5; s.vy *= -1; s.mine = 1; s.col = '#7fb0ff'; } else if (r !== false){ s.life = 0; } else if (B.iframe > 0){ s.done = 1; } }
    if (s.mine) for (const e of B.en) if (e.hp > 0 && Math.abs(e.x - s.x) < e.d.r && Math.abs(e.y - 30 - s.y) < e.d.r + 10){ damage(e, s.dmg * 2, { kb:6 }); s.life = 0; break; } });
  B.es = B.es.filter(s => s.life > 0 && s.x > B.cam - 80 && s.x < B.cam + 720);
  // fx/txt
  B.fx.forEach(f => f.t += dt); B.fx = B.fx.filter(f => f.t < f.life);
  B.tx.forEach(t => { t.t += dt; t.y += t.vy * dt; t.vy *= .94; }); B.tx = B.tx.filter(t => t.t < t.life);
  if (B.ban){ B.ban.t += dt; if (B.ban.t > 1.6) B.ban = null; }
  // segment cleared?
  if (!B.cleared && B.en.length === 0){ if (B.seg >= B.segs.length - 1){ endBattle(true); } else { B.cleared = true; ftxt(B.x, B.y - 90, 'CLEAR! ▶ 전진', '#7fe7ff', 15, 1.3); } }
  if (window.tickUltFx) tickUltFx(dt);
  rageTick(dt); if (B.say) B.say.t += dt;
  if (B.tut) tutTick(dt); B.assist = (B.assist || 0) - dt;
}
function tutTick(dt){ const f = B.tutFlags; B.tutT += dt;
  if (!f.moved && Math.hypot(INP.jx, INP.jy) > .3 || INP.keys.KeyD) f.moved = 1;
  if (B.seg === 2 && !f.bt){ const br = B.en.find(e => e.t === 'brute' && e.wind); if (br && br.wind.t > br.wind.dur - .45 && !f.slowed){ f.slowed = 1; B.tutPause = 1; } }
  if (B.stats.bt > 0) f.bt = 1;
}

// ====================================================================
//  RENDER
// ====================================================================
const BGIMG = { ruins:'art/bg_ruins.webp', lab:'art/bg_lab.webp', rift:'art/bg_rift.webp', vault:'art/bg_lab.webp', abyss:'art/bg_rift.webp' };
const BGCOL = { ruins:['#0b1630', '#1a2a4a', '#ff3d7f'], lab:['#071a22', '#103040', '#3ff0ff'], rift:['#1a0726', '#2a0a3a', '#ff2a7a'], vault:['#071a22', '#103040', '#3ff0ff'], abyss:['#1a0726', '#2a0a3a', '#ff2a7a'] };
function drawBG(){ const c = ctx, bg = B.bg, col = BGCOL[bg] || BGCOL.ruins; const im = img(BGIMG[bg] || BGIMG.ruins);
  if (ok(im)){ const h = LH, w = im.naturalWidth / im.naturalHeight * h; let ox = -(B.cam * .35) % w; if (ox > 0) ox -= w; for (let x = ox; x < LW; x += w) c.drawImage(im, x, 0, w, h); }
  else { const g = c.createLinearGradient(0, 0, 0, GY0); g.addColorStop(0, col[0]); g.addColorStop(1, col[1]); c.fillStyle = g; c.fillRect(0, 0, LW, GY0 + 10);
    // skyline
    for (let L = 0; L < 2; L++){ const par = L ? .5 : .25; c.fillStyle = L ? '#0c1426' : '#121c36'; let s = 1234 + L * 99;
      for (let i = -2; i < 26; i++){ const bx = i * 46 - (B.cam * par) % 46 - ((B.cam * par / 46) | 0) * 0; const seed = Math.sin((i + Math.floor(B.cam * par / 46)) * 12.9898 + L) * 43758.5; const hh = 50 + (seed - Math.floor(seed)) * (L ? 110 : 140);
        c.fillRect(bx, GY0 - hh + 10, 40, hh); c.fillStyle = col[2] + '55'; for (let wy = GY0 - hh + 18; wy < GY0; wy += 12) if (((wy * 7 + i * 3) | 0) % 3 === 0) c.fillRect(bx + 6 + ((i * wy) % 22), wy, 4, 3); c.fillStyle = L ? '#0c1426' : '#121c36'; } }
    // rift in sky
    c.save(); c.globalAlpha = .55 + Math.sin(B.t * 2) * .1; c.strokeStyle = col[2]; c.lineWidth = 3; c.shadowColor = col[2]; c.shadowBlur = 18; c.beginPath(); c.moveTo(380 - B.cam * .1 % 900, 20); c.lineTo(400 - B.cam * .1 % 900, 60); c.lineTo(390 - B.cam * .1 % 900, 90); c.lineTo(420 - B.cam * .1 % 900, 130); c.stroke(); c.restore(); }
  // ground
  const hasImg = ok(im); const g2 = c.createLinearGradient(0, GY0 - 20, 0, LH); g2.addColorStop(0, 'rgba(10,16,30,.0)'); g2.addColorStop(.15, hasImg ? 'rgba(8,12,26,.25)' : 'rgba(12,20,36,.85)'); g2.addColorStop(1, hasImg ? 'rgba(4,8,18,.6)' : 'rgba(6,10,20,.97)'); c.fillStyle = g2; c.fillRect(0, GY0 - 20, LW, LH);
  c.strokeStyle = (col[2]) + (hasImg ? '14' : '33'); c.lineWidth = 1; for (let i = -10; i < 30; i++){ const x = i * 60 - (B.cam % 60); c.beginPath(); c.moveTo(x, GY0 - 6); c.lineTo(x + (x - 320) * .9, LH); c.stroke(); }
  for (let k = 0; k < 5; k++){ const y = GY0 - 6 + Math.pow(k / 5, 1.6) * (LH - GY0 + 6); c.beginPath(); c.moveTo(0, y); c.lineTo(LW, y); c.stroke(); }
  c.fillStyle = col[2] + '22'; c.fillRect(0, GY0 - 8, LW, 2);
}
function drawChar(id, x, y, face, opt){ const c = ctx, ch = CHM[id]; opt = opt || {};
  const sp = img(sprArt(id));
  c.save(); c.translate(x, y);
  if (opt.alpha != null) c.globalAlpha = opt.alpha;
  // shadow
  c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.ellipse(0, 0, 18, 5, 0, 0, 7); c.fill();
  const bob = opt.anim === 'run' ? Math.abs(Math.sin(B.animT * 14)) * 3 : Math.sin(B.animT * 3) * 1.2;
  if (ok(sp)){ const fw = sp.naturalWidth / 4, fh = sp.naturalHeight; const H = 112, W = fw / fh * H;
    let fr = opt.skill ? 3 : opt.atk ? 2 : opt.anim === 'run' ? 1 : 0;
    // ---- motion: lunge / recoil / squash ----
    let ox = 0, oy = 0, rot = 0, sx = 1, sy = 1, smear = 0;
    const ph = opt.ph ?? 9, melee = opt.kind === 'm';
    if (opt.skill){ const k = Math.min(1, (.35 - (B.skAnim || 0)) / .12); ox = 10 * k; rot = .1 * k; sx = 1 + .08 * (1 - k); sy = 1 - .06 * (1 - k); }
    else if (opt.atk){
      if (melee){ const fin = opt.combo === 2; if (fin) fr = 3;
        const L = fin ? 44 : 30;
        if (ph < .07){ const k = ph / .07; ox = -12 * k; rot = -.22 * k; sx = .93; sy = 1.07; fr = 1; }            // wind-up (pull back)
        else if (ph < .17){ const k = (ph - .07) / .1, e2 = 1 - (1 - k) * (1 - k); ox = lerp(-12, L, e2); rot = lerp(-.22, .26, e2); sx = 1.14; sy = .9; smear = 1 - k * .5; }   // strike (lunge)
        else { const k = Math.min(1, (ph - .17) / .25); ox = lerp(L, 6, k * k); rot = lerp(.26, .04, k); }
        if (opt.combo === 1) rot *= -.6; }
      else { const k = Math.min(1, ph / .12); ox = -12 * (1 - k); rot = -.12 * (1 - k); sx = 1 + .07 * (1 - k); sy = 1 - .05 * (1 - k);    // recoil per shot
        if (ph < .07 && opt.main){ c.save(); c.scale(face, 1); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(W * .42, -H * .64, 0, W * .42, -H * .64, 26); g.addColorStop(0, '#fff'); g.addColorStop(.3, ch.col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.beginPath(); c.arc(W * .42, -H * .64, 26, 0, 7); c.fill(); c.restore(); } } }
    else if (opt.anim === 'run'){ const cyc = B.animT * 12; oy = -Math.abs(Math.sin(cyc)) * 4; rot = .07; sy = 1 + Math.sin(cyc * 2) * .025; sx = 1 - Math.sin(cyc * 2) * .02; }
    else { sy = 1 + Math.sin(B.animT * 3) * .012; }
    c.scale(face, 1); if (opt.tint) c.filter = opt.tint;
    if (smear > 0){ c.save(); c.globalAlpha *= .35 * smear; for (let q = 1; q <= 3; q++){ c.globalAlpha = .28 * smear * (1 - q / 4); c.save(); c.translate(ox - q * 14, oy); c.rotate(rot * .6); c.filter = 'brightness(1.8) saturate(0) sepia(1) hue-rotate(160deg)'; c.drawImage(sp, fr * fw, 0, fw, fh, -W / 2, -H + 4, W, H); c.restore(); } c.restore(); }
    c.translate(ox, oy); c.rotate(rot); c.scale(sx, sy);
    c.drawImage(sp, fr * fw, 0, fw, fh, -W / 2, -H - bob * .3 + 4, W, H); c.filter = 'none'; }
  else { // procedural agent
    c.scale(face, 1); const lean = opt.atk ? 5 : opt.anim === 'run' ? 3 : 0; const legA = opt.anim === 'run' ? Math.sin(B.animT * 14) * 7 : 0;
    c.strokeStyle = '#141a26'; c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-3, -30 - bob); c.lineTo(-4 - legA, -2); c.moveTo(3, -30 - bob); c.lineTo(4 + legA, -2); c.stroke();
    // body
    const g = c.createLinearGradient(0, -62, 0, -26); g.addColorStop(0, '#26324a'); g.addColorStop(1, '#151c2c'); c.fillStyle = g;
    c.beginPath(); c.moveTo(-10 + lean, -64 - bob); c.lineTo(10 + lean, -64 - bob); c.lineTo(9, -28 - bob); c.lineTo(-9, -28 - bob); c.closePath(); c.fill();
    c.strokeStyle = ch.col; c.lineWidth = 1.5; c.shadowColor = ch.col; c.shadowBlur = 6; c.beginPath(); c.moveTo(-6 + lean, -62 - bob); c.lineTo(-5, -30 - bob); c.moveTo(6 + lean, -62 - bob); c.lineTo(5, -30 - bob); c.stroke(); c.shadowBlur = 0;
    // arm + weapon
    c.strokeStyle = '#1d2638'; c.lineWidth = 5; c.beginPath(); c.moveTo(4 + lean, -58 - bob); c.lineTo(18 + lean, opt.atk ? -54 - bob : -44 - bob); c.stroke();
    c.fillStyle = ch.col; c.shadowColor = ch.col; c.shadowBlur = 8; const a = ch.atk.k;
    if (a === 'm'){ c.save(); c.translate(19 + lean, -50 - bob); c.rotate(opt.atk ? -.2 : .9); c.fillRect(-2, -26, 4, 30); c.restore(); }
    else if (a === 'b' || ch.atk.pierce){ c.fillRect(10 + lean, -56 - bob, 26, 5); }
    else c.fillRect(14 + lean, -54 - bob, 12, 4);
    c.shadowBlur = 0;
    // head
    const fi = img(faceArt(id)); const hx = 1 + lean, hy = -76 - bob;
    c.save(); c.beginPath(); c.arc(hx, hy, 13, 0, 7); c.closePath(); c.fillStyle = ch.hair; c.fill(); c.clip();
    if (ok(fi)){ c.scale(face, 1); c.drawImage(fi, -15 * face + hx * face - (face < 0 ? 0 : 0), hy - 15, 30, 30); } else { c.fillStyle = '#f2d6c4'; c.beginPath(); c.arc(hx + 2, hy + 3, 9, 0, 7); c.fill(); }
    c.restore(); c.strokeStyle = ch.col; c.lineWidth = 1.5; c.beginPath(); c.arc(hx, hy, 13, 0, 7); c.stroke();
  }
  c.restore();
}
function drawEnemy(e){ const c = ctx, d = e.d; const sx = e.x - B.cam; if (sx < -80 || sx > LW + 80) return;
  c.save(); c.translate(sx, e.y);
  const a = e.st === 'spawn' ? 1 - Math.max(0, e.stT) / .45 : 1; c.globalAlpha = e.hp <= 0 ? Math.max(0, e.dieT / .45) : clamp(a, 0, 1);
  // telegraphs (ground)
  if (e.wind && e.hp > 0){ const w = e.wind, k = w.t / w.dur; c.save(); c.translate(-sx, -e.y);
    c.fillStyle = `rgba(255,40,70,${.12 + k * .25})`; c.strokeStyle = `rgba(255,60,90,${.5 + k * .5})`; c.lineWidth = 2;
    if (w.k === 'slam'){ c.fillRect(w.x - w.w / 2 - B.cam, w.y - w.h / 2, w.w, w.h); c.fillStyle = 'rgba(255,60,90,.35)'; c.fillRect(w.x - w.w / 2 - B.cam, w.y - w.h / 2, w.w * k, w.h); c.strokeRect(w.x - w.w / 2 - B.cam, w.y - w.h / 2, w.w, w.h); }
    if (w.k === 'bslam'){ c.beginPath(); c.ellipse(w.x - B.cam, w.y, w.r, w.r / 1.6, 0, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.ellipse(w.x - B.cam, w.y, w.r * k, w.r / 1.6 * k, 0, 0, 7); c.fill(); }
    if (w.k === 'bcharge'){ const x1 = e.x + w.face * 420; c.fillRect(Math.min(e.x, x1) - B.cam, w.y - 30, Math.abs(x1 - e.x), 60); }
    if (w.k === 'blaser'){ c.fillRect(0, w.y - 20, LW, 40); c.fillStyle = `rgba(255,255,255,${k * .3})`; c.fillRect(0, w.y - 2, LW, 4); }
    if (w.k === 'laser'){ c.strokeStyle = `rgba(80,240,255,${.3 + k * .6})`; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(e.x - B.cam, w.y - 52); c.lineTo(e.x - B.cam + w.face * 400, w.y - 52); c.stroke(); c.setLineDash([]); }
    if (w.k === 'shot'){ c.strokeStyle = `rgba(255,80,140,${.3 + k * .5})`; c.beginPath(); c.moveTo(e.x - B.cam + w.face * 16, e.y - 30); c.lineTo(B.x - B.cam, B.y - 30); c.stroke(); }
    c.restore();
    if (w.k === 'swipe' || w.k === 'slam' || e.t === 'boss'){ c.fillStyle = '#ff3b5c'; c.font = '900 16px sans-serif'; c.textAlign = 'center'; c.fillText('!', 0, -d.r * 2.6 - 14 - Math.sin(e.ph * 20) * 2); }
  }
  c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.ellipse(0, 0, d.r * 1.1, d.r * .3, 0, 0, 7); c.fill();
  const fly = d.fly ? 40 + Math.sin(e.ph * 3) * 5 : 0;
  if (e.t === 'core'){ c.globalAlpha *= 1; c.fillStyle = '#ffd447'; c.shadowColor = '#ffd447'; c.shadowBlur = 20; c.save(); c.translate(0, -40); c.rotate(e.ph * 2); c.beginPath(); c.moveTo(0, -18); c.lineTo(12, 0); c.lineTo(0, 18); c.lineTo(-12, 0); c.closePath(); c.fill(); c.restore(); c.restore(); if (e.hp > 0){ c.fillStyle = '#ffd447'; c.fillRect(sx - 14, e.y - 70, 28 * e.hp / e.maxhp, 3); } return; }
  const sp = img(e.t === 'boss' ? `art/e_${B.opt.boss}.webp` : `art/e_${e.t}.webp`);
  const fr = e.wind ? 1 : 0;
  c.scale(e.face, 1);
  if (e.flash > 0) c.filter = 'brightness(3)';
  else if (e.lock > 0 || B.freeze > 0) c.filter = 'grayscale(1) brightness(.8) sepia(.6) hue-rotate(170deg)';
  if (ok(sp)){ const fw = sp.naturalWidth / 2, fh = sp.naturalHeight, H = d.r * 4.2 * (e.t === 'boss' ? 1.1 : 1), W = fw / fh * H; c.drawImage(sp, fr * fw, 0, fw, fh, -W / 2, -H - fly + 6, W, H); }
  else { // procedural remnant
    const r = d.r, col = d.col, wob = Math.sin(e.ph * 4) * 2;
    const g = c.createRadialGradient(0, -r * 1.4 - fly, 2, 0, -r * 1.3 - fly, r * 1.8); g.addColorStop(0, col); g.addColorStop(.5, '#1a0f2e'); g.addColorStop(1, 'rgba(10,6,20,0)');
    c.fillStyle = g; c.beginPath();
    if (d.fly){ c.ellipse(0, -fly - r, r * 1.3, r * .8, 0, 0, 7); c.fill(); c.fillStyle = col; c.fillRect(-r * 1.6, -fly - r - 2, r * 3.2, 3); }
    else { c.moveTo(-r, 0); c.quadraticCurveTo(-r * 1.3, -r * 1.6, -r * .6 + wob, -r * 2.6); c.quadraticCurveTo(0, -r * 3.3, r * .6 - wob, -r * 2.6); c.quadraticCurveTo(r * 1.3, -r * 1.6, r, 0); c.closePath(); c.fill();
      c.strokeStyle = col; c.globalAlpha *= .8; c.lineWidth = 2; c.shadowColor = col; c.shadowBlur = 12; c.stroke(); c.shadowBlur = 0; }
    // eyes
    c.fillStyle = e.wind ? '#ff3b5c' : '#fff'; c.shadowColor = c.fillStyle; c.shadowBlur = 8; const ey = d.fly ? -fly - r : -r * 2;
    c.beginPath(); c.arc(r * .35, ey, r * .14 + 1, 0, 7); c.arc(r * .7, ey + 1, r * .11 + 1, 0, 7); c.fill(); c.shadowBlur = 0;
    if (e.t === 'boss'){ c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.arc(0, -r * 1.7, r * 1.6 + Math.sin(e.ph * 3) * 3, 0, 7); c.stroke(); }
    if (e.t === 'gunner'){ c.fillStyle = '#ff9ac0'; c.fillRect(r * .5, -r * 1.4, r * 1.2, 4); }
    if (e.t === 'brute'){ c.fillStyle = col; c.fillRect(-r * 1.2, -r * 1.6, r * .5, r * 1.1); c.fillRect(r * .8, -r * 1.6, r * .5, r * 1.1); }
  }
  c.filter = 'none';
  c.restore();
  // hp bar
  if (e.hp > 0 && e.st !== 'spawn' && e.t !== 'boss' && e.hp < e.maxhp){ const w = d.r * 2.2; c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(sx - w / 2, e.y - d.r * 2.9 - (d.fly ? 44 : 0) - 6, w, 4); c.fillStyle = '#ff4c6a'; c.fillRect(sx - w / 2, e.y - d.r * 2.9 - (d.fly ? 44 : 0) - 6, w * e.hp / e.maxhp, 4); }
  if (e.stun > 0 && e.hp > 0){ c.fillStyle = '#ffe25a'; c.font = '800 10px sans-serif'; c.textAlign = 'center'; c.fillText('✦ ✦', sx, e.y - d.r * 3 - (d.fly ? 44 : 0) - 10); }
  if (e.lock > 0 && e.hp > 0){ c.strokeStyle = '#ffd447'; c.lineWidth = 2; c.beginPath(); c.arc(sx, e.y - d.r * 1.5, d.r * 1.5, 0, 6.283 * (e.lock / 1.6)); c.stroke(); }
}
function drawFx(f){ const c = ctx, k = f.t / f.life, x = (f.x || 0) - B.cam;
  c.save();
  switch (f.k){
    case 'slash': { c.translate(x, f.y); c.scale(f.face, 1); const a = (f.arc || 1) * 1.15, R0 = f.r * (f.fin ? 1.35 : 1.15), sw = k < .35 ? k / .35 : 1, fade = k < .35 ? 1 : 1 - (k - .35) / .65;
      const a0 = -a, a1 = -a + 2 * a * sw; c.globalCompositeOperation = 'lighter'; c.globalAlpha = fade; c.shadowColor = f.col; c.shadowBlur = 22;
      const g = c.createRadialGradient(0, 0, R0 * .55, 0, 0, R0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.6, f.col); g.addColorStop(.92, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g;
      c.beginPath(); c.arc(-R0 * .25, 0, R0, a0, a1); c.arc(-R0 * .25 + R0 * .18, 0, R0 * .78, a1, a0, true); c.closePath(); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = f.fin ? 3 : 2; c.beginPath(); c.arc(-R0 * .25, 0, R0 * .97, a0 + (a1 - a0) * .2, a1); c.stroke();
      if (f.fin){ for (let i = 0; i < 6; i++){ const t = a0 + (a1 - a0) * (i / 6); c.fillStyle = '#fff'; c.fillRect(-R0 * .25 + Math.cos(t) * R0 * (1.05 + k * .4), Math.sin(t) * R0 * (1.05 + k * .4), 3, 3); } } break; }
    case 'eslash': { c.translate(x, f.y); c.scale(f.face, 1); c.globalAlpha = 1 - k; c.strokeStyle = '#ff3b6b'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 26, -1, 1); c.stroke(); break; }
    case 'muzzle': { c.globalAlpha = 1 - k; c.fillStyle = '#fff'; c.shadowColor = f.col; c.shadowBlur = 16; c.beginPath(); c.arc(x, f.y, 6, 0, 7); c.fill(); break; }
    case 'spark': { c.globalAlpha = 1 - k; c.strokeStyle = f.col; c.lineWidth = 2; for (let i = 0; i < 5; i++){ const a = i * 1.26; c.beginPath(); c.moveTo(x, f.y); c.lineTo(x + Math.cos(a) * 12 * (k + .3), f.y + Math.sin(a) * 12 * (k + .3)); c.stroke(); } break; }
    case 'ring': { c.globalAlpha = 1 - k; c.strokeStyle = f.col; c.shadowColor = f.col; c.shadowBlur = 14; c.lineWidth = 3; c.beginPath(); c.ellipse(x, f.y, lerp(f.r0, f.r1, k), lerp(f.r0, f.r1, k) * .45, 0, 0, 7); c.stroke(); break; }
    case 'burst': { c.globalAlpha = 1 - k; c.fillStyle = f.col; c.shadowColor = f.col; c.shadowBlur = 20; for (let i = 0; i < 9; i++){ const a = i * .7 + f.r; c.beginPath(); c.arc(x + Math.cos(a) * f.r * k, f.y + Math.sin(a) * f.r * k * .6, 3 * (1 - k) + 1, 0, 7); c.fill(); } break; }
    case 'boom': { c.globalAlpha = 1 - k; const g = c.createRadialGradient(x, f.y - 10, 0, x, f.y - 10, f.r * (0.5 + k)); g.addColorStop(0, '#fff'); g.addColorStop(.3, '#ffcf5a'); g.addColorStop(.7, 'rgba(255,80,40,.6)'); g.addColorStop(1, 'rgba(255,40,40,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(x, f.y - 10, f.r * (0.5 + k), f.r * (0.5 + k) * .7, 0, 0, 7); c.fill(); break; }
    case 'shock': { c.globalAlpha = 1 - k; c.strokeStyle = '#ff8a3a'; c.lineWidth = 4; c.beginPath(); c.ellipse(x, f.y, f.w / 2 * (0.4 + k * .8), f.w / 6 * (0.4 + k * .8), 0, 0, 7); c.stroke(); break; }
    case 'beam': { c.globalAlpha = 1 - k; c.translate(x, f.y); c.scale(f.face, 1); c.shadowColor = f.col; c.shadowBlur = 24; c.fillStyle = f.col; c.fillRect(0, -f.w / 2 * (1 - k), f.len, f.w * (1 - k)); c.fillStyle = '#fff'; c.fillRect(0, -f.w / 6 * (1 - k), f.len, f.w / 3 * (1 - k)); break; }
    case 'elaser': { c.globalAlpha = 1 - k; c.translate(x, f.y); c.scale(f.face, 1); c.fillStyle = f.big ? '#ff2a5a' : '#3fe0ff'; c.shadowColor = c.fillStyle; c.shadowBlur = 18; c.fillRect(0, -(f.big ? 20 : 4), f.big ? 800 : 420, f.big ? 40 : 8); break; }
    case 'streak': { c.globalAlpha = 1 - k; c.strokeStyle = f.col; c.shadowColor = f.col; c.shadowBlur = 20; c.lineWidth = 10 * (1 - k); c.beginPath(); c.moveTo(f.x0 - B.cam, f.y); c.lineTo(f.x1 - B.cam, f.y); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 3 * (1 - k); c.stroke(); break; }
    case 'pillar': { c.globalAlpha = (1 - k) * .9; const g = c.createLinearGradient(0, 0, 0, LH); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.6, f.col); g.addColorStop(1, 'rgba(255,200,120,0)'); c.fillStyle = g; c.fillRect(0, 0, LW, LH); break; }
    case 'fall': { c.globalAlpha = 1; c.strokeStyle = f.col; c.lineWidth = 3; c.beginPath(); c.moveTo(x, f.y - 300 + k * 300); c.lineTo(x, f.y - 340 + k * 300); c.stroke(); break; }
    case 'flash': { c.globalAlpha = 1 - k; c.fillStyle = f.col; c.fillRect(0, 0, LW, LH); break; }
    case 'clock': { c.globalAlpha = Math.min(1, (f.life - f.t) * 2) * .8; c.translate(x, f.y); c.strokeStyle = f.col; c.shadowColor = f.col; c.shadowBlur = 16; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 0, 120, 52, 0, 0, 7); c.stroke();
      for (let i = 0; i < 12; i++){ const a = i / 12 * 6.283; c.beginPath(); c.moveTo(Math.cos(a) * 110, Math.sin(a) * 47); c.lineTo(Math.cos(a) * 120, Math.sin(a) * 52); c.stroke(); }
      const hd = (f.rev ? -1 : 1) * f.t * 4; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(hd) * 90, Math.sin(hd) * 38); c.stroke(); break; }
    case 'after': { const a = f.chain ? .7 : .45; drawChar(f.id, x - (f.chain ? 0 : 0), f.y, f.face, { alpha:a * (1 - k), tint:f.chain ? 'sepia(1) saturate(4) hue-rotate(10deg) brightness(1.4)' : 'brightness(1.6) saturate(0) sepia(1) hue-rotate(150deg)' }); break; }
  }
  c.restore();
}
function rr(x, y, w, h, r){ const c = ctx; c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function faceCircle(id, x, y, r){ const c = ctx, fi = img(faceArt(id)), ch = CHM[id]; c.save(); c.beginPath(); c.arc(x, y, r, 0, 7); c.clip(); c.fillStyle = '#16203a'; c.fillRect(x - r, y - r, r * 2, r * 2);
  if (ok(fi)) c.drawImage(fi, x - r, y - r, r * 2, r * 2); else { const ci = img(cardArt(id)); if (ok(ci)) c.drawImage(ci, 0, 0, ci.naturalWidth, ci.naturalWidth, x - r, y - r, r * 2, r * 2); else { c.fillStyle = ch.col; c.font = `900 ${r}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch.name[0], x, y + 1); c.textBaseline = 'alphabetic'; } }
  c.restore(); }
function drawHUD(){ const c = ctx, m = me();
  // active
  faceCircle(m.id, 30, 30, 20); c.strokeStyle = m.c.col; c.lineWidth = 2; c.beginPath(); c.arc(30, 30, 20, 0, 7); c.stroke();
  c.fillStyle = '#fff'; c.font = '900 12px sans-serif'; c.textAlign = 'left'; c.fillText(m.c.name, 56, 22); c.fillStyle = RAR[m.c.r].c; c.font = '800 9px sans-serif'; c.fillText(ELEM[m.c.el].e + ' ' + m.c.r + ' · ' + m.c.role, 56 + c.measureText(m.c.name).width * 1.4 + 4, 22);
  c.fillStyle = 'rgba(0,0,0,.6)'; rr(56, 27, 150, 8, 4); c.fill(); c.fillStyle = m.hp / m.maxhp < .3 ? '#ff4c6a' : '#5dff8a'; rr(56, 27, 150 * m.hp / m.maxhp, 8, 4); c.fill();
  if (m.shield > 0){ c.fillStyle = 'rgba(120,200,255,.8)'; rr(56, 27, Math.min(150, 150 * m.shield / m.maxhp), 3, 1); c.fill(); }
  c.fillStyle = 'rgba(0,0,0,.6)'; rr(56, 39, 150, 6, 3); c.fill(); const eg = c.createLinearGradient(56, 0, 206, 0); eg.addColorStop(0, '#26e0ff'); eg.addColorStop(1, '#ff3d7f'); c.fillStyle = eg; rr(56, 39, 150 * B.energy / 100, 6, 3); c.fill();
  c.fillStyle = '#9fd'; c.font = '700 8px sans-serif'; c.fillText('시공간 에너지 ' + Math.floor(B.energy), 56, 54);
  // stage info
  c.textAlign = 'center'; c.fillStyle = '#cfe9ff'; c.font = '800 11px sans-serif'; c.fillText(B.opt.title || '', 320, 16);
  c.font = '700 9px sans-serif'; c.fillStyle = '#8fb6d8'; const tt = Math.floor(B.t); c.fillText(`${Math.floor(tt / 60)}:${String(tt % 60).padStart(2, '0')} · 구역 ${B.seg + 1}/${B.segs.length}`, 320, 29);
  // boss bar
  if (B.boss && B.boss.hp > 0){ const b = B.boss; c.fillStyle = 'rgba(0,0,0,.7)'; rr(170, 36, 300, 10, 5); c.fill(); c.fillStyle = '#ff2a5a'; rr(170, 36, 300 * b.hp / b.maxhp, 10, 5); c.fill(); c.fillStyle = '#fff'; c.font = '900 10px sans-serif'; c.fillText(b.name, 320, 60); }
  // go arrow
  if (B.cleared){ c.globalAlpha = .6 + Math.sin(B.t * 8) * .4; c.fillStyle = '#7fe7ff'; c.font = '900 22px sans-serif'; c.fillText('GO ▶', 560, 180); c.globalAlpha = 1; }
  // tag portraits
  others().forEach((i, k) => { const q = B.party[i], b = BTN[k ? 't2' : 't1']; c.globalAlpha = q.dead ? .35 : 1; faceCircle(q.id, b.x, b.y, b.r);
    c.strokeStyle = B.bt > 0 && !q.dead ? '#ffd447' : q.c.col; c.lineWidth = B.bt > 0 ? 3 : 2; c.beginPath(); c.arc(b.x, b.y, b.r, 0, 7); c.stroke();
    c.strokeStyle = '#5dff8a'; c.lineWidth = 3; c.beginPath(); c.arc(b.x, b.y, b.r + 3, -1.57, -1.57 + 6.283 * q.hp / q.maxhp); c.stroke();
    if (B.tagCd > 0 && !q.dead){ c.fillStyle = 'rgba(0,0,0,.55)'; c.beginPath(); c.moveTo(b.x, b.y); c.arc(b.x, b.y, b.r, -1.57, -1.57 + 6.283 * Math.min(1, B.tagCd / 1.1)); c.fill(); }
    if (B.bt > 0 && !q.dead){ c.fillStyle = '#ffd447'; c.font = '900 9px sans-serif'; c.fillText('TAG!', b.x - 36, b.y + 3); }
    c.globalAlpha = 1; });
  // buttons
  const btn = (b, fill, label, sub) => { c.fillStyle = fill; c.beginPath(); c.arc(b.x, b.y, b.r, 0, 7); c.fill(); c.strokeStyle = 'rgba(160,230,255,.6)'; c.lineWidth = 1.5; c.stroke(); c.fillStyle = '#fff'; c.font = `900 ${b.r > 30 ? 13 : 10}px sans-serif`; c.fillText(label, b.x, b.y + (sub ? 0 : 4)); if (sub){ c.font = '700 8px sans-serif'; c.fillStyle = '#bfe'; c.fillText(sub, b.x, b.y + 11); } };
  btn(BTN.atk, INP.atk ? 'rgba(60,180,255,.55)' : 'rgba(20,50,90,.55)', '공격', m.c.wpn);
  btn(BTN.sk, 'rgba(20,50,90,.55)', '스킬'); if (m.skCd > 0){ c.fillStyle = 'rgba(0,0,0,.6)'; c.beginPath(); c.moveTo(BTN.sk.x, BTN.sk.y); c.arc(BTN.sk.x, BTN.sk.y, BTN.sk.r, -1.57, -1.57 + 6.283 * m.skCd / m.skMax); c.fill(); c.fillStyle = '#fff'; c.font = '900 11px sans-serif'; c.fillText(Math.ceil(m.skCd), BTN.sk.x, BTN.sk.y + 4); }
  btn(BTN.dodge, B.dodgeCd > 0 ? 'rgba(10,20,40,.5)' : 'rgba(20,50,90,.55)', '회피');
  const ready = B.energy >= 100; btn(BTN.ult, ready ? `rgba(255,${120 + Math.sin(B.t * 8) * 60},160,.75)` : 'rgba(20,30,60,.55)', '궁극기');
  c.strokeStyle = '#ff7fb0'; c.lineWidth = 3; c.beginPath(); c.arc(BTN.ult.x, BTN.ult.y, BTN.ult.r + 3, -1.57, -1.57 + 6.283 * B.energy / 100); c.stroke();
  // pause
  c.fillStyle = 'rgba(20,40,70,.7)'; c.beginPath(); c.arc(BTN.pause.x, BTN.pause.y, BTN.pause.r, 0, 7); c.fill(); c.fillStyle = '#cfe'; c.fillRect(BTN.pause.x - 5, BTN.pause.y - 6, 3, 12); c.fillRect(BTN.pause.x + 2, BTN.pause.y - 6, 3, 12);
  // joystick
  if (INP.jid !== null){ c.globalAlpha = .5; c.strokeStyle = '#7fe7ff'; c.lineWidth = 2; c.beginPath(); c.arc(INP.jox, INP.joy, 40, 0, 7); c.stroke(); c.fillStyle = '#7fe7ff'; c.beginPath(); c.arc(INP.jox + INP.jx * 40, INP.joy + INP.jy * 40, 16, 0, 7); c.fill(); c.globalAlpha = 1; }
  else if (B.t < 6 || B.tut){ c.globalAlpha = .25; c.strokeStyle = '#7fe7ff'; c.lineWidth = 2; c.beginPath(); c.arc(100, 290, 40, 0, 7); c.stroke(); c.globalAlpha = 1; }
}
function drawTut(){ if (!B.tut || B.over) return; const c = ctx, f = B.tutFlags; let msg = '';
  if (!f.moved) msg = '왼쪽 화면을 드래그해서 이동하세요';
  else if (B.kills < 2) msg = '공격 버튼을 누르고 있으면 계속 공격해요';
  else if (B.seg < 2 && !f.sk) { msg = '스킬 버튼으로 요원 고유 스킬을 사용하세요'; if (me().skCd > 0) f.sk = 1; }
  else if (B.seg < 2) msg = '적을 모두 처치하면 ▶ 방향으로 전진!';
  else if (!f.bt) msg = B.assist > 0 ? '지금! [회피] 버튼!' : '빨간 범위 공격 직전에 [회피]! 타이밍이 맞으면 불릿 타임';
  else if (!f.chain) msg = '불릿 타임 중에 오른쪽 요원 얼굴을 눌러 교체 → 인과 역전 연계기!';
  else if (!f.ult && B.energy >= 100) msg = '에너지가 가득! [궁극기]를 사용하세요';
  if (B.stats.ult > 0) f.ult = 1;
  if (!msg) return;
  c.save(); c.font = '800 12px sans-serif'; const w = c.measureText(msg).width + 28; c.fillStyle = 'rgba(4,14,30,.88)'; rr(320 - w / 2, 70, w, 26, 13); c.fill(); c.strokeStyle = '#7fe7ff'; c.lineWidth = 1.5; c.stroke(); c.fillStyle = '#e8f8ff'; c.textAlign = 'center'; c.fillText(msg, 320, 87); c.restore();
}
function render(){ const c = ctx; c.setTransform(K, 0, 0, K, 0, 0); c.clearRect(0, 0, LW, LH);
  if (!B){ return; }
  const sh = B.shake > 0 ? B.shake * 14 : 0; c.save(); if (sh) c.translate((R() - .5) * sh, (R() - .5) * sh);
  if (B.mono > 0) c.filter = 'grayscale(1) contrast(1.3) brightness(.8)';
  drawBG();
  B.zones.forEach(z => { c.save(); c.globalAlpha = .35; c.fillStyle = z.col; c.beginPath(); c.ellipse(z.x - B.cam, z.y, z.r, z.r * .4, 0, 0, 7); c.fill(); c.restore(); });
  // entities sorted
  const list = B.en.map(e => ({ y:e.y, f:() => drawEnemy(e) }));
  list.push({ y:B.y, f:() => { const m = me(); if (B.iframe > 0 && B.dodgeT > 0) {} drawChar(m.id, B.x - B.cam, B.y, B.face, { anim:B.anim, atk:B.atkAnim > 0, skill:B.skAnim > 0, ph:B.t - (B.lastAtk ?? -9), kind:m.c.atk.k, combo:m.combo, main:1, alpha:B.hurtT > 0 && Math.floor(B.t * 30) % 2 ? .5 : 1 });
    if (m.shield > 0){ c.save(); c.globalAlpha = .35; c.strokeStyle = '#7fd0ff'; c.lineWidth = 2; c.beginPath(); c.ellipse(B.x - B.cam, B.y - 40, 28, 48, 0, 0, 7); c.stroke(); c.restore(); }
    if (B.reflect > 0){ c.save(); c.globalAlpha = .5; c.fillStyle = '#7fb0ff'; c.fillRect(B.x - B.cam + B.face * 26, B.y - 80, 5, 70); c.restore(); } } });
  list.sort((a, b) => a.y - b.y).forEach(o => o.f());
  c.filter = 'none';
  B.drones.forEach(d => { const x = B.x - B.cam + Math.cos(d.a) * 40, y = B.y - 70 + Math.sin(d.a) * 14; c.save(); c.fillStyle = d.col; c.shadowColor = d.col; c.shadowBlur = 10; c.beginPath(); c.moveTo(x - 8, y); c.lineTo(x, y - 4); c.lineTo(x + 8, y); c.lineTo(x, y + 3); c.closePath(); c.fill(); c.restore(); });
  // shots
  B.shots.forEach(s => { c.save(); c.fillStyle = s.col; c.strokeStyle = s.col; c.shadowColor = s.col; c.shadowBlur = 10; const x = s.x - B.cam;
    if (s.lob){ c.beginPath(); c.arc(x, s.y, 5, 0, 7); c.fill(); }
    else if (s.len){ const l = Math.hypot(s.vx, s.vy) || 1; c.lineWidth = s.w; c.beginPath(); c.moveTo(x, s.y); c.lineTo(x - s.vx / l * s.len, s.y - s.vy / l * s.len); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 1; c.stroke(); }
    else { c.beginPath(); c.arc(x, s.y, s.w, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x, s.y, s.w * .45, 0, 7); c.fill(); }
    c.restore(); });
  B.es.forEach(s => { c.save(); c.fillStyle = s.col; c.shadowColor = s.col; c.shadowBlur = 12; c.beginPath(); c.arc(s.x - B.cam, s.y, s.r, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(s.x - B.cam, s.y, s.r * .4, 0, 7); c.fill(); c.restore(); });
  B.fx.forEach(drawFx);
  if (window.drawUltFx) drawUltFx();
  // texts
  B.tx.forEach(t => { const k = t.t / t.life; c.globalAlpha = 1 - Math.max(0, k - .6) / .4; c.font = `900 ${t.size}px sans-serif`; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.8)'; c.strokeText(t.s, t.x - B.cam, t.y); c.fillStyle = t.col; c.fillText(t.s, t.x - B.cam, t.y); c.globalAlpha = 1; });
  c.restore();
  // bullet time overlay
  if (B.bt > 0 || B.freeze > 0){ const a = Math.min(1, (B.bt || B.freeze) * 2); c.save(); c.globalAlpha = .28 * a; c.fillStyle = B.freeze > 0 ? '#3a2a6a' : '#0a3a5a'; c.globalCompositeOperation = 'multiply'; c.fillRect(0, 0, LW, LH); c.restore();
    const g = c.createRadialGradient(320, 180, 120, 320, 180, 420); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(40,200,255,${.35 * a})`); c.fillStyle = g; c.fillRect(0, 0, LW, LH);
    if (B.bt > 0){ c.fillStyle = '#7fe7ff'; c.font = '900 12px sans-serif'; c.textAlign = 'center'; c.fillText(`BULLET TIME ${B.bt.toFixed(1)}`, 320, 112); } }
  if (B.ban){ const k = B.ban.t / 1.6, a = k < .15 ? k / .15 : k > .8 ? (1 - k) / .2 : 1; c.save(); c.globalAlpha = a; c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(0, 130, LW, 54); c.fillStyle = B.ban.col; c.font = '900 26px sans-serif'; c.textAlign = 'center'; c.shadowColor = B.ban.col; c.shadowBlur = 16; c.fillText(B.ban.main, 320 + (1 - a) * 40, 164); c.shadowBlur = 0; if (B.ban.sub){ c.fillStyle = '#fff'; c.font = '800 11px sans-serif'; c.fillText(B.ban.sub, 320, 178); } c.restore(); }
  drawHUD(); drawBossExtra(); drawSay(); drawTut();
  // ult cut-in
  if (B.cut){ const k = B.cut.t / B.cut.life, m = B.cut.m; c.save(); c.fillStyle = `rgba(0,0,0,${.6 * Math.min(1, k * 5)})`; c.fillRect(0, 0, LW, LH);
    const sl = k < .2 ? 1 - k / .2 : k > .85 ? -(k - .85) / .15 : 0; c.translate(sl * 640, 0);
    c.save(); c.beginPath(); c.moveTo(0, 90); c.lineTo(LW, 60); c.lineTo(LW, 290); c.lineTo(0, 320); c.closePath(); c.clip();
    const g = c.createLinearGradient(0, 0, LW, 0); g.addColorStop(0, m.c.col); g.addColorStop(1, '#10162a'); c.fillStyle = g; c.fillRect(0, 0, LW, LH);
    for (let i = 0; i < 20; i++){ c.fillStyle = 'rgba(255,255,255,.15)'; c.fillRect((i * 97 + k * 2000) % 700 - 40, 70 + i * 12, 80, 2); }
    const ci = img(cardArt(m.id)); if (ok(ci)){ const h = 420, w = ci.naturalWidth / ci.naturalHeight * h; c.drawImage(ci, 300 - k * 40, -40, w, h); }
    else { const s = img(sprArt(m.id)); if (ok(s)) c.drawImage(s, 0, 0, s.naturalWidth / 4, s.naturalHeight, 340, 40, 200, 280); }
    c.restore(); c.fillStyle = '#fff'; c.font = '900 30px sans-serif'; c.textAlign = 'left'; c.shadowColor = m.c.col; c.shadowBlur = 20; c.fillText(m.c.ult.n, 30, 200); c.font = '800 13px sans-serif'; c.shadowBlur = 0; c.fillText(m.c.name + ' — ' + m.c.en.toUpperCase(), 32, 224); if (window.ULT_CAP && ULT_CAP[m.id]){ c.font = 'italic 700 11px sans-serif'; c.fillStyle = 'rgba(255,255,255,.75)'; c.fillText(ULT_CAP[m.id], 32, 244); } if (window.drawCutExtra) drawCutExtra(m, k); c.restore(); }
}
let lastT = performance.now();
function loop(t){ const dt = Math.min(.05, (t - lastT) / 1000); lastT = t; try { update(dt); render(); } catch(e){ console.error(e); } requestAnimationFrame(loop); }
requestAnimationFrame(loop);

// ---------- end ----------
function endBattle(win, quit){ if (B.over) return; B.over = 1; INP.atk = false; INP.jid = null; INP.jx = INP.jy = 0;
  const o = B.opt, time = B.t;
  setTimeout(() => {
    if (win) SFX.win(); else SFX.lose();
    let stars = 0, rw = { cred:0, chip:0, cry:0, exp:0 }, first = false;
    if (win){ stars = 1 + (B.ko === 0 ? 1 : 0) + (time < (o.par || 150) ? 1 : 0);
      if (o.mode === 'story'){ const s = o.st; first = !M.clear[s.id]; M.clear[s.id] = 1; M.star[s.id] = Math.max(M.star[s.id] || 0, stars);
        rw.cred = Math.round(800 * s.pow + 400); rw.chip = Math.round(3 + s.pow * 2); rw.exp = 30 + s.idx * 4; if (first){ rw.cry = s.boss ? 150 : 60; if (s.id === 'P-1') rw.cry = 300; }
        if (s.id === 'P-1'){ M.prologue = 1; } misAdd('stage'); }
      if (o.mode === 'daily'){ const lv = o.lvl, wm = weekend() ? 2 : 1; if (o.dun === 'cred') rw.cred = (6000 * lv + 4000) * wm; else rw.chip = (18 * lv + 10) * wm; rw.exp = 20; M.daily.dun[o.dun]--; M.stats.dun++; misAdd('dun'); misAdd('stage'); }
      if (o.mode === 'abyss'){ const f = o.floor; rw.cred = 500 * f; rw.chip = Math.ceil(f / 2); if (f > (M.abyss || 0)){ rw.cry = f % 5 === 0 ? 80 : 20; M.abyss = f; } rw.exp = 10; }
      M.cred += rw.cred; M.chip += rw.chip; M.cry += rw.cry; M.cmdExp = (M.cmdExp || 0) + rw.exp;
    } else if (o.mode === 'story' && o.stamPaid && !quit){ M.stam += Math.floor(o.stamPaid * .8); }
    save();
    const st = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    const rwT = [rw.cred && `🪙 ${fmt(rw.cred)}`, rw.chip && `💠 ${rw.chip}`, rw.cry && `💎 ${rw.cry}${first ? ' (최초 클리어)' : ''}`, rw.exp && `지휘관 EXP +${rw.exp}`].filter(Boolean).join(' · ');
    const mvp = me(); const html = win ? `<div style="display:flex;align-items:center;gap:8px;justify-content:center;margin-bottom:4px"><img src="${faceArt(mvp.id)}" style="width:36px;height:36px;border-radius:50%"><i style="font-size:11px;color:#cde">“${voice(mvp.id, 'win')}”</i></div><h3 style="color:#ffd447;font-size:22px">MISSION CLEAR</h3><div style="font-size:24px;color:#ffd447;letter-spacing:4px">${st}</div><p class="sub">★ 클리어 · ★ 전투 불능 없음 · ★ ${o.par || 150}초 이내</p><p>${rwT}</p><p class="sub">처치 ${B.kills} · 불릿 타임 ${B.stats.bt} · 연계기 ${B.stats.chain} · ${Math.floor(time)}초</p>`
      : `<h3 style="color:#ff5a7a;font-size:22px">${quit ? '작전 포기' : 'MISSION FAILED'}</h3><p>${quit ? '' : '요원 레벨을 올리거나 편성을 바꿔 보세요.<br>빨간 범위 공격은 [회피]로 피하면 불릿 타임!'}</p>${o.stamPaid && !quit ? '<p class="sub">행동력 80% 반환</p>' : ''}`;
    const post = win && o.mode === 'story' && o.st.post && first;
    const btns = [];
    if (win && o.mode === 'story'){ const nx = STAGES[o.st.idx + 1]; if (nx) btns.push(['다음 스테이지', () => afterBattle(post, () => openStage(nx.id))]); }
    if (o.mode === 'abyss' && win) btns.push(['다음 층', () => startAbyss(o.floor + 1)]);
    btns.push(['재도전', () => afterBattle(post, () => o.mode === 'story' ? openStage(o.st.id) : o.mode === 'daily' ? startDaily(o.dun, o.lvl) : startAbyss(o.floor)), 'gray']);
    btns.push(['로비', () => afterBattle(post, () => goLobby()), 'gray']);
    modal(html, btns);
  }, win ? 900 : 700);
}
function afterBattle(post, then){ const s = B && B.opt.st; B = null; render(); if (post) runDialog(s.post, () => { checkUnlock(s); then(); }); else then(); }
function checkUnlock(s){ if (s && s.id === 'P-1') { M.party = ['noah', 'raven', 'chloe']; M.lobby = 'noah'; save(); } }

// ---------- boss gimmicks ----------
function bossBreakHit(e){ if (e.groggy > 0) return; e.brkHits = (e.brkHits || 0) + 1; ftxt(e.x, e.y - 120, `BREAK ${e.brkHits}/3`, '#ffd447', 15, 1);
  if (e.brkHits >= 3){ e.brkHits = 0; e.groggy = 8; e.wind = null; e.stun = 0; banner('BREAK!', '8초간 받는 피해 2배', '#ffd447'); B.shake = .5; SFX.boom(); } }
function startRage(e){ B.rage = 1; B.rageT = 15; banner('광폭화', '시간이 빨라진다 — 시간 핵을 파괴하라!', '#ff2a5a');
  for (let i = 0; i < 3; i++) spawnEnemy('core', B.segX0 + 120 + i * 200, lerp(GY0 + 10, GY1 - 10, R()), 0); }
function rageTick(dt){ if (!B.rage) return; const cores = B.en.filter(e => e.t === 'core' && e.hp > 0);
  if (!cores.length){ B.rage = 0; banner('패턴 저지!', '보스가 경직됩니다', '#7dff9a'); if (B.boss && B.boss.hp > 0) B.boss.stun = 3; return; }
  B.rageT -= dt; if (B.rageT <= 0 && B.boss && B.boss.hp > 0){ B.boss.hp = Math.min(B.boss.maxhp, B.boss.hp + B.boss.maxhp * .12); ftxt(B.boss.x, B.boss.y - 120, '시간 흡수 +12%', '#ff2a5a', 15, 1.2); B.rageT = 15; } }
function drawBossExtra(){ const c = ctx, b = B.boss; if (!b || b.hp <= 0) return;
  for (let i = 0; i < 3; i++){ c.fillStyle = i < (b.brkHits || 0) ? '#ffd447' : 'rgba(255,255,255,.2)'; c.beginPath(); c.arc(300 + i * 20, 50, 4, 0, 7); c.fill(); }
  if (b.groggy > 0){ c.fillStyle = '#ffd447'; c.font = '900 10px sans-serif'; c.textAlign = 'center'; c.fillText(`BREAK ${b.groggy.toFixed(1)}s · 피해 2배`, 400, 52); }
  if (B.rage){ c.fillStyle = '#ff5a7a'; c.font = '900 10px sans-serif'; c.textAlign = 'center'; c.fillText(`광폭화! 시간 핵 파괴 ${Math.ceil(B.rageT)}초 · 스킬 쿨타임 지연`, 320, 72); } }
function drawSay(){ if (!B.say) return; const c = ctx, k = B.say.t; if (k > 2.4){ B.say = null; return; } c.save(); c.globalAlpha = k < .15 ? k / .15 : k > 2 ? (2.4 - k) / .4 : 1;
  c.font = '800 12px sans-serif'; const w = c.measureText(B.say.s).width + 54; c.fillStyle = 'rgba(4,10,24,.85)'; rr(320 - w / 2, 300, w, 26, 13); c.fill(); faceCircle(B.say.id, 320 - w / 2 + 14, 313, 11); c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText('“' + B.say.s + '”', 320 - w / 2 + 30, 317); c.restore(); }
function drawEnemyCore(e){ }
