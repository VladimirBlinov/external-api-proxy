export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);

  // --- ОБРАБОТКА GET ЗАПРОСА --
  if (req.method === 'GET') {
    const domain = url.searchParams.get('domain');

    // ПРОВЕРКА: Если параметра domain нет, возвращаем ошибку
    if (!domain) {
      return new Response(JSON.stringify({ 
        error: "Missing required parameter: 'domain'. Example: ?domain=www.google.com" 
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 1. Формируем чистый путь (убираем /api из начала)
    const cleanPath = url.pathname.replace(/^\/api/, '');
    
    // 2. Копируем параметры и удаляем 'domain', чтобы не передавать его целевому API
    const newParams = new URLSearchParams(url.search);
    newParams.delete('domain');
    
    const queryString = newParams.toString();
    const targetUrl = `https://${domain}${cleanPath}${queryString ? '?' + queryString : ''}`;

    try {
      console.log(`Forwarding GET to: ${targetUrl}`);

      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          //'Referer': `https://${domain}/`,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0 Safari/537.36",
        }
      });

      const data = await response.text();
      return new Response(data, {
        status: response.status,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }

  // --- ОБРАБОТКА POST ЗАПРОСА ---
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const { url: targetUrl, headers, params } = body;

      if (!targetUrl) {
        return new Response(JSON.stringify({ error: "Missing 'url' in POST body" }), { status: 400 });
      }

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers 
        },
        body: JSON.stringify(params || {})
      });

      const data = await response.text();
      return new Response(data, {
        status: response.status,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON: " + e.message }), { status: 500 });
    }
  }

  return new Response("Method not allowed", { status: 405 });

}
