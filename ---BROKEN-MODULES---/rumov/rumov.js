async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=68e094699525b18a70bab2f86b1fa706&query=${encodedKeyword}`);
        const data = JSON.parse(responseText);

        const transformedResults = data.results.map(result => {
            return {
                title: result.title || result.name || result.original_title || result.original_name,
                image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                href: `https://bingeflex.vercel.app/movie/${result.id}`
            };
        });

        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in searchResults:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        const match = url.match(/https:\/\/bingeflex\.vercel\.app\/movie\/([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");

        const movieId = match[1];
        const responseText = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
        const data = JSON.parse(responseText);

        const transformedResults = [{
            description: data.overview || 'No description available',
            aliases: `Duration: ${data.runtime ? data.runtime + " minutes" : 'Unknown'}`,
            airdate: `Released: ${data.release_date ? data.release_date : 'Unknown'}`
        }];

        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Details error:', error);
        return JSON.stringify([{
            description: 'Error loading description',
            aliases: 'Duration: Unknown',
            airdate: 'Aired/Released: Unknown'
        }]);
    }
}

async function extractEpisodes(url) {
    try {
        const match = url.match(/https:\/\/bingeflex\.vercel\.app\/movie\/([^\/]+)/);
        
        if (!match) throw new Error("Invalid URL format");
        
        const movieId = match[1];
        
        return JSON.stringify([
            { href: `https://bingeflex.vercel.app/movie/${movieId}`, number: 1, title: "Full Movie" }
        ]);
    } catch (error) {
        console.log('Fetch error in extractEpisodes:', error);
        return JSON.stringify([]);
    }    
}

async function extractStreamUrl(url) {  
    try {
        const match = url.match(/https:\/\/bingeflex\.vercel\.app\/movie\/([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");

        const movieId = match[1];

        const responseImdb = await fetchv2(`https://api.themoviedb.org/3/movie/${movieId}?api_key=ad301b7cc82ffe19273e55e4d4206885&append_to_response=external_ids`);
        const dataImdbId = await responseImdb.json();

        const imdbId = dataImdbId.external_ids.imdb_id;

        const response = await fetchv2(`https://api.insertunit.ws/embed/imdb/${imdbId}`);
        const data = await response.text();

        if (data) {
            const streamMatch = data.match(/hls:\s*"([^"]+)"/);
            const stream = streamMatch ? streamMatch[1] : '';

            console.log(stream);
            return stream;
        } else {
            throw new Error("No data received from insertunit API");
        }
    } catch (error) {
        console.log('Fetch error in extractStreamUrl:', error);
        return null;
    }
}