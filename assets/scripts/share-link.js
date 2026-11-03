/* Copy-only sharing on desktop; touch devices can use the native share sheet. */
(() => {
  const resetTimers = new WeakMap();
  // Clipboard-check path: Font Awesome Free v7.3.1, Fonticons, Inc. (fontawesome.com/license/free).
  const icons = `
    <svg class="share-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/></svg>
    <svg class="share-link-copied-icon" viewBox="0 0 640 640" aria-hidden="true"><path fill="currentColor" d="M384 64C407.7 64 428.4 76.9 439.4 96L448 96C483.3 96 512 124.7 512 160L512 512C512 547.3 483.3 576 448 576L192 576C156.7 576 128 547.3 128 512L128 160C128 124.7 156.7 96 192 96L200.6 96C211.6 76.9 232.3 64 256 64L384 64zM410.9 276.6C400.2 268.8 385.2 271.2 377.4 281.9L291.8 399.6L265.3 372.2C256.1 362.7 240.9 362.4 231.4 371.6C221.9 380.8 221.6 396 230.8 405.5L277.2 453.5C282.1 458.6 289 461.3 296.1 460.8C303.2 460.3 309.7 456.7 313.9 451L416.2 310.1C424 299.4 421.6 284.4 410.9 276.6zM264 128C250.7 128 240 138.7 240 152C240 165.3 250.7 176 264 176L376 176C389.3 176 400 165.3 400 152C400 138.7 389.3 128 376 128L264 128z"/></svg>
    <span class="share-link-label">Share</span><span class="visually-hidden share-link-status" role="status"></span>`;

  async function copy(url) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(url);
    const field = document.createElement('textarea');
    field.value = url;
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.append(field);
    let copied;
    try {
      field.select();
      copied = document.execCommand('copy');
    } finally {
      field.remove();
    }
    if (!copied) throw new Error('Clipboard unavailable');
  }

  function createButton({ url, title, previewOnly = false }) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'share-link';
    button.setAttribute('aria-label', `Share link to ${title}`);
    button.innerHTML = icons;
    if (previewOnly) {
      button.setAttribute('aria-disabled', 'true');
      button.title = 'Preview only';
      return button;
    }

    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      let action = 'Copied';
      if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
        try {
          await navigator.share({ title, url });
          action = 'Shared';
        } catch (error) {
          if (error?.name === 'AbortError') return;
        }
      }
      if (action !== 'Shared') {
        try {
          await copy(url);
        } catch {
          window.prompt('Copy this link:', url);
          return;
        }
      }

      clearTimeout(resetTimers.get(button));
      button.classList.add('is-copied');
      button.querySelector('.share-link-label').textContent = action;
      button.querySelector('.share-link-status').textContent = `${action} link to ${title}.`;
      button.setAttribute('aria-label', `${action} link to ${title}`);
      resetTimers.set(button, setTimeout(() => {
        button.classList.remove('is-copied');
        button.querySelector('.share-link-label').textContent = 'Share';
        button.querySelector('.share-link-status').textContent = '';
        button.setAttribute('aria-label', `Share link to ${title}`);
      }, 2500));
    });
    return button;
  }

  window.AuriShare = { createButton };
})();
