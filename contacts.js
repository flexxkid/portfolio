/* ═══════════════════════════════════════════════════
   CONTACTS PAGE — interactions
   Service picker · validation · EmailJS send ·
   daily allowance (5/day) · burst guard · status modal
   ═══════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── EMAILJS CONFIG ─────────────────────────────
     Paste the same IDs you currently use in
     contactsform.js. Nothing else needs changing. */
  const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';
  const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';
  const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';

  if (window.emailjs) {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  }

  /* ── SENDING ALLOWANCE SETTINGS ───────────────── */
  const DAILY_LIMIT = 5;            // messages per visitor per day
  const BURST_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
  const BURST_MAX = 3;              // 3 sends inside the window = pause for the day
  const STORE_KEY = 'tim_contact_log';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ═══ 1. PAGE REVEAL ANIMATIONS ═══ */
  const revealEls = document.querySelectorAll('.fade-up');

  if ('IntersectionObserver' in window && !reduceMotion) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    revealEls.forEach((el) => obs.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('visible'));
  }

  /* ═══ 2. SERVICE PICKER ═══ */
  const picker = document.getElementById('svcPicker');
  const trigger = document.getElementById('svcTrigger');
  const triggerText = document.getElementById('svcTriggerText');
  const panel = document.getElementById('svcPanel');
  const serviceInput = document.getElementById('service');
  const options = Array.from(panel.querySelectorAll('.svc-option'));
  let focusIndex = -1;

  function openPicker() {
    picker.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
    focusIndex = options.findIndex((o) => o.classList.contains('selected'));
  }

  function closePicker() {
    picker.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
    options.forEach((o) => o.classList.remove('focused'));
    focusIndex = -1;
  }

  function selectOption(opt) {
    options.forEach((o) => o.classList.remove('selected'));
    opt.classList.add('selected');
    serviceInput.value = opt.dataset.value;
    triggerText.textContent = opt.querySelector('.svc-name').textContent;
    triggerText.removeAttribute('data-placeholder');
    clearError('service');
    closePicker();
    trigger.focus();
  }

  function moveFocus(dir) {
    focusIndex = (focusIndex + dir + options.length) % options.length;
    options.forEach((o, i) => o.classList.toggle('focused', i === focusIndex));
    options[focusIndex].scrollIntoView({ block: 'nearest' });
  }

  trigger.addEventListener('click', () => {
    picker.classList.contains('open') ? closePicker() : openPicker();
  });

  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!picker.classList.contains('open')) openPicker();
      moveFocus(e.key === 'ArrowDown' ? 1 : -1);
    } else if ((e.key === 'Enter' || e.key === ' ') && picker.classList.contains('open') && focusIndex >= 0) {
      e.preventDefault();
      selectOption(options[focusIndex]);
    } else if (e.key === 'Escape') {
      closePicker();
    }
  });

  options.forEach((opt) => {
    opt.addEventListener('click', () => selectOption(opt));
    opt.addEventListener('mouseenter', () => {
      options.forEach((o) => o.classList.remove('focused'));
      focusIndex = options.indexOf(opt);
      opt.classList.add('focused');
    });
  });

  document.addEventListener('click', (e) => {
    if (!picker.contains(e.target)) closePicker();
  });

  /* ═══ 3. CHARACTER COUNTER ═══ */
  const messageEl = document.getElementById('message');
  const charCount = document.getElementById('charCount');

  messageEl.addEventListener('input', () => {
    const len = messageEl.value.length;
    charCount.textContent = len + ' / 1000';
    charCount.classList.toggle('warm', len > 900);
  });

  /* ═══ 4. VALIDATION ═══ */
  const fields = ['name', 'email', 'subject', 'service', 'message'];

  function setError(id, msg) {
    const errEl = document.getElementById('err-' + id);
    const inputEl = id === 'service' ? trigger : document.getElementById(id);
    if (errEl) {
      errEl.textContent = msg;
      errEl.classList.add('show');
    }
    inputEl.classList.add('invalid');
  }

  function clearError(id) {
    const errEl = document.getElementById('err-' + id);
    const inputEl = id === 'service' ? trigger : document.getElementById(id);
    if (errEl) errEl.classList.remove('show');
    inputEl.classList.remove('invalid');
  }

  fields.forEach((id) => {
    if (id === 'service') return;
    document.getElementById(id).addEventListener('input', () => clearError(id));
  });

  function validate() {
    let ok = true;
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const subject = document.getElementById('subject').value.trim();
    const message = messageEl.value.trim();

    if (!name) { setError('name', 'Please add your name'); ok = false; }
    if (!email) {
      setError('email', 'Please add your email');
      ok = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('email', 'That email doesn\u2019t look right');
      ok = false;
    }
    if (!subject) { setError('subject', 'A short subject helps me respond faster'); ok = false; }
    if (!serviceInput.value) { setError('service', 'Pick the service closest to what you need'); ok = false; }
    if (!message) {
      setError('message', 'Tell me a little about your project');
      ok = false;
    } else if (message.length < 20) {
      setError('message', 'A few more details would help \u2014 aim for at least 20 characters');
      ok = false;
    }
    return ok;
  }

  /* ═══ 5. SENDING ALLOWANCE (per visitor, per day) ═══ */
  function todayKey() {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function readLog() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY)) || {};
      if (raw.day !== todayKey()) {
        return { day: todayKey(), sends: [], paused: false };
      }
      return raw;
    } catch (e) {
      return { day: todayKey(), sends: [], paused: false };
    }
  }

  function writeLog(log) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(log)); } catch (e) { /* storage unavailable */ }
  }

  function sentToday() { return readLog().sends.length; }
  function remainingToday() { return Math.max(0, DAILY_LIMIT - sentToday()); }
  function isPaused() { return readLog().paused === true; }

  function recordSend() {
    const log = readLog();
    const now = Date.now();
    log.sends.push(now);

    // burst guard: too many messages in a short space of time
    const recent = log.sends.filter((t) => now - t <= BURST_WINDOW_MS);
    if (recent.length >= BURST_MAX) log.paused = true;

    writeLog(log);
  }

  /* ═══ 6. STATUS MODAL ═══ */
  const overlay = document.getElementById('msgOverlay');
  const modal = document.getElementById('msgModal');
  const msgClose = document.getElementById('msgClose');
  const msgTitle = document.getElementById('msgTitle');
  const msgBody = document.getElementById('msgBody');
  const msgSteps = document.getElementById('msgSteps');
  const msgQuotaText = document.getElementById('msgQuotaText');
  const pips = Array.from(document.querySelectorAll('#msgQuotaPips .pip'));
  const msgPrimary = document.getElementById('msgPrimary');
  const msgSecondary = document.getElementById('msgSecondary');
  let lastFocused = null;

  function renderQuota() {
    const used = sentToday();
    const left = remainingToday();

    pips.forEach((pip, i) => {
      pip.classList.toggle('used', i < used);
      pip.classList.toggle('last', i === used - 1);
    });

    if (isPaused()) {
      msgQuotaText.textContent = 'Sending paused for today';
    } else if (left === 0) {
      msgQuotaText.textContent = 'No messages left today';
    } else {
      msgQuotaText.textContent = left + (left === 1 ? ' message' : ' messages') + ' left today';
    }
  }

  function openStatusModal(kind, title, body, opts) {
    opts = opts || {};
    lastFocused = document.activeElement;

    overlay.classList.remove('success', 'issue', 'empty');
    overlay.classList.add(kind === 'success' ? 'success' : 'issue');
    if (opts.empty) overlay.classList.add('empty');

    msgTitle.textContent = title;
    msgBody.textContent = body;
    msgSteps.hidden = !opts.showSteps;
    msgSecondary.hidden = !opts.showEmailLink;
    msgPrimary.textContent = opts.primaryLabel || 'Done';

    renderQuota();

    overlay.hidden = false;
    void overlay.offsetWidth; // restart entrance + icon animations
    overlay.classList.add('open');
    document.body.classList.add('modal-open');
    msgPrimary.focus();
  }

  function closeStatusModal() {
    overlay.classList.remove('open');
    document.body.classList.remove('modal-open');
    setTimeout(() => { overlay.hidden = true; }, reduceMotion ? 0 : 320);
    if (lastFocused) lastFocused.focus();
  }

  msgClose.addEventListener('click', closeStatusModal);
  msgPrimary.addEventListener('click', closeStatusModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeStatusModal(); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeStatusModal();

    if (e.key === 'Tab' && overlay.classList.contains('open')) {
      const focusable = Array.from(modal.querySelectorAll('button, a[href]')).filter((el) => !el.hidden);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ═══ 7. SEND FLOW ═══ */
  const sendBtn = document.getElementById('sendBtn');
  const sendBtnLabel = document.getElementById('sendBtnLabel');
  const sendNote = document.getElementById('sendNote');

  function refreshSendState() {
    if (isPaused()) {
      sendBtn.disabled = true;
      sendBtnLabel.textContent = 'Sending paused';
      sendNote.textContent = 'Sending from this page is paused for today. You can still reach me directly by email or WhatsApp.';
      sendNote.classList.add('show');
    } else if (remainingToday() === 0) {
      sendBtn.disabled = true;
      sendBtnLabel.textContent = 'Daily limit reached';
      sendNote.textContent = 'You\u2019ve used today\u2019s messages from this page. It resets tomorrow \u2014 or email me directly any time.';
      sendNote.classList.add('show');
    } else {
      sendBtn.disabled = false;
      sendBtnLabel.textContent = 'Send Message';
      sendNote.classList.remove('show');
    }
  }

  function setSending(on) {
    sendBtn.classList.toggle('sending', on);
    sendBtn.disabled = on;
    sendBtnLabel.textContent = on ? 'Sending\u2026' : 'Send Message';
  }

  function clearForm() {
    ['name', 'email', 'subject'].forEach((id) => { document.getElementById(id).value = ''; });
    messageEl.value = '';
    charCount.textContent = '0 / 1000';
    charCount.classList.remove('warm');
    serviceInput.value = '';
    triggerText.textContent = 'Select a service';
    triggerText.setAttribute('data-placeholder', 'true');
    options.forEach((o) => o.classList.remove('selected'));
  }

  sendBtn.addEventListener('click', () => {
    // friendly gate checks first
    if (isPaused()) {
      openStatusModal('issue', 'Sending is paused for today',
        'Quite a few messages went out in a short space of time, so sending from this page is taking a break until tomorrow. I\u2019d still love to hear from you directly.',
        { showEmailLink: true, primaryLabel: 'Okay', empty: true });
      return;
    }

    if (remainingToday() === 0) {
      openStatusModal('issue', 'That\u2019s all for today',
        'You\u2019ve used all ' + DAILY_LIMIT + ' messages available from this page today. It resets tomorrow \u2014 or you can email me directly right now.',
        { showEmailLink: true, primaryLabel: 'Okay', empty: true });
      return;
    }

    if (!validate()) return;

    setSending(true);

    const params = {
      name: document.getElementById('name').value.trim(),
      email: document.getElementById('email').value.trim(),
      subject: document.getElementById('subject').value.trim(),
      service: serviceInput.value,
      message: messageEl.value.trim()
    };

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params)
      .then(() => {
        recordSend();
        setSending(false);
        refreshSendState();
        clearForm();

        const left = remainingToday();
        if (isPaused()) {
          openStatusModal('success', 'Message sent',
            'Your message is on its way \u2014 I\u2019ll get back to you within 24 hours on weekdays. Sending from this page is now paused until tomorrow, but you can always email me directly.',
            { showEmailLink: true, primaryLabel: 'Done' });
        } else if (left === 0) {
          openStatusModal('success', 'Message sent',
            'Your message is on its way \u2014 I\u2019ll get back to you within 24 hours on weekdays. That was the last message available from this page today.',
            { primaryLabel: 'Done' });
        } else {
          openStatusModal('success', 'Message sent',
            'Thanks for reaching out \u2014 I\u2019ll get back to you within 24 hours on weekdays.',
            { primaryLabel: 'Done' });
        }
      })
      .catch(() => {
        setSending(false);
        refreshSendState();
        openStatusModal('issue', 'Message didn\u2019t go through',
          'Something interrupted the delivery \u2014 your message hasn\u2019t been sent. Here\u2019s what usually fixes it:',
          { showSteps: true, showEmailLink: true, primaryLabel: 'Try again' });
      });
  });

  // initial state on load (handles returning visitors)
  refreshSendState();

})();