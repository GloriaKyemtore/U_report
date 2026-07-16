// Transforme tout <input data-phone> en champ telephone international
// (drapeaux + indicatif de tous les pays) via intl-tel-input, avec
// validation du format propre a chaque pays (bon nombre de chiffres, etc.).
(function () {
  if (!window.intlTelInput) return;

  var UTILS = 'https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js';

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

  function errorElement(input) {
    var wrap = input.closest('.iti') || input;
    var err = wrap.parentNode.querySelector('.phone-error');
    if (!err) {
      err = document.createElement('div');
      err.className = 'phone-error text-danger small mt-1';
      wrap.parentNode.insertBefore(err, wrap.nextSibling);
    }
    return err;
  }

  document.querySelectorAll('input[data-phone]').forEach(function (input) {
    var options = {
      initialCountry: 'bf',
      separateDialCode: true,
      preferredCountries: ['bf', 'ci', 'ml', 'ne', 'tg', 'bj', 'sn', 'gh', 'ng', 'fr'],
      utilsScript: UTILS,
    };
    if (localizedCountries) options.localizedCountries = localizedCountries;

    var iti = window.intlTelInput(input, options);
    var form = input.closest('form');
    if (!form) return;

    // Efface l'erreur des que l'utilisateur corrige son numero
    input.addEventListener('input', function () {
      input.classList.remove('is-invalid');
      errorElement(input).textContent = '';
    });

    form.addEventListener('submit', function (e) {
      var raw = input.value.trim();
      errorElement(input).textContent = '';
      input.classList.remove('is-invalid');

      // Champ vide : laisse la validation "required" native du navigateur decider
      if (!raw) return;

      // Validation par pays (disponible une fois utils.js charge)
      if (window.intlTelInputUtils && iti.isValidNumber() === false) {
        e.preventDefault();
        input.classList.add('is-invalid');
        errorElement(input).textContent =
          'Numéro invalide pour le pays sélectionné (vérifiez le nombre de chiffres).';
        input.focus();
        return;
      }

      // Numero valide : on stocke le format international complet
      if (window.intlTelInputUtils && typeof iti.getNumber === 'function') {
        var formatted = iti.getNumber(window.intlTelInputUtils.numberFormat.INTERNATIONAL);
        if (formatted) input.value = formatted;
      } else if (raw.charAt(0) !== '+') {
        var dialCode = iti.getSelectedCountryData().dialCode;
        if (dialCode) input.value = '+' + dialCode + ' ' + raw;
      }
    });
  });
})();
