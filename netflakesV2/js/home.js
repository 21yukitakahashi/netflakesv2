// ==================== CONFIGURATION ====================
const CONFIG = {
  API_KEY: '4e677baabbee6c14b748aa4c9c936109',
  BASE_URL: 'https://api.themoviedb.org/3',
  IMG_URL: 'https://image.tmdb.org/t/p/original',
  SERVERS: {
    'vidsrc.cc': 'https://vidsrc.cc/v2/embed',
    'vidsrc.me': 'https://vidsrc.net/embed',
    'player.videasy.net': 'https://player.videasy.net',
    'vidfast.pm': 'https://vidfast.pm',
    'www.vidsrc.wtf': 'https://vidsrc.wtf/api/1',
    'spencerdevs.xyz': 'https://spencerdevs.xyz'
  }
};

// ==================== STATE ====================
let currentItem = null;
let searchTimeout = null;
let isInlineSearchActive = false;

// ==================== API ====================
// ... (API Functions: fetchTrending, fetchTrendingAnime, fetchDiscover, searchContent, fetchDetails - WALANG BINAGO DITO) ...
async function fetchTrending(type, page = 1) {
  try {
    const valid_type = (type === 'movie' || type === 'tv') ? type : 'movie';
    const res = await fetch(`${CONFIG.BASE_URL}/trending/${valid_type}/week?api_key=${CONFIG.API_KEY}&page=${page}`);
    const data = await res.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch (err) {
    console.error(`Error fetching trending ${type}:`, err);
    return [];
  }
}
async function fetchTrendingAnime() {
  try {
    let all = [];
    for (let page = 1; page <= 3; page++) {
      const res = await fetch(`${CONFIG.BASE_URL}/trending/tv/week?api_key=${CONFIG.API_KEY}&page=${page}`);
      const data = await res.json();
      const filtered = (data.results || []).filter(item =>
        item.original_language === 'ja' && (item.genre_ids || []).includes(16)
      );
      all = all.concat(filtered);
    }
    return all;
  } catch (err) {
    console.error('Error fetching trending anime:', err);
    return [];
  }
}
async function fetchDiscover(type, genre, page = 1) {
  const endpointType = (type === 'anime') ? 'tv' : type;
  let url = `${CONFIG.BASE_URL}/discover/${endpointType}?api_key=${CONFIG.API_KEY}&page=${page}&sort_by=popularity.desc`;
  let genreParams = [];
  if (genre) { genreParams.push(genre); }
  if (type === 'anime') {
    if (!genreParams.includes('16')) { genreParams.push('16'); }
    url += '&with_original_language=ja';
  }
  if (genreParams.length > 0) { url += `&with_genres=${genreParams.join(',')}`; }
  try {
    const res = await fetch(url);
    const data = await res.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch (err) {
    console.error(`Error fetching discover ${type} with genre ${genre}:`, err);
    return [];
  }
}
async function searchContent(query) {
  try {
    const res = await fetch(`${CONFIG.BASE_URL}/search/multi?api_key=${CONFIG.API_KEY}&query=${encodeURIComponent(query)}`);
    const data = await res.json();
    return (data.results || []).filter(item =>
      (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path
    );
  } catch (err) {
    console.error('Error searching content:', err);
    return [];
  }
}
async function fetchDetails(type, id) {
  try {
    // Idinagdag natin ang ,external_ids para makuha ang IMDB ID
    const res = await fetch(`${CONFIG.BASE_URL}/${type}/${id}?api_key=${CONFIG.API_KEY}&append_to_response=images,external_ids`);
    const data = await res.json();
    data.media_type = type;
    return data;
  } catch (err) {
    console.error(`Error fetching details for ${type} ${id}:`, err);
    return null;
  }
}


// ==================== UI ====================
// ... (UI Functions: displayBanner, displayList, createMediaCard, createSearchResultItem, searchTMDB_Inline, toggleInlineSearch - WALANG BINAGO DITO) ...
function displayBanner(item) {
  const banner = document.getElementById('banner');
  const titleElement = document.getElementById('banner-title');
  const desc = document.getElementById('banner-description');
  const playBtn = document.getElementById('banner-play-btn');
  const infoBtn = document.getElementById('banner-info-btn');
  banner.style.backgroundImage = item?.backdrop_path ? `url(${CONFIG.IMG_URL}${item.backdrop_path})` : 'none';
  desc.textContent = item.overview || 'No description available.';
  titleElement.innerHTML = ''; titleElement.classList.remove('has-logo');
  let logoToUse = null;
  if (item.images?.logos?.length > 0) {
    logoToUse = item.images.logos.find(logo => logo.iso_639_1 === 'en') || item.images.logos[0];
  }
  if (logoToUse) {
    const logoImg = document.createElement('img');
    logoImg.src = `https://image.tmdb.org/t/p/w500${logoToUse.file_path}`;
    logoImg.className = 'hero-title-logo'; logoImg.alt = item.title || item.name;
    titleElement.appendChild(logoImg); titleElement.classList.add('has-logo');
  } else { titleElement.textContent = item.title || item.name || ''; }
  const itemForModal = item;
  playBtn.onclick = () => showDetails(itemForModal);
  infoBtn.onclick = () => showDetails(itemForModal);
}
function displayList(items, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = ''; items.forEach(item => container.appendChild(createMediaCard(item)));
}
function createMediaCard(item) {
  const card = document.createElement('div'); card.className = 'media-card';
  card.setAttribute('role', 'button'); card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', (item.title || item.name || 'Open') + ' details');
  if (!item.media_type) { item.media_type = item.title ? 'movie' : 'tv'; }
  const img = document.createElement('img');
  img.src = item.poster_path ? `${CONFIG.IMG_URL}${item.poster_path}` : 'https://via.placeholder.com/200x300?text=No+Image';
  img.alt = item.title || item.name || 'Poster'; img.loading = 'lazy';
  const overlay = document.createElement('div'); overlay.className = 'media-card-overlay';
  const title = document.createElement('div'); title.className = 'media-card-title'; title.textContent = item.title || item.name;
  const rating = document.createElement('div'); rating.className = 'media-card-rating';
  rating.innerHTML = `<i class="fas fa-star" aria-hidden="true"></i> ${Number(item.vote_average || 0).toFixed(1)}`;
  overlay.appendChild(title); overlay.appendChild(rating);
  card.appendChild(img); card.appendChild(overlay);
  const open = () => showDetails(item); card.onclick = open;
  card.onkeydown = (e) => (e.key === 'Enter' || e.key === ' ') && open();
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top;
    const { width, height } = rect; const rotateX = (y - height / 2) / (height / 2) * -10; const rotateY = (x - width / 2) / (width / 2) * 10;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
  });
  card.addEventListener('mouseleave', () => { card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)'; });
  return card;
}
function createSearchResultItem(item) {
  const itemElement = document.createElement('div'); itemElement.className = 'search-result-item';
  const img = document.createElement('img');
  img.src = item.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : 'https://via.placeholder.com/45x60?text=N/A';
  img.alt = item.title || item.name; img.loading = 'lazy';
  const info = document.createElement('div'); info.className = 'search-result-info';
  const title = document.createElement('h4'); title.textContent = item.title || item.name;
  const year = document.createElement('p'); const date = item.release_date || item.first_air_date;
  year.textContent = date ? new Date(date).getFullYear() : 'N/A';
  info.appendChild(title); info.appendChild(year);
  itemElement.appendChild(img); itemElement.appendChild(info);
  itemElement.onclick = () => { showDetails(item); toggleInlineSearch(false); };
  return itemElement;
}
async function searchTMDB_Inline() {
  const query = document.getElementById('inline-search-input').value.trim();
  const resultsContainer = document.getElementById('inline-search-results');
  clearTimeout(searchTimeout); if (!query) { resultsContainer.innerHTML = ''; resultsContainer.classList.remove('visible'); return; }
  resultsContainer.classList.add('visible'); resultsContainer.innerHTML = '<div class="inline-search-results-feedback"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';
  searchTimeout = setTimeout(async () => {
    const list = await searchContent(query); resultsContainer.innerHTML = '';
    if (!list.length) { resultsContainer.innerHTML = '<div class="inline-search-results-feedback">No results found.</div>'; return; }
    list.slice(0, 5).forEach(item => { resultsContainer.appendChild(createSearchResultItem(item)); });
  }, 450);
}
function toggleInlineSearch(forceState) {
  const container = document.getElementById('search-container'); const input = document.getElementById('inline-search-input');
  const icon = document.getElementById('search-btn-icon'); const results = document.getElementById('inline-search-results');
  const newState = (forceState !== undefined) ? forceState : !container.classList.contains('active');
  if (newState) { container.classList.add('active'); icon.className = 'fas fa-times'; input.focus(); isInlineSearchActive = true; }
  else { container.classList.remove('active'); icon.className = 'fas fa-search'; input.value = ''; input.blur(); results.innerHTML = ''; results.classList.remove('visible'); isInlineSearchActive = false; }
}


// ==================== MODAL (Details) ====================
// ... (Modal Functions: loadEpisodes, createEpisodeListItem, showDetails, closeModal - WALANG BINAGO DITO) ...
async function loadEpisodes(tvId, seasonNumber) {
  const episodeListContainer = document.getElementById('episode-list');
  episodeListContainer.innerHTML = '<div class="inline-search-results-feedback"><i class="fas fa-spinner fa-spin"></i> Loading episodes...</div>';
  if (!seasonNumber) { episodeListContainer.innerHTML = '<div class="episode-list-placeholder">Select a season to view episodes.</div>'; return; }
  try {
    const res = await fetch(`${CONFIG.BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${CONFIG.API_KEY}`);
    const data = await res.json(); episodeListContainer.innerHTML = '';
    if (data?.episodes?.length > 0) {
      data.episodes.forEach((ep, index) => {
        const episodeItem = createEpisodeListItem(ep);
        episodeItem.addEventListener('click', () => {
          episodeListContainer.querySelectorAll('.episode-item').forEach(el => el.classList.remove('active'));
          episodeItem.classList.add('active'); changeServer();
        });
        episodeListContainer.appendChild(episodeItem);
        if (index === 0) { episodeItem.classList.add('active'); }
      });
      changeServer();
    } else { episodeListContainer.innerHTML = '<div class="episode-list-placeholder">No episodes found for this season.</div>'; }
  } catch (err) { console.error("Error loading episodes:", err); episodeListContainer.innerHTML = '<div class="episode-list-placeholder">Error loading episodes.</div>'; }
}
function createEpisodeListItem(ep) {
  const item = document.createElement('div'); item.className = 'episode-item'; item.dataset.episodeNumber = ep.episode_number;
  const numberSpan = document.createElement('span'); numberSpan.className = 'ep-number'; numberSpan.textContent = ep.episode_number;
  const thumbnail = document.createElement('img'); thumbnail.className = 'ep-thumbnail';
  thumbnail.src = ep.still_path ? `https://image.tmdb.org/t/p/w185${ep.still_path}` : 'https://via.placeholder.com/100x56?text=N/A';
  thumbnail.alt = `Episode ${ep.episode_number}`; thumbnail.loading = 'lazy';
  const infoDiv = document.createElement('div'); infoDiv.className = 'ep-info';
  const titleSpan = document.createElement('span'); titleSpan.className = 'ep-title'; titleSpan.textContent = ep.name || `Episode ${ep.episode_number}`;
  const durationSpan = document.createElement('span'); durationSpan.className = 'ep-duration'; durationSpan.textContent = ep.runtime ? `${ep.runtime} min` : '';
  infoDiv.appendChild(titleSpan); if (ep.runtime) { infoDiv.appendChild(durationSpan); }
  const playIcon = document.createElement('i'); playIcon.className = 'fas fa-play ep-play-icon';
  item.appendChild(numberSpan); item.appendChild(thumbnail); item.appendChild(infoDiv); item.appendChild(playIcon);
  return item;
}
async function showDetails(item) {
  const searchModal = document.getElementById('search-modal'); if (searchModal.classList.contains('active')) { closeSearchModal(); }
  currentItem = item;
  const modalContainer = document.getElementById('modal-container'); const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title'); const modalDescription = document.getElementById('modal-description');
  const modalImage = document.getElementById('modal-image'); const modalRating = document.getElementById('modal-rating');
  const modalYear = document.getElementById('modal-year'); const modalType = document.getElementById('modal-type');
  const modalGenres = document.getElementById('modal-genres'); const modalBackdrop = document.getElementById('modal-backdrop-image');
  const seasonSelect = document.getElementById('season-select'); seasonSelect.innerHTML = '';
  document.getElementById('episode-list').innerHTML = '<div class="episode-list-placeholder">Select a season to view episodes.</div>';
  let media_type = item.media_type; if (!media_type) { media_type = item.title ? 'movie' : 'tv'; } if (media_type === 'anime') { media_type = 'tv'; }
  modalTitle.innerHTML = ''; let detailedItem = item;
 if (!item.images && item.id) { console.log("Fetching full details..."); detailedItem = await fetchDetails(media_type, item.id) || item; }

  // --- BAGO: I-save ang IMDB ID ---
  if (detailedItem?.external_ids?.imdb_id) {
    currentItem.imdb_id = detailedItem.external_ids.imdb_id;
    console.log(`[showDetails] IMDB ID found: ${currentItem.imdb_id}`);
  } else {
    console.warn(`[showDetails] IMDB ID NOT found for ${detailedItem.id}`);
    currentItem.imdb_id = null; // Ilagay na null kung walang nakuha
  }
  // --- END NG BAGO ---

  let logoToUse = null; if (detailedItem.images?.logos?.length > 0) { logoToUse = detailedItem.images.logos.find(logo => logo.iso_639_1 === 'en') || detailedItem.images.logos[0]; }
  if (logoToUse) {
    const logoImg = document.createElement('img'); logoImg.src = `https://image.tmdb.org/t/p/w500${logoToUse.file_path}`;
    logoImg.className = 'modal-title-logo'; logoImg.alt = detailedItem.title || detailedItem.name; modalTitle.appendChild(logoImg);
  } else { modalTitle.textContent = detailedItem.title || detailedItem.name || ''; }
  modalDescription.textContent = detailedItem.overview || 'No description available.';
  modalImage.src = `${CONFIG.IMG_URL}${detailedItem.poster_path}`; modalImage.alt = (detailedItem.title || detailedItem.name || '') + ' poster';
  modalBackdrop.src = detailedItem.backdrop_path ? `${CONFIG.IMG_URL}${detailedItem.backdrop_path}` : '';
  modalRating.textContent = Number(detailedItem.vote_average || 0).toFixed(1);
  const year = detailedItem.release_date || detailedItem.first_air_date; modalYear.textContent = year ? new Date(year).getFullYear() : 'N/A';
  currentItem.media_type = media_type; modalType.textContent = media_type === 'movie' ? 'Movie' : 'TV Show';
  modalGenres.innerHTML = ''; let genres = detailedItem.genres || [];
  if (genres.length > 0) { genres.slice(0, 4).forEach(genre => { const tag = document.createElement('span'); tag.className = 'genre-tag'; tag.textContent = genre.name; modalGenres.appendChild(tag); }); }
  modalContainer.classList.remove('is-movie', 'is-tv');
  if (currentItem.media_type === 'tv') {
    modalContainer.classList.add('is-tv');
    if (detailedItem?.seasons) {
      detailedItem.seasons.forEach(season => { if (season.season_number > 0) { const option = document.createElement('option'); option.value = season.season_number; option.textContent = `Season ${season.season_number} (${season.episode_count} eps)`; seasonSelect.appendChild(option); } });
      seasonSelect.onchange = () => loadEpisodes(detailedItem.id, seasonSelect.value);
      if (seasonSelect.value) { loadEpisodes(detailedItem.id, seasonSelect.value); } else { document.getElementById('episode-list').innerHTML = '<div class="episode-list-placeholder">No seasons found.</div>'; changeServer(); }
    } else { console.warn("Season data missing:", detailedItem?.id); document.getElementById('episode-list').innerHTML = '<div class="episode-list-placeholder">Could not load season data.</div>'; changeServer(); }
  } else { modalContainer.classList.add('is-movie'); changeServer(); }
  modal.classList.add('active'); modal.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
}
function closeModal() {
  console.log("closeModal called."); const modal = document.getElementById('modal'); const modalVideo = document.getElementById('modal-video');
  modal.classList.remove('active'); modal.setAttribute('aria-hidden', 'true'); modalVideo.src = ''; document.body.style.overflow = 'auto';
  document.getElementById('season-select').innerHTML = ''; document.getElementById('episode-list').innerHTML = '<div class="episode-list-placeholder">Select a season to view episodes.</div>';
  document.getElementById('modal-container').classList.remove('is-movie', 'is-tv'); currentItem = null;
}

// ===========================================
// === ITO ANG IN-UPDATE NA changeServer FUNCTION ===
// ===========================================
function changeServer() {
  if (!currentItem) { console.warn("changeServer called but currentItem is null."); return; }
  
  // --- Kunin ang parehong ID ---
  const tmdbId = currentItem.id;
  const imdbId = currentItem.imdb_id; // Galing sa showDetails (kailangan pa rin para sa vidsrc.cc)

  const server = document.getElementById('server').value; 
  let type = currentItem.media_type; 
  if (!type) { type = currentItem.title ? 'movie' : 'tv'; }
  type = type === 'movie' ? 'movie' : 'tv'; 
  
  const baseURL = CONFIG.SERVERS[server]; 
  if (!baseURL) { console.error("Invalid server:", server); return; }
  
  let embedURL = ''; 
  console.log(`[changeServer] Building URL: Server=${server}, Type=${type}, TMDB_ID=${tmdbId}, IMDB_ID=${imdbId}`);

  // --- Check kung may IMDB ID para sa vidsrc.cc (Server 1) ---
  if (server === 'vidsrc.cc' && !imdbId) {
    console.error(`Server ${server} requires an IMDB ID, but none was found.`);
    alert(`Error: Server ${server} requires an IMDB ID, but it's not available for this title.`);
    const videoFrame = document.getElementById('modal-video');
    videoFrame.src = ''; 
    return; 
  }

  // ===========================================
  // === LOGIC PARA SA BAWAT SERVER ===
  // ===========================================

  if (type === 'movie') {
    if (server === 'vidsrc.cc') { 
        // Server 1: vidsrc.cc (Gumagamit ng IMDB ID)
        embedURL = `${baseURL}/${type}/${imdbId}`; 
    }
    else if (server === 'vidsrc.me') { 
        // Server 2: vidsrc.me (Gumagamit ng TMDB ID + ?tmdb=)
        embedURL = `${baseURL}/${type}/?tmdb=${tmdbId}`; 
    }
    else if (server === 'player.videasy.net' || server === 'vidfast.pm' || server === 'vidora.su') { 
        // Server 3, 4, at 6: (Gumagamit ng TMDB ID, walang /embed/)
        // NILIPAT NATIN ANG 'vidora.su' DITO
        embedURL = `${baseURL}/${type}/${tmdbId}`; 
    }
    else if (server === 'www.vidsrc.wtf') {
        // Server 5: vidsrc.wtf (Format galing sa docs)
        embedURL = `${baseURL}/movie/?id=${tmdbId}`;
    }
  } 
  
  else if (type === 'tv') {
    const season = document.getElementById('season-select').value; 
    const activeEpisodeItem = document.querySelector('#episode-list .episode-item.active');
    const episode = activeEpisodeItem ? activeEpisodeItem.dataset.episodeNumber : null;
    
    if (!season || !episode) { 
      console.warn("TV show selected but season/episode not ready. Using fallback.");
      // Fallback
      if (server === 'vidsrc.cc') { 
        embedURL = `${baseURL}/${type}/${imdbId}`; 
      }
      else if (server === 'vidsrc.me') { 
        embedURL = `${baseURL}/${type}/?tmdb=${tmdbId}`; 
      }
      else if (server === 'player.videasy.net' || server === 'vidfast.pm' || server === 'vidora.su') { 
        // NILIPAT NATIN ANG 'vidora.su' DITO
        embedURL = `${baseURL}/${type}/${tmdbId}`; 
      }
      else if (server === 'www.vidsrc.wtf') {
        embedURL = `${baseURL}/tv/?id=${tmdbId}`;
      }
    }
    else { 
      console.log(`[changeServer] Building TV URL: S=${season}, E=${episode}`);
      if (server === 'vidsrc.cc') { 
          embedURL = `${baseURL}/${type}/${imdbId}/${season}/${episode}`; 
      }
      else if (server === 'vidsrc.me') { 
          embedURL = `${baseURL}/${type}/?tmdb=${tmdbId}&s=${season}&e=${episode}`; 
      }
      else if (server === 'player.videasy.net' || server === 'vidfast.pm' || server === 'vidora.su') { 
        // NILIPAT NATIN ANG 'vidora.su' DITO
          embedURL = `${baseURL}/${type}/${tmdbId}/${season}/${episode}`; 
      }
      else if (server === 'www.vidsrc.wtf') {
          embedURL = `${baseURL}/tv/?id=${tmdbId}&s=${season}&e=${episode}`;
      }
    }
  }
  
  console.log("[changeServer] Setting iframe src to:", embedURL); 
  const videoFrame = document.getElementById('modal-video'); 
  if (videoFrame.src !== embedURL) { 
    videoFrame.src = embedURL; 
  }
}

// ==================== SEARCH MODAL (Mobile) ====================
// ... (Search Modal Functions: openSearchModal, closeSearchModal, searchTMDB - WALANG BINAGO DITO) ...
function openSearchModal() { const m = document.getElementById('search-modal'); const input = document.getElementById('search-input'); m.classList.add('active'); m.setAttribute('aria-hidden', 'false'); input.focus(); document.body.style.overflow = 'hidden'; }
function closeSearchModal() { const m = document.getElementById('search-modal'); const input = document.getElementById('search-input'); const results = document.getElementById('search-results'); m.classList.remove('active'); m.setAttribute('aria-hidden', 'true'); input.value = ''; results.innerHTML = ''; document.body.style.overflow = 'auto'; }
async function searchTMDB() {
  const query = document.getElementById('search-input').value.trim(); const results = document.getElementById('search-results');
  const loading = document.getElementById('search-loading'); const empty = document.getElementById('search-empty');
  clearTimeout(searchTimeout); if (!query) { results.innerHTML = ''; loading.style.display = 'none'; empty.style.display = 'none'; return; }
  loading.style.display = 'flex'; empty.style.display = 'none'; results.innerHTML = '';
  searchTimeout = setTimeout(async () => {
    const list = await searchContent(query); loading.style.display = 'none';
    if (!list.length) { empty.style.display = 'flex'; return; }
    results.innerHTML = ''; list.forEach(item => results.appendChild(createMediaCard(item)));
  }, 450);
}


// ==================== HELPERS ====================
// ... (Helper Functions: scrollCarousel, toggleMobileMenu, handleNavbarScroll, initScrollObserver - WALANG BINAGO DITO) ...
function scrollCarousel(listId, direction) { const list = document.getElementById(listId); const amount = 400; list.scrollBy({ left: direction * amount, behavior: 'smooth' }); }
function toggleMobileMenu() { const menu = document.getElementById('mobile-menu'); const isActive = menu.classList.toggle('active'); menu.setAttribute('aria-hidden', String(!isActive)); }
function handleNavbarScroll() { const navbar = document.querySelector('.navbar'); if (window.scrollY > 50) navbar.classList.add('scrolled'); else navbar.classList.remove('scrolled'); }
function initScrollObserver() {
  const animatedElements = document.querySelectorAll('.scroll-animate');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } });
  }, { threshold: 0.1 }); animatedElements.forEach(el => { observer.observe(el); });
}

