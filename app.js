// ---- CONFIG ----
// Get a free key at https://www.last.fm/api/account/create
const LASTFM_API_KEY = "287bf7be3a6bde9f6174c639a306b459";
const LASTFM_ENDPOINT = "https://ws.audioscrobbler.com/2.0/";
let episodes = [];

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

// ---- ALBUM BAR ----
let loop = horizontalLoop(".image", {
  speed: 0.5,
  repeat: -1,
  paddingRight: 15,
  reversed: true,
});

function setDirection(value) {
  if (loop.direction !== value) {
    gsap.to(loop, { timeScale: value, duration: 0.3, overwrite: true });
    loop.direction = value;
  }
}

/*
This helper function makes a group of elements animate along the x-axis in a seamless, responsive loop.

Features:
 - Uses xPercent so that even if the widths change (like if the window gets resized), it should still work in most cases.
 - When each item animates to the left or right enough, it will loop back to the other side
 - Optionally pass in a config object with values like "speed" (default: 1, which travels at roughly 100 pixels per second), paused (boolean), repeat, reversed, and paddingRight.
 - The returned timeline will have the following methods added to it:
   - next() - animates to the next element using a timeline.tweenTo() which it returns. You can pass in a vars object to control duration, easing, etc.
   - previous() - animates to the previous element using a timeline.tweenTo() which it returns. You can pass in a vars object to control duration, easing, etc.
   - toIndex() - pass in a zero-based index value of the element that it should animate to, and optionally pass in a vars object to control duration, easing, etc. Always goes in the shortest direction
   - current() - returns the current index (if an animation is in-progress, it reflects the final index)
   - times - an Array of the times on the timeline where each element hits the "starting" spot. There's also a label added accordingly, so "label1" is when the 2nd element reaches the start.
 */
function horizontalLoop(items, config) {
  items = gsap.utils.toArray(items);
  config = config || {};
  let tl = gsap.timeline({
      repeat: config.repeat,
      paused: config.paused,
      defaults: { ease: "none" },
      onReverseComplete: () => tl.totalTime(tl.rawTime() + tl.duration() * 100),
    }),
    length = items.length,
    startX = items[0].offsetLeft,
    times = [],
    widths = [],
    xPercents = [],
    curIndex = 0,
    pixelsPerSecond = (config.speed || 1) * 100,
    snap = config.snap === false ? (v) => v : gsap.utils.snap(config.snap || 1), // some browsers shift by a pixel to accommodate flex layouts, so for example if width is 20% the first element's width might be 242px, and the next 243px, alternating back and forth. So we snap to 5 percentage points to make things look more natural
    totalWidth,
    curX,
    distanceToStart,
    distanceToLoop,
    item,
    i;
  gsap.set(items, {
    // convert "x" to "xPercent" to make things responsive, and populate the widths/xPercents Arrays to make lookups faster.
    xPercent: (i, el) => {
      let w = (widths[i] = parseFloat(gsap.getProperty(el, "width", "px")));
      xPercents[i] = snap(
        (parseFloat(gsap.getProperty(el, "x", "px")) / w) * 100 +
          gsap.getProperty(el, "xPercent"),
      );
      return xPercents[i];
    },
  });
  gsap.set(items, { x: 0 });
  totalWidth =
    items[length - 1].offsetLeft +
    (xPercents[length - 1] / 100) * widths[length - 1] -
    startX +
    items[length - 1].offsetWidth *
      gsap.getProperty(items[length - 1], "scaleX") +
    (parseFloat(config.paddingRight) || 0);
  for (i = 0; i < length; i++) {
    item = items[i];
    curX = (xPercents[i] / 100) * widths[i];
    distanceToStart = item.offsetLeft + curX - startX;
    distanceToLoop =
      distanceToStart + widths[i] * gsap.getProperty(item, "scaleX");
    tl.to(
      item,
      {
        xPercent: snap(((curX - distanceToLoop) / widths[i]) * 100),
        duration: distanceToLoop / pixelsPerSecond,
      },
      0,
    )
      .fromTo(
        item,
        {
          xPercent: snap(
            ((curX - distanceToLoop + totalWidth) / widths[i]) * 100,
          ),
        },
        {
          xPercent: xPercents[i],
          duration:
            (curX - distanceToLoop + totalWidth - curX) / pixelsPerSecond,
          immediateRender: false,
        },
        distanceToLoop / pixelsPerSecond,
      )
      .add("label" + i, distanceToStart / pixelsPerSecond);
    times[i] = distanceToStart / pixelsPerSecond;
  }
  function toIndex(index, vars) {
    vars = vars || {};
    Math.abs(index - curIndex) > length / 2 &&
      (index += index > curIndex ? -length : length); // always go in the shortest direction
    let newIndex = gsap.utils.wrap(0, length, index),
      time = times[newIndex];
    if (time > tl.time() !== index > curIndex) {
      // if we're wrapping the timeline's playhead, make the proper adjustments
      vars.modifiers = { time: gsap.utils.wrap(0, tl.duration()) };
      time += tl.duration() * (index > curIndex ? 1 : -1);
    }
    curIndex = newIndex;
    vars.overwrite = true;
    return tl.tweenTo(time, vars);
  }
  tl.next = (vars) => toIndex(curIndex + 1, vars);
  tl.previous = (vars) => toIndex(curIndex - 1, vars);
  tl.current = () => curIndex;
  tl.toIndex = (index, vars) => toIndex(index, vars);
  tl.times = times;
  tl.progress(1, true).progress(0, true); // pre-render for performance
  if (config.reversed) {
    tl.vars.onReverseComplete();
    tl.reverse();
  }
  return tl;
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
  const trackRows = [];

  episode.tracklist.forEach((t, i) => {
    const row = trackTemplate.content.cloneNode(true);
    row.querySelector(".track-index").textContent = String(i + 1).padStart(
      2,
      "0",
    );
    row.querySelector(".track-name").textContent = t.track;
    row.querySelector(".track-artist").textContent = t.artist;

    const img = row.querySelector(".track-art");
    img.alt = `${t.track} artwork`;

    tracklistEl.appendChild(row);

    trackRows.push({ img, artist: t.artist, track: t.track });
  });

  // wait to fetch album art until the card is actually opened
  const cardEl = node.querySelector(".episode-card");
  let artLoaded = false;
  cardEl.addEventListener("toggle", () => {
    if (!cardEl.open || artLoaded) return;
    artLoaded = true;
    trackRows.forEach(({ img, artist, track }) => {
      fetchTrackArt(artist, track).then((artUrl) => {
        if (artUrl) img.src = artUrl;
      });
    });
  });

  return node;
}

