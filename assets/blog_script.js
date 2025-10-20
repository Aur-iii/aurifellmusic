/* =========================
   BLOG — public script
   ========================= */

/* ---------- GLOBAL SETUP ---------- */
(function(){
  const y = document.getElementById('y');
  if (y) y.textContent = new Date().getFullYear();
})();
const backdrop = document.getElementById('backdrop');

/* ---------- REPO CONFIG ---------- */
const GH = {
  owner: 'Aur-iii',
  repo:  'aurifellmusic',
  branch: 'main',
  postsPath: 'blog/posts'
};
const rawUrl = (rel) =>
  `https://raw.githubusercontent.com/${GH.owner}/${GH.repo}/${GH.branch}/${String(rel).replace(/^\/+/, '')}`;

/* ---------- ELEMENTS ---------- */
const btnOut   = document.getElementById('menuBtn');
const btnIn    = document.getElementById('menuBtnIn');
const menuCard = document.getElementById('menuCard');

// Follow drawer
const followBtn    = document.querySelector('.blog-header .follow-btn');
const followCard   = document.getElementById('followCard');
const followCancel = document.getElementById('followCancel');
const followForm   = document.getElementById('followForm');
const followEmail  = document.getElementById('followEmail');
const followStatus = document.getElementById('followStatus');
const submitFollow = document.getElementById('submitFollow');
const unfollowBtn  = document.getElementById('unfollowBtn');

// Posts + controls
const postsHost   = document.querySelector('.blog-posts');
const showMoreBtn = document.querySelector('.show-more');
const showLessBtn = document.querySelector('.show-less');

/* ---------- HELPERS ---------- */
const escapeHTML = (s='') => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toDateText = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' }) : '';

const bodyToParagraphs = (txt = '') => {
  const norm = String(txt || '').replace(/\r\n?/g, '\n').trim();
  if (!norm) return '';
  const paras = norm.split(/\n{2,}/); // blank lines = new paragraph
  return paras.map(p => {
    const lines = p.split('\n').map(line => escapeHTML(line));
    return `<p>${lines.join('<br>')}</p>`; // single \n -> <br>
  }).join('\n');
};

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
        if (li && key) { (fm[key] ||= []).push(li[1].replace(/^"(.*)"$/, '$1')); continue; }
        const kv = ln.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
        if (kv) {
          key = kv[1];
          let v = kv[2].trim();
          if (v === '') { fm[key] = []; continue; }
          fm[key] = v.replace(/^"(.*)"$/, '$1');
        } else key = null;
      }
    }
  }
  return { fm, body };
}

// Cache-bust helper
function withBust(url, token) {
  return url + (url.includes('?') ? '&' : '?') + 't=' + token;
}

// Fetch a post's index.md via GitHub Contents API (cache-proof); fallback to RAW
async function fetchIndexMd(slug) {
  const apiUrl =
    `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/` +
    `${encodeURIComponent(GH.postsPath)}/${encodeURIComponent(slug)}/index.md?ref=${GH.branch}`;

  try {
    const r = await fetch(apiUrl, { cache: 'no-store' });
    if (r.ok) {
      const j = await r.json(); // { content (base64), sha, download_url, ... }
      const content = atob(String(j.content || '').replace(/\n/g, ''));
      return { md: content, bust: j.sha || String(Date.now()) };
    }
    console.warn('[public] contents API not OK for', slug, r.status);
  } catch (e) {
    console.warn('[public] contents API failed for', slug, e);
  }

  // Fallback to raw with timestamp bust
  const raw = rawUrl(`${GH.postsPath}/${slug}/index.md`);
  const r2 = await fetch(withBust(raw, Date.now()), { cache: 'no-store' });
  if (!r2.ok) throw new Error('md 404: ' + slug);
  return { md: await r2.text(), bust: String(Date.now()) };
}

/* ---------- FOLLOW: EmailJS (optional) ---------- */
const EJS_SERVICE  = "service_aurifellmusic";
const EJS_TEMPLATE = "send_to_follower";
const SITE_NAME    = "Auri Fell — Blog";

