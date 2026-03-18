const EMAILJS_PUBLIC_KEY  = '23iit2cXJCEMKrlFf';
const EMAILJS_SERVICE_ID  = 'service_fkkyd4f';
const EMAILJS_TEMPLATE_ID = 'template_uml7rmj';

  emailjs.init(EMAILJS_PUBLIC_KEY);

  function sendMessage() {
    const name    = document.getElementById('name').value.trim();
    const email   = document.getElementById('email').value.trim();
    const subject = document.getElementById('subject').value.trim();
    const budget  = document.getElementById('budget').value;
    const message = document.getElementById('message').value.trim();
    const btn      = document.getElementById('sendBtn');
    const feedback = document.getElementById('form-feedback');

    // Basic validation
    if (!name || !email || !message) {
      showFeedback('Please fill in your name, email and message.', 'error');
      return;
    }

    if (!email.includes('@')) {
      showFeedback('Please enter a valid email address.', 'error');
      return;
    }

    // Disable button while sending
    btn.disabled = true;
    btn.textContent = 'Sending...';

    // Template parameters — these must match your EmailJS template variables
    const templateParams = {
      from_name:    name,
      from_email:   email,
      subject:      subject || '(No subject)',
      budget:       budget  || 'Not specified',
      message:      message,
      reply_to:     email,
      sent_at:      new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })
    };

emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
  .then(() => {
    // Send auto-reply to client
    return emailjs.send(EMAILJS_SERVICE_ID, 'template_kelkdho', templateParams);
  })
  .then(() => {
    showFeedback("Message sent — I'll get back to you within 24 hours.", 'success');
    document.getElementById('name').value    = '';
    document.getElementById('email').value   = '';
    document.getElementById('subject').value = '';
    document.getElementById('budget').value  = '';
    document.getElementById('message').value = '';
    btn.disabled    = false;
    btn.textContent = 'Send Message';
  })
  .catch((error) => {
    console.error('EmailJS error:', error);
    showFeedback('Something went wrong. Try emailing me directly at timothy.kioko001@gmail.com', 'error');
    btn.disabled    = false;
    btn.textContent = 'Send Message';
  });
  }

  function showFeedback(text, type) {
    const el = document.getElementById('form-feedback');
    el.textContent = text;
    el.style.display    = 'block';
    el.style.fontFamily = "'DM Mono', monospace";
    el.style.fontSize   = '0.7rem';
    el.style.letterSpacing = '0.08em';
    el.style.padding    = '0.9rem 1.2rem';
    el.style.borderRadius = '2px';
    el.style.marginBottom = '0.5rem';
    el.style.lineHeight = '1.6';

    if (type === 'success') {
      el.style.color      = 'var(--green-bright)';
      el.style.background = 'rgba(62,200,120,0.07)';
      el.style.border     = '1px solid rgba(62,200,120,0.2)';
    } else {
      el.style.color      = '#e07a5f';
      el.style.background = 'rgba(224,122,95,0.07)';
      el.style.border     = '1px solid rgba(224,122,95,0.2)';
    }
  }
