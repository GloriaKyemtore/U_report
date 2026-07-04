document.querySelectorAll('.toggle-password').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var input = btn.previousElementSibling;
    var icon = btn.querySelector('i');
    var showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    icon.classList.toggle('bi-eye', showing);
    icon.classList.toggle('bi-eye-slash', !showing);
  });
});
