const toggle = document.getElementById('navToggle');
const mobileNav = document.getElementById('navMobile');

toggle.addEventListener('click', () => {
  toggle.classList.toggle('open');
  mobileNav.classList.toggle('open');
});

function closeMobileNav() {
  toggle.classList.remove('open');
  mobileNav.classList.remove('open');
}