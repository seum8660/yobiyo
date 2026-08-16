import React from 'react';

/**
 * 여비요 — 개인 버전 (국내여비 정산 신청서)
 * 의존성: react만 필요. 스타일은 컴포넌트가 직접 주입한다.
 *
 * 사용:
 *   import Yeobiyo from './Yeobiyo';
 *   <Yeobiyo officeHead="전남광주통합특별시신안교육장" fareTable={FARE_TABLE} aliases={ALIASES} />
 *
 * fareTable: [[코드, 지역, 목적지명, 왕복운임], ...]
 * aliases:   [[별칭, 목적지명], ...]
 */

const CSS = `
.yb, .yb * { box-sizing: border-box; }
.yb { font-family: Pretendard, -apple-system, BlinkMacSystemFont, "Malgun Gothic", sans-serif;
  font-size: 16px; letter-spacing: -0.02em; color: #101010; background: #FAFAFB;
  min-height: 100vh; font-variant-numeric: tabular-nums; }
.yb h1 { font-weight: 900; letter-spacing: -0.045em; margin: 0; }
.yb .btn { border: 0; border-radius: 999px; min-height: 44px; padding: 0 18px; font-weight: 800;
  font-size: 15px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  cursor: pointer; font-family: inherit; text-decoration: none;
  transition: background 120ms ease, transform 80ms ease; }
.yb .btn-primary { background: #FA0050; color: #fff; box-shadow: 0 8px 20px rgba(250,0,80,.28); }
.yb .btn-primary:hover { background: #D60044; }
.yb .btn-primary:active { transform: scale(.98); }
.yb .btn-secondary { background: #FFF1F5; color: #A60035; }
.yb .btn-secondary:hover { background: #FFD0DD; }
.yb .btn-ghost { background: transparent; color: #5A5A61; }
.yb .btn-ghost:hover { background: #F5F6F8; }
.yb .card { border: 1px solid #DEE0E4; border-radius: 20px; background: #fff;
  box-shadow: 0 1px 3px rgba(26,26,26,.05); padding: 26px; }
.yb .fld { display: flex; flex-direction: column; gap: 7px; }
.yb .fld > span { font-size: 13px; font-weight: 800; color: #5A5A61; text-align: left; }
.yb .input, .yb .pick { width: 100%; min-height: 46px; border: 1px solid #B4B9C1; border-radius: 12px;
  background: #FAFAFB; color: #1A1A1A; padding: 0 14px; font-size: 15px; font-weight: 600;
  font-family: inherit; }
.yb .input:focus-visible, .yb .pick:focus-visible { outline: none; border-color: #FA0050;
  background: #fff; box-shadow: 0 0 0 3px #FFF1F5; }
.yb .num { text-align: right; }
.yb .sheet table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.yb .sheet th, .yb .sheet td { border: 1px solid #1d1f20; padding: 6px 8px; font-size: 12px;
  vertical-align: middle; }
.yb .sheet th { font-weight: 500; background: #f4f4f5; text-align: center; }
@page { size: A4; margin: 12mm; }
@media print {
  .yb [data-noprint] { display: none !important; }
  .yb { background: #fff; }
  .yb .sheet { box-shadow: none !important; margin: 0 !important; width: auto !important;
    min-height: 0 !important; padding: 0 !important; page-break-after: always; }
  .yb .sheet:last-of-type { page-break-after: auto; }
}
`;

const LODGE_SEOUL = 100000, LODGE_METRO = 80000, LODGE_ETC = 70000;
const METRO = ['부산', '대구', '인천', '광주', '대전', '울산'];
const TRANSPORTS = ['승용차', '선박차량', '버스', '철도', '항공', '동승'];
const AUTO_MODES = ['승용차', '선박차량'];
const ME_KEY = 'yeobiyo-personal-me';
const RECENT_KEY = 'yeobiyo-personal-recent';

const won = n => (n || 0).toLocaleString('ko-KR') + '원';
const toNum = v => { const n = parseInt(String(v).replace(/[^0-9-]/g, ''), 10); return isNaN(n) ? 0 : n; };
const kb = n => (n > 1048576 ? `${(n / 1048576).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`);
const isoToday = () => new Date().toISOString().slice(0, 10);

const daysBetween = (a, b) => {
  if (!a || !b) return 1;
  const d1 = new Date(a.slice(0, 10)), d2 = new Date(b.slice(0, 10));
  return Math.max(1, Math.round((d2 - d1) / 86400000) + 1);
};

