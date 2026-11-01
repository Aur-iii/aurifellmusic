(() => {
  const siteBase = window.AURI_SHOP_BASE || './';
  const root = `${siteBase}shop/products/`;
  const imageFallback = `${siteBase}assets/images/auri-anagram-color.png`;
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  // Read one product's simple YAML-style front matter and Markdown body.
  function parseProduct(markdown, slug) {
    const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match) throw new Error(`Invalid product file: ${slug}`);
    const meta = {};
    for (const line of match[1].split(/\r?\n/)) {
      const entry = line.match(/^([a-zA-Z][a-zA-Z0-9]*):\s*(.*)$/);
      if (!entry) continue;
      try { meta[entry[1]] = JSON.parse(entry[2]); }
      catch { meta[entry[1]] = entry[2]; }
    }
    return { ...meta, slug, description: match[2].trim() };
  }

  // Resolve local artwork without allowing arbitrary URL schemes.
  function safeImage(value) {
    const url = String(value || '');
    if (/^\.\/assets\/images\/[a-z0-9._-]+$/i.test(url)) return `${siteBase}${url.slice(2)}`;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' ? parsed.href : imageFallback;
    } catch { return imageFallback; }
  }

  function safePurchase(value) {
    try {
      const url = new URL(String(value || ''));
      return url.protocol === 'https:' ? url.href : null;
    } catch { return null; }
  }

  function retailerName(url) {
    try {
      const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
      const known = {
        'sheetmusicdirect.com': 'Sheet Music Direct',
        'sheetmusicplus.com': 'Sheet Music Plus',
        'musicnotes.com': 'Musicnotes',
        'arrangeme.com': 'ArrangeMe',
        'bandcamp.com': 'Bandcamp',
      };
      const domain = Object.keys(known).find((name) => host === name || host.endsWith(`.${name}`));
      return domain ? known[domain] : host;
    } catch { return ''; }
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  function sortablePrice(product, missing) {
    if (product.price === null || product.price === '' || product.price === undefined) return missing;
    const price = Number(product.price);
    return Number.isFinite(price) ? price : missing;
  }

  function image(product, className) {
    const node = element('img', className);
    node.src = safeImage(product.imageUrl);
    node.alt = product.imageAlt || `${product.title || 'Product'} artwork`;
    node.loading = 'lazy';
    node.addEventListener('error', () => {
      if (!node.src.endsWith('/auri-anagram-color.png')) node.src = imageFallback;
    });
    return node;
  }

  // These renderers are shared by the public pages and the local admin previews.
  function createCard(product, onOpen) {
    const card = element('a', 'card shop-card');
    card.href = `shop-product.html?product=${encodeURIComponent(product.slug)}`;
    if (onOpen) card.addEventListener('click', (event) => { event.preventDefault(); onOpen(product); });
    const art = element('div', 'shop-card-art');
    art.append(image(product, 'shop-card-image'));
    card.append(art);
    const copy = element('div', 'shop-card-copy');
    copy.append(element('span', 'eyebrow', product.category || 'Sheet music'));
    copy.append(element('h3', 'shop-card-title', product.title || 'Untitled'));
    copy.append(element('p', 'muted shop-card-blurb', product.summary || ''));
    const bottom = element('div', 'shop-card-bottom');
    bottom.append(element('span', 'shop-card-arrow', 'View details'));
    copy.append(bottom);
    card.append(copy);
    return card;
  }

  function contentUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
    } catch { return null; }
  }

  function appendInline(node, text) {
    const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<>"'*]+)/gi);
    for (const token of tokens) {
      if (!token) continue;
      if (token.startsWith('**') && token.endsWith('**')) {
        const strong = element('strong');
        appendInline(strong, token.slice(2, -2));
        node.append(strong);
      } else if (token.startsWith('*') && token.endsWith('*')) {
        const em = element('em');
        appendInline(em, token.slice(1, -1));
        node.append(em);
      } else {
        const markdownLink = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/i);
        const bareUrl = /^https?:\/\//i.test(token);
        const visible = bareUrl ? token.replace(/[.,!?;:]+$/, '') : '';
        const href = contentUrl(markdownLink ? markdownLink[2] : visible);
        if (href) {
          const link = element('a', '', markdownLink ? markdownLink[1] : visible);
          link.href = href;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          node.append(link);
          if (bareUrl) node.append(document.createTextNode(token.slice(visible.length)));
        } else node.append(document.createTextNode(token));
      }
    }
  }

  function renderDescription(markdown, target) {
    target.replaceChildren();
    let list = null;
    for (const line of String(markdown || '').split(/\r?\n/)) {
      const content = line.trim();
      if (!content) { list = null; continue; }
      if (content.startsWith('- ')) {
        if (!list) { list = element('ul'); target.append(list); }
        const item = element('li', 'muted'); appendInline(item, content.slice(2)); list.append(item);
      } else {
        list = null;
        const heading = content.match(/^#{2,3}\s+(.+)$/);
        const node = element(heading ? 'h3' : 'p', heading ? '' : 'muted');
        appendInline(node, heading ? heading[1] : content);
        target.append(node);
      }
    }
  }

  function formatDate(value) {
    const date = new Date(`${String(value || '').slice(0, 10)}T12:00:00`);
    return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en-CA', { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
  }

  function renderDetail(product, target, previewOnly = false) {
    target.replaceChildren();
    const art = element('div', 'card shop-detail-art');
    art.append(image(product, 'shop-detail-image'));
    const content = element('div', 'shop-detail-copy');
    const heading = element('div', 'page-heading shop-detail-heading');
    heading.append(element('span', 'eyebrow', product.category || 'Sheet music'));
    heading.append(element('h1', 'shop-detail-title', product.title || 'Untitled'));
    heading.append(element('p', 'shop-detail-summary', product.summary || ''));
    content.append(heading);
    const meta = element('div', 'shop-detail-meta');
    if (formatDate(product.date)) meta.append(element('span', '', `Published ${formatDate(product.date)}`));
    if (product.format) meta.append(element('span', '', product.format));
    if (product.instrumentation) meta.append(element('span', '', product.instrumentation));
    content.append(meta);
    const prose = element('div', 'shop-prose');
    renderDescription(product.description, prose);
    content.append(prose);
    const actions = element('div', 'shop-purchase');
    const links = Array.isArray(product.purchaseLinks) ? product.purchaseLinks : [];
    for (const link of links) {
      const url = safePurchase(typeof link === 'string' ? link : link?.url);
      if (!url) continue;
      const website = retailerName(url);
      const node = element('a', 'btn', `Purchase on ${website}`);
      node.href = previewOnly ? '#' : url;
      node.target = '_blank';
      node.rel = 'noopener noreferrer';
      if (previewOnly) {
        node.setAttribute('aria-disabled', 'true');
        node.title = 'Preview only - purchase link not available yet';
        node.addEventListener('click', (event) => event.preventDefault());
      }
      actions.append(node);
    }
    if (actions.childElementCount) content.append(actions);
    target.append(art, content);
  }

  // Static hosting only needs a slug index; every listing is populated from its MD file.
  async function fetchProduct(slug) {
    if (!slugPattern.test(slug)) throw new Error('Invalid product address.');
    let response = await fetch(`${root}${slug}/index.md`, { cache: 'no-store' });
    // GitHub Pages converts front-matter Markdown to HTML, so read the source on a 404.
    if (response.status === 404) {
      const raw = `https://raw.githubusercontent.com/Aur-iii/aurifellmusic/main/shop/products/${slug}/index.md`;
      response = await fetch(`${raw}?t=${Date.now()}`, { cache: 'no-store' });
    }
    if (!response.ok) throw new Error('Product not found.');
    return parseProduct(await response.text(), slug);
  }

  async function fetchProducts() {
    const response = await fetch(`${root}index.json`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Shop catalog could not be loaded.');
    const slugs = await response.json();
    if (!Array.isArray(slugs)) throw new Error('Shop catalog is invalid.');
    return Promise.all(slugs.filter((slug) => slugPattern.test(slug)).map(fetchProduct));
  }

  // Filter and sort controls never change the Markdown source files.
  function mountCatalog(products, target) {
    const step = 9;
    const grid = target.querySelector('#shopGrid');
    const filters = target.querySelector('#shopFilters');
    const count = target.querySelector('#shopCount');
    const sortMenu = target.querySelector('#shopSort');
    const toolbar = target.querySelector('.shop-toolbar');
    const empty = target.querySelector('#shopEmpty');
    const controls = target.querySelector('#shopControls');
    const moreButton = controls.querySelector('.show-more');
    const lessButton = controls.querySelector('.show-less');
    let category = 'All';
    let order = 'newest';
    let visible = step;
    let lastDelta = step;
    let filteredTotal = 0;
    toolbar.hidden = products.length === 0;
    empty.hidden = products.length !== 0;
    const categories = ['All', ...new Set(products.map((product) => product.category || 'Sheet music'))];
    const render = () => {
      const shown = products.filter((product) => category === 'All' || product.category === category);
      shown.sort((a, b) => {
        if (order === 'title') return a.title.localeCompare(b.title);
        if (order === 'price-low') return sortablePrice(a, Infinity) - sortablePrice(b, Infinity) || 0;
        if (order === 'price-high') return sortablePrice(b, -Infinity) - sortablePrice(a, -Infinity) || 0;
        return order === 'oldest' ? String(a.date).localeCompare(String(b.date)) : String(b.date).localeCompare(String(a.date));
      });
      filteredTotal = shown.length;
      grid.replaceChildren(...shown.slice(0, visible).map((product) => createCard(product)));
      count.textContent = `${shown.length} ${shown.length === 1 ? 'piece' : 'pieces'}`;
      controls.hidden = shown.length <= step;
      moreButton.hidden = visible >= shown.length;
      lessButton.hidden = visible <= step;
    };
    moreButton.addEventListener('click', () => {
      const delta = Math.min(step, filteredTotal - visible);
      if (delta <= 0) return;
      visible += delta;
      lastDelta = delta;
      render();
    });
    lessButton.addEventListener('click', () => {
      visible = Math.max(step, visible - lastDelta);
      lastDelta = step;
      render();
    });
    for (const name of categories) {
      const button = element('button', 'button shop-filter', name);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(name === category));
      button.addEventListener('click', () => {
        category = name;
        visible = step;
        lastDelta = step;
        filters.querySelectorAll('button').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
        render();
      });
      filters.append(button);
    }
    const sortSummary = sortMenu.querySelector('summary');
    let sortCloseTimer;
    const closeSort = () => {
      if (!sortMenu.open || sortMenu.classList.contains('is-closing')) return;
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        sortMenu.open = false;
        return;
      }
      sortMenu.classList.add('is-closing');
      sortCloseTimer = window.setTimeout(() => {
        sortMenu.open = false;
        sortMenu.classList.remove('is-closing');
      }, 180);
    };
    sortSummary.addEventListener('click', (event) => {
      event.preventDefault();
      if (sortMenu.open && !sortMenu.classList.contains('is-closing')) closeSort();
      else {
        window.clearTimeout(sortCloseTimer);
        sortMenu.classList.remove('is-closing');
        sortMenu.open = true;
      }
    });
    document.addEventListener('pointerdown', (event) => {
      if (!sortMenu.contains(event.target)) closeSort();
    });
    sortMenu.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeSort();
        sortSummary.focus();
      }
    });
    sortMenu.querySelectorAll('[data-sort]').forEach((button) => button.addEventListener('click', () => {
      order = button.dataset.sort;
      visible = step;
      lastDelta = step;
      sortSummary.querySelector('span').textContent = button.textContent;
      closeSort();
      render();
    }));
    render();
  }

  // Select the gallery or detail view from the page's data attribute.
  async function mountPublic() {
    const page = document.body.dataset.shopPage;
    if (!page) return;
    const slug = page === 'detail' ? new URLSearchParams(location.search).get('product') || '' : '';
    const hasProduct = slugPattern.test(slug);
    const hideInvalidDetail = () => {
      let robots = document.querySelector('meta[name="robots"]');
      if (!robots) {
        robots = document.createElement('meta');
        robots.name = 'robots';
        document.head.append(robots);
      }
      robots.content = 'noindex';
    };
    const showGalleryLink = (text) => {
      const message = document.getElementById('shopError');
      const link = document.createElement('a');
      link.href = 'shop.html';
      link.textContent = 'Browse the shop';
      message.textContent = `${text} `;
      message.append(link);
      message.hidden = false;
    };
    if (location.protocol === 'file:') {
      const message = document.getElementById('shopError');
      const link = document.createElement('a');
      link.href = `http://127.0.0.1:5173/preview/${page === 'detail' && hasProduct ? `shop-product.html?product=${encodeURIComponent(slug)}` : 'shop.html'}`;
      link.textContent = 'Open the shop through the local server';
      message.textContent = 'This page loads Markdown files, so it cannot run directly from file://. ';
      message.append(link);
      message.hidden = false;
      return;
    }
    if (page === 'detail' && !hasProduct) {
      hideInvalidDetail();
      showGalleryLink('No product was selected. Open a listing from the gallery.');
      return;
    }
    try {
      if (page === 'catalog') {
        const products = await fetchProducts();
        mountCatalog(products, document);
      } else if (page === 'detail') {
        const product = await fetchProduct(slug);
        renderDetail(product, document.getElementById('shopDetail'));
        document.title = `${product.title} | Auri Fell Music`;
        if (product.summary) document.querySelector('meta[name="description"]').content = product.summary;
        const canonical = document.createElement('link');
        canonical.rel = 'canonical';
        canonical.href = `https://aurifellmusic.com/shop-product.html?product=${encodeURIComponent(slug)}`;
        document.head.append(canonical);
      }
    } catch (error) {
      if (page === 'detail') hideInvalidDetail();
      const message = document.getElementById('shopError');
      if (message) { message.hidden = false; message.textContent = error.message; }
    }
  }

  window.AuriShop = { parseProduct, createCard, renderDetail, fetchProducts, fetchProduct };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountPublic);
  else mountPublic();
})();
