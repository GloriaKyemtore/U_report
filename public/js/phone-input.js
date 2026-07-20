// Transforme tout <input data-phone> en champ telephone international
// (drapeaux + indicatif de tous les pays) via intl-tel-input, avec
// validation du format propre a chaque pays (bon nombre de chiffres, etc.).
(function () {
  if (!window.intlTelInput) return;

  var UTILS = 'https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js';

  // Passe les noms de pays en francais et retrie la liste par ordre
  // alphabetique francais. On modifie DIRECTEMENT le tableau partage
  // d'intl-tel-input (getCountryData renvoie la reference interne) et on ne
  // passe PAS l'option `localizedCountries` : sinon la librairie retrie
  // elle-meme avec une comparaison naive (a.name < b.name) qui, en JS, place
  // les caracteres accentues (E majuscule = 201) apres tout l'alphabet ASCII.
  // Resultat sans ce contournement : "Etats-Unis", "Egypte", "Ethiopie" etc.
  // se retrouvaient tout en bas de la liste, apres "Zimbabwe" (introuvables).
  try {
    if (window.Intl && Intl.DisplayNames && window.intlTelInputGlobals) {
      var dn = new Intl.DisplayNames(['fr'], { type: 'region' });
      var countryData = window.intlTelInputGlobals.getCountryData();
      countryData.forEach(function (c) {
        try {
          var nom = dn.of(c.iso2.toUpperCase());
          if (nom && nom.toLowerCase() !== c.iso2) c.name = nom;
        } catch (e) {
          /* pays non resolu : on garde le nom par defaut */
        }
      });
      countryData.sort(function (a, b) {
        return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
      });
    }
  } catch (e) {
    /* localisation impossible : on garde les noms/ordre par defaut */
  }

  // Regroupe une suite de chiffres par paires separees de tirets : 52-30-47-10.
  function groupInPairs(value) {
    var digits = value.replace(/\D/g, '');
    var groups = [];
    for (var i = 0; i < digits.length; i += 2) groups.push(digits.substr(i, 2));
    return groups.join('-');
  }

  // Nombre de chiffres attendu pour le pays selectionne, deduit du numero
  // d'exemple fourni par libphonenumber (utils.js) : evite d'ecrire un tableau
  // pays par pays. Renvoie 0 tant que utils.js n'est pas charge ou si le pays
  // n'a pas d'exemple : dans ce cas on ne limite pas la saisie.
  var maxDigitsCache = {};
  function maxDigitsFor(iti) {
    if (!window.intlTelInputUtils || !intlTelInputUtils.getExampleNumber) return 0;
    var data = iti.getSelectedCountryData() || {};
    var iso2 = data.iso2;
    if (!iso2) return 0;
    if (maxDigitsCache[iso2]) return maxDigitsCache[iso2];
    try {
      var example = intlTelInputUtils.getExampleNumber(iso2, true, intlTelInputUtils.numberType.MOBILE);
      var n = (example || '').replace(/\D/g, '').length;
      if (n) maxDigitsCache[iso2] = n;
      return n;
    } catch (e) {
      return 0;
    }
  }

  // Tronque les chiffres a la longueur du pays puis les regroupe par paires.
  function formatForCountry(value, iti) {
    var digits = value.replace(/\D/g, '');
    var max = maxDigitsFor(iti);
    if (max && digits.length > max) digits = digits.slice(0, max);
    return groupInPairs(digits);
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
    // Pas d'option localizedCountries ici : les noms francais et l'ordre sont
    // deja appliques ci-dessus, directement dans les donnees partagees.

    var iti = window.intlTelInput(input, options);
    var form = input.closest('form');
    if (!form) return;

    // A chaque frappe : efface l'erreur eventuelle, limite la saisie au nombre
    // de chiffres du pays et regroupe par paires (52-30-47-10), en conservant
    // la position du curseur pour permettre les corrections au milieu.
    input.addEventListener('input', function () {
      input.classList.remove('is-invalid');
      errorElement(input).textContent = '';

      var digitsBeforeCaret = input.value.slice(0, input.selectionStart).replace(/\D/g, '').length;
      var formatted = formatForCountry(input.value, iti);
      if (formatted === input.value) return; // rien a reformater
      input.value = formatted;

      // Replace le curseur apres le meme nombre de chiffres qu'avant.
      var pos = 0;
      var seen = 0;
      while (pos < formatted.length && seen < digitsBeforeCaret) {
        if (/\d/.test(formatted.charAt(pos))) seen++;
        pos++;
      }
      input.setSelectionRange(pos, pos);
    });

    // Changement de pays : re-applique la limite du nouveau pays au numero deja
    // saisi (un numero trop long pour le nouveau pays est tronque).
    input.addEventListener('countrychange', function () {
      if (input.value) input.value = formatForCountry(input.value, iti);
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
