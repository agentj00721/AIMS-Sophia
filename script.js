/* ============================================================
   Wellx × AIMS Gulf — interactive proposal
   ============================================================ */
(function () {
  'use strict';

  const chapters = Array.from(document.querySelectorAll('.chapter'));
  const navLinks = Array.from(document.querySelectorAll('.rail-list a'));
  const progressFill = document.getElementById('progressFill');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const curNo = document.getElementById('curNo');
  const isMobile = () => window.matchMedia('(max-width:820px)').matches;

  let current = 0;
  const total = chapters.length;

  function idOf(i) { return chapters[i].id; }

  function go(index, push) {
    index = Math.max(0, Math.min(total - 1, index));
    current = index;

    if (isMobile()) {
      chapters[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      chapters.forEach((c, i) => c.classList.toggle('active', i === index));
      const deck = document.getElementById('deck');
      if (deck) deck.scrollTop = 0;
    }

    navLinks.forEach((a, i) => a.classList.toggle('current', i === index));
    progressFill.style.width = ((index) / (total - 1)) * 100 + '%';
    curNo.textContent = String(index).padStart(2, '0');
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === total - 1;

    triggerCounters(chapters[index]);

    if (push !== false) {
      history.replaceState(null, '', '#' + idOf(index));
    }
    closeRail();
  }

  // ---- Navigation events ----
  document.querySelectorAll('[data-nav]').forEach(a => {
    a.addEventListener('click', e => {
      const hash = a.getAttribute('href');
      const i = chapters.findIndex(c => '#' + c.id === hash);
      if (i >= 0) { e.preventDefault(); go(i); }
    });
  });
  document.querySelectorAll('[data-next]').forEach(b =>
    b.addEventListener('click', () => go(current + 1)));

  prevBtn.addEventListener('click', () => go(current - 1));
  nextBtn.addEventListener('click', () => go(current + 1));

  // ---- Keyboard ----
  document.addEventListener('keydown', e => {
    if (isMobile()) return;
    if (['ArrowRight', 'PageDown'].includes(e.key)) { e.preventDefault(); go(current + 1); }
    else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); go(current - 1); }
    else if (e.key === 'Home') { go(0); }
    else if (e.key === 'End') { go(total - 1); }
  });

  // ---- Wheel paging (desktop) ----
  let wheelLock = false;
  document.getElementById('deck').addEventListener('wheel', e => {
    if (isMobile()) return;
    const ch = chapters[current];
    const atTop = ch.scrollTop <= 2;
    const atBottom = ch.scrollTop + ch.clientHeight >= ch.scrollHeight - 2;
    if ((e.deltaY > 0 && !atBottom) || (e.deltaY < 0 && !atTop)) return; // let inner scroll
    if (wheelLock) return;
    if (Math.abs(e.deltaY) < 18) return;
    wheelLock = true;
    if (e.deltaY > 0) go(current + 1); else go(current - 1);
    setTimeout(() => { wheelLock = false; }, 850);
  }, { passive: true });

  // ---- Mobile rail ----
  const rail = document.getElementById('rail');
  const scrim = document.getElementById('railScrim');
  const toggle = document.getElementById('menuToggle');
  function closeRail() { rail.classList.remove('open'); scrim.classList.remove('show'); }
  toggle && toggle.addEventListener('click', () => {
    rail.classList.toggle('open'); scrim.classList.toggle('show');
  });
  scrim && scrim.addEventListener('click', closeRail);

  // ---- Mobile scroll-spy ----
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver(entries => {
      if (!isMobile()) return;
      entries.forEach(en => {
        if (en.isIntersecting) {
          const i = chapters.indexOf(en.target);
          navLinks.forEach((a, k) => a.classList.toggle('current', k === i));
          curNo.textContent = String(i).padStart(2, '0');
          triggerCounters(en.target);
        }
      });
    }, { threshold: 0.5 });
    chapters.forEach(c => spy.observe(c));
  }

  // ---- Animated counters ----
  function triggerCounters(scope) {
    scope.querySelectorAll('[data-count]').forEach(el => {
      if (el.dataset.done) return;
      el.dataset.done = '1';
      const target = +el.dataset.count;
      const suffix = el.dataset.suffix || '';
      const dur = 1400, start = performance.now();
      function fmt(n) {
        if (target >= 1000) return Math.round(n).toLocaleString('en-US');
        return Math.round(n);
      }
      function tick(now) {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  // ============================================================
  //  Volume pricing calculator — Option 5 (banded tiers)
  // ============================================================
  const TIERS = [
    { name: 'Tier 1', cap: 10000,  rate: 30, color: '#fb9b35' },
    { name: 'Tier 2', cap: 50000,  rate: 25, color: '#f1517b' },
    { name: 'Tier 3', cap: 100000, rate: 22, color: '#b43082' },
    { name: 'Tier 4', cap: 200000, rate: 18, color: '#8431cb' },
    { name: 'Tier 5', cap: 300000, rate: 15, color: '#35c5fc' }
  ];

  const slider = document.getElementById('memberSlider');
  if (slider) {
    const memberCount = document.getElementById('memberCount');
    const annualTotal = document.getElementById('annualTotal');
    const blendedRate = document.getElementById('blendedRate');
    const bandsEl = document.getElementById('calcBands');
    const tableRows = Array.from(document.querySelectorAll('.tier-table tbody tr'));
    const MAX = 300000;

    function compute(n) {
      let remaining = n, total = 0, prevCap = 0;
      const segments = [];
      for (const t of TIERS) {
        const room = t.cap - prevCap;
        const inBand = Math.max(0, Math.min(remaining, room));
        if (inBand > 0) { total += inBand * t.rate; segments.push({ ...t, members: inBand }); }
        remaining -= inBand; prevCap = t.cap;
        if (remaining <= 0) break;
      }
      return { total, segments };
    }

    function render() {
      const n = +slider.value;
      const { total, segments } = compute(n);
      memberCount.textContent = n.toLocaleString('en-US');
      annualTotal.textContent = '$' + total.toLocaleString('en-US');
      blendedRate.textContent = '$' + (n ? (total / n) : 0).toFixed(2);

      // band bar (width proportional to members, scaled to MAX)
      bandsEl.innerHTML = '';
      segments.forEach(s => {
        const div = document.createElement('div');
        div.className = 'band';
        div.style.background = s.color;
        div.style.flexBasis = (s.members / MAX * 100) + '%';
        if (s.members / MAX > 0.05) {
          div.innerHTML = '<span>' + s.members.toLocaleString('en-US') + ' @ $' + s.rate + '</span>';
        }
        div.title = s.name + ' · ' + s.members.toLocaleString('en-US') + ' members @ $' + s.rate;
        bandsEl.appendChild(div);
      });

      const activeNames = segments.map(s => s.name);
      tableRows.forEach((row, i) => row.classList.toggle('on', activeNames.includes(TIERS[i].name)));
    }
    slider.addEventListener('input', render);
    render();
  }

  // ============================================================
  //  Portfolio tabs
  // ============================================================
  document.querySelectorAll('.ptab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.ptab').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.ptab-panel').forEach(p =>
        p.classList.toggle('active', p.dataset.panel === tab));
    });
  });

  // ---- Initial chapter from hash ----
  const startHash = location.hash;
  const startIdx = chapters.findIndex(c => '#' + c.id === startHash);
  if (!isMobile()) {
    go(startIdx >= 0 ? startIdx : 0, false);
  } else {
    navLinks.forEach((a, i) => a.classList.toggle('current', i === 0));
    if (startIdx > 0) setTimeout(() => chapters[startIdx].scrollIntoView(), 60);
    triggerCounters(chapters[0]);
  }

  // Re-evaluate layout on resize between mobile/desktop
  let lastMobile = isMobile();
  window.addEventListener('resize', () => {
    const m = isMobile();
    if (m !== lastMobile) { lastMobile = m; go(current, false); }
  });
})();
