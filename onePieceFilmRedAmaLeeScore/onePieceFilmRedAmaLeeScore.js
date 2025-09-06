async function searchResults(keyword) {
    const results = [];

    results.push({
        title: "Use External Player",
        image: "https://raw.githubusercontent.com/xibrox/sora-movie-module/refs/heads/main/onePieceFilmRedAmaLeeScore/UseExternalPlayer.png",
        href: ""
    });

    results.push({
        title: "Film Red AmaLee Score v2",
        image: "https://raw.githubusercontent.com/xibrox/sora-movie-module/refs/heads/main/onePieceFilmRedAmaLeeScore/icon.png",
        href: "https://pixeldrain.net/u/5doVw29C"
    });
    
    console.log(`Results: ${JSON.stringify(results)}`);
    return JSON.stringify(results);
}

async function extractDetails(url) {
    const transformedResults = [{
        description: '',
        aliases: '',
        airdate: ''
    }];

    console.log(`Details: ${JSON.stringify(transformedResults)}`);
    return JSON.stringify(transformedResults);
}

async function extractEpisodes(url) {
    const match = url.match(/https:\/\/pixeldrain\.net\/u\/([^\/]+)/);
    if (!match) throw new Error("Invalid URL format");
            
    const id = match[1];

    const transformedResults = [];
    transformedResults.push({
        href: `${id}`,
        number: 1,
    });

    console.log(`Episodes: ${JSON.stringify(transformedResults)}`);
    return JSON.stringify(transformedResults);
}

async function extractStreamUrl(url) {
    return `https://pixeldrain.net/api/file/${url}`;
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