// =======================================================
// === LOGIC PARA SA all.html PAGE (REVISED) ===
// =======================================================

let allPage = 1;
let allType = 'movie';
let allGenre = null;

const MOVIE_GENRES = { 28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction', 10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western' };
const TV_GENRES = { 10759: 'Action & Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family', 10762: 'Kids', 9648: 'Mystery', 10763: 'News', 10764: 'Reality', 10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics', 37: 'Western' };

function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    type: params.get('type') || 'movie',
    genre: params.get('genre') || null,
  };
}

// ===================================================================
// === ITO ANG INAYOS NA FUNCTION PARA SA "VIEW ALL" ===
// ===================================================================
async function loadAllResults(page = 1) {
  console.log(`[loadAllResults] Called. Page: ${page}, Type: ${allType}, Genre: ${allGenre}`); // DEBUG LOG
  const grid = document.getElementById('all-results-grid');
  const loading = document.getElementById('all-loading');
  const empty = document.getElementById('all-empty');
  const loadMoreBtn = document.getElementById('load-more-btn');

  // Defensive check kung nahanap ba ang elements
  if (!grid || !loading || !empty || !loadMoreBtn) {
      console.error("[loadAllResults] Error: Missing required HTML elements (grid, loading, empty, loadMoreBtn).");
      return;
  }

  loading.style.display = 'flex'; // IPAPAKITA ANG LOADING
  console.log("[loadAllResults] Loading spinner shown."); // DEBUG LOG
  loadMoreBtn.style.display = 'none';
  if (page === 1) {
    grid.innerHTML = ''; // Laging linisin ang grid kapag page 1 (o nag-filter)
  }

  let results = [];
  
  try { // Idinagdag ang try...catch block para mahuli ang errors sa fetch
    if (allType === 'anime') {
        results = await fetchDiscover('anime', allGenre, page);
        console.log(`[loadAllResults] Fetched Discover (Anime). Genre: ${allGenre}, Page: ${page}. Results count: ${results.length}`); // DEBUG LOG
    } 
    else if (allGenre) {
        results = await fetchDiscover(allType, allGenre, page);
        console.log(`[loadAllResults] Fetched Discover (${allType}). Genre: ${allGenre}, Page: ${page}. Results count: ${results.length}`); // DEBUG LOG
    } 
    else {
        results = await fetchTrending(allType, page);
        console.log(`[loadAllResults] Fetched Trending (${allType}). Page: ${page}. Results count: ${results.length}`); // DEBUG LOG
    }
  } catch (error) {
      console.error("[loadAllResults] Error during fetch:", error); // DEBUG LOG error
      results = []; // Ensure results is empty on error
  }


  loading.style.display = 'none'; // ITATAGO ANG LOADING
  console.log("[loadAllResults] Loading spinner hidden."); // DEBUG LOG

  if (page === 1 && results.length === 0) {
    console.log("[loadAllResults] No results found on page 1. Showing empty state."); // DEBUG LOG
    empty.style.display = 'flex';
    return; // Ititigil na dito kung walang results sa page 1
  } else {
      empty.style.display = 'none'; // Siguraduhing tago ang empty state kung may results
  }


  if (results.length > 0) {
    console.log("[loadAllResults] Displaying results."); // DEBUG LOG
    results.forEach(item => {
      if (!item.media_type) {
        item.media_type = (allType === 'anime') ? 'tv' : allType;
      }
      grid.appendChild(createMediaCard(item));
    });
    if (results.length === 20) { // Standard TMDB page size
      console.log("[loadAllResults] Showing Load More button."); // DEBUG LOG
      loadMoreBtn.style.display = 'inline-flex';
    } else {
      console.log("[loadAllResults] Hiding Load More button (less than 20 results)."); // DEBUG LOG
      loadMoreBtn.style.display = 'none'; // Wala nang next page malamang
    }
  } else {
    // Kung hindi page 1 at walang results (meaning, naubos na sa Load More)
    console.log(`[loadAllResults] No more results found on page ${page}. Hiding Load More button.`); // DEBUG LOG
    loadMoreBtn.style.display = 'none';
  }
}
// ===================================================================
// === END NG INAYOS NA FUNCTION ===
// ===================================================================

