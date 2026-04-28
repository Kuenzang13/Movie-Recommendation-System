// Simple, modular front-end logic with localStorage watchlist and content-based recommendations
const state = {
  movies: [],
  watchlist: new Set(JSON.parse(localStorage.getItem('watchlist') || '[]')),
  lastWatched: localStorage.getItem('lastWatched') || 'inception', // seed for demo
};

const els = {
  trendingGrid: document.getElementById('trendingGrid'),
  relatedGrid: document.getElementById('relatedGrid'),
  picksGrid: document.getElementById('picksGrid'),
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  searchResults: document.getElementById('searchResults'),
  becauseTitle: document.getElementById('becauseTitle'),
  cardTemplate: document.getElementById('cardTemplate'),
  modal: document.getElementById('detailModal'),
  modalClose: document.getElementById('modalClose'),
  modalImg: document.getElementById('modalImg'),
  modalTitle: document.getElementById('modalTitle'),
  modalDesc: document.getElementById('modalDesc'),
  modalTags: document.getElementById('modalTags'),
  modalPlay: document.getElementById('modalPlay'),
  modalAdd: document.getElementById('modalAdd'),
};

// Movie data (combine all movies for KNN)
const allMovies = [
  { title: "Inception", poster: "https://i.pinimg.com/originals/72/3d/50/723d5099b430dd39d0a203e06eb61452.jpg", tags: ["Sci-Fi", "Thriller"], rating: "8.8" },
  { title: "Interstellar", poster: "https://cameralabs.org/media/k2/items/cache/e30cf710e90c351ff73792fb505f304c_L.jpg", tags: ["Sci-Fi", "Drama"], rating: "8.6" },
  { title: "The Dark Knight", poster: "https://tse4.mm.bing.net/th/id/OIP.NN9rKH-vZbFgtH4FuoW7OwHaLH?pid=ImgDetMain&o=7&rm=3", tags: ["Action", "Crime"], rating: "9.0" },
  { title: "Parasite", poster: "https://wallpapers.com/images/hd/parasite-movie-staircase-scene-7mozyq90botax9oy.jpg", tags: ["Thriller", "Drama"], rating: "8.6" },
  { title: "Avengers: Endgame", poster: "https://tse3.mm.bing.net/th/id/OIP.KNfIqaD92jvecpbxNWWQ4wHaJ4?pid=ImgDetMain&o=7&rm=3", tags: ["Action", "Sci-Fi"], rating: "8.4" },
  { title: "Joker", poster: "https://tse4.mm.bing.net/th/id/OIP.4SzxxHd6AhrJIjmE39oKZwHaKe?pid=ImgDetMain&o=7&rm=3", tags: ["Crime", "Drama"], rating: "8.4" },
  { title: "La La Land", poster: "https://tse4.mm.bing.net/th/id/OIP.jeX7IshOyj5QiEElerGquQHaK-?pid=ImgDetMain&o=7&rm=3", tags: ["Romance", "Drama"], rating: "8.0" },
  { title: "Forrest Gump", poster: "https://tse2.mm.bing.net/th/id/OIP.4L_vNEKtfkb3z9layw1XXgHaJ3?pid=ImgDetMain&o=7&rm=3", tags: ["Drama", "Romance"], rating: "8.8" },
  { title: "The Matrix", poster: "https://tse1.explicit.bing.net/th/id/OIP.65Hwd6hiYXc22PENVJulyAHaKm?rs=1&pid=ImgDetMain&o=7&rm=3", tags: ["Sci-Fi", "Action"], rating: "8.7" },
  { title: "Titanic", poster: "https://tse2.mm.bing.net/th/id/OIP.XqG7LUbIi8q7DdiRLAliLgHaK5?pid=ImgDetMain&o=7&rm=3", tags: ["Romance", "Drama"], rating: "7.9" },
  { title: "Shutter Island", poster: "https://tse3.mm.bing.net/th/id/OIP.QBsSQD_8_qSoP2VOfwMcyQHaK9?pid=ImgDetMain&o=7&rm=3", tags: ["Thriller", "Mystery"], rating: "8.2" },
  { title: "Memento", poster: "https://tse2.mm.bing.net/th/id/OIP.86lA-l-Az82eQzPMVqWBxQHaJ4?pid=ImgDetMain&o=7&rm=3", tags: ["Mystery", "Thriller"], rating: "8.4" },
  { title: "Tenet", poster: "https://tse1.mm.bing.net/th/id/OIP.tY_h_iK19H2ZfA6Svajp2wHaK-?pid=ImgDetMain&o=7&rm=3", tags: ["Action", "Sci-Fi"], rating: "7.8" },
  { title: "Blade Runner 2049", poster: "https://tse3.mm.bing.net/th/id/OIP.wgOotAOgclEbDERXF8cdSQHaKe?pid=ImgDetMain&o=7&rm=3", tags: ["Sci-Fi", "Thriller"], rating: "8.0" },
  { title: "Arrival", poster: "https://image.tmdb.org/t/p/original/iQBIXJprC8AN7Jwx7aOI0gPUqff.jpg", tags: ["Sci-Fi", "Drama"], rating: "7.9" },
  { title: "Whiplash", poster: "assets/whiplash.jpg", tags: ["Drama", "Music"], rating: "8.5" },
  { title: "The Prestige", poster: "assets/prestige.jpg", tags: ["Drama", "Mystery"], rating: "8.5" },
  { title: "Moonlight", poster: "assets/moonlight.jpg", tags: ["Drama"], rating: "7.4" },
  { title: "Mad Max: Fury Road", poster: "assets/mad_max.jpg", tags: ["Action", "Adventure"], rating: "8.1" },
  { title: "Her", poster: "assets/her.jpg", tags: ["Romance", "Drama"], rating: "8.0" }
];

