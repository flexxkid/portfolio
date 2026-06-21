/* ═══════════════════════════════════════════════════
   NETWORKING PROJECTS — fetch · render · filter · modal
   ═══════════════════════════════════════════════════ */

(function () {
  'use strict';

  const DATA_URL = 'network.json'; // adjust if you store it elsewhere
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let projects = [];
  let currentFilter = 'all';

  /* ── DOM refs ── */
  const grid = document.getElementById('projectsGrid');
  const loadingState = document.getElementById('loadingState');
  const errorState = document.getElementById('errorState');
  const emptyState = document.getElementById('emptyState');
  const emptyText = document.getElementById('emptyText');
  const retryBtn = document.getElementById('retryBtn');
  const filterBtns = Array.from(document.querySelectorAll('.filter-btn'));

  const modal = document.getElementById('projectModal');
  const modalContent = document.getElementById('modalContent');
  const modalBody = document.getElementById('modalBody');
  const closeBtn = document.getElementById('closeModal');
  let lastFocused = null;

  /* ── small HTML-escape for text we put into attributes/markup ── */
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const TOOL_LABELS = { cisco: 'Cisco PT', wireshark: 'Wireshark' };

  /* ═══ 1. PAGE REVEAL ═══ */
  const revealEls = document.querySelectorAll('.fade-up');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.1 });
    revealEls.forEach((el) => obs.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('visible'));
  }

  /* ═══ 2. STATE HELPERS ═══ */
  function showState(which) {
    loadingState.hidden = which !== 'loading';
    errorState.hidden = which !== 'error';
    emptyState.hidden = which !== 'empty';
    grid.style.display = which === 'grid' ? '' : 'none';
  }

  /* ═══ 3. FETCH ═══ */
  function loadProjects() {
    showState('loading');
    fetch(DATA_URL, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('fetch_failed');
        return res.json();
      })
      .then((data) => {
        projects = Array.isArray(data) ? data : [];
        updateCounts();
        renderProjects(currentFilter);
      })
      .catch(() => showState('error'));
  }

  retryBtn.addEventListener('click', loadProjects);

  /* ═══ 4. FILTER COUNTS ═══ */
  function updateCounts() {
    const counts = {
      all: projects.length,
      cisco: projects.filter((p) => p.tool === 'cisco').length,
      wireshark: projects.filter((p) => p.tool === 'wireshark').length
    };
    document.querySelectorAll('.filter-count').forEach((el) => {
      el.textContent = counts[el.dataset.count] ?? 0;
    });
  }

  /* ═══ 5. RENDER CARDS ═══ */
  function renderProjects(filter) {
    const list = filter === 'all' ? projects : projects.filter((p) => p.tool === filter);

    if (list.length === 0) {
      grid.innerHTML = '';
      const label = filter === 'all' ? '' : (TOOL_LABELS[filter] + ' ');
      emptyText.textContent = 'No ' + label + 'projects yet — check back soon!';
      showState('empty');
      return;
    }

    showState('grid');
    grid.innerHTML = list.map(buildCard).join('');

    // wire up the cards
    grid.querySelectorAll('.net-view-btn').forEach((btn) => {
      btn.addEventListener('click', () => openModal(btn.dataset.id));
    });
    grid.querySelectorAll('.net-card-dl').forEach((btn) => {
      btn.addEventListener('click', (e) => e.stopPropagation());
    });
    grid.querySelectorAll('.net-card-thumb img').forEach((img) => {
      img.addEventListener('error', () => { img.style.display = 'none'; });
    });

    // staggered fade-in
    const cards = Array.from(grid.querySelectorAll('.net-card'));
    if (reduceMotion) {
      cards.forEach((c) => c.classList.add('in'));
    } else {
      cards.forEach((c, i) => setTimeout(() => c.classList.add('in'), 60 + i * 70));
    }
  }

  function buildCard(p) {
    const badge = p.tool === 'cisco' ? 'cisco' : 'wireshark';
    const mainFile = (p.files && (p.files.pkt || p.files.pcap)) || null;

    const dlIcon = mainFile
      ? `<a class="net-card-dl" href="${esc(mainFile)}" download
            aria-label="Download file for ${esc(p.title)}" title="Download file">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
             <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
             <path d="M17 21v-8H7v8M7 3v5h8"/>
           </svg>
         </a>`
      : '';

    const dateLabel = p.date
      ? new Date(p.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
      : '';

    return `
      <article class="net-card" data-tool="${esc(p.tool)}">
        <div class="net-card-thumb">
          <div class="net-card-thumb-fallback" aria-hidden="true">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3">
              <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
            </svg>
          </div>
          <img src="${esc(p.thumbnail)}" alt="${esc(p.title)} preview" loading="lazy" />
          ${dlIcon}
        </div>
        <div class="net-card-body">
          <div class="net-card-top">
            <span class="tool-badge ${badge}">${esc(TOOL_LABELS[p.tool] || p.tool)}</span>
            <span class="net-card-date">${esc(dateLabel)}</span>
          </div>
          <h3 class="net-card-title">${esc(p.title)}</h3>
          <p class="net-card-desc">${esc(p.shortDescription)}</p>
          <div class="net-card-foot">
            <button class="net-view-btn" data-id="${esc(p.id)}" aria-label="View details for ${esc(p.title)}">
              View details
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>
      </article>`;
  }

  /* ═══ 6. FILTER BUTTONS ═══ */
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('active')) return;
      filterBtns.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      currentFilter = btn.dataset.filter;

      // quick crossfade out, then re-render
      const cards = Array.from(grid.querySelectorAll('.net-card'));
      if (reduceMotion || cards.length === 0) {
        renderProjects(currentFilter);
      } else {
        cards.forEach((c) => c.classList.add('filtering'));
        setTimeout(() => renderProjects(currentFilter), 180);
      }
    });
  });

  /* ═══ 7. MODAL ═══ */
  function openModal(id) {
    const p = projects.find((x) => x.id === id);
    if (!p) return;

    lastFocused = document.activeElement;
    modalBody.innerHTML = buildModal(p);
    modal.hidden = false;
    void modal.offsetWidth;
    modal.classList.add('open');
    document.body.classList.add('modal-open');
    modalContent.scrollTop = 0;
    closeBtn.focus();
  }

  function closeModal() {
    modal.classList.remove('open');
    document.body.classList.remove('modal-open');
    setTimeout(() => { modal.hidden = true; modalBody.innerHTML = ''; }, reduceMotion ? 0 : 320);
    if (lastFocused) lastFocused.focus();
  }

  function buildModal(p) {
    const badge = p.tool === 'cisco' ? 'cisco' : 'wireshark';
    const toolLabel = TOOL_LABELS[p.tool] || p.tool;

    // topology image with graceful fallback
    const topo = p.topologyImage
      ? `<img class="modal-topo" src="${esc(p.topologyImage)}" alt="${esc(p.title)} topology"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
         <div class="modal-topo-fallback" style="display:none;" aria-hidden="true">
           <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
             <circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/>
             <path d="M7.5 7.5l3 9M16.5 7.5l-3 9M8 6h8"/>
           </svg>
         </div>`
      : `<div class="modal-topo-fallback" aria-hidden="true">
           <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
             <circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/>
             <path d="M7.5 7.5l3 9M16.5 7.5l-3 9M8 6h8"/>
           </svg>
         </div>`;

    const caption = p.tool === 'wireshark' ? 'Wireshark analysis graph' : 'Packet Tracer topology';

    // download buttons
    const dl = [];
    if (p.files && p.files.pkt) {
      dl.push(`<a class="modal-dl-btn" href="${esc(p.files.pkt)}" download>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
        </svg>
        Download Cisco Packet Tracer lab (.pkt)</a>`);
    }
    if (p.files && p.files.pcap) {
      dl.push(`<a class="modal-dl-btn" href="${esc(p.files.pcap)}" download>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
        </svg>
        Download PCAP file (.pcapng)</a>`);
    }
    const downloadsBlock = dl.length
      ? dl.join('')
      : `<p class="modal-dl-none">No file available for download</p>`;

    return `
      <div class="modal-left">
        <div class="modal-eyebrow">
          <span class="tool-badge ${badge}">${esc(toolLabel)}</span>
        </div>
        <h2 class="modal-title" id="modalTitle">${esc(p.title)}</h2>
        <div class="modal-doc">${p.documentationHtml || ''}</div>
      </div>
      <div class="modal-right">
        <figure class="modal-topo-figure">
          ${topo}
          <figcaption class="modal-topo-caption">${esc(caption)}</figcaption>
        </figure>
        <div class="modal-downloads">
          <span class="modal-dl-label">Files</span>
          ${downloadsBlock}
        </div>
      </div>`;
  }

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('open')) return;

    if (e.key === 'Escape') closeModal();

    if (e.key === 'Tab') {
      const focusable = Array.from(
        modalContent.querySelectorAll('button, a[href]')
      ).filter((el) => el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ═══ 8. GO ═══ */
  loadProjects();

})();