function populateGenreFilter(type, activeGenreId) {
    console.log(`[populateGenreFilter] Called. Type: ${type}, Active Genre: ${activeGenreId}`); // DEBUG LOG
    const container = document.getElementById('genre-filter-bar-container');
    if (!container) {
        console.error("[populateGenreFilter] Error: Container #genre-filter-bar-container not found."); // DEBUG LOG error
        return;
    }

    container.innerHTML = ''; 
    
    let genreMap;
    if (type === 'movie') { genreMap = MOVIE_GENRES; }
    else if (type === 'tv' || type === 'anime') { genreMap = TV_GENRES; }
    else { console.warn(`[populateGenreFilter] Unknown type: ${type}`); return; } // DEBUG LOG warning

    const allBtn = document.createElement('button');
    allBtn.className = 'genre-filter-btn'; allBtn.textContent = 'All'; allBtn.dataset.genreId = 'all'; 
    if (!activeGenreId) { allBtn.classList.add('active'); }
    container.appendChild(allBtn);

    for (const [id, name] of Object.entries(genreMap)) {
        const btn = document.createElement('button');
        btn.className = 'genre-filter-btn'; btn.textContent = name; btn.dataset.genreId = id;
        if (id === activeGenreId) { allBtn.classList.remove('active'); btn.classList.add('active'); }
        container.appendChild(btn);
    }

    // Tanggalin muna ang lumang listener kung meron (importante para hindi dumami)
    container.replaceWith(container.cloneNode(true)); // Simple way to remove all listeners
    const newContainer = document.getElementById('genre-filter-bar-container'); // Kunin ulit yung bago

    // Magdagdag ng bagong listener
    newContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('genre-filter-btn')) {
            const clickedBtn = e.target;
            const newGenreId = clickedBtn.dataset.genreId;
            console.log(`[Genre Filter Click] Clicked Genre ID: ${newGenreId}`); // DEBUG LOG

            if (clickedBtn.classList.contains('active')) {
                console.log("[Genre Filter Click] Clicked active button, doing nothing."); // DEBUG LOG
                return;
            }

            newContainer.querySelectorAll('.genre-filter-btn').forEach(btn => { btn.classList.remove('active'); });
            clickedBtn.classList.add('active');

            allPage = 1; 
            allGenre = (newGenreId === 'all') ? null : newGenreId;
            console.log(`[Genre Filter Click] State updated - Page: ${allPage}, Genre: ${allGenre}`); // DEBUG LOG

            loadAllResults(allPage); // Reload results for the new genre
        }
    });
    console.log("[populateGenreFilter] Filter bar populated and listener attached."); // DEBUG LOG
}


