export async function onRequest(context) {
  // context.request.url gives the full URL
  const url = new URL(context.request.url);
  const type = url.searchParams.get('type') || 'movie';
  const page = url.searchParams.get('page') || '1';
  
  // Get the hidden API key
  const apiKey = context.env.TMDB_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 });
  }

  const tmdbUrl = `https://api.themoviedb.org/3/trending/${type}/week?api_key=${apiKey}&page=${page}`;
  
  try {
    const res = await fetch(tmdbUrl);
    // Return the response from TMDB directly to your frontend
    return new Response(res.body, {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=3600' // Cache for 1 hour
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}