async function searchResults(keyword) {
    const results = [];
    const response = await soraFetch();
    const html = await response.text();

    let match;
    while ((match = regex.exec(html)) !== null) {
        results.push({
            title: match[3].trim(),
            image: match[2].trim(),
            href: match[1].trim()
        });
    }

    return JSON.stringify(results);
}

async function extractDetails(url) {
    const results = [];
    const response = await soraFetch(url);
    const html = await response.text();

    results.push({
        description: description,
        aliases: 'N/A',
        airdate: 'N/A'
    });

    return JSON.stringify(results);
}

async function extractEpisodes(url) {
    const results = [];
    const response = await soraFetch(url);
    const html = await response.text();

        results.push({
            href: match[1].trim(),
            number: parseInt(match[2], 10)
        });
  
    return JSON.stringify(results);
}

async function extractStreamUrl(url) {
    const response = await soraFetch(url);
    const html = await response.text();
    
    return "";
}

async function soraFetch(url, options = { headers: {}, method: 'GET', body: null }) {
    try {
        return await fetchv2(url, options.headers ?? {}, options.method ?? 'GET', options.body ?? null);
    } catch(e) {
        try {
            return await fetch(url, options);
        } catch(error) {
            return null;
        }
    }
}