async function initAllPage() {
  console.log("[initAllPage] Initializing all.html page..."); // DEBUG LOG
  const params = getUrlParams();
  allType = params.type;
  allGenre = params.genre; 
  allPage = 1;
  console.log(`[initAllPage] Initial State - Type: ${allType}, Genre: ${allGenre}, Page: ${allPage}`); // DEBUG LOG

  const titleEl = document.getElementById('all-page-title');
  const loadingScreen = document.getElementById('loading-screen'); // Para sa main loading screen
  const loadMoreBtn = document.getElementById('load-more-btn');

  // Defensive checks for core elements
  if (!titleEl || !loadMoreBtn || !loadingScreen) {
      console.error("[initAllPage] Error: Missing required page elements (title, loadMoreBtn, loadingScreen).");
      return;
  }
  
  let title = 'Results';
  if (allType === 'movie') title = 'Movies';
  else if (allType === 'tv') title = 'TV Shows';
  else if (allType === 'anime') title = 'Anime';
  
  titleEl.textContent = title;
  document.title = `NetFlakes - ${title}`;
  console.log(`[initAllPage] Page title set to: ${title}`); // DEBUG LOG

  populateGenreFilter(allType, allGenre);

  // Tanggalin ang lumang listener sa Load More bago magdagdag ng bago
  const newLoadMoreBtn = loadMoreBtn.cloneNode(true);
  loadMoreBtn.parentNode.replaceChild(newLoadMoreBtn, loadMoreBtn);

  newLoadMoreBtn.addEventListener('click', () => { // Gamitin ang newLoadMoreBtn
    console.log("[Load More Click] Button clicked."); // DEBUG LOG
    allPage++;
    console.log(`[Load More Click] Incrementing page to: ${allPage}`); // DEBUG LOG
    loadAllResults(allPage); // Load the next page
  });
  console.log("[initAllPage] Load More button listener attached."); // DEBUG LOG

  await loadAllResults(allPage); // Initial load of results
  console.log("[initAllPage] Initial results loaded."); // DEBUG LOG

  if (loadingScreen && !loadingScreen.classList.contains('hidden')) {
    console.log("[initAllPage] Hiding main loading screen."); // DEBUG LOG
    setTimeout(() => loadingScreen.classList.add('hidden'), 100); // Small delay
  }
}


