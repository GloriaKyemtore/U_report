(function () {
  var select = document.getElementById('statutFilter');
  var container = document.getElementById('complaintsContainer');
  var count = document.getElementById('complaintsCount');
  if (!select || !container) return;

  function applyFilter(statut) {
    var qs = statut ? '?statut=' + encodeURIComponent(statut) : '';
    fetch('/dashboard/filtre' + qs)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        container.innerHTML = data.html;
        if (count) count.textContent = data.count;
        history.replaceState(null, '', '/dashboard' + qs);
      })
      .catch(function () {});
  }

  select.addEventListener('change', function () {
    applyFilter(select.value);
  });

  // Le lien "Reinitialiser le filtre" est recree a chaque remplacement du
  // conteneur : on delegue l'ecoute du clic au conteneur parent.
  container.addEventListener('click', function (e) {
    var link = e.target.closest('[data-reset-filter]');
    if (!link) return;
    e.preventDefault();
    select.value = '';
    applyFilter('');
  });
})();