function setFollowStatus(msg, ok = true) {
  if (!followStatus) return;
  followStatus.textContent = msg;
  followStatus.classList.remove('status--error','status--success','is-visible');
  followStatus.classList.add(ok ? 'status--success' : 'status--error', 'is-visible');
}
async function sendThanksEmail(toEmail) {
  if (typeof emailjs === 'undefined') throw new Error('EmailJS not loaded');
  return emailjs.send(EJS_SERVICE, EJS_TEMPLATE, { to_email: toEmail, site_name: SITE_NAME });
}
followForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = (followEmail?.value || "").trim().toLowerCase();
  if (!email) return;

  if (submitFollow) {
    submitFollow.disabled = true;
    submitFollow.textContent = "Sending…";
  }
  setFollowStatus("", true);

  try {
    await sendThanksEmail(email);
    setFollowStatus("Thanks! Check your inbox ✉️", true);
    if (submitFollow) submitFollow.textContent = "Sent ✓";
    setTimeout(() => openDrawer(null), 1200);
  } catch (err) {
    console.error(err);
    setFollowStatus("Could not send email. Try again?", false);
    if (submitFollow) submitFollow.textContent = "Follow";
  } finally {
    if (submitFollow) submitFollow.disabled = false;
  }
});
unfollowBtn?.addEventListener('click', () => {
  setFollowStatus("Unfollowed (local only)", false);
  if (submitFollow) submitFollow.textContent = "Follow";
  setTimeout(() => openDrawer(null), 1000);
});

/* ---------- DRAWERS ---------- */
function openDrawer(which) {
  const openMenu   = which === 'menu';
  const openFollow = which === 'follow';
  const anyOpen    = !!which;
  menuCard?.classList.toggle('open', openMenu);
  followCard?.classList.toggle('open', openFollow);
  document.body.classList.toggle('menu-open', anyOpen);
  backdrop?.classList.toggle('show', anyOpen);
  if (anyOpen) {
    setTimeout(() => {
      const host = openMenu ? menuCard : followCard;
      const first = host?.querySelector('input,button,a,select,textarea,[tabindex]:not([tabindex="-1"])');
      first?.focus();
    }, 220);
  }
}
btnOut?.addEventListener('click', () => {
  const isOpen = menuCard?.classList.contains('open');
  openDrawer(isOpen ? null : 'menu');
});
btnIn?.addEventListener('click', () => openDrawer(null));
followBtn?.addEventListener('click', () => {
  const isOpen = followCard?.classList.contains('open');
  openDrawer(isOpen ? null : 'follow');
});
followCancel?.addEventListener('click', () => openDrawer(null));
document.addEventListener('keydown', e => { if (e.key === 'Escape') openDrawer(null); });
backdrop?.addEventListener('click', () => openDrawer(null));
document.addEventListener('click', e => {
  const inside = e.target.closest('#menuCard, #menuBtn, #menuBtnIn, #followCard, .blog-header .follow-btn');
  if (!inside) openDrawer(null);
});

/* ---------- SHOW MORE / LESS ---------- */
const STEP = 3;
let visible = 0;
let lastDelta = STEP;

function setShown(el, show) {
  if (!el) return;
  el.hidden = !show;
  el.style.display = show ? '' : 'none';
  el.classList.toggle('hidden', !show);
}

function applyVisibility(){
  const items = postsHost?.querySelectorAll('.blog-post') || [];
  items.forEach((post, idx) => { post.style.display = (idx < visible) ? '' : 'none'; });
}

function updateButtons() {
  const items  = postsHost?.querySelectorAll('.blog-post') || [];
  const total  = items.length;
  const moreBtn = document.querySelector('.show-more');
  const lessBtn = document.querySelector('.show-less');

  if (total <= STEP) { setShown(moreBtn, false); setShown(lessBtn, false); return; }
  setShown(moreBtn, visible < total);
  setShown(lessBtn, visible > STEP);
}
function recomputeShowButtons(){
  const total = postsHost?.querySelectorAll('.blog-post').length || 0;
  visible = Math.min(total, Math.max(visible || STEP, STEP));
  applyVisibility(); updateButtons();
}
document.addEventListener('DOMContentLoaded', () => {
  const total = postsHost?.querySelectorAll('.blog-post').length || 0;
  visible = Math.min(total, STEP); lastDelta = STEP;
  applyVisibility(); updateButtons();
});
showMoreBtn?.addEventListener('click', () => {
  const total = postsHost?.querySelectorAll('.blog-post').length || 0;
  const remaining = total - visible;
  const delta = Math.min(STEP, remaining);
  visible += delta; lastDelta = delta;
  applyVisibility(); updateButtons();
});
showLessBtn?.addEventListener('click', () => {
  visible = Math.max(STEP, visible - lastDelta);
  lastDelta = STEP;
  applyVisibility(); updateButtons();
});