async function init() {
  document.getElementById("site-sub").textContent =
    "Every setlist from every show EVER";

  const grid = document.getElementById("episode-grid");
  try {
    const res = await fetch("episodes.json");
    episodes = await res.json();

    grid.innerHTML = "";

    // most recent episode first
    episodes
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach((episode, i) => grid.appendChild(renderEpisode(episode, i)));
  } catch (err) {
    grid.innerHTML = `<p class="loading-msg">Couldn't load episodes</p>`;
    console.error(err);
  }
}

// ---- SEARCH ----
const inputElement = document.getElementById("search");

inputElement.addEventListener("input", () => {
  const query = inputElement.value.toLowerCase();
  const grid = document.getElementById("episode-grid");
  grid.innerHTML = "";
  episodes
    .filter(
      (episode) =>
        episode.title.toLowerCase().includes(query) ||
        episode.description?.toLowerCase().includes(query) ||
        episode.tracklist.some(
          (t) =>
            t.track.toLowerCase().includes(query) ||
            t.artist.toLowerCase().includes(query),
        ),
    )
    .forEach((episode, i) => grid.appendChild(renderEpisode(episode, i)));

  if (grid.innerHTML === "") {
    grid.innerHTML = `<p class="loading-msg">Didn't find anything...</p>`;
  }
});

// ---- SORT ----

const sortSelect = document.getElementById("sort-select");

sortSelect.addEventListener("change", () => {
  const sortValue = sortSelect.value;
  const grid = document.getElementById("episode-grid");
  grid.innerHTML = "";

  let sortedEpisodes = [...episodes];
  if (sortValue === "date-desc") {
    sortedEpisodes.sort((a, b) => new Date(b.date) - new Date(a.date));
  } else if (sortValue === "date-asc") {
    sortedEpisodes.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  sortedEpisodes.forEach((episode, i) =>
    grid.appendChild(renderEpisode(episode, i)),
  );
});

// ---- BACK TO TOP ----

const backToTopBtn = document.getElementById("back-to-top");

window.addEventListener("scroll", () => {
  backToTopBtn.classList.toggle("visible", window.scrollY > 400);
});

backToTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

init();