// Fetch data
async function loadData() {
  const res = await fetch('data/movies.json');
  const data = await res.json();
  state.movies = data;
}

// Utility: create star rating (0–5)
function renderStars(rating) {
  const fullStars = Math.round(rating);
  return '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
}

// Utility: tag chips
function renderTags(genres) {
  return genres.map(g => `<span class="tag">${g}</span>`).join('');
}

// Create card node from template
function createCard(movie) {
  const tpl = els.cardTemplate.content.cloneNode(true);
  const img = tpl.querySelector('img');
  const title = tpl.querySelector('.title');
  const tags = tpl.querySelector('.tags');
  const rating = tpl.querySelector('.rating');
  const wlBtn = tpl.querySelector('.watchlist-btn');
  const card = tpl.querySelector('.card');

  img.src = movie.img || 'assets/placeholder.jpg';
  img.alt = movie.title;
  title.textContent = movie.title;
  tags.innerHTML = renderTags(movie.genres);
  rating.textContent = renderStars(movie.rating);

  // Watchlist toggle
  const isInWatchlist = state.watchlist.has(movie.id);
  wlBtn.textContent = isInWatchlist ? '✓' : '+';
  wlBtn.title = isInWatchlist ? 'In watchlist' : 'Add to watchlist';
  wlBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleWatchlist(movie.id);
    const nowIn = state.watchlist.has(movie.id);
    wlBtn.textContent = nowIn ? '✓' : '+';
    wlBtn.title = nowIn ? 'In watchlist' : 'Add to watchlist';
  });

  // Open modal on click
  card.addEventListener('click', () => openModal(movie));
  return tpl;
}

// Render list into grid
function renderList(movies, container) {
  container.innerHTML = '';
  movies.forEach(m => container.appendChild(createCard(m)));
}

// Content-based similarity using tags + genres (cosine on binary vectors)
function cosineSim(a, b) {
  const setA = new Set(a);
  const setB = new Set(b);
  const all = new Set([...setA, ...setB]);
  let dot = 0, magA = 0, magB = 0;
  all.forEach(term => {
    const va = setA.has(term) ? 1 : 0;
    const vb = setB.has(term) ? 1 : 0;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  });
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
}

// Recommend top N similar to a given “seed”
function recommendSimilar(seedTitle, N = 5) {
  const seed = state.movies.find(m => m.title.toLowerCase() === seedTitle.toLowerCase());
  if (!seed) return [];

  const seedFeatures = [...(seed.tags || []), ...(seed.genres || [])];
  const scored = state.movies
    .filter(m => m.id !== seed.id)
    .map(m => ({
      movie: m,
      score: cosineSim(seedFeatures, [...(m.tags || []), ...(m.genres || [])])
    }))
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, N).map(s => s.movie);
}

// Trending heuristic: top rating + recent vibe by id ordering
function getTrending(N = 7) {
  return [...state.movies]
    .sort((a, b) => (b.rating - a.rating))
    .slice(0, N);
}