/* ---------- GALLERY NORMALIZER + LIGHTBOX ---------- */
function normalizePostGalleries(root = document){
  (root.querySelectorAll?.('.post-gallery') || []).forEach(gallery => {
    const thumbs = Array.from(gallery.querySelectorAll('.thumb'));
    const imgs   = thumbs.map(t => t.querySelector('img')).filter(Boolean);
    if (!imgs.length) { gallery.classList.add('hidden'); return; }

    const allItems = imgs.map(img => {
      const src = img.currentSrc || img.src;
      const alt = img.alt || 'Gallery image';
      const caption = img.dataset.caption?.trim() || img.alt || '';
      return { src, alt, caption };
    });
    gallery.dataset.images = JSON.stringify(allItems);
    gallery.classList.add('collage');

    if (imgs.length <= 4) {
      thumbs.slice(imgs.length).forEach(t => t.remove());
      if (thumbs[3]) {
        thumbs[3].classList.remove('more');
        thumbs[3].removeAttribute('data-more');
        thumbs[3].querySelector('.more-badge')?.remove();
      }
    } else {
      let fourth = thumbs[3];
      if (!fourth) {
        fourth = document.createElement('div');
        fourth.className = 'thumb';
        fourth.appendChild(imgs[3].cloneNode(true));
        gallery.appendChild(fourth);
      }
      const extraCount = imgs.length - 4;
      fourth.classList.add('more');
      fourth.setAttribute('data-more', `+${extraCount}`);
      let badge = fourth.querySelector('div.more-badge');
      if (!badge) {
        badge = document.createElement('div'); badge.className = 'more-badge'; fourth.appendChild(badge);
      }
      badge.textContent = `+${extraCount}`;
      const fourthImg = fourth.querySelector('img');
      if (fourthImg && imgs[3]) { fourthImg.src = imgs[3].src; fourthImg.alt = imgs[3].alt || 'Gallery image'; }
      Array.from(gallery.querySelectorAll('.thumb')).slice(4).forEach(t => t.remove());
    }

    gallery.onclick = () => openGalleryLightbox(gallery, 0);
  });
}

