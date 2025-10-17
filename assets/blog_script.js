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
function updateButtons(){
  const total = postsHost?.querySelectorAll('.blog-post').length || 0;
  if (total === 0 || total <= STEP) {
    showMoreBtn?.classList.add('hidden');
    showLessBtn?.classList.add('hidden');
  } else {
    showMoreBtn?.classList.toggle('hidden', visible >= total);
    showLessBtn?.classList.toggle('hidden', visible <= STEP);
  }
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
