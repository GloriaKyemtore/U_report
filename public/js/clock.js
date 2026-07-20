// Horloge de la navbar : affiche l'heure locale et se remet a jour chaque seconde.
(function () {
  const clock = document.getElementById('navClock');
  if (!clock) return;

  const format = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  function render() {
    clock.textContent = format.format(new Date());
  }

  render();

  // On se cale sur le debut de la seconde suivante pour que le changement
  // d'affichage tombe en meme temps que le changement d'heure reel.
  setTimeout(function () {
    render();
    setInterval(render, 1000);
  }, 1000 - (Date.now() % 1000));
})();
