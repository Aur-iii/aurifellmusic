(() => {
  // =========================
  //  Year stamp + mobile menu
  // =========================
  const yEl = document.getElementById('y');
  if (yEl) yEl.textContent = new Date().getFullYear();

  const btnOut   = document.getElementById('menuBtn');
  const btnIn    = document.getElementById('menuBtnIn');
  const card     = document.getElementById('menuCard');
  const backdrop = document.getElementById('backdrop');
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  let lastMenuFocus = null;
  let lastLightboxFocus = null;

  function trapFocus(e, root) {
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll(FOCUSABLE)).filter(el => !el.hasAttribute('disabled'));
    if (!nodes.length) { e.preventDefault(); return; }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function setOpen(on){
    if (!card) return;
    const willOpen = !!on;
    if (willOpen) lastMenuFocus = document.activeElement;
    card.classList.toggle('open', willOpen);
    document.body.classList.toggle('menu-open', willOpen);
    btnOut?.classList.toggle('is-open', willOpen);
    btnIn?.classList.toggle('is-open', willOpen);
    btnOut?.setAttribute('aria-expanded', String(willOpen));
    backdrop?.classList.toggle('show', willOpen);
    if (willOpen) {
      setTimeout(() => card.querySelector('.menu-list a')?.focus(), 280);
    } else if (lastMenuFocus && typeof lastMenuFocus.focus === 'function') {
      lastMenuFocus.focus();
    }
  }
  btnOut?.addEventListener('click', () => setOpen(!card?.classList.contains('open')));
  btnIn?.addEventListener('click',  () => setOpen(false));
  backdrop?.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e)=>{
    if (e.key === 'Escape') setOpen(false);
    if (e.key === 'Tab' && card?.classList.contains('open')) trapFocus(e, card);
  });
  document.addEventListener('click', (e)=>{
    const insideCard = e.target.closest('#menuCard');
    const onBtnOut   = e.target.closest('#menuBtn');
    const onBtnIn    = e.target.closest('#menuBtnIn');
    if (!insideCard && !onBtnOut && !onBtnIn) setOpen(false);
  });

  // =========================
  //  GitHub config (music)
  // =========================
  const GH = {
    owner: 'Aur-iii',
    repo:  'aurifellmusic',
    branch: 'main',
    releasesPath: 'music/releases'
  };

  const rawUrl = (rel) =>
    `https://raw.githubusercontent.com/${GH.owner}/${GH.repo}/${GH.branch}/${String(rel).replace(/^\/+/, '')}`;

  function withBust(url, token) {
    return url + (url.includes('?') ? '&' : '?') + 't=' + token;
  }

  // Minimal front-matter parser (copied from blog_script.js)
  function parseFrontMatter(md) {
    let fm = {}, body = md;
    if (md.startsWith('---')) {
      const end = md.indexOf('\n---', 3);
      if (end !== -1) {
        const block = md.slice(3, end).trim();
        body = md.slice(end + 4).replace(/^\s+/, '');
        const lines = block.split(/\r?\n/);
        let key = null;
        for (const ln of lines) {
          const li = ln.match(/^\s*-\s+(.*)$/);
          if (li && key) {
            (fm[key] ||= []).push(li[1].replace(/^"(.*)"$/, '$1'));
            continue;
          }
          const kv = ln.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
          if (kv) {
            key = kv[1];
            let v = kv[2].trim();
            if (v === '') {
              fm[key] = [];
              continue;
            }
            fm[key] = v.replace(/^"(.*)"$/, '$1');
          } else {
            key = null;
          }
        }
      }
    }
    return { fm, body };
  }

  async function fetchReleaseIndex(slug) {
    const apiUrl =
      `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/` +
      `${encodeURIComponent(GH.releasesPath)}/${encodeURIComponent(slug)}/index.md?ref=${GH.branch}`;

    try {
      const r = await fetch(apiUrl, { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        const content = atob(String(j.content || '').replace(/\n/g, ''));
        return { md: content, bust: j.sha || String(Date.now()) };
      }
      console.warn('[music] contents API not OK for', slug, r.status);
    } catch (e) {
      console.warn('[music] contents API failed for', slug, e);
    }

    const raw = rawUrl(`${GH.releasesPath}/${slug}/index.md`);
    const r2 = await fetch(withBust(raw, Date.now()), { cache: 'no-store' });
    if (!r2.ok) throw new Error('md 404: ' + slug);
    return { md: await r2.text(), bust: String(Date.now()) };
  }

  // =========================
  //  Normalizing release data
  // =========================

  // Parse fm.links (array of strings like `{ label: "Bandcamp", url: "https://..." }`)
  function parseLinksFromFrontMatter(rawLinks) {
    const arr = Array.isArray(rawLinks) ? rawLinks : rawLinks ? [rawLinks] : [];
    const out = [];
    for (const item of arr) {
      const s = String(item);
      // { label: "Bandcamp", url: "https://..." }
      let m = s.match(/label:\s*"([^"]*)".*url:\s*"([^"]*)"/i);
      if (m) {
        out.push({ label: m[1], url: m[2] });
        continue;
      }
      // fallback: label:url
      m = s.match(/^([^:]+):(https?:\/\/.+)$/i);
      if (m) {
        out.push({ label: m[1], url: m[2] });
        continue;
      }
      // bare URL
      if (/^https?:\/\//i.test(s)) {
        out.push({ label: '', url: s });
      }
    }
    return out;
  }

  // Turn link list into map { bandcamp, spotify, apple, youtube, other }
  function toLinkMap(list) {
    const map = {};
    for (const l of list) {
      const label = (l.label || '').toLowerCase();
      const url = (l.url || '').toLowerCase();
      let key = 'other';
      if (label.includes('bandcamp') || url.includes('bandcamp')) key = 'bandcamp';
      else if (label.includes('spotify') || url.includes('spotify')) key = 'spotify';
      else if (label.includes('apple') || url.includes('apple')) key = 'apple';
      else if (label.includes('youtube') || url.includes('youtube')) key = 'youtube';
      if (!map[key]) map[key] = l.url;
    }
    return map;
  }

  function primaryLink(links) {
    return (
      links?.bandcamp ||
      links?.spotify ||
      links?.apple   ||
      links?.youtube ||
      links?.other   ||
      '#'
    );
  }

  function secondaryLink(links, primaryHref) {
    const order = ['spotify', 'apple', 'bandcamp', 'youtube', 'other'];
    for (const k of order) {
      if (links?.[k] && links[k] !== primaryHref) {
        const base = k === 'other' ? 'another platform' : (k[0].toUpperCase() + k.slice(1));
        return { label: `Listen on ${base}`, href: links[k] };
      }
    }
    return null;
  }

  function labelFromHref(href) {
    if (!href) return 'Listen';
    const u = href.toLowerCase();
    if (u.includes('bandcamp'))     return 'Listen on Bandcamp';
    if (u.includes('open.spotify')) return 'Listen on Spotify';
    if (u.includes('music.apple'))  return 'Listen on Apple Music';
    if (u.includes('youtube'))      return 'Listen on YouTube';
    return 'Listen';
  }

  async function loadReleasesFromGitHub() {
    const api =
      `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/` +
      `${encodeURIComponent(GH.releasesPath)}?ref=${GH.branch}`;

    const out = [];
    try {
      const res = await fetch(api, { cache: 'no-store' });
      if (res.status === 404) {
        console.warn('[music] No releases folder yet');
        return [];
      }
      if (!res.ok) throw new Error(`GitHub list failed: ${res.status}`);
      const listing = await res.json();
      const dirs = (Array.isArray(listing) ? listing : []).filter(e => e.type === 'dir');

      for (const d of dirs) {
        const slug = d.name;
        try {
          const { md, bust } = await fetchReleaseIndex(slug);
          const { fm } = parseFrontMatter(md);
          const linksList = parseLinksFromFrontMatter(fm.links);
          const linksMap = toLinkMap(linksList);
          const ts = fm.date ? Date.parse(fm.date) : 0;

          out.push({
            slug,
            title: fm.title || slug,
            date: fm.date  || '',
            ts: isNaN(ts) ? 0 : ts,
            type: fm.type || 'single',
            cover: fm.coverUrl
              ? fm.coverUrl
              : withBust(rawUrl(`${GH.releasesPath}/${slug}/cover.png`), bust),
            blurb: fm.blurb || '',
            tracks: Array.isArray(fm.tracks) ? fm.tracks : [],
            links: linksMap
          });
        } catch (e) {
          console.warn('[music] skip bad release', slug, e);
        }
      }

      out.sort((a,b) => (b.ts - a.ts) || a.slug.localeCompare(b.slug));
      return out;
    } catch (err) {
      console.error('[music] load releases failed', err);
      return [];
    }
  }

  // =========================
  //  Rendering
  // =========================
  const latestCover = document.getElementById('latestCover');
  const latestTitle = document.getElementById('latestTitle');
  const latestMeta  = document.getElementById('latestMeta');
  const latestBlurb = document.getElementById('latestBlurb');
  const latestPlay  = document.getElementById('latestPlay');
  const latestAlt   = document.getElementById('latestAlt');

  const grid       = document.getElementById('discographyGrid');
  const moreBtn    = document.querySelector('.discography-controls .show-more');
  const lessBtn    = document.querySelector('.discography-controls .show-less');

  const lb      = document.getElementById('lb');
  const lbClose = document.getElementById('lbClose');

  let releases = [];
  const GRID_STEP      = 4;   // one row of 4 per step
  const GRID_BASE_ROWS = 3;   // 3 rows visible by default
  const GRID_BASE      = GRID_STEP * GRID_BASE_ROWS; // 12
  let visible = 0;
  let lastDelta = GRID_STEP;

  function setBtnShown(el, show) {
    if (!el) return;
    el.hidden = !show;
    el.style.display = show ? '' : 'none';
  }

  function renderLatest(r) {
    if (!r) return;
    if (latestCover) latestCover.src = r.cover;
    if (latestTitle) latestTitle.textContent = r.title;

    const pretty = r.date
      ? new Date(r.date).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' })
      : '';
    if (latestMeta) {
      const typeLabel = r.type.charAt(0).toUpperCase() + r.type.slice(1);
      latestMeta.textContent = pretty ? `${typeLabel} • ${pretty}` : typeLabel;
    }
    if (latestBlurb) latestBlurb.textContent = r.blurb || '';

    const primary = primaryLink(r.links);
    if (latestPlay) {
      latestPlay.href = primary;
      latestPlay.textContent = labelFromHref(primary);
    }

    if (latestAlt) {
      const alt = secondaryLink(r.links, primary);
      if (alt) {
        latestAlt.style.display = '';
        latestAlt.href = alt.href;
        latestAlt.textContent = alt.label;
      } else {
        latestAlt.style.display = 'none';
      }
    }
  }

  function buildGrid(gridReleases) {
    if (!grid) return;
    grid.innerHTML = '';

    gridReleases.forEach((r, idxOffset) => {
      const globalIndex = releases.indexOf(r); // use full array index so lightbox matches
      const card = document.createElement('article');
      card.className = 'release';
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.dataset.index = String(globalIndex);

      card.innerHTML = `
        <span class="label">${r.type.toUpperCase()}</span>
        <img src="${r.cover}" alt="${r.title} cover" loading="lazy"/>
      `;

      card.addEventListener('click', () => openLB(globalIndex));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLB(globalIndex);
        }
      });

      grid.appendChild(card);
    });
  }

  function applyGridVisibility() {
    if (!grid) return;
    const cards = grid.querySelectorAll('.release');
    const total = cards.length;

    if (!total) {
      setBtnShown(moreBtn, false);
      setBtnShown(lessBtn, false);
      return;
    }

    const baseVisible = Math.min(GRID_BASE, total);
    if (visible < baseVisible) visible = baseVisible;
    if (visible > total) visible = total;

    cards.forEach((card, idx) => {
      card.style.display = (idx < visible) ? '' : 'none';
    });

    if (total <= GRID_BASE) {
      setBtnShown(moreBtn, false);
      setBtnShown(lessBtn, false);
      return;
    }

    setBtnShown(moreBtn, visible < total);
    setBtnShown(lessBtn, visible > GRID_BASE);
  }

  function setupShowMoreLess() {
    if (!moreBtn || !lessBtn) return;

    moreBtn.addEventListener('click', () => {
      if (!grid) return;
      const total = grid.querySelectorAll('.release').length;
      const remaining = total - visible;
      const delta = Math.min(GRID_STEP, remaining);
      visible += delta;
      lastDelta = delta;
      applyGridVisibility();
    });

    lessBtn.addEventListener('click', () => {
      if (!grid) return;
      const total = grid.querySelectorAll('.release').length;
      const baseVisible = Math.min(GRID_BASE, total);
      visible = Math.max(baseVisible, visible - lastDelta);
      lastDelta = GRID_STEP;
      applyGridVisibility();
    });
  }

  // =========================
  //  Lightbox
  // =========================
  function openLB(i) {
    const r = releases[i];
    if (!r || !lb) return;

    const coverEl = document.getElementById('lbCover');
    const titleEl = document.getElementById('lbTitle');
    const metaEl  = document.getElementById('lbMeta');
    const blurbEl = document.getElementById('lbBlurb');
    const linksEl = document.getElementById('lbLinks');
    const wrap    = document.getElementById('lbTracksWrap');
    const list    = document.getElementById('lbTracks');

    if (coverEl) coverEl.src = r.cover;
    if (titleEl) titleEl.textContent = r.title;

    const pretty = r.date
      ? new Date(r.date).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' })
      : '';
    if (metaEl) {
      const typeLabel = r.type.charAt(0).toUpperCase() + r.type.slice(1);
      metaEl.textContent = pretty ? `${typeLabel} • ${pretty}` : typeLabel;
    }
    if (blurbEl) blurbEl.textContent = r.blurb || '';

    if (linksEl) {
      linksEl.innerHTML = '';
      const order = ['spotify','apple','bandcamp','youtube','other'];
      order.forEach(k => {
        if (r.links && r.links[k]) {
          const a = document.createElement('a');
          a.href = r.links[k];
          a.target = '_blank';
          a.rel   = 'noopener';
          a.textContent =
            k === 'other'
              ? 'Listen'
              : `Listen on ${k[0].toUpperCase() + k.slice(1)}`;
          linksEl.appendChild(a);
        }
      });
    }

    if (wrap && list) {
      if (r.type !== 'single' && Array.isArray(r.tracks) && r.tracks.length) {
        wrap.style.display = '';
        list.innerHTML = '';
        r.tracks.forEach(t => {
          const li = document.createElement('li');
          li.textContent = t;
          list.appendChild(li);
        });
      } else {
        wrap.style.display = 'none';
      }
    }

    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
    lastLightboxFocus = document.activeElement;
    lb.querySelector('.lb-close')?.focus();
  }

  function closeLB() {
    if (!lb) return;
    lb.classList.remove('open');
    document.body.style.overflow = '';
    if (lastLightboxFocus && typeof lastLightboxFocus.focus === 'function') {
      lastLightboxFocus.focus();
    }
  }

  if (lb && lbClose) {
    lbClose.addEventListener('click', closeLB);
    lb.addEventListener('click', (e) => { if (e.target === lb) closeLB(); });
    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') closeLB();
      if (e.key === 'Tab') trapFocus(e, lb);
    });
  }

  // =========================
  //  Boot: load + render
  // =========================
  document.addEventListener('DOMContentLoaded', async () => {
    releases = await loadReleasesFromGitHub();
    if (!releases.length) {
      console.warn('[music] No releases found');
      if (grid) grid.innerHTML = `<p class="muted">No releases yet — check back soon!</p>`;
      return;
    }

    // Latest is first
    renderLatest(releases[0]);

    // Grid uses the rest (older releases)
    const gridReleases = releases.slice(1);
    buildGrid(gridReleases);

    const total = gridReleases.length;
    visible = Math.min(total, GRID_BASE);
    lastDelta = GRID_STEP;
    setupShowMoreLess();
    applyGridVisibility();
  });
})();
