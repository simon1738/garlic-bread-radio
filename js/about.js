// ---- LOGO SPIN ON SCROLL ----

const logo = document.querySelector(".gbr-logo");

let ticking = false;

function updateLogoRotation() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  logo.style.transform = `rotate(${progress * 360}deg)`;
  ticking = false;
}

window.addEventListener("scroll", () => {
  if (!ticking) {
    requestAnimationFrame(updateLogoRotation);
    ticking = true;
  }
});

updateLogoRotation();

// ---- HEADER ALBUM LIST ----

function renderAlbum(album) {
  const cardTemplate = document.getElementById("album-card-template");
  const node = cardTemplate.content.cloneNode(true);

  const img = node.querySelector(".album-art");
  img.src = album.image;
  img.alt = `${album.album} artwork`;

  node.querySelector(".album-title").textContent = album.album;
  node.querySelector(".album-artist").textContent = album.artist;

  return node;
}

async function initAlbumList() {
  const list = document.getElementById("album-list");
  if (!list) return; // not on the about page

  try {
    const res = await fetch("data/albums.json");
    const albums = await res.json();

    list.innerHTML = "";
    albums.forEach((album) => list.appendChild(renderAlbum(album)));
  } catch (err) {
    list.innerHTML = `<p class="loading-msg">Couldn't load albums</p>`;
    console.error(err);
  }
}

initAlbumList();
