(function () {
  var dropdown = document.getElementById('notifDropdown');
  var badge = document.getElementById('notifBadge');
  var list = document.getElementById('notifList');
  if (!dropdown || !badge || !list) return;

  var POLL_MS = 20000;

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderList(items) {
    if (!items.length) {
      list.innerHTML = '<li class="px-2 py-3 text-center text-muted small">Aucune notification</li>';
      return;
    }
    list.innerHTML = items
      .map(function (n) {
        return (
          '<li><a class="dropdown-item small text-wrap" href="/reclamations/' + n.id + '">' +
          '<strong>' + escapeHtml(n.ref) + '</strong> &mdash; ' + escapeHtml(n.titre) +
          '</a></li>'
        );
      })
      .join('');
  }

  function updateBadge(count) {
    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove('d-none');
    } else {
      badge.classList.add('d-none');
    }
  }

  function refresh() {
    fetch('/notifications')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        updateBadge(data.count);
        renderList(data.items);
      })
      .catch(function () {});
  }

  dropdown.addEventListener('shown.bs.dropdown', function () {
    updateBadge(0);
    fetch('/notifications/read', { method: 'POST' }).catch(function () {});
  });

  setInterval(refresh, POLL_MS);
})();
