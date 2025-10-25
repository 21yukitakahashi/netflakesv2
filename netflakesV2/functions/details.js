export async function onRequest(context) {
  const url = new URL(context.request.url);
  const type = url.searchParams.get('type');
  const id = url.searchParams.get('id');
  const apiKey = context.env.TMDB_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 });
  }
  if (!type || !id) {
    return new Response(JSON.stringify({ error: 'Type and ID are required' }), { status: 400 });
  }

  const tmdbUrl = `https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}`;
  
  try {
    const res = await fetch(tmdbUrl);
    return new Response(res.body, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}