const fmtKDate = iso => {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${y}. ${+m}. ${+d}.`;
};

const lodgeCapOf = place => {
  const p = place || '';
  if (p.includes('서울')) return LODGE_SEOUL;
  if (METRO.some(c => p.includes(c))) return LODGE_METRO;
  return LODGE_ETC;
};

const amountFromName = name => {
  const base = String(name).replace(/\.[a-z0-9]+$/i, '');
  const hits = [...base.matchAll(/(\d{1,3}(?:,\d{3})+|\d{4,7})\s*(?:원|won)?/gi)]
    .map(m => parseInt(m[1].replace(/,/g, ''), 10))
    .filter(n => n >= 1000 && n <= 5000000 && !/^20\d{2}$/.test(String(n)));
  return hits.length ? String(hits[hits.length - 1]) : '';
};

const kindFromName = (name, fallback) => {
  const n = String(name);
  if (/숙박|호텔|모텔|스테이|lodg|hotel/i.test(n)) return '숙박비';
  if (/운임|주유|톨게이트|통행|기차|ktx|버스|항공|택시|fare|train/i.test(n)) return '운임';
  return fallback;
};

const readJson = (key, fallback) => {
  try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v === null ? fallback : v; }
  catch (e) { return fallback; }
};

export default function Yeobiyo({
  officeHead = '전남광주통합특별시신안교육장',
  defaultOrg = '',
  defaultOrigin = '목포',
  fareTable = [],
  aliases = [],
}) {
  const me = React.useMemo(() => readJson(ME_KEY, {}), []);
  const today = isoToday();

  const [view, setView] = React.useState('input');
  const [org, setOrg] = React.useState('org' in me ? me.org : defaultOrg);
  const [rank, setRank] = React.useState(me.rank || '');
  const [name, setName] = React.useState(me.name || '');
  const [origin, setOrigin] = React.useState(me.origin || defaultOrigin);
  const [scope, setScope] = React.useState('관외');
  const [from, setFrom] = React.useState(today);
  const [to, setTo] = React.useState(today);
  const [dest, setDest] = React.useState('');
  const [transport, setTransport] = React.useState('승용차');
  const [purpose, setPurpose] = React.useState('');
  const [lodgeInput, setLodgeInput] = React.useState('');
  const [applyDate, setApplyDate] = React.useState(() => {
    const d = new Date();
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  });
  const [mates, setMates] = React.useState([]);
  const [mateName, setMateName] = React.useState('');
  const [mateRank, setMateRank] = React.useState('');
  const [legs, setLegs] = React.useState([{ date: today, from: me.origin || defaultOrigin, to: '', grade: '왕복', fare: '' }]);
  const [legsTouched, setLegsTouched] = React.useState(false);
  const [receipts, setReceipts] = React.useState([]);
  const [recent, setRecent] = React.useState(() => readJson(RECENT_KEY, []));
  const [drag, setDrag] = React.useState({ from: null, over: null });
  const [flash, setFlash] = React.useState(false);
  const flashT = React.useRef(null);

  React.useEffect(() => {
    try { localStorage.setItem(ME_KEY, JSON.stringify({ org, rank, name, origin })); } catch (e) {}
  }, [org, rank, name, origin]);

  const matchFare = React.useCallback(key => {
    if (!key) return null;
    for (const [alias, target] of aliases) {
      if (key.includes(alias)) {
        const hit = fareTable.find(f => f[2] === target);
        if (hit) return { name: hit[2], fare: hit[3] };
      }
    }
    for (const row of fareTable) if (key.includes(row[2])) return { name: row[2], fare: row[3] };
    return null;
  }, [fareTable, aliases]);

  const autoLegs = React.useCallback((o, d, f, t) => {
    const dst = (d || '').trim();
    if (!dst) return [{ date: f, from: o, to: '', grade: '편도', fare: '' }];
    return [
      { date: f, from: o, to: dst, grade: '편도', fare: '' },
      { date: t, from: dst, to: o, grade: '편도', fare: '' },
    ];
  }, []);

  const syncLegs = (next = {}) => {
    if (legsTouched) return;
    const o = next.origin ?? origin, d = next.dest ?? dest;
    const f = next.from ?? from, t = next.to ?? to;
    setLegs(autoLegs(o, d, f, t));
  };

  const addReceipt = (file, fallbackName) => {
    const nm = file.name || fallbackName || 'clipboard.png';
    const id = `${Date.now()}-${Math.random()}`;
    const fallbackKind = daysBetween(from, to) > 1 ? '숙박비' : '운임';
    const item = { id, name: nm, size: file.size, type: file.type, url: '',
      kind: kindFromName(nm, fallbackKind), amount: amountFromName(nm) };
    if ((file.type || '').startsWith('image/')) {
      const rd = new FileReader();
      rd.onload = () => setReceipts(rs => rs.map(r => (r.id === id ? { ...r, url: rd.result } : r)));
      rd.readAsDataURL(file);
    }
    setReceipts(rs => [...rs, item]);
    setFlash(true);
    clearTimeout(flashT.current);
    flashT.current = setTimeout(() => setFlash(false), 1400);
  };

  React.useEffect(() => {
    const onPaste = e => {
      const items = [...((e.clipboardData || {}).items || [])].filter(it => it.type.startsWith('image/'));
      if (!items.length) return;
      e.preventDefault();
      items.forEach(it => {
        const f = it.getAsFile();
        if (f) addReceipt(f, `붙여넣은 이미지 ${new Date().toLocaleTimeString('ko-KR')}.png`);
      });
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  });

  const days = daysBetween(from, to);
  const nights = Math.max(0, days - 1);
  const isLocal = scope === '관내';
  const isRide = transport === '동승';

  const legRows = legs.map((lg, i) => {
    const home = (origin || '').trim();
    const toV = String(lg.to || '').trim(), fromV = String(lg.from || '').trim();
    const key = home && toV === home ? fromV : toV;
    const hit = matchFare(key) || matchFare(dest);
    const auto = (isRide || isLocal) ? 0
      : (AUTO_MODES.includes(transport) && hit && typeof hit.fare === 'number'
          ? (lg.grade === '왕복' ? hit.fare : Math.round(hit.fare / 2)) : 0);
    return { ...lg, i, auto, amount: lg.fare !== '' ? toNum(lg.fare) : auto };
  });
  const legsFilled = legRows.filter(lg => String(lg.to).trim() !== '');
  const fare = legsFilled.reduce((s, lg) => s + lg.amount, 0);

  const cap = lodgeCapOf(dest);
  const lodgeMax = nights * cap;
  const lodge = lodgeInput !== '' ? toNum(lodgeInput) : lodgeMax;
  const lodgeOver = Math.max(0, lodge - lodgeMax);

  const attachLine = `첨 부 : 신용카드 매출전표 등 ${receipts.length || 1}부`;
  const tripPeriod = days > 1 ? `${fmtKDate(from)} － ${fmtKDate(to)}` : fmtKDate(from);

  const makeSheet = (person, isMate) => {
    const rows = legsFilled.map(lg => ({
      date: fmtKDate(lg.date || from),
      transport: isMate ? '동승' : transport,
      from: lg.from, to: lg.to, grade: lg.grade,
      amount: won(isMate ? 0 : lg.amount),
    }));
    return {
      org, rank: person.rank, name: person.name, place: dest, tripPeriod,
      lodgeCapFmt: won(lodgeMax), lodgeFmt: won(lodge),
      lodgeExcess: lodgeOver > 0 ? `${won(lodgeOver)} / 상한 초과` : (lodge > 0 ? '' : '해당 없음'),
      fareRows: rows,
      fareSpan: Math.max(rows.length, 4) + 1,
      fillers: Math.max(0, 4 - rows.length),
      attachLine, applyDate, officeHead,
    };
  };

  const sheets = [makeSheet({ rank, name }, false), ...mates.map(mt => makeSheet(mt, true))];

  const warns = [];
  if (!name) warns.push('신청인 성명이 비어 있어 서식에 이름이 찍히지 않습니다.');
  if (!dest) warns.push('출장지가 비어 있습니다.');
  if (lodgeOver > 0) warns.push(`숙박비가 상한을 ${won(lodgeOver)} 넘습니다. 초과지출 사유가 필요합니다.`);
  if (!isLocal && !isRide && fare === 0) warns.push('운임이 0원입니다. 구간별 운임을 직접 입력하세요.');
  if (legsFilled.length === 0) warns.push('운임 구간이 비어 있습니다. 도착지를 넣어주세요.');

  const setLeg = (i, key) => e =>
    setLegs(ls => { setLegsTouched(true); return ls.map((lg, j) => (j === i ? { ...lg, [key]: e.target.value } : lg)); });

  const setReceipt = (i, key) => e =>
    setReceipts(rs => rs.map((r, j) => (j === i ? { ...r, [key]: e.target.value } : r)));

  const saveRecent = () => {
    const item = { scope, from, to, origin, dest, transport, purpose, legs };
    const next = [item, ...recent.filter(r => !(r.dest === dest && r.from === from))].slice(0, 5);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch (e) {}
  };

  const loadRecent = r => {
    setScope(r.scope); setFrom(r.from); setTo(r.to); setOrigin(r.origin); setDest(r.dest);
    setTransport(r.transport); setPurpose(r.purpose || ''); setLodgeInput('');
    setLegs(r.legs && r.legs.length ? r.legs : autoLegs(r.origin, r.dest, r.from, r.to));
    setLegsTouched(false);
  };

  const deleteRecent = i => {
    const next = recent.filter((_, j) => j !== i);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch (e) {}
  };

  const resetAll = () => {
    setScope('관외'); setDest(''); setTransport('승용차'); setPurpose('');
    setLodgeInput(''); setMates([]); setReceipts([]);
    setLegs(autoLegs(origin, '', from, to)); setLegsTouched(false);
  };

  const print = () => { setView('form'); setTimeout(() => window.print(), 250); };

  const dropOnCard = i => e => {
    e.preventDefault(); e.stopPropagation();
    const files = [...((e.dataTransfer || {}).files || [])];
    if (files.length) { setDrag({ from: null, over: null }); files.forEach(f => addReceipt(f)); return; }
    const dt = parseInt(e.dataTransfer.getData('text/plain'), 10);
    const src = drag.from !== null ? drag.from : (isNaN(dt) ? null : dt);
    if (src === null || src === i) { setDrag({ from: null, over: null }); return; }
    setReceipts(rs => { const next = [...rs]; const [moved] = next.splice(src, 1); next.splice(i, 0, moved); return next; });
    setDrag({ from: null, over: null });
  };

  const receiptTotal = receipts.reduce((sum, rc) => {
    const auto = rc.kind === '숙박비' ? lodge : (rc.kind === '운임' ? fare : 0);
    return sum + (rc.amount !== '' ? toNum(rc.amount) : auto);
  }, 0);

  const tab = active => ({
    minHeight: 40, padding: '0 20px', border: 0, borderRadius: 999, fontSize: 15, fontWeight: 800,
    cursor: 'pointer', background: active ? '#FA0050' : 'transparent', color: active ? '#fff' : '#7C7C82',
  });

  return (
    <div className="yb">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={{ width: 1320, margin: '0 auto', padding: '0 40px 80px' }}>

        <div data-noprint style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 0', borderBottom: '1px solid #DEE0E4' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginRight: 'auto' }}>
            <span style={{ fontWeight: 900, fontSize: 21, letterSpacing: '-0.05em' }}>여비요</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#A60035' }}>개인 버전</span>
          </div>
          <button className="btn btn-secondary" type="button" onClick={saveRecent}>이 출장 저장</button>
          <button className="btn btn-secondary" type="button" onClick={resetAll}>초기화</button>
          <button className="btn btn-primary" type="button" onClick={print}>신청서 인쇄</button>
        </div>

        <div data-noprint style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, padding: '12px 18px', border: '1px dashed #FA0050', borderRadius: 12, background: 'rgba(250,0,80,.05)' }}>
          <span style={{ flex: 'none', fontSize: 16 }}>🛵</span>
          <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.6, color: '#32323A' }}>
            서식은 여비요가, 책임은 신청자가. 자동 채운 값이 틀릴 수 있으니 <b>참고용 자료로만</b> 쓰시고 제출 전에 규정과 증빙으로 한 번 더 확인해 주세요.
          </span>
        </div>

        <div data-noprint style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 40, padding: '28px 0 22px' }}>
          <div style={{ maxWidth: 620 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#A60035' }}>내 출장 한 건 · 신청서만 출력</div>
            <h1 style={{ fontSize: 40, margin: '10px 0' }}>국내여비 정산 신청서 만들기</h1>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: '#32323A' }}>
              기간과 출장지를 넣으면 서식이 채워집니다. 동승자를 추가하면 사람 수만큼 신청서가 만들어지고, 영수증을 올리면 첨부 장수와 첨부 페이지가 함께 인쇄됩니다.
            </p>
          </div>
          <div style={{ flex: 'none', display: 'flex', gap: 8, padding: 4, borderRadius: 999, background: '#F5F6F8' }}>
            <button type="button" style={tab(view === 'input')} onClick={() => setView('input')}>입력</button>
            <button type="button" style={tab(view === 'form')} onClick={() => setView('form')}>신청서</button>
          </div>
        </div>

        {view === 'input' && (
          <div data-noprint style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 24, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

              <div className="card">
                <SectionHead n="01" title="신청인" note="한 번 넣으면 다음에도 그대로" />
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
                  <Field label="소속"><input className="input" value={org} onChange={e => setOrg(e.target.value)} /></Field>
                  <Field label="직급(직위)"><input className="input" value={rank} onChange={e => setRank(e.target.value)} /></Field>
                  <Field label="성명"><input className="input" value={name} onChange={e => setName(e.target.value)} /></Field>
                </div>
              </div>

              <div className="card">
                <SectionHead n="02" title="출장 정보" note={`${days}일${nights > 0 ? ` · ${nights}박` : ' · 당일'}`} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
                  <Field label="출장구분">
                    <select className="pick" value={scope} onChange={e => setScope(e.target.value)}>
                      <option value="관외">관외</option><option value="관내">관내</option>
                    </select>
                  </Field>
                  <Field label="시작일">
                    <input className="input" type="date" value={from}
                      onChange={e => { setFrom(e.target.value); syncLegs({ from: e.target.value }); }} />
                  </Field>
                  <Field label="종료일">
                    <input className="input" type="date" value={to}
                      onChange={e => { setTo(e.target.value); syncLegs({ to: e.target.value }); }} />
                  </Field>
                  <Field label="교통편">
                    <select className="pick" value={transport} onChange={e => setTransport(e.target.value)}>
                      {TRANSPORTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="출발지">
                    <input className="input" value={origin}
                      onChange={e => { setOrigin(e.target.value); syncLegs({ origin: e.target.value }); }} />
                  </Field>
                  <Field label="출장지 (숙박 상한·서식 기준지)" span={3}>
                    <input className="input" value={dest} placeholder="예: 광주"
                      onChange={e => { setDest(e.target.value); syncLegs({ dest: e.target.value }); }} />
                  </Field>
                  <Field label="출장목적" span={4}>
                    <input className="input" value={purpose} onChange={e => setPurpose(e.target.value)} />
                  </Field>
                </div>

                <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #E4E6EA' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#5A5A61' }}>동승자</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#8A8A90' }}>같은 차로 함께 간 사람 — 운임 없는 신청서가 따로 만들어집니다</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                    <Field label="성명" style={{ flex: 1 }}>
                      <input className="input" value={mateName} placeholder="이름 입력 후 추가"
                        onChange={e => setMateName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMate(); } }} />
                    </Field>
                    <Field label="직급(직위)" style={{ width: 150 }}>
                      <input className="input" value={mateRank}
                        onChange={e => setMateRank(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMate(); } }} />
                    </Field>
                    <button type="button" className="btn btn-secondary" style={{ minHeight: 46 }} onClick={addMate}>추가</button>
                  </div>
                  {mates.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                      {mates.map((mt, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px 8px 14px', borderRadius: 999, background: '#FFF1F5', color: '#A60035', fontSize: 14, fontWeight: 800 }}>
                          <span>{mt.name}{mt.rank ? ` · ${mt.rank}` : ''}</span>
                          <button type="button" onClick={() => setMates(ms => ms.filter((_, j) => j !== i))}
                            style={{ border: 0, background: 'transparent', color: '#A60035', font: 'inherit', fontSize: 16, cursor: 'pointer', padding: '0 2px' }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="card">
                <SectionHead n="03" title="운임 구간" note="출장 정보대로 왕복 두 줄이 자동으로 만들어집니다 — 경유가 있으면 줄을 추가하세요" />
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 1fr 90px 130px 46px', gap: 10, alignItems: 'center', fontSize: 12.5, fontWeight: 800, color: '#8A8A90', padding: '0 2px 8px' }}>
                  <span>일자</span><span>출발지</span><span>도착지</span><span>등급</span>
                  <span style={{ textAlign: 'right' }}>운임</span><span />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {legRows.map(lg => (
                    <div key={lg.i} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 1fr 90px 130px 46px', gap: 10, alignItems: 'center' }}>
                      <input className="input" type="date" value={lg.date} onChange={setLeg(lg.i, 'date')} />
                      <input className="input" value={lg.from} placeholder="목포" onChange={setLeg(lg.i, 'from')} />
                      <input className="input" value={lg.to} placeholder="무안" onChange={setLeg(lg.i, 'to')} />
                      <select className="pick" value={lg.grade} onChange={setLeg(lg.i, 'grade')}>
                        <option value="편도">편도</option><option value="왕복">왕복</option>
                      </select>
                      <input className="input num" value={lg.fare} onChange={setLeg(lg.i, 'fare')}
                        placeholder={lg.auto > 0 ? `자동 ${won(lg.auto)}` : '직접 입력'} />
                      <button type="button" onClick={() => { setLegsTouched(true); setLegs(ls => ls.filter((_, j) => j !== lg.i)); }}
                        style={{ width: 46, height: 46, border: '1px solid #B4B9C1', borderRadius: 12, background: '#FAFAFB', color: '#8A8A90', font: 'inherit', fontSize: 18, cursor: 'pointer' }}>×</button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => {
                    setLegsTouched(true);
                    setLegs(ls => {
                      const last = ls[ls.length - 1];
                      return [...ls, { date: last ? last.date : from, from: last ? last.to : origin, to: '', grade: '편도', fare: '' }];
                    });
                  }}>구간 추가</button>
                  <button type="button" className="btn btn-ghost"
                    onClick={() => { setLegs(autoLegs(origin, dest, from, to)); setLegsTouched(false); }}>일정대로 다시 만들기</button>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#8A8A90', marginLeft: 'auto' }}>
                    운임 합계 {won(fare)} · {legsFilled.length}구간
                  </span>
                </div>
                <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid #E4E6EA', display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
                  <Field label="숙박비 실제 소요액">
                    <input className="input num" value={lodgeInput} onChange={e => setLodgeInput(e.target.value)}
                      placeholder={nights > 0 ? `자동 ${won(lodgeMax)}` : '숙박 없음'} />
                  </Field>
                </div>
              </div>

              <div className="card">
                <SectionHead n="04" title="영수증 첨부" note="신용카드 매출전표 · 숙박 영수증 · 승차권" />
                <label
                  onDrop={e => { e.preventDefault(); [...((e.dataTransfer || {}).files || [])].forEach(f => addReceipt(f)); }}
                  onDragOver={e => e.preventDefault()}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 150, border: `2px dashed ${flash ? '#FA0050' : '#DEE0E4'}`, borderRadius: 16, background: flash ? '#FFF1F5' : '#FAFAFB', cursor: 'pointer', transition: 'border-color 150ms, background 150ms' }}>
                  <span style={{ fontSize: 24 }}>{flash ? '✓' : '📄'}</span>
                  <span style={{ fontSize: 16, fontWeight: 800 }}>
                    {flash ? `담았습니다 · 영수증 ${receipts.length}건` : '캡처는 Ctrl+V, 파일은 끌어다 놓거나 눌러서 선택'}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#8A8A90' }}>
                    {flash ? '아래 목록에서 구분과 금액을 확인하세요' : '이미지 · PDF · 여러 장 한 번에'}
                  </span>
                  <input type="file" multiple accept="image/*,application/pdf" style={{ display: 'none' }}
                    onChange={e => { const fs = [...(e.target.files || [])]; e.target.value = ''; fs.forEach(f => addReceipt(f)); }} />
                </label>

                {receipts.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 16 }}>
                    {receipts.map((rc, i) => {
                      const auto = rc.kind === '숙박비' ? lodge : (rc.kind === '운임' ? fare : 0);
                      return (
                        <div key={rc.id} draggable
                          onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); setDrag({ from: i, over: null }); }}
                          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDrag(d => (d.over === i ? d : { ...d, over: i })); }}
                          onDrop={dropOnCard(i)}
                          onDragEnd={() => setDrag({ from: null, over: null })}
                          style={{ position: 'relative', border: `1px solid ${drag.over === i && drag.from !== i ? '#FA0050' : '#E4E6EA'}`, borderRadius: 14, overflow: 'hidden', background: '#FAFAFB', cursor: 'grab', opacity: drag.from === i ? 0.45 : 1 }}>
                          <div style={{ height: 112, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F6F8', overflow: 'hidden' }}>
                            {rc.url
                              ? <img src={rc.url} alt="" draggable={false} style={{ width: '100%', height: 112, objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
                              : <span style={{ fontSize: 13, fontWeight: 800, color: '#8A8A90' }}>{rc.type === 'application/pdf' ? 'PDF' : '미리보기 없음'}</span>}
                          </div>
                          <div draggable={false} style={{ padding: '9px 11px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 800 }}>
                              <span style={{ color: '#C6C6CC' }}>⠿</span>
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rc.name}</span>
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#8A8A90', marginTop: 2 }}>{kb(rc.size)}</div>
                            <select className="pick" value={rc.kind} onChange={setReceipt(i, 'kind')}
                              style={{ minHeight: 34, fontSize: 12.5, padding: '0 10px', marginTop: 8 }}>
                              <option value="숙박비">숙박비</option><option value="운임">운임</option><option value="기타">기타</option>
                            </select>
                            <input className="input num" value={rc.amount} onChange={setReceipt(i, 'amount')}
                              placeholder={auto > 0 ? `자동 ${won(auto)}` : '금액 입력'}
                              style={{ minHeight: 34, fontSize: 12.5, marginTop: 6 }} />
                          </div>
                          <button type="button" onClick={() => setReceipts(rs => rs.filter((_, j) => j !== i))}
                            style={{ position: 'absolute', top: 7, right: 7, width: 24, height: 24, border: 0, borderRadius: 999, background: 'rgba(16,16,16,.6)', color: '#fff', font: 'inherit', fontSize: 14, lineHeight: 1, cursor: 'pointer' }}>×</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 22, position: 'sticky', top: 20 }}>
              <div className="card" style={{ padding: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#A60035', marginBottom: 16 }}>출력 미리 확인</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Check label="일정" value={`${fmtKDate(from)}${days > 1 ? ` ~ ${fmtKDate(to)}` : ''} (${days}일)`} />
                  <Check label="이동" value={legsFilled.length ? [legsFilled[0].from, ...legsFilled.map(l => l.to)].join(' → ') : '구간 없음'} />
                  <Check label="신청서" value={`${sheets.length}장 (본인 1${mates.length ? ` · 동승자 ${mates.length}` : ''})`} />
                  <Check label="영수증" value={receipts.length ? `${receipts.length}건 첨부` : '없음'} />
                </div>
                {warns.length > 0 && (
                  <div style={{ marginTop: 18, padding: '12px 14px', borderRadius: 12, background: '#FFF1F5', color: '#A60035', fontSize: 13, fontWeight: 800, lineHeight: 1.55 }}>
                    {warns.join(' ')}
                  </div>
                )}
                <button type="button" className="btn btn-primary" style={{ width: '100%', marginTop: 18 }} onClick={() => setView('form')}>신청서 보기</button>
              </div>

              <div className="card" style={{ padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 14, fontWeight: 900, color: '#A60035' }}>최근 출장</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#8A8A90' }}>눌러서 불러오기</span>
                </div>
                {recent.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {recent.map((r, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: '1px solid #E4E6EA', borderRadius: 14, background: '#FAFAFB' }}>
                        <button type="button" onClick={() => loadRecent(r)}
                          style={{ flex: 1, textAlign: 'left', border: 0, background: 'transparent', padding: 0, cursor: 'pointer', font: 'inherit' }}>
                          <div style={{ fontSize: 15, fontWeight: 800 }}>{r.dest || '(출장지 미입력)'} · {r.transport || '-'}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#8A8A90', marginTop: 3 }}>
                            {fmtKDate(r.from)}{r.from !== r.to ? ` ~ ${fmtKDate(r.to)}` : ''} · {r.purpose || '목적 미입력'}
                          </div>
                        </button>
                        <button type="button" onClick={() => deleteRecent(i)}
                          style={{ border: 0, background: 'transparent', color: '#A0A0A6', font: 'inherit', fontSize: 18, cursor: 'pointer', padding: '0 4px' }}>×</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#8A8A90' }}>
                    저장한 출장이 없습니다. 같은 곳을 또 가게 되면 상단의 <b>이 출장 저장</b>을 눌러두세요.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'form' && (
          <div>
            <div data-noprint style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderTop: '1px solid #DEE0E4', borderBottom: '1px solid #DEE0E4', marginBottom: 24 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, color: '#5A5A61' }}>
                신청일
                <input className="input" style={{ width: 170, minHeight: 38 }} value={applyDate} onChange={e => setApplyDate(e.target.value)} />
              </label>
              <span style={{ fontSize: 14, color: '#5A5A61', marginLeft: 'auto' }}>
                {sheets.length + (receipts.length ? 1 : 0)}장 · A4 세로 · 인쇄하면 이 줄은 나오지 않습니다
              </span>
            </div>

            {sheets.map((s, i) => <Sheet key={i} s={s} />)}

            {receipts.length > 0 && (
              <div className="sheet" style={{ width: 794, minHeight: 1123, margin: '0 auto 28px', padding: '56px 52px', background: '#fff', boxShadow: '0 5px 16px rgba(26,26,26,.09)', color: '#1d1f20' }}>
                <div style={{ fontSize: 11, marginBottom: 12 }}>■ 첨부</div>
                <div style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, letterSpacing: '0.1em', margin: '0 0 8px' }}>영 수 증 첨 부</div>
                <div style={{ textAlign: 'center', fontSize: 12, marginBottom: 6 }}>
                  {name || '신청인'} · {fmtKDate(from)}{days > 1 ? ` ~ ${fmtKDate(to)}` : ''} · {dest} · 총 {receipts.length}건
                </div>
                <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, marginBottom: 22 }}>
                  첨부 금액 합계 {won(receiptTotal)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'flex-start' }}>
                  {receipts.map((rc, i) => {
                    const auto = rc.kind === '숙박비' ? lodge : (rc.kind === '운임' ? fare : 0);
                    const amt = rc.amount !== '' ? toNum(rc.amount) : auto;
                    return (
                      <div key={rc.id} style={{ border: '1px solid #1d1f20', maxWidth: '100%', breakInside: 'avoid' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 60 }}>
                          {rc.url
                            ? <img src={rc.url} alt="" style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: 900, display: 'block' }} />
                            : <span style={{ fontSize: 12, color: '#6b6b70', padding: '60px 90px' }}>{rc.type === 'application/pdf' ? 'PDF' : '미리보기 없음'}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 10, borderTop: '1px solid #1d1f20', padding: '6px 8px', fontSize: 11 }}>
                          <span>{i + 1}. {rc.name}</span>
                          <span style={{ marginLeft: 'auto' }}>{amt > 0 ? `${rc.kind} ${won(amt)}` : rc.kind}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  function addMate() {
    const nm = mateName.trim();
    if (!nm) return;
    setMates(ms => [...ms, { name: nm, rank: mateRank.trim() }]);
    setMateName(''); setMateRank('');
  }
}

function SectionHead({ n, title, note }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      <span style={{ fontSize: 14, fontWeight: 900, color: '#A60035' }}>{n} · {title}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#8A8A90' }}>{note}</span>
    </div>
  );
}

function Field({ label, span, style, children }) {
  return (
    <label className="fld" style={{ gridColumn: span ? `span ${span}` : undefined, ...style }}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function Check({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
      <span style={{ fontSize: 14, fontWeight: 800, color: '#5A5A61', minWidth: 82 }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 800, textAlign: 'right', marginLeft: 'auto' }}>{value}</span>
    </div>
  );
}

function Sheet({ s }) {
  return (
    <div className="sheet" style={{ width: 794, minHeight: 1123, margin: '0 auto 28px', padding: '56px 52px', background: '#fff', boxShadow: '0 5px 16px rgba(26,26,26,.09)', color: '#1d1f20', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 10.5, marginBottom: 18 }}>■ 공무원보수 등의 업무지침 제9장 [별지 제3호 서식]</div>
      <div style={{ textAlign: 'center', fontSize: 24, fontWeight: 700, letterSpacing: '0.06em', margin: '0 0 26px' }}>국내여비 정산 신청서</div>
      <div style={{ fontSize: 10, marginBottom: 8 }}>※ 「e-사람 시스템」 등 전산시스템으로 신청 시 수기 작성 생략</div>

      <table><tbody>
        <tr style={{ height: 34 }}>
          <th style={{ width: 96 }}>소 속</th>
          <td style={{ width: 214 }}>{s.org}</td>
          <th style={{ width: 76 }}>직 급<br />(직위)</th>
          <td style={{ width: 104, textAlign: 'center' }}>{s.rank}</td>
          <th style={{ width: 76 }}>성 명</th>
          <td style={{ textAlign: 'center' }}>{s.name}</td>
        </tr>
      </tbody></table>
      <div style={{ height: 14 }} />

      <table><tbody>
        <tr style={{ height: 32 }}>
          <th rowSpan={2} style={{ width: 96 }}>출장(부임)<br />일 정</th>
          <th style={{ width: 84 }}>일 시</th>
          <td colSpan={4} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{s.tripPeriod}</td>
        </tr>
        <tr style={{ height: 32 }}>
          <th>출장(부임)지</th>
          <td colSpan={4} style={{ textAlign: 'center' }}>{s.place}</td>
        </tr>
      </tbody></table>
      <div style={{ height: 14 }} />

      <table><tbody>
        <tr style={{ height: 58 }}>
          <th style={{ width: 96 }}>숙 박 비</th>
          <th style={{ width: 84 }}>상한액 또는<br />지급받은 선금</th>
          <td className="num" style={{ width: 92 }}>{s.lodgeCapFmt}</td>
          <th style={{ width: 84 }}>실제 소요액</th>
          <td className="num" style={{ width: 92 }}>{s.lodgeFmt}</td>
          <th style={{ width: 84 }}>초과지출 사유</th>
          <td style={{ fontSize: 10.5 }}>{s.lodgeExcess}</td>
        </tr>
      </tbody></table>
      <div style={{ height: 14 }} />

      <table><tbody>
        <tr style={{ height: 30 }}>
          <th rowSpan={s.fareSpan} style={{ width: 96 }}>운 임</th>
          <th style={{ width: 92 }}>일 자</th><th style={{ width: 76 }}>교통편</th>
          <th>출발지</th><th>도착지</th><th style={{ width: 66 }}>등 급</th><th style={{ width: 86 }}>금 액</th>
        </tr>
        {s.fareRows.map((f, i) => (
          <tr key={i} style={{ height: 30 }}>
            <td style={{ textAlign: 'center' }}>{f.date}</td>
            <td style={{ textAlign: 'center' }}>{f.transport}</td>
            <td style={{ textAlign: 'center' }}>{f.from}</td>
            <td style={{ textAlign: 'center' }}>{f.to}</td>
            <td style={{ textAlign: 'center' }}>{f.grade}</td>
            <td className="num">{f.amount}</td>
          </tr>
        ))}
        {Array.from({ length: s.fillers }).map((_, i) => (
          <tr key={`z${i}`} style={{ height: 30 }}><td /><td /><td /><td /><td /><td /></tr>
        ))}
      </tbody></table>

      <p style={{ margin: '30px 0 0', fontSize: 12, lineHeight: 1.85 }}>
        「공무원 여비 규정」제16조 제1항 · 제2항에 의하여 관계서류를 첨부하여 위와 같이 국내여비의 정산을 신청합니다.
      </p>
      <p style={{ margin: '22px 0 0', fontSize: 12 }}>{s.attachLine}</p>
      <div style={{ textAlign: 'right', fontSize: 12.5, margin: '40px 0 26px', paddingRight: 44, letterSpacing: '0.35em' }}>{s.applyDate}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 22, fontSize: 13, paddingRight: 8, marginBottom: 38 }}>
        <span style={{ letterSpacing: '0.3em' }}>신 청 인</span>
        <span style={{ letterSpacing: '0.3em' }}>성 명 {s.name}</span>
        <span style={{ fontSize: 10, color: '#6b6b70' }}>(서명 또는 인)</span>
      </div>
      <div style={{ fontSize: 14.5, fontWeight: 700, margin: 'auto 0 12px' }}>
        {s.officeHead} <span style={{ fontSize: 12, fontWeight: 400 }}>귀하</span>
      </div>
      <div style={{ border: '1px solid #1d1f20' }}>
        <div style={{ background: '#dcdde0', textAlign: 'center', fontSize: 11, padding: '4px 0', borderBottom: '1px solid #1d1f20' }}>유의사항</div>
        <div style={{ padding: '12px 14px', fontSize: 10, lineHeight: 2 }}>
          <div>1. 정산하는 여비 항목 중 운임은 국내여행에 한함. 다만, 국내 · 외 항공운임은 별지 제6호 서식에 의함</div>
          <div>2. 「공무원 여비 규정」제16조 제1항 단서에 따라 숙박비를 상향하는 경우 ‘초과지출 사유’ 작성</div>
        </div>
      </div>
      <div style={{ textAlign: 'right', fontSize: 9.5, marginTop: 10 }}>210㎜×297㎜[백상지 80g/㎡]</div>
    </div>
  );
}