/* ---------- LOAD POSTS DIRECTLY FROM GITHUB (single, cache-proof loader) ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  const host = document.querySelector('.blog-posts');
  if (!host) return;

  const reDateSlug = /^\d{4}-\d{2}-\d{2}-/;

  try {
    // 1) list directories in blog/posts
    const res = await fetch(
      `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${encodeURIComponent(GH.postsPath)}?ref=${GH.branch}`,
      { cache: 'no-store' }
    );
    if (res.status === 404) { host.innerHTML = `<p class="muted">No posts yet — check back soon!</p>`; return; }
    if (!res.ok) throw new Error(`GitHub list failed: ${res.status}`);
    const listing = await res.json();
    const dirs = (Array.isArray(listing) ? listing : []).filter(e => e.type === 'dir' && reDateSlug.test(e.name));
    if (!dirs.length) { host.innerHTML = `<p class="muted">No posts yet — check back soon!</p>`; return; }

    // 2) newest first (date DESC, tie-break slug ASC)
    dirs.sort((a, b) => {
      const ta = new Date(a.name.slice(0,10)).getTime();
      const tb = new Date(b.name.slice(0,10)).getTime();
      if (ta !== tb) return tb - ta;
      return a.name.localeCompare(b.name);
    });

    const frag = document.createDocumentFragment();

    // 3) Build each article
    for (const d of dirs) {
      const slug = d.name;

      // fetch fresh markdown & a stable bust token (blob SHA when available)
      const { md, bust } = await fetchIndexMd(slug);
      const { fm, body } = parseFrontMatter(md);

      const title = fm.title || 'Untitled';
      const dateISO = fm.date || '';
      const side = fm.side === 'left' ? 'left' : 'right';

      // hero (fallback)
      let heroSrc = './assets/auri-headshot-square.png';
      if (fm.hero) {
        const cleanHero = String(fm.hero).replace(/^\.\//,'');
        heroSrc = withBust(rawUrl(`${GH.postsPath}/${slug}/${cleanHero}`), bust);
      }

      // gallery thumbs html (append same bust to each image)
      const galleryHTML = (() => {
        const gallery = Array.isArray(fm.gallery) ? fm.gallery : [];
        const captions = Array.isArray(fm.captions) ? fm.captions : [];
        if (!gallery.length) return '';
        const thumbs = gallery.map((g, i) => {
          const clean = String(g).replace(/^\.\//,'');
          const src = withBust(rawUrl(`${GH.postsPath}/${slug}/${clean}`), bust);
          const cap = captions[i] ? ` data-caption="${escapeHTML(String(captions[i]))}"` : '';
          return `<div class="thumb"><img src="${src}" alt=""${cap}></div>`;
        }).join('');
        return `<div class="post-gallery collage">${thumbs}</div>`;
      })();

      const article = document.createElement('article');
      article.className = `blog-post ${side}`;
      article.innerHTML = `
        <img class="post-image" src="${heroSrc}" alt="">
        <div class="post-content">
          <p class="post-date">${toDateText(dateISO)}</p>
          <h3 class="post-title">${escapeHTML(title)}</h3>
          ${bodyToParagraphs(body)}
          ${galleryHTML}
        </div>
      `;
      frag.appendChild(article);
    }

    // 4) inject + post-init
    host.innerHTML = '';
    host.appendChild(frag);

    if (typeof normalizePostGalleries === 'function') normalizePostGalleries();

    // reset "show more / less" to 3 visible
    if (typeof applyVisibility === 'function' && typeof updateButtons === 'function') {
      visible   = Math.min(STEP, postsHost?.querySelectorAll('.blog-post').length || 0);
      lastDelta = STEP;
      applyVisibility();
      updateButtons();
    }
  } catch (err) {
    console.error('[public] load failed', err);
    host.innerHTML = `<p class="muted">Couldn’t load posts right now. Try again later.</p>`;
  }
});

/* ---------- LIGHTBOX ---------- */
let lb,lbImg,lbBlurb,lbCounter,lbPrev,lbNext,lbClose,lbList=[],lbIndex=0;
function ensureLightbox(){
  if (lb) return;
  lb = document.createElement('div');
  lb.className = 'gallery-modal';
  lb.innerHTML = `
    <div class="gallery-modal__overlay"></div>
    <div class="gallery-modal__frame" role="dialog" aria-modal="true" aria-label="Image gallery">
      <button class="gallery-modal__close" aria-label="Close">✕</button>
      <button class="gallery-modal__arrow prev" aria-label="Previous">‹</button>
      <div class="gallery-modal__image-wrap">
        <img class="gallery-modal__img" alt="">
        <div class="gallery-modal__blurb"></div>
        <div class="gallery-modal__counter"></div>
      </div>
      <button class="gallery-modal__arrow next" aria-label="Next">›</button>
    </div>`;
  document.body.appendChild(lb);
  lbImg     = lb.querySelector('.gallery-modal__img');
  lbCounter = lb.querySelector('.gallery-modal__counter');
  lbBlurb   = lb.querySelector('.gallery-modal__blurb');
  lbPrev    = lb.querySelector('.gallery-modal__arrow.prev');
  lbNext    = lb.querySelector('.gallery-modal__arrow.next');
  lbClose   = lb.querySelector('.gallery-modal__close');
  lb.querySelector('.gallery-modal__overlay').addEventListener('click', closeGalleryLightbox);
  lbClose.addEventListener('click', closeGalleryLightbox);
  lbPrev.addEventListener('click', () => navGallery(-1));
  lbNext.addEventListener('click', () => navGallery(1));
  document.addEventListener('keydown', (e)=>{
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape')     closeGalleryLightbox();
    if (e.key === 'ArrowLeft')  navGallery(-1);
    if (e.key === 'ArrowRight') navGallery(1);
  });
}
function openGalleryLightbox(gallery,start=0){
  ensureLightbox();
  try{lbList=JSON.parse(gallery.dataset.images||'[]');}catch{lbList=[];}
  if(!lbList.length)return;
  lbIndex=Math.max(0,Math.min(start,lbList.length-1));
  renderGalleryImage();
  lb.classList.add('is-open');
}
function closeGalleryLightbox(){lb?.classList.remove('is-open');}
function navGallery(d){ if(!lbList.length)return; lbIndex=(lbIndex+d+lbList.length)%lbList.length; renderGalleryImage(); }
function renderGalleryImage(){
  const item = lbList[lbIndex];
  if (!item) return;
  lbImg.src = item.src;
  lbImg.alt = item.alt || 'Gallery image';
  const text = (item.caption || item.alt || '').trim();
  lbBlurb.textContent = text;
  lbBlurb.style.display = text ? '' : 'none';
  lbCounter.textContent = `${lbIndex + 1} / ${lbList.length}`;
}

document.addEventListener('DOMContentLoaded', normalizePostGalleries);
