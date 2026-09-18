(() => {
  const year = document.getElementById('y');
  if (year) year.textContent = new Date().getFullYear();
  const button = document.getElementById('menuBtn');
  const menu = document.getElementById('menuCard');
  const backdrop = document.getElementById('backdrop');
  if (!button || !menu) return;
  const setOpen = (open) => {
    menu.classList.toggle('open', open);
    button.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
    backdrop?.classList.toggle('show', open);
  };
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen(!menu.classList.contains('open'));
  });
  backdrop?.addEventListener('click', () => setOpen(false));
  menu
    .querySelectorAll('a')
    .forEach((link) => link.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });
})();
