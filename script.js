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

    // Header logo adapts to the chapter background (white AIMS on dark)
    document.body.classList.toggle('chapter-dark',
      chapters[index].matches('.dark, .cover, .contact'));

    if (isMobile()) {
      chapters[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      chapters.forEach((c, i) => c.classList.toggle('active', i === index));
      chapters[index].scrollTop = 0; // always enter a chapter at the top
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
    requestAnimationFrame(updateScrollCue);
    setTimeout(updateScrollCue, 660);
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

  // Note: mouse-wheel does NOT change chapters — it scrolls within a chapter
  // when content overflows. Chapter changes happen only via the nav rail,
  // arrow keys, the prev/next controls, or the on-page buttons. This keeps
  // navigation predictable (no accidental jumps while reading).

  // ---- Scroll-for-more cue ----
  const scrollCue = document.getElementById('scrollCue');
  function updateScrollCue() {
    if (!scrollCue) return;
    if (isMobile()) { scrollCue.classList.remove('show'); return; }
    const ch = chapters[current];
    const overflows = ch.scrollHeight - ch.clientHeight > 16;
    const nearTop = ch.scrollTop < 48;
    scrollCue.classList.toggle('show', overflows && nearTop);
  }
  chapters.forEach(c => c.addEventListener('scroll', () => {
    if (c === chapters[current]) updateScrollCue();
  }, { passive: true }));

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
  // X Upgrade volume pricing — per member, per MONTH (billed annually).
  // (These are the annual $30/$25/$22/$18/$15 tiers expressed monthly.)
  const TIERS = [
    { name: 'Tier 1', cap: 10000,  rate: 2.5,        color: '#fb9b35' },
    { name: 'Tier 2', cap: 50000,  rate: 25 / 12,    color: '#f1517b' },
    { name: 'Tier 3', cap: 100000, rate: 22 / 12,    color: '#b43082' },
    { name: 'Tier 4', cap: 200000, rate: 1.5,        color: '#8431cb' },
    { name: 'Tier 5', cap: 300000, rate: 1.25,       color: '#35c5fc' }
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
      annualTotal.textContent = '$' + Math.round(total).toLocaleString('en-US');
      blendedRate.textContent = '$' + (n ? (total / n) : 0).toFixed(2);

      // Proportional colour bar — pure colour blocks, so no label can ever
      // be clipped while the slider moves. The numbers live in the legend
      // below, which wraps and is always fully visible at any width.
      bandsEl.innerHTML = '';
      const legendEl = document.getElementById('calcLegend');
      if (legendEl) legendEl.innerHTML = '';
      segments.forEach(s => {
        const div = document.createElement('div');
        div.className = 'band';
        div.style.background = s.color;
        div.style.flexBasis = (s.members / MAX * 100) + '%';
        div.title = s.name + ' · ' + s.members.toLocaleString('en-US') + ' members @ $' + s.rate.toFixed(2) + '/mo';
        bandsEl.appendChild(div);
        if (legendEl) {
          const chip = document.createElement('div');
          chip.className = 'legend-chip';
          chip.innerHTML = '<i style="background:' + s.color + '"></i>' +
            '<b>' + s.members.toLocaleString('en-US') + '</b> &times; $' + s.rate.toFixed(2) +
            ' <em>= $' + Math.round(s.members * s.rate).toLocaleString('en-US') + '/mo</em>';
          legendEl.appendChild(chip);
        }
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
  const startAt = startIdx >= 0 ? startIdx : 0;
  if (!isMobile()) {
    go(startAt, false);
  } else {
    // Mobile: keep an .active chapter assigned so a later resize to desktop
    // always has a valid chapter to show (avoids a blank state).
    current = startAt;
    chapters.forEach((c, i) => c.classList.toggle('active', i === startAt));
    navLinks.forEach((a, i) => a.classList.toggle('current', i === startAt));
    curNo.textContent = String(startAt).padStart(2, '0');
    if (startIdx > 0) setTimeout(() => chapters[startIdx].scrollIntoView(), 60);
    triggerCounters(chapters[startAt]);
  }

  // Re-evaluate layout on resize between mobile/desktop
  let lastMobile = isMobile();
  let resizeT;
  window.addEventListener('resize', () => {
    const m = isMobile();
    if (m !== lastMobile) { lastMobile = m; go(current, false); }
    clearTimeout(resizeT);
    resizeT = setTimeout(updateScrollCue, 150);
  });

  // ============================================================
  //  PDF export — captures the branded design and builds a
  //  paginated, footer-stamped PDF for executive sharing.
  // ============================================================
  const pdfBtn = document.getElementById('pdfBtn');
  const pdfOverlay = document.getElementById('pdfOverlay');
  const pdfProgress = document.getElementById('pdfProgress');

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = () => rej(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }
  let libsReady = false;
  async function ensureLibs() {
    if (libsReady) return;
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    libsReady = true;
  }
  // setTimeout (not rAF) so the export keeps progressing even if the tab
  // is backgrounded mid-render (rAF is paused in hidden tabs).
  const settle = () => new Promise(r => setTimeout(r, 45));

  async function exportPDF() {
    if (pdfBtn.disabled) return;
    pdfBtn.disabled = true;
    pdfOverlay.classList.add('show');
    try {
      if (pdfProgress) pdfProgress.textContent = 'Loading…';
      await ensureLibs();
      const { jsPDF } = window.jspdf;
      document.body.classList.add('exporting');
      closeRail();
      // Make sure animated stat counters show their final value in the PDF
      document.querySelectorAll('[data-count]').forEach(el => {
        const t = +el.dataset.count, suf = el.dataset.suffix || '';
        el.textContent = (t >= 1000 ? Math.round(t).toLocaleString('en-US') : t) + suf;
      });
      // Uniform 16:9 slide pages — each chapter is scaled to FIT (contain)
      // and centred, with the letterbox filled to match the chapter edge so
      // it reads as full-bleed. No clipping, consistent page size throughout.
      const PW = 1600, CONT = 900, FT = 58, PH = CONT + FT;
      let pdf = null;
      for (let i = 0; i < chapters.length; i++) {
        if (pdfProgress) pdfProgress.textContent = 'Rendering page ' + (i + 1) + ' of ' + chapters.length;
        const ch = chapters[i];
        const isDark = ch.matches('.dark, .cover, .contact');
        ch.classList.add('pdf-cap');
        await settle();
        const canvas = await window.html2canvas(ch, {
          scale: 2, backgroundColor: isDark ? '#0a0a14' : '#eef0f5',
          useCORS: true, logging: false, windowWidth: 1180, scrollX: 0, scrollY: 0
        });
        ch.classList.remove('pdf-cap');
        const iw = canvas.width, ih = canvas.height;
        const px = canvas.getContext('2d').getImageData(0, 0, 1, 1).data; // edge colour
        const scale = Math.min(PW / iw, CONT / ih);
        const dw = iw * scale, dh = ih * scale;
        const dx = (PW - dw) / 2, dy = (CONT - dh) / 2;
        if (!pdf) pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [PW, PH], compress: true });
        else pdf.addPage([PW, PH], 'landscape');
        pdf.setFillColor(px[0], px[1], px[2]);
        pdf.rect(0, 0, PW, CONT, 'F');                 // seamless letterbox
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.94), 'JPEG', dx, dy, dw, dh);
        pdf.setFillColor(10, 10, 20);
        pdf.rect(0, CONT, PW, FT, 'F');                // footer band
        pdf.setDrawColor(132, 49, 203); pdf.setLineWidth(2);
        pdf.line(0, CONT, PW, CONT);
        pdf.setTextColor(200, 200, 226);
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(15);
        pdf.text('AIMS Gulf   ×   Wellx  —  Partnership Proposal', 30, CONT + FT / 2 + 5);
        pdf.text('Page ' + (i + 1) + ' / ' + chapters.length, PW - 30, CONT + FT / 2 + 5, { align: 'right' });
      }
      document.body.classList.remove('exporting');
      if (pdfProgress) pdfProgress.textContent = 'Saving…';
      pdf.save('AIMS-Gulf-x-Wellx-Proposal.pdf');
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Sorry — the PDF could not be generated. Please check your connection and try again from a desktop browser.');
    } finally {
      document.body.classList.remove('exporting');
      document.querySelectorAll('.pdf-cap').forEach(e => e.classList.remove('pdf-cap'));
      pdfOverlay.classList.remove('show');
      pdfBtn.disabled = false;
      go(current, false); // restore the active chapter cleanly
    }
  }
  if (pdfBtn) pdfBtn.addEventListener('click', exportPDF);
})();
