// ---- CONFIG ----
// Get a free key at https://www.last.fm/api/account/create
const LASTFM_API_KEY = "287bf7be3a6bde9f6174c639a306b459";
const LASTFM_ENDPOINT = "https://ws.audioscrobbler.com/2.0/";

// ---- HELPERS ----

async function fetchTrackArt(artist, track) {
  if (!LASTFM_API_KEY) {
    return null; // no key set yet, skip gracefully
  }
  const params = new URLSearchParams({
    method: "track.getInfo",
    api_key: LASTFM_API_KEY,
    artist,
    track,
    format: "json",
  });
  try {
    const res = await fetch(`${LASTFM_ENDPOINT}?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    const images = data?.track?.album?.image;
    // last.fm returns an array of sizes; grab the largest available
    const art = images?.[images.length - 1]?.["#text"];
    return art || null;
  } catch (err) {
    console.warn("Last.fm lookup failed for", artist, track, err);
    return null;
  }
}

// ---- RENDERING ----

function renderEpisode(episode, index) {
  const cardTemplate = document.getElementById("episode-card-template");
  const node = cardTemplate.content.cloneNode(true);

  node.querySelector(".episode-number").textContent =
    `EP ${String(episode.id)}`;
  node.querySelector(".episode-date").textContent = episode.date;
  node.querySelector(".episode-title").textContent = episode.title;

  const descriptionEl = node.querySelector(".episode-description");
  if (episode.description) {
    descriptionEl.textContent = episode.description;
  } else {
    descriptionEl.remove();
  }


  const tracklistEl = node.querySelector(".tracklist");
  const trackTemplate = document.getElementById("track-row-template");

  episode.tracklist.forEach((t, i) => {
    const row = trackTemplate.content.cloneNode(true);
    row.querySelector(".track-index").textContent = String(i + 1).padStart(2, "0");
    row.querySelector(".track-name").textContent = t.track;
    row.querySelector(".track-artist").textContent = t.artist;

    const img = row.querySelector(".track-art");
    img.alt = `${t.track} artwork`;

    tracklistEl.appendChild(row);

    // fetch art asynchronously and fill it in once it arrives
    fetchTrackArt(t.artist, t.track).then((artUrl) => {
      if (artUrl) img.src = artUrl;
    });
  });

  return node;
}

async function init() {
  const grid = document.getElementById("episode-grid");
  try {
    const res = await fetch("episodes.json");
    const episodes = await res.json();

    grid.innerHTML = ""; // clear "tuning in..." message

    // most recent episode first
    episodes
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach((episode, i) => grid.appendChild(renderEpisode(episode, i)));
  } catch (err) {
    grid.innerHTML = `<p class="loading-msg">couldn't load episodes — check episodes.json</p>`;
    console.error(err);
  }
}

init();
