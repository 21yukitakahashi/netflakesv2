export async function onRequest(context) {
  const url = new URL(context.request.url);
  const tvId = url.searchParams.get('tvId');
  const seasonNum = url.searchParams.get('seasonNum');
  const apiKey = context.env.TMDB_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 });
  }
  if (!tvId || !seasonNum) {
    return new Response(JSON.stringify({ error: 'tvId and seasonNum are required' }), { status: 400 });
  }

  const tmdbUrl = `https://api.themoviedb.org/3/tv/${tvId}/season/${seasonNum}?api_key=${apiKey}`;
  
  try {
    const res = await fetch(tmdbUrl);
    return new Response(res.body, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}