// ==================== INIT ====================
async function init() {
  // Para lang sa index.html
  console.log("[init - Homepage] Starting initialization...");
  const loading = document.getElementById('loading-screen');
  // ... (rest of the init function - WALANG BINAGO DITO) ...
  const pendingItemId = localStorage.getItem('pendingItemId');
  const pendingItemType = localStorage.getItem('pendingItemType');
  if (pendingItemId && pendingItemType) {
    console.log(`[init] Found pending item: type=${pendingItemType}, id=${pendingItemId}`);
    localStorage.removeItem('pendingItemId'); localStorage.removeItem('pendingItemType');
    const item = await fetchDetails(pendingItemType, pendingItemId);
    if (item) {
      console.log("[init] Pending item details fetched. Hiding loading and showing details.");
      loading.classList.add('hidden'); await showDetails(item); console.log("[init] Stopping init early after showing pending item."); return;
    } else { console.warn("[init] Failed to fetch details for pending item. Continuing normal load."); }
  }
  try {
    console.log("[init] Starting initial data fetch (Movies, TV, Anime)...");
    const [movies, tvShows, anime] = await Promise.all([ fetchTrending('movie'), fetchTrending('tv'), fetchTrendingAnime() ]);
    console.log("[init] Initial data fetch complete.");
    const pool = [...movies, ...tvShows].filter(i => i.backdrop_path);
    let randomItemForBanner = pool[Math.floor(Math.random() * pool.length)] || movies[0] || tvShows[0];
    if (randomItemForBanner) {
        console.log("[init] Fetching details for banner item...");
        let bannerItemType = randomItemForBanner.media_type; if (!bannerItemType) { bannerItemType = randomItemForBanner.title ? 'movie' : 'tv'; }
        const detailedBannerItem = await fetchDetails(bannerItemType, randomItemForBanner.id);
        if (detailedBannerItem) { console.log("[init] Displaying banner with detailed item..."); displayBanner(detailedBannerItem); }
        else { console.warn("[init] Failed to fetch details for banner item, using basic info."); displayBanner(randomItemForBanner); }
    }
    console.log("[init] Displaying lists..."); displayList(movies, 'movies-list'); displayList(tvShows, 'tvshows-list'); displayList(anime, 'anime-list');
    console.log("[init] Lists displayed."); initScrollObserver();
    if (!loading.classList.contains('hidden')) { console.log("[init] Hiding loading screen..."); setTimeout(() => loading.classList.add('hidden'), 100); }
    else { console.log("[init] Loading screen was already hidden."); }
  } catch (err) {
    console.error('[init] Initialization error:', err); loading.innerHTML = '<p>Error loading content. Please refresh the page.</p>';
    setTimeout(() => { if (!loading.classList.contains('hidden')) { loading.classList.add('hidden'); } }, 1000);
  }
}
// END INIT

