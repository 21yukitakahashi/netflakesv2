export async function onRequest(context) {
  const url = new URL(context.request.url);
  const query = url.searchParams.get('query');
  const apiKey = context.env.TMDB_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 });
  }
  if (!query) {
    return new Response(JSON.stringify({ error: 'Query is required' }), { status: 400 });
  }
  
  const tmdbUrl = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}`;
  
  try {
    const res = await fetch(tmdbUrl);
    return new Response(res.body, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}