'use strict';
// ====================================================================
//  요원 숙소 — 호감도 · 선물 · 파견 (Addendum Part 3)
// ====================================================================
const GIFTS = {
  gear:{ n:'고급 기계 부품', e:'⚙️', cred:4000 },
  book:{ n:'성스러운 필사본', e:'📜', cred:4000 },
  tea:{ n:'고급 홍차 세트', e:'🫖', cred:4000 },
  drink:{ n:'에너지 드링크', e:'🥤', cred:1500 },
};
// 선호 선물 (기획서: 카린=기계 부품, 셀레나=필사본)
const LIKE = { karin:'gear', layton:'gear', brock:'gear', thomas:'gear', nick:'gear', zero:'gear', marco:'gear',
  selena:'book', luna:'book', eve:'book', sophia:'book', clerk:'book', iris:'book',
  aria:'tea', noah:'tea', leon:'tea', jin:'tea', hannah:'tea', vendor:'tea',
  sera:'drink', kai:'drink', rin:'drink', raven:'drink', chloe:'drink', dante:'drink', miya:'drink', courier:'drink', parttimer:'drink', janitor:'drink', guard:'drink', citizenA:'drink', citizenB:'drink' };
const AFF_NEED = lv => 60 + lv * 40;
function affOf(id){ M.aff = M.aff || {}; return M.aff[id] || (M.aff[id] = { lv:1, xp:0, seen:{} }); }
M.gifts = M.gifts || { gear:0, book:0, tea:0, drink:3 };
M.disp = M.disp || [null, null, null];

// 호감도 Lv.10: 능력치 +5% · Lv.5 이상 +2%
const _statsBase = stats;
stats = function(id){ const s = _statsBase(id), a = M.aff && M.aff[id]; if (!a || a.lv < 5) return s; const k = a.lv >= 10 ? 1.05 : 1.02; return { hp:Math.round(s.hp * k), atk:Math.round(s.atk * k), def:Math.round(s.def * k), crit:s.crit }; };

function giveGift(id, g){ if ((M.gifts[g] || 0) <= 0) return toast('선물이 없어요 — 숙소 상점에서 구매'); const a = affOf(id); if (a.lv >= 10) return toast('호감도 최대예요');
  M.gifts[g]--; const liked = LIKE[id] === g; const xp = g === 'drink' ? (liked ? 30 : 12) : (liked ? 60 : 20); a.xp += xp; let up = 0;
  while (a.lv < 10 && a.xp >= AFF_NEED(a.lv)){ a.xp -= AFF_NEED(a.lv); a.lv++; up = 1; }
  if (a.lv >= 10) a.xp = 0; save(); SFX.heal();
  const c = CHM[id]; toast(`${c.name} 호감도 +${xp}${liked ? ' (최애 선물!)' : ''}${up ? ` · Lv.${a.lv} 달성!` : ''}`);
  if (up && (a.lv === 5 || a.lv === 10) && !a.seen[a.lv]){ a.seen[a.lv] = 1; save(); setTimeout(() => modal(`<h3>${c.name} 호감도 Lv.${a.lv}</h3><p>${a.lv === 5 ? '전용 메모리얼 로비 · 외전 1화가 해금됐어요' : '외전 2화 해금 · 능력치 +5%'}</p>`, [['외전 보기', () => runDialog(drama(id, a.lv), () => renderBase(id))], ['나중에', () => renderBase(id), 'gray']]), 300); return; }
  renderBase(id); }
function drama(id, lv){ const c = CHM[id], g = GIFTS[LIKE[id]] || GIFTS.drink, l = c.lines || [];
  if (lv === 5) return [['sys', `— 외전 1화 「쉬는 시간의 ${c.name}」 · 에이전시 지하 라운지 —`], [id, l[0] || '지휘관, 왔어?'], ['cmd', `${g.n}, 마음에 들었어?`], [id, `…어떻게 알았어? 이런 거 좋아하는 거. 아무한테도 말 안 했는데.`], ['sys', `${c.name}의 표정이 아주 조금, 풀어졌다.`], [id, l[1] || '고마워. 진짜로.']];
  return [['sys', `— 외전 2화 「72시간 전의 약속」 —`], [id, `지휘관. 가끔 그런 생각이 들어. 너는 우리가 모르는 미래를 이미 본 사람 같다고.`], ['cmd', '……'], [id, `대답 안 해도 돼. 대신 약속해. 이번엔 혼자 짊어지지 않겠다고.`], ['cmd', '약속할게.'], [id, l[2] || l[0] || '그럼 됐어. 같이 가자.'], ['sys', `${c.name}과의 인연이 깊어졌다. (능력치 +5%)`]]; }

