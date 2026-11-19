'use strict';
// ====================================================================
//  UI — lobby, pages, gacha, shop, missions
// ====================================================================
const SCR = ['lobby', 'pgStory', 'pgDaily', 'pgAgents', 'pgGacha', 'pgShop', 'pgList'];
let cur = 'lobby';
function showScreen(id){ SCR.forEach(s => $(s).classList.toggle('on', s === id)); cur = id; if (id === 'lobby') renderLobby(); }
function goLobby(){ BGM.stop(); BGM.start('lobby'); showScreen('lobby'); }
document.querySelectorAll('.back').forEach(b => b.onclick = () => { SFX.ui(); goLobby(); });
function misAdd(k, n){ dailyReset(); M.daily.mis[k] = (M.daily.mis[k] || 0) + (n || 1); }
function giveRw(rw){ const t = []; if (rw.cry){ M.cry += rw.cry; t.push('💎' + rw.cry); } if (rw.cred){ M.cred += rw.cred; t.push('🪙' + fmt(rw.cred)); } if (rw.chip){ M.chip += rw.chip; t.push('💠' + rw.chip); } if (rw.tk){ M.tk += rw.tk; t.push('🎫 소환권 ' + rw.tk); } if (rw.ptk){ M.ptk += rw.ptk; t.push('🎟️ 픽업 소환권 ' + rw.ptk); }
  if (rw.ssrTicket){ M.ssrTk = (M.ssrTk || 0) + rw.ssrTicket; t.push('SSR 확정 소환권'); } if (rw.ssrSel){ M.ssrSel += rw.ssrSel; t.push('상시 SSR 선택권'); } if (rw.stam){ M.stam += rw.stam; t.push('⚡' + rw.stam); }
  if (rw.noahAw){ grantAgent('noah'); t.push('노아 각성 +1'); } save(); return t.join(' · '); }
const rwText = rw => [rw.cry && '💎' + rw.cry, rw.cred && '🪙' + fmt(rw.cred), rw.chip && '💠' + rw.chip, rw.tk && '🎫×' + rw.tk, rw.ptk && '🎟️×' + rw.ptk, rw.stam && '⚡' + rw.stam].filter(Boolean).join(' ');

// ---------- lobby ----------
let speechT = 0;
function renderLobby(){ dailyReset(); stamTick(); const c = CHM[M.lobby] || CHM.noah;
  $('lobbyChar').src = cardArt(c.id); $('charName').textContent = `${c.name} · ${c.job}`;
  $('cmdLv').textContent = 'Lv.' + cmdLv(); $('vStam').textContent = `${M.stam}/${STAM_MAX()}`; $('vCred').textContent = fmt(M.cred); $('vChip').textContent = fmt(M.chip); $('vCry').textContent = fmt(M.cry);
  document.querySelectorAll('.vCry').forEach(e => e.textContent = fmt(M.cry)); document.querySelectorAll('.vStam').forEach(e => e.textContent = `${M.stam}/${STAM_MAX()}`);
  const nx = nextStage(); $('storyNext').textContent = nx ? `${nx.id} ${nx.name}` : '시즌 1 완료 · 다시 플레이';
  $('dailyLeft').textContent = `남은 입장 ${M.daily.dun.cred + M.daily.dun.chip}`;
  $('gachaSub').textContent = '픽업: ' + CHM[PICKUP()].name;
  $('abyssSub').textContent = `최고 ${M.abyss || 0}층`; if (window.baseBadge) baseBadge();
  // time-of-day tint
  const h = new Date(nowT() + 9 * 3600000).getUTCHours(); $('lobTint').style.background = h >= 6 && h < 17 ? 'linear-gradient(rgba(120,180,255,.05),rgba(0,0,0,.15))' : h < 20 && h >= 17 ? 'linear-gradient(rgba(255,120,80,.18),rgba(40,0,60,.25))' : 'linear-gradient(rgba(20,0,60,.3),rgba(255,40,140,.12))';
  $('dAtt').classList.toggle('on', M.att.last !== today()); $('dMis').classList.toggle('on', DMIS.some(m => (M.daily.mis[m[0]] || 0) >= m[2] && !M.daily.got[m[0]]));
  $('dBoot').classList.toggle('on', bootReady()); $('dGacha').classList.toggle('on', M.daily.free < 1 || (M.ssrTk || 0) > 0 || M.ssrSel > 0);
  $('dPass').classList.toggle('on', passOn() && M.passGot !== today()); $('dShop').classList.toggle('on', !M.iap.cl_starter);
  $('dAgents').classList.toggle('on', Object.keys(M.own).some(id => canLv(id)));
  $('stamT').textContent = M.stam < STAM_MAX() ? `⚡ 다음 회복 ${Math.max(0, Math.ceil((M.stamT + 240000 - nowT()) / 60000))}분` : '⚡ 가득';
}
setInterval(() => { if (cur === 'lobby') { stamTick(); $('vStam').textContent = `${M.stam}/${STAM_MAX()}`; } }, 15000);
$('lobbyChar').onclick = () => { const c = CHM[M.lobby]; const s = $('speech'); s.textContent = pick(c.lines.concat((VOICE[c.id] && VOICE[c.id].lobby) || [])); s.classList.add('on'); $('lobbyChar').classList.add('tap'); setTimeout(() => $('lobbyChar').classList.remove('tap'), 250); clearTimeout(speechT); speechT = setTimeout(() => s.classList.remove('on'), 2600); SFX.ui(); };
$('bStory').onclick = () => { SFX.ui(); if (!M.prologue) { openStage('P-1'); return; } renderStory(); showScreen('pgStory'); };
$('bDaily').onclick = () => { SFX.ui(); if (!M.prologue) return toast('프롤로그를 먼저 완료하세요'); renderDaily(); showScreen('pgDaily'); };
$('bAgents').onclick = () => { SFX.ui(); renderAgents(); showScreen('pgAgents'); };
$('bGacha').onclick = () => { SFX.ui(); renderGacha(); showScreen('pgGacha'); };
$('bShop').onclick = () => { SFX.ui(); renderShop(); showScreen('pgShop'); };
$('curCry').onclick = () => { SFX.ui(); renderShop(); showScreen('pgShop'); };
$('bAbyss').onclick = () => { SFX.ui(); if (!M.clear['1-5']) return toast('1장 보스를 토벌하면 열려요'); startAbyss((M.abyss || 0) + 1); };
$('bAtt').onclick = () => { SFX.ui(); renderAttend(); };
$('bBoot').onclick = () => { SFX.ui(); renderBoot(); };
$('bMis').onclick = () => { SFX.ui(); renderMis(); };
$('bPass').onclick = () => { SFX.ui(); renderPass(); };
$('bSet').onclick = () => { SFX.ui(); modal(`<h3>설정</h3><div class="row"><div class="t">배경음악</div><button class="cta ${M.bgm ? '' : 'gray'}" id="sBgm">${M.bgm ? 'ON' : 'OFF'}</button></div><div class="row"><div class="t">효과음</div><button class="cta ${M.sfx ? '' : 'gray'}" id="sSfx">${M.sfx ? 'ON' : 'OFF'}</button></div>
  <div class="row"><div class="t">구매 복원<small>원스토어 결제 내역 확인</small></div><button class="cta gray" id="sRes">복원</button></div><p class="sub"><a href="prob.html" target="_blank" style="color:#8fb6d8">확률 정보</a> · <a href="terms.html" target="_blank" style="color:#8fb6d8">이용약관</a> · <a href="privacy.html" target="_blank" style="color:#8fb6d8">개인정보처리방침</a></p><p class="sub">v1.0 · 진행 데이터는 이 기기에 저장됩니다</p>`);
  $('sBgm').onclick = () => { M.bgm = M.bgm ? 0 : 1; setVol(); save(); $('sBgm').textContent = M.bgm ? 'ON' : 'OFF'; $('sBgm').className = 'cta ' + (M.bgm ? '' : 'gray'); };
  $('sSfx').onclick = () => { M.sfx = M.sfx ? 0 : 1; setVol(); save(); $('sSfx').textContent = M.sfx ? 'ON' : 'OFF'; $('sSfx').className = 'cta ' + (M.sfx ? '' : 'gray'); };
  $('sRes').onclick = () => { $('modal').classList.remove('on'); restore(); }; };

