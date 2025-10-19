/* =========================
   BLOG — public script
   ========================= */

/* ---------- GLOBAL SETUP ---------- */
(function(){
  const y = document.getElementById('y');
  if (y) y.textContent = new Date().getFullYear();
})();
const backdrop = document.getElementById('backdrop');

/* ---------- ELEMENTS ---------- */
// Nav
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

/* ---------- FOLLOW: EmailJS ---------- */
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
// Nav
btnOut?.addEventListener('click', () => {
  const isOpen = menuCard?.classList.contains('open');
  openDrawer(isOpen ? null : 'menu');
});
btnIn?.addEventListener('click', () => openDrawer(null));

// Follow
followBtn?.addEventListener('click', () => {
  const isOpen = followCard?.classList.contains('open');
  openDrawer(isOpen ? null : 'follow');
});
followCancel?.addEventListener('click', () => openDrawer(null));

// Outside click + ESC
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

function applyVisibility(){
  const items = postsHost?.querySelectorAll('.blog-post') || [];
  items.forEach((post, idx) => { post.style.display = (idx < visible) ? '' : 'none'; });
}
function updateButtons() {
  const items  = postsHost?.querySelectorAll('.blog-post') || [];
  const total  = items.length;
  const moreBtn = document.querySelector('.show-more');
  const lessBtn = document.querySelector('.show-less');

  // Hide both if ≤ 3 posts total (or none)
  if (total <= STEP) {
    if (moreBtn) moreBtn.style.display = 'none';
    if (lessBtn) lessBtn.style.display = 'none';
    return;
  }

  // Otherwise: hide "more" when exhausted; hide "less" when at initial 3
  if (moreBtn) moreBtn.style.display = visible >= total ? 'none' : '';
  if (lessBtn) lessBtn.style.display = visible > STEP ? '' : 'none';
}

function recomputeShowButtons(){
  const total = postsHost?.querySelectorAll('.blog-post').length || 0;
  visible = Math.min(total, Math.max(visible || STEP, STEP));
  applyVisibility();
  updateButtons();
}
document.addEventListener('DOMContentLoaded', () => {
  const total = postsHost?.querySelectorAll('.blog-post').length || 0;
  visible = Math.min(total, STEP);
  lastDelta = STEP;
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
        badge = document.createElement('div');
        badge.className = 'more-badge';
        fourth.appendChild(badge);
      }
      badge.textContent = `+${extraCount}`;
      const fourthImg = fourth.querySelector('img');
      if (fourthImg && imgs[3]) {
        fourthImg.src = imgs[3].src;
        fourthImg.alt = imgs[3].alt || 'Gallery image';
      }
      Array.from(gallery.querySelectorAll('.thumb')).slice(4).forEach(t => t.remove());
    }

    gallery.onclick = () => openGalleryLightbox(gallery, 0);
  });
}

/* ---------- LOAD POSTS DIRECTLY FROM GITHUB (no local server) ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  const host = document.querySelector('.blog-posts');
  if (!host) return;

  // your repo config
  const GH = {
    owner: 'Aur-iii',
    repo:  'aurifellmusic',
    branch: 'main',
    postsPath: 'blog/posts'
  };

  const reDateSlug = /^\d{4}-\d{2}-\d{2}-/;
  const rawUrl = (rel) =>
    `https://raw.githubusercontent.com/${GH.owner}/${GH.repo}/${GH.branch}/${rel.replace(/^\/+/, '')}`;

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

  const galleryHTML = (slug, gallery = [], captions = []) => {
    if (!Array.isArray(gallery) || gallery.length === 0) return '';
    const thumbs = gallery.map((g, i) => {
      const clean = String(g).replace(/^\.\//,'');
      const src = rawUrl(`${GH.postsPath}/${slug}/${clean}`);
      const cap = captions[i] ? ` data-caption="${escapeHTML(String(captions[i]))}"` : '';
      return `<div class="thumb"><img src="${src}" alt=""${cap}></div>`;
    }).join('');
    return `<div class="post-gallery collage">${thumbs}</div>`;
  };

  try {
    // list post directories
    const res = await fetch(
      `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${encodeURIComponent(GH.postsPath)}?ref=${GH.branch}`,
      { cache: 'no-store' }
    );
    if (res.status === 404) { host.innerHTML = `<p class="muted">No posts yet — check back soon!</p>`; return; }
    if (!res.ok) throw new Error(`GitHub list failed: ${res.status}`);
    const listing = await res.json();
    const dirs = (Array.isArray(listing) ? listing : []).filter(e => e.type === 'dir' && reDateSlug.test(e.name));
    if (dirs.length === 0) { host.innerHTML = `<p class="muted">No posts yet — check back soon!</p>`; return; }

    // newest first
    dirs.sort((a, b) => {
      const dateA = new Date(a.name.substring(0, 10));
      const dateB = new Date(b.name.substring(0, 10));
      if (dateA.getTime() !== dateB.getTime()) return dateB - dateA; // newest first
      return a.name.localeCompare(b.name); // tie-break by slug
    });

    const frag = document.createDocumentFragment();
    for (const d of dirs) {
      const slug = d.name;
      const mdRes = await fetch(rawUrl(`${GH.postsPath}/${slug}/index.md`), { cache:'no-store' });
      if (!mdRes.ok) { console.warn('skip (no index.md):', slug); continue; }
      const md = await mdRes.text();
      const { fm, body } = parseFrontMatter(md);

      const title = fm.title || 'Untitled';
      const dateISO = fm.date || '';
      const side = fm.side === 'left' ? 'left' : 'right';

      // hero fallback to your asset if none in front-matter
      let heroSrc = './assets/auri-headshot-square.png';
      if (fm.hero) {
        const cleanHero = String(fm.hero).replace(/^\.\//,'');
        heroSrc = rawUrl(`${GH.postsPath}/${slug}/${cleanHero}`);
      }

      const article = document.createElement('article');
      article.className = `blog-post ${side}`;
      article.innerHTML = `
        <img class="post-image" src="${heroSrc}" alt="">
        <div class="post-content">
          <p class="post-date">${toDateText(dateISO)}</p>
          <h3 class="post-title">${escapeHTML(title)}</h3>
          ${bodyToParagraphs(body)}
          ${galleryHTML(slug, Array.isArray(fm.gallery) ? fm.gallery : [], Array.isArray(fm.captions) ? fm.captions : [])}
        </div>
      `;
      frag.appendChild(article);
    }

    host.innerHTML = '';
    host.appendChild(frag);

    if (typeof normalizePostGalleries === 'function') normalizePostGalleries();

    // NEW: reset to 3 on fresh render so older posts hide again
    if (typeof applyVisibility === 'function' && typeof updateButtons === 'function') {
      visible   = Math.min(STEP, postsHost?.querySelectorAll('.blog-post').length || 0);
      lastDelta = STEP;
      applyVisibility();
      updateButtons();
    }

    
  } catch (err) {
    console.error('Failed to load posts from GitHub', err);
    host.innerHTML = `<p class="muted">Couldn’t load posts right now. Try again later.</p>`;
  }
});



// Lightbox
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