// 파견: 4시간 후 크레딧·칩·선물 회수
const DISP_T = 4 * 3600000;
function dispReady(i){ const d = M.disp[i]; return d && nowT() >= d.t + DISP_T; }
function baseBadge(){ const e = $('dBase'); if (e) e.classList.toggle('on', M.disp.some((d, i) => dispReady(i)) || (M.daily.baseGift !== today())); }
function collect(i){ const d = M.disp[i]; if (!dispReady(i)) return; const g = pick(['gear', 'book', 'tea', 'drink', 'drink']);
  M.cred += 6000; M.chip += 15; M.gifts[g] = (M.gifts[g] || 0) + 1; const a = affOf(d.id); a.xp += 15; while (a.lv < 10 && a.xp >= AFF_NEED(a.lv)){ a.xp -= AFF_NEED(a.lv); a.lv++; }
  M.disp[i] = null; save(); toast(`파견 귀환! 🪙6,000 · 💠15 · ${GIFTS[g].e} ${GIFTS[g].n}`); renderBase(); }
let baseSel = null;
function renderBase(sel){ if (sel) baseSel = sel; const own = CH.filter(c => owned(c.id));
  if (!baseSel || !owned(baseSel)) baseSel = M.lobby && owned(M.lobby) ? M.lobby : own[0].id;
  const c = CHM[baseSel], a = affOf(baseSel), need = AFF_NEED(a.lv);
  let h = `<div style="display:flex;gap:10px">
   <div style="width:150px;flex:none;position:relative;border-radius:12px;overflow:hidden;border:1px solid #2f6aa0;height:300px;background:#0b1428"><img src="${cardArt(c.id)}" style="width:100%;height:100%;object-fit:cover;object-position:50% 8%">
     <div style="position:absolute;left:0;right:0;bottom:0;padding:16px 8px 6px;background:linear-gradient(transparent,rgba(0,0,0,.92))"><b>${c.name}</b><div class="sub">호감도 Lv.${a.lv}/10 ${a.lv >= 5 ? '💗' : ''}</div>
     <div style="height:6px;border-radius:3px;background:rgba(255,255,255,.15);margin-top:3px"><i style="display:block;height:100%;border-radius:3px;width:${a.lv >= 10 ? 100 : a.xp / need * 100}%;background:linear-gradient(90deg,#ff7fb0,#ffd27a)"></i></div></div></div>
   <div style="flex:1;min-width:0">
    <div class="row" style="flex-wrap:wrap;gap:6px"><div class="t" style="flex-basis:100%">선물하기 <small>최애 선물: ${(GIFTS[LIKE[c.id]] || GIFTS.drink).e} ${(GIFTS[LIKE[c.id]] || GIFTS.drink).n} (호감도 3배)</small></div>
     ${Object.entries(GIFTS).map(([k, g]) => `<button class="cta ${LIKE[c.id] === k ? 'pink' : ''}" data-g="${k}" style="padding:6px 8px;font-size:11px">${g.e} ${g.n} ×${M.gifts[k] || 0}</button>`).join('')}</div>
    <div class="row"><div class="t">해금 보상<small>Lv.5 메모리얼 로비 + 외전 1화 · 능력치 +2%<br>Lv.10 외전 2화 · 능력치 +5%</small></div>
     ${a.lv >= 5 ? `<button class="cta gold" data-d="5">외전 1화</button>` : ''}${a.lv >= 10 ? `<button class="cta gold" data-d="10">외전 2화</button>` : ''}${a.lv >= 5 ? `<button class="cta" id="bMem">메모리얼 로비</button>` : ''}</div>
    <div class="row" style="flex-wrap:wrap;gap:6px"><div class="t" style="flex-basis:100%">파견 (4시간) <small>귀환 시 🪙6,000 · 💠15 · 선물 1개 · 호감도 +15</small></div>
     ${M.disp.map((d, i) => d ? `<button class="cta ${dispReady(i) ? 'gold' : 'gray'}" data-c="${i}" style="font-size:11px;padding:6px 8px">${CHM[d.id].name} ${dispReady(i) ? '귀환!' : Math.ceil((d.t + DISP_T - nowT()) / 60000) + '분'}</button>` : `<button class="cta" data-s="${i}" style="font-size:11px;padding:6px 8px">+ ${c.name} 파견</button>`).join('')}</div>
    <div class="row"><div class="t">숙소 상점<small>매일 무료 🥤 1개 · 크레딧으로 선물 구매</small></div><button class="cta ${M.daily.baseGift === today() ? 'gray' : 'gold'}" id="bFree" ${M.daily.baseGift === today() ? 'disabled' : ''}>무료 🥤</button>
     ${['gear', 'book', 'tea'].map(k => `<button class="cta gray" data-b="${k}" style="font-size:10px;padding:5px 7px">${GIFTS[k].e} 🪙${fmt(GIFTS[k].cred)}</button>`).join('')}</div>
   </div></div>
   <div style="font-size:12px;font-weight:900;color:#9fe8ff;margin:8px 0 4px">숙소 요원</div><div class="agrid">${own.map(o => { const aa = affOf(o.id); return `<div class="acard r-${o.r} ${o.id === baseSel ? 'inp' : ''}" data-a="${o.id}"><img src="${cardArt(o.id)}"><span class="lv">💗${aa.lv}</span><div class="nm">${o.name}${M.disp.some(d => d && d.id === o.id) ? ' (파견)' : ''}</div></div>`; }).join('')}</div>`;
  openList('템퍼럴 에이전시 숙소', h, () => { const q = s => $('listBody').querySelectorAll(s);
    q('[data-a]').forEach(el => el.onclick = () => renderBase(el.dataset.a));
    q('[data-g]').forEach(el => el.onclick = () => giveGift(baseSel, el.dataset.g));
    q('[data-d]').forEach(el => el.onclick = () => runDialog(drama(baseSel, +el.dataset.d), () => renderBase()));
    q('[data-c]').forEach(el => el.onclick = () => collect(+el.dataset.c));
    q('[data-s]').forEach(el => el.onclick = () => { if (M.disp.some(d => d && d.id === baseSel)) return toast('이미 파견 중이에요'); if (M.party.includes(baseSel)) return toast('출격 파티 요원은 파견할 수 없어요'); M.disp[+el.dataset.s] = { id:baseSel, t:nowT() }; save(); toast(`${CHM[baseSel].name} 파견 출발 (4시간)`); renderBase(); });
    q('[data-b]').forEach(el => el.onclick = () => { const k = el.dataset.b, g = GIFTS[k]; if (M.cred < g.cred) return toast('크레딧이 부족해요'); M.cred -= g.cred; M.gifts[k] = (M.gifts[k] || 0) + 1; save(); SFX.ui(); renderBase(); });
    const fr = $('bFree'); if (fr) fr.onclick = () => { M.daily.baseGift = today(); M.gifts.drink = (M.gifts.drink || 0) + 1; save(); toast('🥤 에너지 드링크 +1'); renderBase(); };
    const mm = $('bMem'); if (mm) mm.onclick = () => { M.lobby = baseSel; M.memorial = baseSel; save(); toast('메모리얼 로비로 설정했어요'); };
  });
}
$('bBase').onclick = () => { SFX.ui(); renderBase(); };
const _renderLobbyBase = renderLobby;
renderLobby = function(){ _renderLobbyBase(); const mem = M.memorial && M.memorial === M.lobby && (affOf(M.lobby).lv >= 5);
  $('lobbyChar').style.filter = mem ? 'drop-shadow(0 0 24px rgba(255,120,180,.65))' : ''; if (mem) $('charName').textContent += ' · 💗 메모리얼'; };