// Picks: curated stable selection
function getPicks(N = 6) {
  const curatedIds = ['enchanted-realm', 'cosmic-voyage', 'renaissance-hearts', 'starfall', 'neon-future', 'midknight-protocol'];
  const picks = state.movies.filter(m => curatedIds.includes(m.id));
  return picks.slice(0, N);
}

// Watchlist
function toggleWatchlist(id) {
  if (state.watchlist.has(id)) {
    state.watchlist.delete(id);
  } else {
    state.watchlist.add(id);
  }
  localStorage.setItem('watchlist', JSON.stringify([...state.watchlist]));
}

function openModal(movie) {
  els.modalImg.src = movie.img;
  els.modalTitle.textContent = movie.title;
  els.modalDesc.textContent = movie.desc;
  els.modalTags.innerHTML = renderTags([...(movie.genres || []), ...(movie.tags || [])]);
  els.modal.classList.add('show');

  els.modalPlay.onclick = () => {
    // Demo: mark last watched and close
    localStorage.setItem('lastWatched', movie.title);
    state.lastWatched = movie.title;
    els.modal.classList.remove('show');
    refreshRelated();
  };
  els.modalAdd.onclick = () => {
    toggleWatchlist(movie.id);
  };
}

function closeModal() {
  els.modal.classList.remove('show');
}

// Search across title, tags, genres
function search(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return state.movies.filter(m => {
    const hay = [
      m.title,
      ...(m.genres || []),
      ...(m.tags || [])
    ].join(' ').toLowerCase();
    return hay.includes(q);
  });
}

// Initial render
async function init() {
  await loadData();

  // Seed “Because you watched” title
  const lw = localStorage.getItem('lastWatched') || 'Inception';
  els.becauseTitle.textContent = `Because you watched "${lw}"`;

  renderList(getTrending(7), els.trendingGrid);
  refreshRelated();
  renderList(getPicks(6), els.picksGrid);

  // Events
  els.searchBtn.addEventListener('click', () => {
    const results = search(els.searchInput.value);
    renderList(results, els.searchResults);
  });
  els.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const results = search(els.searchInput.value);
      renderList(results, els.searchResults);
    }
  });
  els.modalClose.addEventListener('click', closeModal);
  els.modal.addEventListener('click', (e) => {
    if (e.target === els.modal) closeModal();
  });
}

function refreshRelated() {
  const seed = localStorage.getItem('lastWatched') || 'Inception';
  els.becauseTitle.textContent = `Because you watched "${seed}"`;

  const related = recommendSimilar(seed, 5);
  if (related.length === 0) {
    // Fall back to sci-fi themed suggestions
    const fallback = state.movies.filter(m => (m.genres || []).includes('Sci-Fi')).slice(0, 5);
    renderList(fallback, els.relatedGrid);
  } else {
    renderList(related, els.relatedGrid);
  }
}

// KNN: Find k nearest movies by tag similarity
function knnRecommend(selectedTitle, k = 5) {
  const selected = allMovies.find(m => m.title === selectedTitle);
  if (!selected) return [];

  // Simple similarity: count shared tags
  return allMovies
    .filter(m => m.title !== selectedTitle)
    .map(m => ({
      ...m,
      similarity: m.tags.filter(tag => selected.tags.includes(tag)).length
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
}

// Render function (same as before)
function renderMovies(gridId, movieList) {
  const grid = document.getElementById(gridId);
  grid.innerHTML = "";
  const template = document.getElementById("cardTemplate");

  movieList.forEach((movie) => {
    const card = template.content.cloneNode(true);
    const img = card.querySelector("img");
    img.src = movie.poster;
    img.alt = movie.title + " poster";
    card.querySelector(".title").textContent = movie.title;
    card.querySelector(".rating").textContent = movie.rating;
    const tagsDiv = card.querySelector(".tags");
    tagsDiv.innerHTML = movie.tags.map(tag => `<span class="tag">${tag}</span>`).join(" ");
    grid.appendChild(card);
  });
}

// Trending (example: first 10 movies)
renderMovies("trendingGrid", allMovies.slice(0, 10));

// KNN recommendations for "Inception"
const relatedMovies = knnRecommend("Inception", 5);
renderMovies("relatedGrid", relatedMovies);

// CineStream picks (example: next 5 movies)
renderMovies("picksGrid", allMovies.slice(10, 15));

init();