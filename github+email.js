/* ═══════════════════════════════════════════════════
   GITHUB REDIRECT PAGE — interactions + email logic
   Countdown · request modal · urgency selector ·
   validation · send via Resend (through your endpoint)
   ═══════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── EMAIL CONFIG ───────────────────────────────
     Resend's API cannot be called from the browser
     (the key would be public). The form posts to a
     tiny endpoint on YOUR server, which holds the
     key and calls Resend. Full setup steps are in
     Github-Email-Setup.md.                          */
  const SEND_ENDPOINT = '/api/github-access.php'; // change if you host it elsewhere
  const REQUEST_TIMEOUT_MS = 12000;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ═══ 1. REOPEN COUNTDOWN ═══ */
  const countdownEl = document.getElementById('ghCountdown');
  const reopenDate = new Date(2026, 8, 7); // 7 September 2026 (month is 0-indexed)

  (function renderCountdown() {
    const now = new Date();
    const days = Math.ceil((reopenDate - now) / 86400000);
    if (days > 1) {
      countdownEl.textContent = days + ' days to go';
    } else if (days === 1) {
      countdownEl.textContent = 'Reopening tomorrow';
    } else {
      countdownEl.textContent = 'Reopening any moment now';
    }
  })();

  /* ═══ 2. MODAL OPEN / CLOSE ═══ */
  const overlay = document.getElementById('ghOverlay');
  const modal = document.getElementById('ghModal');
  const openBtn = document.getElementById('ghRequestBtn');
  const closeBtn = document.getElementById('ghClose');
  const viewForm = document.getElementById('ghViewForm');
  const viewResult = document.getElementById('ghViewResult');
  let lastFocused = null;

  function showView(view) {
    [viewForm, viewResult].forEach((v) => {
      v.hidden = v !== view;
      v.classList.remove('leaving', 'arriving');
    });
    if (!reduceMotion) view.classList.add('arriving');
  }

  function openModal() {
    lastFocused = document.activeElement;
    overlay.classList.remove('success', 'issue', 'show-result');
    showView(viewForm);
    overlay.hidden = false;
    void overlay.offsetWidth;
    overlay.classList.add('open');
    document.body.classList.add('modal-open');
    document.getElementById('ghEmail').focus();
  }

  function closeModal() {
    overlay.classList.remove('open');
    document.body.classList.remove('modal-open');
    setTimeout(() => { overlay.hidden = true; }, reduceMotion ? 0 : 320);
    if (lastFocused) lastFocused.focus();
  }

  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('open')) return;

    if (e.key === 'Escape') closeModal();

    // focus trap
    if (e.key === 'Tab') {
      const focusable = Array.from(
        modal.querySelectorAll('button, a[href], input, textarea')
      ).filter((el) => !el.hidden && el.offsetParent !== null && !el.classList.contains('gh-hp'));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ═══ 3. URGENCY SELECTOR ═══ */
  const urgencyOpts = Array.from(document.querySelectorAll('.gh-urgency-opt'));
  let urgency = 'Just curious';

  urgencyOpts.forEach((opt) => {
    opt.addEventListener('click', () => {
      urgencyOpts.forEach((o) => {
        o.classList.remove('selected');
        o.setAttribute('aria-checked', 'false');
      });
      opt.classList.add('selected');
      opt.setAttribute('aria-checked', 'true');
      urgency = opt.dataset.value;
    });
  });

  /* ═══ 4. VALIDATION ═══ */
  const emailInput = document.getElementById('ghEmail');
  const emailError = document.getElementById('ghEmailError');
  const reasonInput = document.getElementById('ghReason');
  const honeypot = document.getElementById('ghCompany');

  function setEmailError(msg) {
    emailError.textContent = msg;
    emailError.classList.add('show');
    emailInput.classList.add('gh-invalid');
  }

  function clearEmailError() {
    emailError.classList.remove('show');
    emailInput.classList.remove('gh-invalid');
  }

  emailInput.addEventListener('input', clearEmailError);

  function validate() {
    const email = emailInput.value.trim();
    if (!email) { setEmailError('Please add your email so I know where to send the invite'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError('That email doesn\u2019t look right'); return false; }
    return true;
  }

  /* ═══ 5. SEND FLOW ═══ */
  const sendBtn = document.getElementById('ghSend');
  const sendLabel = document.getElementById('ghSendLabel');
  const resultTitle = document.getElementById('ghResultTitle');
  const resultBody = document.getElementById('ghResultBody');
  const resultSteps = document.getElementById('ghResultSteps');
  const resultPrimary = document.getElementById('ghResultPrimary');
  const resultEmail = document.getElementById('ghResultEmail');

  function setSending(on) {
    sendBtn.classList.toggle('sending', on);
    sendBtn.disabled = on;
    sendLabel.textContent = on ? 'Sending\u2026' : 'Send Request';
  }

  function transitionToResult(kind, title, body, opts) {
    opts = opts || {};
    overlay.classList.remove('success', 'issue', 'show-result');
    overlay.classList.add(kind);

    resultTitle.textContent = title;
    resultBody.textContent = body;
    resultSteps.hidden = !opts.showSteps;
    resultEmail.hidden = !opts.showEmailLink;
    resultPrimary.textContent = opts.primaryLabel || 'Done';

    if (reduceMotion) {
      showView(viewResult);
      overlay.classList.add('show-result');
      resultPrimary.focus();
      return;
    }

    viewForm.classList.add('leaving');
    setTimeout(() => {
      showView(viewResult);
      void overlay.offsetWidth; // restart icon draw animations
      overlay.classList.add('show-result');
      resultPrimary.focus();
    }, 250);
  }

  function backToForm() {
    overlay.classList.remove('success', 'issue', 'show-result');
    showView(viewForm);
    emailInput.focus();
  }

  resultPrimary.addEventListener('click', () => {
    // "Try again" returns to the form; "Done" closes
    if (resultPrimary.textContent === 'Try again') backToForm();
    else closeModal();
  });

  sendBtn.addEventListener('click', () => {
    if (!validate()) return;

    // bots fill hidden fields; humans never see this one
    if (honeypot.value) {
      transitionToResult('success', 'Request sent', 'You\u2019ll hear from me shortly with your invite.', { primaryLabel: 'Done' });
      return;
    }

    setSending(true);

    const payload = {
      email: emailInput.value.trim(),
      urgency: urgency,
      reason: reasonInput.value.trim() || 'Not specified',
      page: 'GitHub access request \u2014 developertim.com'
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    fetch(SEND_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    })
      .then((res) => {
        clearTimeout(timer);
        if (!res.ok) throw new Error('send_failed');
        return res.json().catch(() => ({}));
      })
      .then(() => {
        setSending(false);
        emailInput.value = '';
        reasonInput.value = '';
        transitionToResult('success', 'Request sent',
          'Your request is in my inbox. I\u2019ll send the GitHub invite to your email \u2014 usually within a day, faster if it\u2019s urgent.',
          { primaryLabel: 'Done' });
      })
      .catch(() => {
        clearTimeout(timer);
        setSending(false);
        transitionToResult('issue', 'Request didn\u2019t go through',
          'Something interrupted the delivery, your request hasn\u2019t been sent. Here\u2019s what usually fixes it:',
          { showSteps: true, showEmailLink: true, primaryLabel: 'Try again' });
      });
  });

})();