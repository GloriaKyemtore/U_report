(function () {
  var select = document.getElementById('statutFilter');
  var container = document.getElementById('complaintsContainer');
  var count = document.getElementById('complaintsCount');
  var pager = document.getElementById('pagination');
  if (!select || !container) return;

  var exportPdf = document.getElementById('exportPdfBtn');

  function applyFilter(statut, page) {
    var params = [];
    if (statut) params.push('statut=' + encodeURIComponent(statut));
    if (page && page > 1) params.push('page=' + page);
    var qs = params.length ? '?' + params.join('&') : '';
    // L'export PDF suit le filtre de statut mais jamais la pagination :
    // il exporte l'ensemble des reclamations correspondantes.
    if (exportPdf) exportPdf.href = '/admin/export/pdf' + (statut ? '?statut=' + encodeURIComponent(statut) : '');
    fetch('/dashboard/filtre' + qs)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        container.innerHTML = data.html;
        if (count) count.textContent = data.count;
        if (pager) pager.innerHTML = data.pagination || '';
        history.replaceState(null, '', '/dashboard' + qs);
      })
      .catch(function () {});
  }

  select.addEventListener('change', function () {
    // Changer de filtre repart de la premiere page.
    applyFilter(select.value, 1);
  });

  // Les liens de pagination sont recrees a chaque chargement : on delegue
  // l'ecoute du clic au conteneur parent.
  if (pager) {
    pager.addEventListener('click', function (e) {
      var link = e.target.closest('[data-page]');
      if (!link || link.closest('.disabled')) return;
      e.preventDefault();
      applyFilter(select.value, parseInt(link.getAttribute('data-page'), 10));
    });
  }

  // Le lien "Reinitialiser le filtre" est recree a chaque remplacement du
  // conteneur : on delegue l'ecoute du clic au conteneur parent.
  container.addEventListener('click', function (e) {
    var link = e.target.closest('[data-reset-filter]');
    if (!link) return;
    e.preventDefault();
    select.value = '';
    applyFilter('', 1);
  });
})();
