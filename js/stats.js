let episodes = [];

// ---- STAT COMPUTATION ----

function getTotalEpisodes(episodes) {
  return episodes.length;
}

function getTopArtists(episodes, limit) {
  const artistCounts = {};
  episodes.forEach(({ tracklist }) => {
    tracklist.forEach(({ artist }) => {
      artistCounts[artist] = (artistCounts[artist] || 0) + 1;
    });
  });
  return Object.entries(artistCounts)
    .map(([artist, count]) => ({ artist, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// ---- RENDERING ----

function renderArtistRow(rank, artist, count) {
  const rowTemplate = document.getElementById("artist-row-template");
  const node = rowTemplate.content.cloneNode(true);

  node.querySelector(".artist-rank").textContent = `${rank}.`;
  node.querySelector(".artist-name").textContent = artist;
  node.querySelector(".artist-count").textContent = `${count} plays`;

  return node;
}

async function init() {
  const list = document.getElementById("artist-list");
  const episodeCountEl = document.getElementById("episode-count");
  if (!list || !episodeCountEl) return; // not on the stats page

  try {
    const res = await fetch("data/episodes.json");
    episodes = await res.json();

    episodeCountEl.textContent = getTotalEpisodes(episodes);

    list.innerHTML = "";
    getTopArtists(episodes, 20).forEach(({ artist, count }, i) =>
      list.appendChild(renderArtistRow(i + 1, artist, count)),
    );
  } catch (err) {
    list.innerHTML = `<li class="loading-msg">Couldn't load stats</li>`;
    console.error(err);
  }
}

init();
