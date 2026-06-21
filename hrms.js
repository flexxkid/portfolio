/* ═══════════════════════════════════════════════════
   HRMS PROJECT PAGE — interactions
   Reading progress · section rail · scroll reveals ·
   animated counters · phase track · download modal
   ═══════════════════════════════════════════════════ */

(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 1. READING PROGRESS BAR ───────────────────── */
  const progressBar = document.getElementById('readProgress');

  function updateProgress() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    progressBar.style.width = pct + '%';
  }

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  /* ── 2. SCROLL-TRIGGERED FADE-UP REVEALS ───────── */
  const revealEls = document.querySelectorAll('.fade-up');

  if ('IntersectionObserver' in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('visible'));
  }

  /* ── 3. SECTION RAIL ACTIVE STATE ──────────────── */
  const railDots = document.querySelectorAll('.rail-dot');
  const railSections = Array.from(railDots)
    .map((dot) => document.getElementById(dot.dataset.rail))
    .filter(Boolean);

  if ('IntersectionObserver' in window && railSections.length) {
    const railObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          railDots.forEach((d) => d.classList.toggle('active', d.dataset.rail === entry.target.id));
        }
      });
    }, { rootMargin: '-35% 0px -55% 0px' });

    railSections.forEach((sec) => railObserver.observe(sec));
  }

  /* ── 4. ANIMATED OUTCOME COUNTERS ──────────────── */
  const counters = document.querySelectorAll('.count-up');

  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const from = parseInt(el.dataset.from || '0', 10);
    const suffix = el.dataset.suffix || '';
    const duration = 1400;
    const start = performance.now();

    function frame(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const value = Math.round(from + (target - from) * eased);
      el.textContent = value.toLocaleString() + suffix;
      if (t < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  if ('IntersectionObserver' in window && !reduceMotion) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });

    counters.forEach((c) => counterObserver.observe(c));
  } else {
    counters.forEach((c) => {
      c.textContent = parseInt(c.dataset.target, 10).toLocaleString() + (c.dataset.suffix || '');
    });
  }

  /* ── 5. PHASE TRACK PROGRESS LINE ──────────────── */
  const phaseTrack = document.getElementById('phaseTrack');

  if (phaseTrack && 'IntersectionObserver' in window) {
    const phaseObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          phaseTrack.classList.add('visible');
          phaseObserver.unobserve(phaseTrack);
        }
      });
    }, { threshold: 0.3 });

    phaseObserver.observe(phaseTrack);
  }

  /* ── 6. DOWNLOAD MODAL ─────────────────────────── */
  const overlay      = document.getElementById('dlOverlay');
  const modal        = document.getElementById('dlModal');
  const closeBtn     = document.getElementById('dlModalClose');
  const cancelBtn    = document.getElementById('dlCancel');
  const startBtn     = document.getElementById('dlStart');
  const startLabel   = document.getElementById('dlStartLabel');
  const verifyFill   = document.getElementById('dlVerifyFill');
  const verifyText   = document.getElementById('dlVerifyText');
  const anchor       = document.getElementById('dlAnchor');
  const toast        = document.getElementById('dlToast');
  const toastText    = document.getElementById('dlToastText');

  const fields = {
    platform: document.getElementById('dlModalPlatform'),
    file:     document.getElementById('dlModalFile'),
    size:     document.getElementById('dlModalSize'),
    format:   document.getElementById('dlModalFormat'),
    req:      document.getElementById('dlModalReq'),
    note:     document.getElementById('dlModalNote'),
    icon:     document.getElementById('dlModalIcon')
  };

  let activeCard = null;
  let lastFocused = null;
  let verifyTimer = null;
  let toastTimer = null;

  function resetVerify() {
    clearInterval(verifyTimer);
    verifyFill.style.width = '0%';
    verifyFill.classList.remove('done');
    verifyText.classList.remove('active');
    verifyText.textContent = 'Ready to download';
    startBtn.disabled = false;
    startLabel.textContent = 'Coming Soon';
  }

  function openModal(card) {
    activeCard = card;
    lastFocused = document.activeElement;

    fields.platform.textContent = card.dataset.platform;
    fields.file.textContent     = card.dataset.filename;
    fields.size.textContent     = card.dataset.size;
    fields.format.textContent   = card.dataset.format;
    fields.req.textContent      = card.dataset.req;
    fields.note.textContent     = card.dataset.note;
    fields.icon.innerHTML       = card.querySelector('.dl-icon').innerHTML;

    resetVerify();

    overlay.hidden = false;
    // force reflow so the transition plays
    void overlay.offsetWidth;
    overlay.classList.add('open');
    document.body.classList.add('modal-open');
    closeBtn.focus();
  }

  function closeModal() {
    overlay.classList.remove('open');
    document.body.classList.remove('modal-open');
    clearInterval(verifyTimer);
    setTimeout(() => {
      overlay.hidden = true;
      resetVerify();
    }, reduceMotion ? 0 : 320);
    if (lastFocused) lastFocused.focus();
  }

  function showToast(message) {
    toastText.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  function triggerDownload() {
    anchor.href = activeCard.dataset.href;
    anchor.setAttribute('download', activeCard.dataset.filename);
    anchor.click();
  }

  function startDownload() {
    if (!activeCard) return;
    startBtn.disabled = true;
    startLabel.textContent = 'Preparing…';
    verifyText.textContent = 'Verifying package integrity';
    verifyText.classList.add('active');

    if (reduceMotion) {
      verifyFill.style.width = '100%';
      verifyFill.classList.add('done');
      verifyText.textContent = 'Verified · download started';
      triggerDownload();
      showToast(activeCard.dataset.platform + ' download started');
      setTimeout(closeModal, 600);
      return;
    }

    let pct = 0;
    verifyTimer = setInterval(() => {
      // ease toward 100 with a natural-feeling ramp
      pct += Math.random() * 16 + 6;
      if (pct >= 100) {
        pct = 100;
        clearInterval(verifyTimer);
        verifyFill.style.width = '100%';
        verifyFill.classList.add('done');
        verifyText.textContent = 'Verified · download started';
        startLabel.textContent = 'Started';
        triggerDownload();
        showToast(activeCard.dataset.platform + ' download started');
        setTimeout(closeModal, 1100);
      } else {
        verifyFill.style.width = pct + '%';
      }
    }, 140);
  }

  document.querySelectorAll('.dl-card').forEach((card) => {
    card.addEventListener('click', () => openModal(card));
  });

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  startBtn.addEventListener('click', startDownload);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();

    // simple focus trap while the modal is open
    if (e.key === 'Tab' && overlay.classList.contains('open')) {
      const focusable = modal.querySelectorAll('button, a[href]');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

})();