// ==================== EVENTS ====================
window.addEventListener('scroll', handleNavbarScroll);

document.addEventListener('keydown', (e) => { 
    if (e.key === 'Escape') { 
        closeModal(); closeSearchModal(); 
        document.getElementById('mobile-menu').classList.remove('active'); 
        toggleInlineSearch(false); 
    } 
});

document.addEventListener('click', (e) => { 
    if (e.target.closest('.mobile-nav-link')) { toggleMobileMenu(); }
});

// =======================================================
// === PAGE ROUTING LOGIC (Updated with Debug Logs) ===
// =======================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log(">>> DOMContentLoaded event fired."); // DEBUG LOG

    // === Setup Common Listeners ===
    const serverSelect = document.getElementById('server');
    if (serverSelect) { 
        console.log("Attaching listener to #server select."); // DEBUG LOG
        serverSelect.addEventListener('change', changeServer); 
    } else {
        console.warn("Element #server not found."); // DEBUG LOG warning
    }

    const searchBtn = document.getElementById('search-btn-trigger');
    if (searchBtn) { 
        console.log("Attaching listener to #search-btn-trigger."); // DEBUG LOG
        searchBtn.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            if (window.innerWidth > 768) { toggleInlineSearch(); } else { openSearchModal(); } 
        }); 
    } else {
        console.warn("Element #search-btn-trigger not found."); // DEBUG LOG warning
    }

    document.addEventListener('click', (e) => { 
        const container = document.getElementById('search-container'); 
        if (isInlineSearchActive && container && !container.contains(e.target)) { toggleInlineSearch(false); } 
    });

    console.log("Initializing scroll observer..."); // DEBUG LOG
    initScrollObserver();

    // === PAGE ROUTING LOGIC ===
    console.log("Determining current page for initialization..."); // DEBUG LOG
    const banner = document.getElementById('banner');
    const moviesList = document.getElementById('movies-list');
    const allResultsGrid = document.getElementById('all-results-grid');

    if (banner && moviesList) {
        console.log(">>> Page Type: Homepage (index.html)"); // DEBUG LOG
        init(); 
    } else if (allResultsGrid) {
        console.log(">>> Page Type: All Results Page (all.html)"); // DEBUG LOG
        initAllPage(); // Ito ang function para sa all.html
    } else {
        console.log(">>> Page Type: Other (e.g., genres.html - should be removed)"); // DEBUG LOG
        
        const loading = document.getElementById('loading-screen');
        if (loading && !loading.classList.contains('hidden')) {
            console.log("Hiding loading screen on 'Other' page."); // DEBUG LOG
            if (!localStorage.getItem('pendingItemId')) {
                 setTimeout(() => loading.classList.add('hidden'), 100);
            } else {
                 console.log("Pending item detected on 'Other' page, running init() for modal only."); // DEBUG LOG
                 init(); // Para sa pending item modal
            }
        }
    }
    console.log(">>> DOMContentLoaded handler finished."); // DEBUG LOG
});

