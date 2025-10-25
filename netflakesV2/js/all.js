/* ================================================================== */
/* === SCRIPT PARA SA ALL.HTML (VIEW ALL PAGE) === */
/* ================================================================== */

// !! MAHALAGA !!
// Ilagay ang iyong TMDB API Key dito. Ito ang mag-aayos ng "API Key missing" error.
const API_KEY = '4e677baabbee6c14b748aa4c9c936109'; 

/*
 * TANDAAN: 
 * Ang file na ito ay kailangan pa rin ang 'home.js'
 * para gumana ang openModal(), closeModal(), at search functions.
 * 'Yung API_KEY sa taas ay para lang sa "View All" page logic.
 */

// I-define ang mga API endpoints
const API_ENDPOINTS = {
    movie: {
        title: "Trending Movies",
        url: `https://api.themoviedb.org/3/trending/movie/week`
    },
    tv: {
        title: "Trending TV Shows",
        url: `https://api.themoviedb.org/3/trending/tv/week`
    },
    anime: {
        title: "Trending Anime",
        // Gumagamit tayo ng 'discover' para i-filter by genre (Animation) at keyword (Anime)
        url: `https://api.themoviedb.org/3/discover/tv`,
        params: `&with_genres=16&with_keywords=210024&sort_by=popularity.desc`
    }
};

let currentPage = 1;
let currentType = '';
let currentEndpoint = {};
let isLoading = false; // Para maiwasan ang double-click sa "Load More"

// Hihintayin muna natin na ma-load ang buong page
document.addEventListener('DOMContentLoaded', () => {
    
    // Siguraduhin muna na may API key
    if (API_KEY === 'ILAGAY_DITO_ANG_IYONG_API_KEY' || !API_KEY) {
        console.error("PALITAN ANG API KEY sa js/all.js");
        document.getElementById('page-title').innerText = "Error: API Key Not Configured";
        alert("Error: API Key ay hindi pa napapalitan sa js/all.js. Paki-edit muna ng file.");
        return;
    }

    // 1. Kunin ang 'type' mula sa URL (e.g., ?type=anime)
    const params = new URLSearchParams(window.location.search);
    currentType = params.get('type') || 'movie'; // Default sa 'movie' kung walang type
    
    // 2. Kunin ang tamang endpoint, title, at URL
    currentEndpoint = API_ENDPOINTS[currentType];
    
    if (!currentEndpoint) {
        console.error("Invalid type in URL");
        document.getElementById('page-title').innerText = "Error: Invalid Category";
        return;
    }

    // 3. Ilagay ang Title sa page
    document.getElementById('page-title').innerText = currentEndpoint.title;
    
    // 4. Tawagin ang function para kumuha ng data (unang page)
    fetchAndDisplayContent(currentType, currentPage);

    // 5. Magdagdag ng event listener sa "Load More" button
    document.getElementById('load-more-btn').addEventListener('click', () => {
        if (isLoading) return; // Kung naglo-load pa, huwag muna ulit
        
        currentPage++; // Ituloy sa next page
        fetchAndDisplayContent(currentType, currentPage);
    });
});

async function fetchAndDisplayContent(type, page) {
    isLoading = true;
    const loadMoreBtn = document.getElementById('load-more-btn');
    loadMoreBtn.innerText = "Loading...";
    loadMoreBtn.disabled = true;

    // 1. Buuin ang tamang API URL
    let url = `${currentEndpoint.url}?api_key=${API_KEY}&page=${page}`;
    
    // Kung 'anime', idagdag ang special parameters
    if (type === 'anime' && currentEndpoint.params) {
        url += currentEndpoint.params;
    }

    try {
        // 2. Kumuha ng data
        const response = await fetch(url);
        const data = await response.json();
        
        // 3. Ipakita ang data sa grid
        displayContentGrid(data.results, type);

        // Itago ang "Load More" button kung wala nang results
        if (page >= data.total_pages) {
            loadMoreBtn.style.display = 'none';
        }

    } catch (error) {
        console.error("Error fetching data:", error);
    } finally {
        // Ibabalik sa dati ang button kapag tapos na mag-load
        isLoading = false;
        loadMoreBtn.innerText = "Load More";
        loadMoreBtn.disabled = false;
    }
}

function displayContentGrid(items, type) {
    const gridContainer = document.getElementById('content-grid');
    const imageBaseUrl = 'https://image.tmdb.org/t/p/w500';

    if (!items || items.length === 0) {
        // Kung walang results sa unang page
        if (currentPage === 1) {
            gridContainer.innerHTML = '<p>No results found.</p>';
        }
        // Kung walang *pang* results (end of list), itago ang button
        document.getElementById('load-more-btn').style.display = 'none';
        return;
    }

    items.forEach(item => {
        // Kunin ang tamang title (movie vs tv/anime)
        const title = item.title || item.name;
        // Siguraduhin na may poster path, kung wala, 'wag na ipakita
        if (!item.poster_path) return; 

        const posterPath = `${imageBaseUrl}${item.poster_path}`;

        // Gawa ng card HTML
        const card = document.createElement('div');
        card.className = 'media-card';
        
        // IMPORTANT: Gagamitin natin ang openModal() function mula sa home.js
        // Siguraduhin na ang openModal function sa home.js ay global (wala sa loob ng DOMContentLoaded)
        card.setAttribute('onclick', `openModal(${item.id}, '${type}')`);
        
        card.innerHTML = `
            <img src="${posterPath}" alt="${title}" loading="lazy">
            <div class="media-card-overlay">
                <h4 class="media-card-title">${title}</h4>
                <div class="media-card-rating">
                    <i class="fas fa-star"></i>
                    <span>${item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}</span>
                </div>
            </div>
        `;
        
        // Idagdag ang card sa grid
        gridContainer.appendChild(card);
    });
}