// ---------- story ----------
function nextStage(){ return STAGES.find(s => !M.clear[s.id]); }
function unlocked(s){ return s.idx === 0 || !!M.clear[STAGES[s.idx - 1].id]; }
function renderStory(){ let h = '';
  CHAPTERS.forEach(ch => { const ss = STAGES.filter(s => s.ch === ch.id); h += `<div style="font-size:13px;font-weight:900;color:#9fe8ff;margin:4px 0 6px">${ch.name}${ch.stam ? ` <span class="sub">· 행동력 ${ch.stam}</span>` : ''}</div><div class="chs" style="margin-bottom:10px">`;
    ss.forEach(s => { const lk = !unlocked(s); h += `<div class="stg ${lk ? 'lock' : ''} ${s.boss ? 'boss' : ''}" data-s="${s.id}">${s.id}<small>${s.name}</small>${M.star[s.id] ? `<span class="star">${'★'.repeat(M.star[s.id])}</span>` : ''}${s.boss ? '<small style="color:#ff8aa0">권장 전투력 ' + recPow(s) + '</small>' : ''}</div>`; });
    h += '</div>'; });
  $('storyBody').innerHTML = h;
  $('storyBody').querySelectorAll('[data-s]').forEach(el => el.onclick = () => { const s = STM[el.dataset.s]; if (!unlocked(s)) return toast('이전 스테이지를 먼저 클리어하세요'); openStage(s.id); });
}
const recPow = s => Math.round(s.pow * 1400);
const partyPow = () => M.party.reduce((a, id) => a + (owned(id) ? power(id) : 0), 0);
function openStage(id){ const s = STM[id]; const ch = CHAPTERS[s.ch];
  if (s.trial){ runDialog(s.pre, () => go(0)); return; }
  stamTick(); const cost = ch.stam;
  const pp = partyPow(), rp = recPow(s);
  modal(`<h3>${s.id} ${s.name}</h3><p>${ch.name}</p><p>권장 전투력 <b style="color:${pp >= rp ? '#7dff9a' : '#ff8a8a'}">${rp}</b> · 내 파티 <b>${pp}</b></p>
    <div style="display:flex;gap:6px;justify-content:center;margin:6px 0">${M.party.map(i => `<img src="${faceArt(i)}" onerror="this.src='${cardArt(i)}'" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid ${CHM[i].col}">`).join('')}</div>
    <p class="sub">행동력 ⚡${cost} (보유 ${M.stam}) · 최초 클리어 💎${s.boss ? 150 : 60}</p>`, [['출격', () => { if (M.stam < cost){ stamBuy(); return; } M.stam -= cost; save(); runDialog(M.clear[s.id] ? null : s.pre, () => go(cost)); }], ['편성', () => { renderAgents(); showScreen('pgAgents'); }, 'gray'], ['닫기', null, 'gray']]);
  function go(paid){ startBattle({ mode:'story', st:s, segs:s.segs, pow:s.pow, boss:s.boss, ids:s.trial || M.party.filter(owned), trial:!!s.trial, tut:s.tut && !M.prologue, title:`${s.id} ${s.name}`, bg:ch.bg, stamPaid:paid, par:s.boss ? 160 : 120 }); }
}
function stamBuy(){ modal(`<h3>행동력 부족</h3><p>💎50으로 행동력 ⚡60을 충전할까요?</p>`, [['충전 💎50', () => { if (M.cry < 50) return toast('💎이 부족해요'); M.cry -= 50; M.stam += 60; save(); renderLobby(); toast('행동력 +60'); }], ['닫기', null, 'gray']]); }
// ---------- daily ----------
function renderDaily(){ let h = '<p class="sub" style="margin:0 0 6px">매일 각 던전 3회 입장 · 행동력 소모 없음 · 주말(금 18시~일)에는 보상 2배!</p>';
  const wk = weekend();
  DAILY.forEach(d => { h += `<div class="row" style="flex-wrap:wrap"><div style="font-size:28px">${d.e}</div><div class="t">${d.name}<small>${d.d} · 남은 입장 ${M.daily.dun[d.id]}/3${wk ? ' · <b style="color:#ffd447">주말 2배</b>' : ''}</small></div>`;
    for (let lv = 1; lv <= 5; lv++){ const lk = cmdLv() < (lv - 1) * 6; h += `<button class="cta ${lk ? 'gray' : ''}" style="padding:6px 8px;font-size:11px" data-d="${d.id}" data-l="${lv}" ${lk ? 'disabled' : ''}>Lv.${lv}${lk ? `<br><small>지휘관 ${(lv - 1) * 6}</small>` : ''}</button>`; }
    h += '</div>'; });
  $('dailyBody').innerHTML = h; $('dailyBody').querySelectorAll('[data-d]').forEach(b => b.onclick = () => { if (M.daily.dun[b.dataset.d] <= 0) return toast('오늘 입장 횟수를 모두 썼어요'); startDaily(b.dataset.d, +b.dataset.l); });
}
const weekend = () => { const d = new Date(nowT() + 9 * 3600000), wd = d.getUTCDay(), h = d.getUTCHours(); return (wd === 5 && h >= 18) || wd === 6 || wd === 0; };
function startDaily(id, lv){ if (M.daily.dun[id] <= 0) { goLobby(); return toast('오늘 입장 횟수를 모두 썼어요'); } const d = DAILY.find(x => x.id === id); startBattle({ mode:'daily', dun:id, lvl:lv, segs:d.segs, pow:.8 + lv * .75, ids:M.party.filter(owned), title:`${d.name} Lv.${lv}`, bg:'vault', par:100 }); }
function startAbyss(f){ const segs = [[['shade', 3 + (f % 3)], ['gunner', 1 + (f % 2)]], [['drone', 2 + (f % 3)], ['brute', f >= 6 ? 1 : 0]], [f % 5 === 0 ? ['boss', 1] : ['brute', 1 + Math.floor(f / 8)], ['shade', 2]]].map(s => s.filter(x => x[1] > 0));
  startBattle({ mode:'abyss', floor:f, segs, pow:1 + f * .24, boss:f % 5 === 0 ? pick(['b1', 'b2', 'b3']) : null, ids:M.party.filter(owned), title:`균열의 심연 ${f}층`, bg:'abyss', par:90 }); M.stats.abyssMax = Math.max(M.stats.abyssMax || 0, f - 1); }

// ---------- agents ----------
let selSlot = -1;
function canLv(id){ const o = M.own[id]; if (!o || o.lv >= LV_CAP()) return false; const c = lvCost(o.lv); return M.cred >= c.cred && M.chip >= c.chip && M.party.includes(id); }
function renderAgents(){ const own = CH.filter(c => owned(c.id)).length; $('ownCnt').textContent = `보유 ${own}/${CH.length}`;
  let h = '<div class="pslots">'; M.party.forEach((id, i) => { const c = CHM[id]; h += `<div class="pslot ${selSlot === i ? 'sel' : ''}" data-p="${i}">${owned(id) ? `<img src="${faceArt(id)}" onerror="this.src='${cardArt(id)}'"><div>${c.name}<div class="sub">Lv.${M.own[id].lv} · 전투력 ${power(id)}</div></div>` : '<div class="sub" style="width:100%;text-align:center">+ 비어 있음</div>'}</div>`; });
  h += `</div><div class="sub" style="margin-bottom:6px">${selSlot >= 0 ? '<b style="color:#ffd447">교체할 요원을 선택하세요</b>' : '슬롯을 누르면 교체 · 요원을 누르면 상세 정보'} · 파티 전투력 <b style="color:#7fe7ff">${partyPow()}</b>${synText()}</div><div class="agrid">`;
  const order = { SSR:0, SR:1, R:2, N:3 };
  CH.slice().sort((a, b) => (owned(b.id) - owned(a.id)) || order[a.r] - order[b.r]).forEach(c => { const o = M.own[c.id];
    h += `<div class="acard r-${c.r} ${o ? '' : 'lock'} ${M.party.includes(c.id) ? 'inp' : ''}" data-a="${c.id}"><img src="${cardArt(c.id)}" onerror="this.style.display='none';this.parentNode.style.background='linear-gradient(160deg,${c.col}55,#0b1222)'"><span class="rr c-${c.r}">${c.r}</span>${o ? `<span class="lv">Lv.${o.lv}${o.aw ? ' ✦' + o.aw : ''}</span>` : ''}<div class="nm">${c.name}</div></div>`; });
  h += '</div>'; $('agentsBody').innerHTML = h;
  $('agentsBody').querySelectorAll('[data-p]').forEach(el => el.onclick = () => { selSlot = selSlot === +el.dataset.p ? -1 : +el.dataset.p; renderAgents(); });
  $('agentsBody').querySelectorAll('[data-a]').forEach(el => el.onclick = () => { const id = el.dataset.a;
    if (selSlot >= 0){ if (!owned(id)) return toast('미보유 요원이에요'); const j = M.party.indexOf(id); if (j >= 0) M.party[j] = M.party[selSlot]; M.party[selSlot] = id; selSlot = -1; save(); renderAgents(); return; }
    openDetail(id); });
}
function openDetail(id){ const c = CHM[id], o = M.own[id], s = stats(id); $('dArt').src = cardArt(id); $('dArt').onerror = () => { $('dArt').src = sprArt(id); };
  const cost = o ? lvCost(o.lv) : null;
  $('dInfo').innerHTML = `<div style="font-size:11px" class="c-${c.r}">${c.r}${c.lim ? ' · 한정' : ''} · ${c.role}</div><div style="font-size:22px;font-weight:900">${c.name} <span style="font-size:12px;color:#8fb6d8">${c.en}</span></div><div class="sub">${c.job} · ${c.wpn} · <b style="color:${ELEM[c.el].c}">${ELEM[c.el].e} ${ELEM[c.el].n}</b> · ${c.agency ? '템퍼럴 에이전시' : '외부 협력자'} · ${{ tank:'탱커', dps:'딜러', sup:'서포터' }[c.cls]}</div>
    <div class="awk">${[1, 2, 3, 4, 5, 6].map(i => `<span class="${o && o.aw >= i ? 'on' : ''}"></span>`).join('')}<small class="sub" style="margin-left:4px">각성 ${o ? o.aw : 0}/6</small></div>
    <div>${o ? `<span class="stat">Lv.${o.lv}/${LV_CAP()}</span>` : ''}<span class="stat">❤ ${s.hp}</span><span class="stat">⚔ ${s.atk}</span><span class="stat">🛡 ${s.def}</span><span class="stat">전투력 ${power(id)}</span></div>
    <div class="skillbox"><b>[공격] ${c.wpn}</b></div>
    <div class="skillbox"><b>[스킬] ${c.sk.n}</b> ${o && o.aw >= 1 ? '<span class="c-SSR">✦강화</span>' : ''}<br>${c.sk.d}</div>
    <div class="skillbox"><b>[궁극기] ${c.ult.n}</b> ${o && o.aw >= 3 ? '<span class="c-SSR">✦강화</span>' : ''}<br>${c.ult.d}</div>
    <div class="sub" style="margin:4px 0">각성 1: 스킬 피해 +30% · 각성 3: 궁극기 +40% · 각성마다 능력치 +8% (중복 획득 시 각성)</div>
    <p style="font-size:11px;line-height:1.5;color:#bcd">${c.desc}</p>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${o ? `<button class="cta" id="dLv" ${o.lv >= LV_CAP() ? 'disabled' : ''}>레벨업 🪙${fmt(cost.cred)} 💠${cost.chip}</button><button class="cta gray" id="dLv5">×5</button><button class="cta gold" id="dLob">로비 대표</button>` : '<span class="sub">소환으로 획득할 수 있어요</span>'}</div>
    ${o && o.lv >= LV_CAP() ? `<p class="sub">레벨 상한 ${LV_CAP()} — 지휘관 레벨을 올리면 상한이 늘어나요</p>` : ''}`;
  $('detail').classList.add('on');
  if (o){ const lvUp = n => { let k = 0; for (let i = 0; i < n; i++){ const cc = lvCost(o.lv); if (o.lv >= LV_CAP() || M.cred < cc.cred || M.chip < cc.chip) break; M.cred -= cc.cred; M.chip -= cc.chip; o.lv++; k++; } if (!k) return toast(o.lv >= LV_CAP() ? '레벨 상한이에요' : '재화가 부족해요'); M.stats.lvup += k; misAdd('lvup', k); save(); SFX.heal(); openDetail(id); toast(`Lv.${o.lv} 달성!`); };
    $('dLv').onclick = () => lvUp(1); $('dLv5').onclick = () => lvUp(5); $('dLob').onclick = () => { M.lobby = id; save(); toast('로비 대표 요원으로 설정했어요'); }; }
}
$('dBack').onclick = () => { $('detail').classList.remove('on'); renderAgents(); };

// ---------- gacha ----------
let gTab = 'pick';
const PICKUP = () => LIM_SSR[Math.floor(dayIdx(nowT()) / 14) % LIM_SSR.length];
const RATES = { SSR:.015, SR:.12, R:.385, N:.48 };
function rollRar(){ const r = R(); if (r < RATES.SSR) return 'SSR'; if (r < RATES.SSR + RATES.SR) return 'SR'; if (r < RATES.SSR + RATES.SR + RATES.R) return 'R'; return 'N'; }
function pullOne(tab){ const P = M.pity; let rar = rollRar();
  const key = tab === 'pick' ? 'pick' : 'std'; P[key]++;
  if (P[key] >= 80) rar = 'SSR';
  let id;
  if (rar === 'SSR'){ P[key] = 0;
    if (tab === 'pick'){ const pk = PICKUP(); if (P.guar || R() < .5){ id = pk; P.guar = 0; } else { id = pick(STD_SSR); P.guar = 1; } }
    else id = pick(STD_SSR); }
  else id = pick(CH.filter(c => c.r === rar).map(c => c.id));
  M.stats.pulls++; misAdd('pull'); return id;
}
function renderGacha(){ const pk = CHM[PICKUP()], P = M.pity, d = dayIdx(nowT()); const left = 14 - d % 14;
  $('vTk').textContent = M.tk + (M.ptk ? ` · 픽업 ${M.ptk}` : '');
  let h = `<div class="tabs"><button class="tab ${gTab === 'pick' ? 'on' : ''}" data-t="pick">한정 픽업</button><button class="tab ${gTab === 'std' ? 'on' : ''}" data-t="std">상시 소환</button></div>`;
  if (gTab === 'pick') h += `<div class="banner"><img src="${cardArt(pk.id)}"><div class="bt"><div class="sub" style="color:#ffd44a">한정 픽업 · ${left}일 남음</div><h3>${pk.name} — ${pk.ult.n}</h3><p>${pk.role} · ${pk.desc.slice(0, 46)}…</p><p>SSR 1.5% · 픽업 점유 50% · <b>80회 천장</b> (50%) / <b>160회 확정</b> · 천장 다음 픽업 이월</p><p style="color:#7fe7ff">천장까지 ${80 - P.pick}회 ${P.guar ? '· <b style="color:#ffd447">다음 SSR 픽업 확정!</b>' : ''}</p></div></div>`;
  else h += `<div class="banner"><img src="${cardArt('layton')}" style="right:120px;opacity:.6"><img src="${cardArt('jin')}"><div class="bt"><div class="sub" style="color:#7fe7ff">상시 소환</div><h3>상시 요원 모집</h3><p>SSR: 레이튼 · 진 · 레온 · 셀레나 · 세라</p><p>SSR 1.5% · 80회 천장 확정</p><p style="color:#7fe7ff">천장까지 ${80 - P.std}회</p></div></div>`;
  const tkN = gTab === 'pick' ? M.ptk : M.tk;
  h += `<div style="display:flex;gap:8px;justify-content:center;margin-top:8px;flex-wrap:wrap">
    ${M.daily.free < 1 ? `<button class="cta gold" id="gFree">오늘의 무료 1회</button>` : ''}
    <button class="cta" id="g1">1회 ${tkN > 0 ? `🎫1` : '💎160'}</button><button class="cta pink" id="g10">10회 ${tkN >= 10 ? `🎫10` : '💎1600'}</button>
    ${(M.ssrTk || 0) > 0 ? `<button class="cta gold" id="gSSR">SSR 확정 소환 (${M.ssrTk})</button>` : ''}${M.ssrSel > 0 ? `<button class="cta gold" id="gSel">SSR 선택권 (${M.ssrSel})</button>` : ''}</div>
    <p class="sub" style="text-align:center">SSR 1.5% · SR 12% · R 38.5% · N 48% · 중복 획득 시 각성 · <a href="prob.html" target="_blank" style="color:#8fb6d8">확률 상세</a></p>`;
  $('gachaBody').innerHTML = h;
  $('gachaBody').querySelectorAll('[data-t]').forEach(b => b.onclick = () => { gTab = b.dataset.t; renderGacha(); });
  $('g1').onclick = () => doPull(1); $('g10').onclick = () => doPull(10);
  if ($('gFree')) $('gFree').onclick = () => { M.daily.free = 1; save(); showPull([pullOne(gTab)]); };
  if ($('gSSR')) $('gSSR').onclick = () => { M.ssrTk--; const id = pick(STD_SSR.concat([PICKUP()])); M.stats.pulls++; save(); showPull([id]); };
  if ($('gSel')) $('gSel').onclick = () => selectSSR();
}
function doPull(n){ const key = gTab === 'pick' ? 'ptk' : 'tk'; if (M[key] >= n){ M[key] -= n; } else { const c = 160 * n; if (M.cry < c){ modal(`<h3>💎이 부족해요</h3><p>필요 💎${c} · 보유 💎${M.cry}</p>`, [['상점으로', () => { renderShop(); showScreen('pgShop'); }], ['닫기', null, 'gray']]); return; } M.cry -= c; }
  const res = []; for (let i = 0; i < n; i++) res.push(pullOne(gTab)); if (n === 10 && !res.some(id => ['SSR', 'SR'].includes(CHM[id].r))){ res[9] = pick(CH.filter(c => c.r === 'SR').map(c => c.id)); }
  save(); showPull(res); }
function selectSSR(){ modal(`<h3>상시 SSR 선택</h3><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px">${STD_SSR.map(id => `<div class="acard r-SSR" data-sel="${id}" style="cursor:pointer"><img src="${cardArt(id)}" onerror="this.style.display='none'"><div class="nm">${CHM[id].name}</div></div>`).join('')}</div>`, [['닫기', null, 'gray']]);
  $('mbox').querySelectorAll('[data-sel]').forEach(el => el.onclick = () => { $('modal').classList.remove('on'); M.ssrSel--; save(); showPull([el.dataset.sel]); }); }
function showPull(ids){ const box = $('gcards'); box.innerHTML = ''; $('gres').classList.add('on'); const best = ids.some(id => CHM[id].r === 'SSR') ? 'SSR' : ids.some(id => CHM[id].r === 'SR') ? 'SR' : 'R';
  const fl = $('gflash'); fl.style.transition = 'none'; fl.style.background = best === 'SSR' ? 'radial-gradient(#fff,#ffcf4a)' : best === 'SR' ? 'radial-gradient(#fff,#c07cff)' : 'radial-gradient(#fff,#4ab8ff)'; fl.style.opacity = 1; setTimeout(() => { fl.style.transition = 'opacity .7s'; fl.style.opacity = 0; }, 60);
  box.style.gridTemplateColumns = ids.length === 1 ? '140px' : 'repeat(5,92px)'; box.style.justifyContent = 'center';
  ids.forEach((id, i) => { const c = CHM[id], res = grantAgent(id); const d = document.createElement('div'); d.className = `gcard r-${c.r} ${c.r === 'SSR' ? 'ssr' : ''}`;
    d.innerHTML = `<img src="${cardArt(id)}" onerror="this.style.display='none';this.parentNode.style.background='linear-gradient(160deg,${c.col}88,#0b1222)'"><span class="rr c-${c.r}" style="position:absolute;left:4px;top:3px;font-size:11px;font-weight:900;text-shadow:0 1px 2px #000">${c.r}</span>${res === 'new' ? '<span class="new">NEW</span>' : res === 'aw' ? '<span class="new" style="background:#ffb422">각성+1</span>' : '<span class="new" style="background:#666">전환</span>'}<div class="nm c-${c.r}">${c.name}</div>`;
    box.appendChild(d); setTimeout(() => { d.classList.add('flip'); SFX.pull(c.r); }, 250 + i * 150); });
  save();
}
$('gOk').onclick = () => { $('gres').classList.remove('on'); renderGacha(); };

// ---------- shop / IAP ----------
const IAPX = [
  { id:'cl_starter', e:'🎁', name:'특무대 입단 보급품', price:'1,500원', once:1, desc:'상시 SSR 선택권 1 + 💎300 + 크레딧 3만 + 칩 100', give(){ M.ssrSel++; M.cry += 300; M.cred += 30000; M.chip += 100; } },
  { id:'cl_pass30', e:'🌀', name:'시공간 동기화 패스 (30일)', price:'5,900원', desc:'즉시 💎300 + 30일간 매일 💎100 (총 💎3,300 · 5.5배) · 행동력 최대치 +60', give(){ M.cry += 300; const base = Math.max(M.passUntil, nowT()); M.passUntil = base + 30 * DAY; } },
  { id:'cl_bp', e:'📘', name:'템퍼럴 크로니클 (시즌 패스)', price:'14,900원', once:1, desc:'소환권 20장 + 크레딧 15만 + 칩 400', give(){ M.tk += 20; M.cred += 150000; M.chip += 400; } },
  { id:'cl_pick1', e:'🎟️', name:'시간의 문 특선 보급', price:'12,000원', desc:'픽업 소환권 10장 + 💎100', give(){ M.ptk += 10; M.cry += 100; } },
  { id:'cl_fund', e:'📈', name:'계급 승진 마일스톤', price:'25,000원', once:1, desc:'지휘관 Lv.10~60 달성마다 💎 페이백 (총 💎16,000 · 8배)', give(){ M.fundOn = 1; } },
  { id:'cl_weekend', e:'🔥', name:'타임어택 버닝 찬스', price:'4,900원', desc:'주말 한정! 행동력 ⚡240 + 소환권 3장 (250% 효율)', weekend:1, give(){ M.stam += 240; M.tk += 3; } },
  { id:'cl_cry_s', e:'💎', name:'크리스탈 60', price:'1,100원', desc:'💎60', give(){ M.cry += 60; } },
  { id:'cl_cry_m', e:'💎', name:'크리스탈 330', price:'5,500원', desc:'💎330 (+10%)', give(){ M.cry += 330; } },
  { id:'cl_cry_l', e:'💎', name:'크리스탈 2,180', price:'33,000원', desc:'💎2,180 (+21%)', give(){ M.cry += 2180; } },
  { id:'cl_cry_xl', e:'💎', name:'크리스탈 6,800', price:'99,000원', desc:'💎6,800 (+26%)', give(){ M.cry += 6800; } },
];
const FUND = [[10, 1000], [20, 2000], [30, 2500], [40, 3000], [50, 3500], [60, 4000]];
(async () => { const sdk = await window.__osdk; if (!sdk || !sdk.iap) return; try { const list = await sdk.iap.getProductDetailsAsync(IAPX.map(q => q.id)); (list || []).forEach(d => { const q = IAPX.find(x => x.id === d.productId); if (q && d.price) q.price = d.price; }); } catch(e){} })();
async function buy(q){ const sdk = window.__osdkSdk; if (!sdk || !sdk.iap){ toast('결제는 원스토어 앱에서만 할 수 있어요'); return; }
  if (q.id === 'cl_pass30') await syncTime();
  try { const r = await sdk.iap.purchase({ productId:q.id, productName:q.name }); grantX(q, false, r); }
  catch(e){ const why = String((e && (e.code || e.reason || e.message)) || e); if (why.includes('already_owned') && q.once){ grantX(q, true); return; } if (why.includes('cancel')) return; toast('결제가 완료되지 않았어요'); } }
function grantX(q, restored){ if (q.once && M.iap[q.id] && !restored) return; if (!(restored && M.iap[q.id])) q.give(); M.iap[q.id] = true; save(); SFX.win(); toast(restored ? '복원 완료!' : q.name + ' 구매 완료!'); renderShop(); renderLobby(); }
async function restore(){ const sdk = window.__osdkSdk; if (!sdk || !sdk.iap){ toast('원스토어 앱에서만 복원할 수 있어요'); return; } await syncTime(); const pn = window.PNS ? await PNS.check() : 0;
  try { const fn = sdk.iap.getPurchasesAsync || sdk.iap.getPurchases; if (!fn){ toast((pn > 0 ? '미지급 결제 ' + pn + '건을 지급했어요' : pn < 0 ? '결제 서버에 연결하지 못했어요. 잠시 후 다시 해주세요' : '지급되지 않은 결제가 없어요')); return; } const list = await fn.call(sdk.iap) || []; let n = 0;
    list.forEach(it => { const q = IAPX.find(x => x.id === it.productId); if (!q) return; if (q.once && !M.iap[q.id]){ q.give(); M.iap[q.id] = true; n++; } if (q.id === 'cl_pass30'){ const t = Number(it.purchaseTime || it.purchaseTimeMillis || 0); if (t && t + 30 * DAY > M.passUntil){ M.passUntil = t + 30 * DAY; n++; } } });
    save(); toast(n ? '구매 내역을 복원했어요' : (pn > 0 ? '미지급 결제 ' + pn + '건을 지급했어요' : pn < 0 ? '결제 서버에 연결하지 못했어요. 잠시 후 다시 해주세요' : '지급되지 않은 결제가 없어요')); } catch(e){ toast('복원하지 못했어요'); } }
window.__pnsGrant = id => { const q = IAPX.find(x => x.id === id); if (!q) return false; grantX(q, false); return true; };
function renderShop(){ if (!(window.__pnsT > Date.now() - 20000)){ window.__pnsT = Date.now(); window.PNS && PNS.check(); } const wk = weekend(); let h = '<div style="font-size:12px;font-weight:900;color:#9fe8ff;margin-bottom:6px">추천 보급</div>';
  IAPX.filter(q => !q.id.startsWith('cl_cry')).forEach(q => { if (q.weekend && !wk) return; const own = q.once && M.iap[q.id];
    h += `<div class="row"><div style="font-size:26px">${q.e}</div><div class="t">${q.name}${q.weekend ? ' <span style="color:#ff6a4a">주말 한정</span>' : ''}<small>${q.desc}${q.id === 'cl_pass30' && passOn() ? ` · <b style="color:#7dff9a">이용 중 ${Math.ceil((M.passUntil - nowT()) / DAY)}일</b>` : ''}</small></div><button class="cta ${own ? 'gray' : q.id === 'cl_starter' ? 'gold' : ''}" data-b="${q.id}" ${own ? 'disabled' : ''}>${own ? '구매 완료' : q.price}</button></div>`; });
  if (M.fundOn){ h += '<div class="row" style="flex-wrap:wrap"><div class="t">계급 승진 마일스톤<small>지휘관 Lv.' + cmdLv() + '</small></div>' + FUND.map(([lv, c]) => `<button class="cta ${M.fund[lv] ? 'gray' : cmdLv() >= lv ? 'gold' : 'gray'}" data-f="${lv}" style="padding:5px 7px;font-size:10px">Lv${lv}<br>💎${c}</button>`).join('') + '</div>'; }
  h += '<div style="font-size:12px;font-weight:900;color:#9fe8ff;margin:10px 0 6px">크리스탈</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">';
  IAPX.filter(q => q.id.startsWith('cl_cry')).forEach(q => { h += `<div class="row" style="flex-direction:column;margin:0;text-align:center"><div style="font-size:24px">💎</div><div class="t" style="font-size:13px">${q.desc}</div><button class="cta" data-b="${q.id}" style="width:100%">${q.price}</button></div>`; });
  h += `</div><div style="font-size:12px;font-weight:900;color:#9fe8ff;margin:10px 0 6px">크리스탈 교환</div>
   <div class="row"><div style="font-size:24px">🎫</div><div class="t">소환권 1장<small>상시 소환에 사용</small></div><button class="cta" data-x="tk">💎150</button></div>
   <div class="row"><div style="font-size:24px">⚡</div><div class="t">행동력 60</div><button class="cta" data-x="stam">💎50</button></div>
   <div class="row"><div style="font-size:24px">💠</div><div class="t">데이터칩 50</div><button class="cta" data-x="chip">💎80</button></div>
   <p class="sub">결제는 원스토어를 통해 진행됩니다 · 유료 상품은 구매 후 7일 이내 미사용 시 청약철회 가능 · <a href="prob.html" target="_blank" style="color:#8fb6d8">확률 정보</a> · <span id="shRes" style="color:#8fb6d8;text-decoration:underline">구매 복원</span></p>`;
  $('shopBody').innerHTML = h; document.querySelectorAll('.vCry').forEach(e => e.textContent = fmt(M.cry));
  $('shopBody').querySelectorAll('[data-b]').forEach(b => b.onclick = () => buy(IAPX.find(q => q.id === b.dataset.b)));
  $('shopBody').querySelectorAll('[data-f]').forEach(b => b.onclick = () => { const lv = +b.dataset.f, c = FUND.find(f => f[0] === lv)[1]; if (M.fund[lv] || cmdLv() < lv) return; M.fund[lv] = 1; M.cry += c; save(); toast('💎' + c + ' 수령!'); renderShop(); });
  $('shopBody').querySelectorAll('[data-x]').forEach(b => b.onclick = () => { const x = b.dataset.x, cost = { tk:150, stam:50, chip:80 }[x]; if (M.cry < cost) return toast('💎이 부족해요'); M.cry -= cost; if (x === 'tk') M.tk++; if (x === 'stam') M.stam += 60; if (x === 'chip') M.chip += 50; save(); SFX.ui(); toast('교환 완료'); renderShop(); });
  $('shRes').onclick = restore;
}
// ---------- lists: missions / boot / attendance / pass ----------
function openList(title, html, bind){ $('listTitle').textContent = title; $('listBody').innerHTML = html; showScreen('pgList'); bind && bind(); }
function renderMis(){ dailyReset(); const h = DMIS.map(([k, t, n, rw]) => { const v = Math.min(n, M.daily.mis[k] || 0), got = M.daily.got[k]; return `<div class="row"><div class="t">${t}<small>${v}/${n} · 보상 ${rwText(rw)}</small></div><button class="cta ${got ? 'gray' : v >= n ? 'gold' : 'gray'}" data-m="${k}" ${got || v < n ? 'disabled' : ''}>${got ? '완료' : '받기'}</button></div>`; }).join('');
  openList('일일 미션', '<p class="sub" style="margin:0 0 6px">매일 오전 0시(한국 시간) 초기화</p>' + h, () => $('listBody').querySelectorAll('[data-m]').forEach(b => b.onclick = () => { const m = DMIS.find(x => x[0] === b.dataset.m); M.daily.got[m[0]] = 1; toast(giveRw(m[3])); renderMis(); })); }
function bootVal(k){ const s = M.stats; return { prologue:M.prologue ? 1 : 0, pulls:s.pulls, clear11:M.clear['1-1'] ? 1 : 0, lvup:s.lvup, dun:s.dun, bt:s.bt, chain:s.chain, clear15:M.clear['1-5'] ? 1 : 0, abyss:M.abyss || 0, clear25:M.clear['2-5'] ? 1 : 0, ult:s.ult, kills:s.kills }[k] || 0; }
const bootDay = () => dayIdx(nowT()) - dayIdx(M.boot.start) + 1;
const bootReady = () => BOOT.some((b, i) => bootDay() >= b.day && !M.boot.got[i] && b.q.every(q => bootVal(q[0]) >= q[2]));
function renderBoot(){ const d = bootDay(); const h = BOOT.map((b, i) => { const open = d >= b.day, done = b.q.every(q => bootVal(q[0]) >= q[2]), got = M.boot.got[i];
    return `<div class="row" style="flex-direction:column;align-items:stretch;opacity:${open ? 1 : .45}"><div style="display:flex;align-items:center;gap:8px"><div class="t">${b.t}<small>보상: ${b.rt}</small></div><button class="cta ${got ? 'gray' : done && open ? 'gold' : 'gray'}" data-b="${i}" ${got || !done || !open ? 'disabled' : ''}>${got ? '완료' : !open ? `${b.day}일차` : '받기'}</button></div>
      ${b.q.map(q => { const v = Math.min(q[2], bootVal(q[0])); return `<div class="sub" style="margin-top:3px">${v >= q[2] ? '✅' : '⬜'} ${q[1]} (${v}/${q[2]})</div>`; }).join('')}</div>`; }).join('');
  openList('신입 지휘관 부트캠프', `<p class="sub" style="margin:0 0 6px">7일 집중 가이드 · 현재 ${d}일차</p>` + h, () => $('listBody').querySelectorAll('[data-b]').forEach(b => b.onclick = () => { const i = +b.dataset.b; M.boot.got[i] = 1; toast(giveRw(BOOT[i].rw)); renderBoot(); })); }
function renderAttend(){ const can = M.att.last !== today(); const n = M.att.n % 7;
  const h = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">' + ATT.map((rw, i) => `<div class="row" style="flex-direction:column;margin:0;padding:8px 2px;text-align:center;${i < n || (i === n && !can) ? 'opacity:.4' : ''}${i === n && can ? ';border-color:#ffd447' : ''}"><div style="font-size:11px;font-weight:900">${i + 1}일</div><div style="font-size:12px;font-weight:800;margin-top:4px">${rwText(rw)}</div>${i < n || (i === n && !can && M.att.n) ? '<div style="color:#7dff9a;font-size:16px">✓</div>' : ''}</div>`).join('') + '</div>';
  openList('출석 체크', h + `<div style="text-align:center;margin-top:10px"><button class="cta gold" id="attGo" ${can ? '' : 'disabled'}>${can ? '출석하기' : '오늘 출석 완료'}</button></div>`, () => { $('attGo').onclick = () => { if (M.att.last === today()) return; const rw = ATT[M.att.n % 7]; M.att.n++; M.att.last = today(); toast(giveRw(rw)); renderAttend(); }; }); }
function renderPass(){ const on = passOn(); openList('시공간 동기화 패스', `<div class="row"><div style="font-size:30px">🌀</div><div class="t">시공간 동기화 패스 (30일)<small>즉시 💎300 + 매일 💎100 · 행동력 최대치 +60 · 총 💎3,300 (5.5배 효율)</small></div>${on ? `<button class="cta ${M.passGot === today() ? 'gray' : 'gold'}" id="pGet" ${M.passGot === today() ? 'disabled' : ''}>${M.passGot === today() ? '오늘 수령함' : '💎100 받기'}</button>` : `<button class="cta" id="pBuy">${IAPX[1].price}</button>`}</div>
  ${on ? `<p class="sub">남은 기간 ${Math.ceil((M.passUntil - nowT()) / DAY)}일</p>` : rolled ? '<p class="sub" style="color:#ff8a8a">기기 시간이 이상해요 · 인터넷 연결 후 다시 확인돼요</p>' : ''}`, () => { if ($('pGet')) $('pGet').onclick = () => { if (!passOn() || M.passGot === today()) return; M.passGot = today(); M.cry += 100; save(); toast('💎100 수령!'); renderPass(); }; if ($('pBuy')) $('pBuy').onclick = () => buy(IAPX[1]); }); }

// ---------- dialog ----------
let dlgQ = null, dlgCb = null, dlgI = 0, dlgTyping = 0, dlgFull = '';
function runDialog(lines, cb){ if (!lines || !lines.length){ cb && cb(); return; } dlgQ = lines; dlgCb = cb; dlgI = 0; $('dlg').classList.add('on'); BGM.mode = 'lobby'; dlgShow(); }
function dlgShow(){ const [who, txt] = dlgQ[dlgI]; const im = $('dlgImg');
  if (who === 'sys' || who === 'cmd'){ im.style.opacity = 0; $('dlgWho').textContent = who === 'cmd' ? '지휘관' : ''; }
  else { const c = CHM[who]; im.style.opacity = 1; im.src = cardArt(who); im.onerror = () => { im.style.opacity = 0; }; im.style.left = dlgI % 2 ? 'auto' : '20px'; im.style.right = dlgI % 2 ? '20px' : 'auto'; $('dlgWho').textContent = c.name; $('dlgWho').style.color = c.col; }
  dlgFull = txt; let i = 0; clearInterval(dlgTyping); $('dlgTxt').textContent = ''; $('dlgTxt').style.fontStyle = who === 'sys' ? 'italic' : 'normal';
  dlgTyping = setInterval(() => { i += 2; $('dlgTxt').textContent = dlgFull.slice(0, i); if (i >= dlgFull.length) clearInterval(dlgTyping); }, 22); }
$('dlg').onclick = e => { if (e.target.id === 'dlgSkip') return; if ($('dlgTxt').textContent.length < dlgFull.length){ clearInterval(dlgTyping); $('dlgTxt').textContent = dlgFull; return; } dlgI++; if (dlgI >= dlgQ.length) dlgEnd(); else dlgShow(); };
$('dlgSkip').onclick = e => { e.stopPropagation(); dlgEnd(); };
function dlgEnd(){ clearInterval(dlgTyping); $('dlg').classList.remove('on'); const cb = dlgCb; dlgCb = null; cb && cb(); }

// ---------- boot ----------
const PRE = ['art/bg_lobby.webp', 'art/key.webp', ...CH.slice(0, 8).map(c => cardArt(c.id)), ...CH.map(c => faceArt(c.id))];
(function preload(){ let n = 0; const tot = PRE.length; const done = () => { n++; $('loadBar').style.width = (n / tot * 100) + '%'; if (n >= tot) ready(); };
  PRE.forEach(s => { const i = img(s); if (i.complete) done(); else { i.addEventListener('load', done); i.addEventListener('error', done); } });
  setTimeout(() => { if (n < tot) { n = tot; ready(); } }, 6000);
  let rd = false; function ready(){ if (rd) return; rd = true; $('loadT').textContent = '준비 완료'; $('tapStart').style.display = 'block';
    $('loading').onclick = () => { audio(); setVol(); $('loading').style.display = 'none'; if (!M.prologue){ openStage('P-1'); } else { goLobby(); } }; }
})();
window.__B = () => B; window.__M = () => M;
window.__T = { startBattle, openStage, tagTo, perfectDodge, useUlt, useSkill, dodge, damage, endBattle, pullOne, doPull, grantAgent };

function synText(){ const cs = M.party.filter(owned).map(i => CHM[i]); const a = cs.length === 3 && cs.every(c => c.agency), r = ['tank', 'dps', 'sup'].every(k => cs.some(c => c.cls === k));
  return `<br>시너지: <b style="color:${a ? '#9dff9a' : '#556'}">에이전시 3인(불릿 타임 +1초)</b> · <b style="color:${r ? '#9dff9a' : '#556'}">탱커+딜러+서포터(연계기 쿨 -15%)</b> · 상성: ⏳시간 > 🌌공간 > 🔮차원 > ⚖️질서 > 🌀혼돈 > ⏳시간 (+30%)`; }
