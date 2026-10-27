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

// 움직임: 동작 줄이기 설정이 아니면 켠다.
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const root = document.documentElement;
  root.classList.add('motion');

  // 위쪽 진행 막대와 헤더 그림자
  const bar = document.createElement('div');
  bar.className = 'progress';
  document.body.prepend(bar);
  const top = document.querySelector('.top');
  function onScroll() {
    const max = root.scrollHeight - innerHeight;
    bar.style.setProperty('--p', max > 0 ? (scrollY / max).toFixed(4) : 0);
    if (top) top.classList.toggle('scrolled', scrollY > 8);
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // 히어로 배경 빛
  const hero = document.querySelector('.hero');
  if (hero) {
    const glow = document.createElement('div');
    glow.className = 'glow';
    glow.setAttribute('aria-hidden', 'true');
    glow.innerHTML = '<i></i><i></i><i></i>';
    hero.prepend(glow);
  }

  // 폰이 마우스를 따라 살짝 움직인다
  const phones = document.querySelector('.phones');
  if (phones && matchMedia('(pointer: fine)').matches) {
    addEventListener('pointermove', (e) => {
      phones.style.setProperty('--mx', (e.clientX / innerWidth - 0.5).toFixed(3));
      phones.style.setProperty('--my', (e.clientY / innerHeight - 0.5).toFixed(3));
    }, { passive: true });
  }

  // 스크롤해서 보일 때 하나씩 나타난다. 같은 줄의 카드는 순서대로 조금씩 늦게.
  const group = '.grid > *, .who > *, .faq details';
  const targets = document.querySelectorAll(
    'section:not(.hero) .sec-title, section:not(.hero) .sec-lead, ' + group +
    ', .calc, .cta img, .cta .stores, .article > h2, .article > p, .crumbs'
  );
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  targets.forEach((el) => {
    if (el.matches(group)) {
      const i = [...el.parentElement.children].indexOf(el);
      el.style.setProperty('--i', i % 8);
    }
    el.classList.add('reveal');
    io.observe(el);
  });
})();

// 문의하기: 메일 주소를 보여 주고 복사하거나 메일 앱을 연다.
(function () {
  const en = document.documentElement.lang === 'en';
  // 단순 수집기에 덜 걸리도록 나눠서 조합한다.
  const email = ['iamborghini5757', 'gmail.com'].join('@');
  const t = en
    ? { title: 'Contact us', body: 'Questions, feedback or partnership ideas are all welcome. We usually reply within a few days.', copy: 'Copy', copied: 'Copied', mail: 'Open mail app', close: 'Close', by: 'Launch Lab · Wonthly' }
    : { title: '문의하기', body: '앱 사용 문의, 의견, 제휴 제안 모두 환영해요. 보통 며칠 안에 답장드려요.', copy: '복사', copied: '복사됨', mail: '메일 앱 열기', close: '닫기', by: 'Launch Lab · Wonthly' };

  let dialog;
  function open(e) {
    if (e) e.preventDefault();
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'contact';
      dialog.innerHTML =
        '<img src="/assets/icon-192.png" alt="" width="60" height="60">' +
        '<h2>' + t.title + '</h2><p>' + t.body + '</p>' +
        '<div class="mail"><span></span><button type="button" class="btn btn-dark btn-sm" data-copy>' + t.copy + '</button></div>' +
        '<div class="row"><a class="btn btn-coral btn-sm" data-mailto>' + t.mail + '</a>' +
        '<form method="dialog"><button class="btn btn-ghost btn-sm" style="width:100%">' + t.close + '</button></form></div>' +
        '<small>' + t.by + '</small>';
      dialog.querySelector('.mail span').textContent = email;
      dialog.querySelector('[data-mailto]').href = 'mailto:' + email + '?subject=' + encodeURIComponent('[Wonthly] ');
      const copy = dialog.querySelector('[data-copy]');
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(email);
        } catch (_) {
          const r = document.createRange();
          r.selectNodeContents(dialog.querySelector('.mail span'));
          const s = getSelection(); s.removeAllRanges(); s.addRange(r);
          document.execCommand('copy');
        }
        copy.textContent = t.copied;
        copy.classList.add('copied');
        setTimeout(() => { copy.textContent = t.copy; copy.classList.remove('copied'); }, 1800);
      });
      dialog.addEventListener('click', (ev) => { if (ev.target === dialog) dialog.close(); });
      document.body.appendChild(dialog);
    }
    dialog.showModal ? dialog.showModal() : (location.href = 'mailto:' + email);
  }
  document.querySelectorAll('[data-contact]').forEach((el) => el.addEventListener('click', open));
  if (location.hash === '#contact') open();
})();
