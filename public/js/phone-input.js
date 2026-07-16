// Transforme tout <input data-phone> en champ telephone international
// (drapeaux + indicatif de tous les pays) via intl-tel-input.
// A la soumission, l'indicatif du pays choisi est prefixe au numero saisi.
(function () {
  if (!window.intlTelInput) return;

  // Noms de pays en francais (un seul nom, au lieu du "Anglais (nom natif)"
  // affiche par defaut), generes pour tous les pays via Intl.DisplayNames.
  var localizedCountries;
  try {
    if (window.Intl && Intl.DisplayNames && window.intlTelInputGlobals) {
      var dn = new Intl.DisplayNames(['fr'], { type: 'region' });
      localizedCountries = {};
      window.intlTelInputGlobals.getCountryData().forEach(function (c) {
        try {
          var nom = dn.of(c.iso2.toUpperCase());
          if (nom && nom.toLowerCase() !== c.iso2) localizedCountries[c.iso2] = nom;
        } catch (e) {
          /* pays non resolu : on garde le nom par defaut */
        }
      });
    }
  } catch (e) {
    localizedCountries = undefined;
  }

  document.querySelectorAll('input[data-phone]').forEach(function (input) {
    var options = {
      initialCountry: 'bf',
      separateDialCode: true,
      preferredCountries: ['bf', 'ci', 'ml', 'ne', 'tg', 'bj', 'sn', 'gh', 'ng', 'fr'],
    };
    if (localizedCountries) options.localizedCountries = localizedCountries;

    var iti = window.intlTelInput(input, options);
    var form = input.closest('form');
    if (!form) return;
    form.addEventListener('submit', function () {
      var raw = input.value.trim();
      if (raw && raw.charAt(0) !== '+') {
        var dialCode = iti.getSelectedCountryData().dialCode;
        if (dialCode) input.value = '+' + dialCode + ' ' + raw;
      }
    });
  });
})();
