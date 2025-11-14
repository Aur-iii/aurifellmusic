  (() => {
    // Year stamp
    const yEl = document.getElementById('y');
    if (yEl) yEl.textContent = new Date().getFullYear();

    // ----- Mobile menu -----
    const btnOut = document.getElementById('menuBtn');
    const btnIn  = document.getElementById('menuBtnIn');
    const card   = document.getElementById('menuCard');
    const backdrop = document.getElementById('backdrop');
    function setOpen(on){
      if (!card) return;
      const willOpen = !!on;
      card.classList.toggle('open', willOpen);
      document.body.classList.toggle('menu-open', willOpen);
      btnOut?.classList.toggle('is-open', willOpen);
      btnIn?.classList.toggle('is-open', willOpen);
      btnOut?.setAttribute('aria-expanded', String(willOpen));
      backdrop?.classList.toggle('show', willOpen);
      if (willOpen) setTimeout(()=> card.querySelector('.menu-list a')?.focus(), 280);
    }
    btnOut?.addEventListener('click', () => setOpen(!card?.classList.contains('open')));
    btnIn?.addEventListener('click',  () => setOpen(false));
    backdrop?.addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') setOpen(false); });
    document.addEventListener('click', (e)=>{
      const insideCard = e.target.closest('#menuCard');
      const onBtnOut   = e.target.closest('#menuBtn');
      const onBtnIn    = e.target.closest('#menuBtnIn');
      if (!insideCard && !onBtnOut && !onBtnIn) setOpen(false);
    });

    // ----- Demo data for releases (front-matter analogue) -----
    const releases = [
      {
        slug: 'if-i-were-a-ghost',
        title: 'If I Were A Ghost',
        date: '2025-10-31',
        type: 'single',
        cover: './assets/auri-anagram-color.png',
        blurb: 'A spectral indie/alt track with lush vocal stacks and a jazz-y undertow.',
        links: {
          bandcamp: 'https://aurifell-music.bandcamp.com/track/if-i-were-a-ghost',
          youtube: 'https://www.youtube.com/@AuriFellMusic'
        }
      },
      {
        slug: 'rose-bones-ep',
        title: 'Rose Bones',
        date: '2025-06-02',
        type: 'ep',
        cover: './assets/auri-a-color.png',
        blurb: 'An alt-goth cottage-synth EP exploring memory, deserts, and radio ghosts.',
        tracks: ['Thistle Static', 'Moon Quarry', 'Iris on the Rails', 'Signal / Silence'],
        links: {
          spotify: '#', apple: '#', bandcamp: '#', youtube: '#'
        }
      },
      {
        slug: 'marrow-creek-originals',
        title: 'Marrow Creek (Originals)',
        date: '2024-11-01',
        type: 'album',
        cover: './assets/auri-a-color_light.png',
        blurb: 'Soundtrack sketches and themes from the Marrow Creek universe.',
        tracks: ['Gravel Choir', 'Plateau Lights', 'Sandstorm Memory', 'The Silence'],
        links: {
          spotify: '#', apple: '#', bandcamp: '#'
        }
      }
    ].sort((a,b)=> new Date(b.date) - new Date(a.date));

    // Helpers for link selection / labels
    function primaryLink(links) {
      return links?.bandcamp || links?.spotify || links?.apple || links?.youtube || '#';
    }
    function secondaryLink(links, primaryHref) {
      const order = ['spotify','apple','bandcamp','youtube'];
      for (const k of order) {
        if (links?.[k] && links[k] !== primaryHref) {
          return {
            label: `Listen on ${k[0].toUpperCase() + k.slice(1)}`,
            href: links[k]
          };
        }
      }
      return null;
    }
    function labelFromHref(href) {
      if (!href) return 'Listen';
      if (href.includes('bandcamp')) return 'Listen on Bandcamp';
      if (href.includes('open.spotify')) return 'Listen on Spotify';
      if (href.includes('music.apple')) return 'Listen on Apple Music';
      if (href.includes('youtube')) return 'Listen on YouTube';
      return 'Listen';
    }

    // ----- Populate Latest Release -----
    const latest = releases[0];
    if (latest){
      document.getElementById('latestCover').src = latest.cover;
      document.getElementById('latestTitle').textContent = latest.title;
      const pretty = new Date(latest.date).toLocaleDateString(
        undefined,{year:'numeric', month:'short', day:'numeric'}
      );
      document.getElementById('latestMeta').textContent =
        `${latest.type.charAt(0).toUpperCase()+latest.type.slice(1)} • ${pretty}`;
      document.getElementById('latestBlurb').textContent = latest.blurb || '';

      const primary = primaryLink(latest.links);
      const btn1 = document.getElementById('latestPlay');
      btn1.href = primary;
      btn1.textContent = labelFromHref(primary);

      const btn2 = document.getElementById('latestAlt');
      const alt = secondaryLink(latest.links, primary);
      if (alt) {
        btn2.style.display = '';
        btn2.href = alt.href;
        btn2.textContent = alt.label;
      } else {
        btn2.style.display = 'none';
      }
    }

    // ----- Build Discography Grid -----
    const grid = document.getElementById('discographyGrid');
    releases.forEach((r, idx) => {
      const card = document.createElement('article');
      card.className = 'release';
      card.setAttribute('tabindex','0');
      card.setAttribute('role','button');
      card.dataset.index = idx;
      card.innerHTML = `
        <span class="label">${r.type.toUpperCase()}</span>
        <img src="${r.cover}" alt="${r.title} cover" loading="lazy"/>
      `;
      card.addEventListener('click', ()=> openLB(idx));
      card.addEventListener('keydown', (e)=>{
        if(e.key==='Enter' || e.key===' ') {
          e.preventDefault();
          openLB(idx);
        }
      });
      grid.appendChild(card);
    });

    // ----- Lightbox -----
    const lb = document.getElementById('lb');
    const lbClose = document.getElementById('lbClose');
    function openLB(i){
      const r = releases[i];
      document.getElementById('lbCover').src = r.cover;
      document.getElementById('lbTitle').textContent = r.title;
      const pretty = new Date(r.date).toLocaleDateString(
        undefined,{year:'numeric', month:'short', day:'numeric'}
      );
      document.getElementById('lbMeta').textContent =
        `${r.type.charAt(0).toUpperCase()+r.type.slice(1)} • ${pretty}`;
      document.getElementById('lbBlurb').textContent = r.blurb || '';

      const links = document.getElementById('lbLinks');
      links.innerHTML = '';
      const order = ['spotify','apple','bandcamp','youtube'];
      order.forEach(k=>{
        if (r.links && r.links[k]){
          const a = document.createElement('a');
          a.href = r.links[k];
          a.target = '_blank';
          a.rel='noopener';
          a.textContent = `Listen on ${k[0].toUpperCase()+k.slice(1)}`;
          links.appendChild(a);
        }
      });

      const wrap = document.getElementById('lbTracksWrap');
      const list = document.getElementById('lbTracks');
      if (r.type !== 'single' && Array.isArray(r.tracks)){
        wrap.style.display = '';
        list.innerHTML = '';
        r.tracks.forEach(t=>{
          const li = document.createElement('li');
          li.textContent = t;
          list.appendChild(li);
        });
      } else {
        wrap.style.display = 'none';
      }

      lb.classList.add('open');
      document.body.style.overflow = 'hidden';
      lb.querySelector('.lb-close').focus();
    }
    function closeLB(){
      lb.classList.remove('open');
      document.body.style.overflow = '';
    }
    lbClose.addEventListener('click', closeLB);
    lb.addEventListener('click', (e)=>{ if(e.target===lb) closeLB(); });
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeLB(); });
  })();