(function () {
  var elements = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || !elements.length) {
    elements.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }
  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  elements.forEach(function (el) { observer.observe(el); });
})();
