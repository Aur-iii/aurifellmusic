(() => {
  const host = document.getElementById('recentPosts');
  if (!host) return;
  const base = 'https://api.github.com/repos/Aur-iii/aurifellmusic/contents/blog/posts?ref=main';
  const raw = (path) => `https://raw.githubusercontent.com/Aur-iii/aurifellmusic/main/${path}`;
  const parse = (markdown) => {
    const end = markdown.indexOf('\n---', 3);
    const fields = {};
    if (!markdown.startsWith('---') || end < 0) return fields;
    markdown
      .slice(3, end)
      .trim()
      .split(/\r?\n/)
      .forEach((line) => {
        const match = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
        if (match) fields[match[1]] = match[2].trim().replace(/^"(.*)"$/, '$1');
      });
    return fields;
  };
  const prettyDate = (value) =>
    value
      ? new Date(value).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '';
  const escape = (value = '') =>
    value.replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  (async () => {
    try {
      const listing = await fetch(base, { cache: 'no-store' });
      if (!listing.ok) throw new Error('Could not list posts');
      const folders = (await listing.json()).filter(
        (item) => item.type === 'dir' && /^\d{4}-\d{2}-\d{2}-/.test(item.name),
      );
      const posts = await Promise.all(
        folders.map(async (folder) => {
          const markdown = await fetch(raw(`blog/posts/${folder.name}/index.md`), {
            cache: 'no-store',
          }).then((response) => response.text());
          return { slug: folder.name, fields: parse(markdown) };
        }),
      );
      posts.sort(
        (a, b) =>
          Date.parse(b.fields.date || b.slug.slice(0, 10)) -
          Date.parse(a.fields.date || a.slug.slice(0, 10)),
      );
      host.innerHTML = posts
        .slice(0, 3)
        .map((post) => {
          const { fields, slug } = post;
          const hero =
            fields.heroUrl ||
            (fields.hero ? raw(`blog/posts/${slug}/${fields.hero.replace(/^\.\//, '')}`) : '');
          return `
            <a class="card post-preview" href="blog.html#${encodeURIComponent(slug)}">
              ${hero ? `<img src="${escape(hero)}" alt="" loading="lazy">` : '<div class="post-preview-art" aria-hidden="true"></div>'}
              <div class="post-preview-copy">
                <span class="eyebrow">${escape(prettyDate(fields.date))}</span>
                <h3>${escape(fields.title || 'Untitled')}</h3>
                <span class="post-preview-cta">Read more →</span>
              </div>
            </a>`;
        })
        .join('');
      if (!host.children.length) host.innerHTML = '<p class="muted">New posts coming soon.</p>';
    } catch (error) {
      console.warn(error);
      host.innerHTML = '<p class="muted">Visit the blog for the latest updates.</p>';
    }
  })();
})();
