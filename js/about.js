// ---- LOGO SPIN ON SCROLL ----

const logo = document.querySelector(".gbr-logo");

let ticking = false;

function updateLogoRotation() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  logo.style.transform = `rotate(${progress * 180}deg)`;
  ticking = false;
}

window.addEventListener("scroll", () => {
  if (!ticking) {
    requestAnimationFrame(updateLogoRotation);
    ticking = true;
  }
});

updateLogoRotation();
