(() => {
  const section = document.querySelector('[data-brahmastra-faq]');
  if (!section) return;

  const search = section.querySelector('[data-faq-search]');
  const filters = [...section.querySelectorAll('[data-faq-filter]')];
  const items = [...section.querySelectorAll('[data-faq-item]')];
  const emptyState = section.querySelector('[data-faq-empty]');
  let activeFilter = 'all';

  const update = () => {
    const query = search.value.trim().toLowerCase();
    let visibleCount = 0;
    items.forEach((item) => {
      const matchesFilter = activeFilter === 'all' || item.dataset.audience.split(' ').includes(activeFilter);
      const matchesSearch = !query || item.textContent.toLowerCase().includes(query);
      const visible = matchesFilter && matchesSearch;
      item.hidden = !visible;
      if (visible) visibleCount += 1;
    });
    emptyState.hidden = visibleCount !== 0;
  };

  filters.forEach((filter) => filter.addEventListener('click', () => {
    activeFilter = filter.dataset.faqFilter;
    filters.forEach((button) => button.setAttribute('aria-pressed', String(button === filter)));
    update();
  }));

  search.addEventListener('input', update);
  items.forEach((item) => item.addEventListener('toggle', () => {
    if (!item.open) return;
    items.forEach((other) => { if (other !== item) other.open = false; });
  }));
})();
