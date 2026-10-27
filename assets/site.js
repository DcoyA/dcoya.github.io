// 스토어 주소가 나오면 여기만 채운다. 비어 있으면 "준비 중" 안내를 띄운다.
const STORE_LINKS = {
  ios: '',
  android: '',
};

(function () {
  const en = document.documentElement.lang === 'en';
  const text = en
    ? { title: 'Coming soon', body: 'Wonthly is getting ready for the App Store and Google Play. Please check back soon.', ok: 'OK' }
    : { title: '출시 준비 중입니다', body: '앱스토어와 구글 플레이에 곧 올라와요. 조금만 기다려 주세요.', ok: '확인' };

  let dialog;
  function soon() {
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.innerHTML =
        '<img src="/assets/icon-192.png" alt="" width="60" height="60">' +
        '<h2>' + text.title + '</h2><p>' + text.body + '</p>' +
        '<form method="dialog"><button class="btn btn-dark">' + text.ok + '</button></form>';
      dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
      document.body.appendChild(dialog);
    }
    if (dialog.showModal) dialog.showModal(); else alert(text.title);
  }

  document.querySelectorAll('[data-store]').forEach((el) => {
    const url = STORE_LINKS[el.dataset.store] || STORE_LINKS.ios || STORE_LINKS.android;
    if (el.dataset.store === 'auto') {
      // 기기에 맞는 스토어로 보낸다.
      const android = /android/i.test(navigator.userAgent);
      const pick = android ? STORE_LINKS.android : STORE_LINKS.ios;
      if (pick) { el.href = pick; return; }
    } else if (STORE_LINKS[el.dataset.store]) {
      el.href = url;
      return;
    }
    el.addEventListener('click', (e) => { e.preventDefault(); soon(); });
  });
})();

// 계산기 공용: 날짜 더하기와 표시.
const DAY = 86400000;
function parseDay(v) {
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function addDays(date, n) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}
function today() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}
function fmt(date) {
  const en = document.documentElement.lang === 'en';
  return date.toLocaleDateString(en ? 'en-US' : 'ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short',
    year: date.getFullYear() !== today().getFullYear() ? 'numeric' : undefined,
  });
}
function daysBetween(a, b) {
  return Math.round((b - a) / DAY);
}
function isoDay(date) {
  const p = (n) => String(n).padStart(2, '0');
  return date.getFullYear() + '-' + p(date.getMonth() + 1) + '-' + p(date.getDate());
}
function tile(cls, label, value) {
  return '<div class="' + cls + '"><small>' + label + '</small><b>' + value + '</b></div>';
}

// 생리 예정일 계산기: 다음 생리 = 마지막 시작일 + 주기, 배란 ≈ 다음 생리 14일 전, 가임기 = 배란 5일 전 ~ 1일 후.
function initPeriodCalc(form) {
  const out = form.parentElement.querySelector('.result');
  const en = document.documentElement.lang === 'en';
  form.last.value = isoDay(addDays(today(), -10));
  function run(e) {
    if (e) e.preventDefault();
    if (!form.last.value) return;
    const last = parseDay(form.last.value);
    const cycle = Math.min(60, Math.max(20, Number(form.cycle.value) || 28));
    const len = Math.min(10, Math.max(2, Number(form.len.value) || 5));
    let next = addDays(last, cycle);
    while (next < today()) next = addDays(next, cycle);
    const ov = addDays(next, -14);
    const rows = [
      tile('c', en ? 'Next period' : '다음 생리 예정일', fmt(next)),
      tile('c', en ? 'Period ends around' : '생리 끝나는 날(예상)', fmt(addDays(next, len - 1))),
      tile('a', en ? 'Ovulation (est.)' : '배란 예정일', fmt(ov)),
      tile('m', en ? 'Fertile window' : '가임기', fmt(addDays(ov, -5)) + ' ~ ' + fmt(addDays(ov, 1))),
      tile('v', en ? 'The one after' : '그다음 생리', fmt(addDays(next, cycle))),
      tile('v', en ? 'Days until next period' : '다음 생리까지', (en ? '' : 'D-') + daysBetween(today(), next) + (en ? ' days' : '')),
    ];
    out.innerHTML = rows.join('');
  }
  form.addEventListener('submit', run);
  form.addEventListener('change', run);
  run();
}

// 출산 예정일 계산기: 마지막 생리 시작일 + 280일(주기 차이 보정), 시험관은 이식일 + 266 - 배아 일수.
function initDueCalc(form) {
  const out = form.parentElement.querySelector('.result');
  const en = document.documentElement.lang === 'en';
  form.date.value = isoDay(addDays(today(), -70));
  const label = form.querySelector('[data-date-label]');
  const cycleRow = form.querySelector('[data-cycle]');
  const embryoRow = form.querySelector('[data-embryo]');
  function sync() {
    const ivf = form.method.value === 'ivf';
    label.textContent = ivf ? (en ? 'Transfer date' : '이식일') : (en ? 'First day of last period' : '마지막 생리 시작일');
    cycleRow.hidden = ivf;
    embryoRow.hidden = !ivf;
  }
  function run(e) {
    if (e) e.preventDefault();
    sync();
    if (!form.date.value) return;
    const d = parseDay(form.date.value);
    const due = form.method.value === 'ivf'
      ? addDays(d, 266 - Number(form.embryo.value))
      : addDays(d, 280 + (Number(form.cycle.value) || 28) - 28);
    const start = addDays(due, -280);
    const passed = daysBetween(start, today());
    const rows = [tile('c', en ? 'Estimated due date' : '출산 예정일', fmt(due))];
    if (passed >= 0 && passed <= 300) {
      rows.push(tile('v', en ? 'Today' : '오늘 기준',
        en ? Math.floor(passed / 7) + ' weeks ' + (passed % 7) + ' days' : '임신 ' + Math.floor(passed / 7) + '주 ' + (passed % 7) + '일'));
      rows.push(tile('m', en ? 'Days to go' : '예정일까지', (en ? '' : 'D-') + Math.max(0, daysBetween(today(), due)) + (en ? ' days' : '')));
    }
    rows.push(tile('a', en ? 'End of 1st trimester (13w6d)' : '임신 초기 끝 (13주 6일)', fmt(addDays(start, 97))));
    rows.push(tile('a', en ? 'Start of 3rd trimester (28w)' : '임신 후기 시작 (28주)', fmt(addDays(start, 196))));
    out.innerHTML = rows.join('');
  }
  form.addEventListener('submit', run);
  form.addEventListener('change', run);
  run();
}

document.querySelectorAll('form[data-calc="period"]').forEach(initPeriodCalc);
document.querySelectorAll('form[data-calc="due"]').forEach(initDueCalc);
