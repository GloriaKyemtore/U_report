// Transforme tout <input data-phone> en champ telephone international
// (drapeaux + indicatif de tous les pays) via intl-tel-input.
// A la soumission, l'indicatif du pays choisi est prefixe au numero saisi.
(function () {
  if (!window.intlTelInput) return;
  document.querySelectorAll('input[data-phone]').forEach(function (input) {
    var iti = window.intlTelInput(input, {
      initialCountry: 'bf',
      separateDialCode: true,
      preferredCountries: ['bf', 'ci', 'ml', 'ne', 'tg', 'bj', 'sn', 'gh', 'ng', 'fr'],
    });
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
