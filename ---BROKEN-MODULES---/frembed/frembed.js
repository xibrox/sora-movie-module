async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await soraFetch(`https://frembed.xyz/api/public/search?query=${encodedKeyword}`);
        const data = await responseText.json();

        console.log(data);

        const movieData = data.movies.map(movie => {
            return {
                title: movie.title || movie.name || movie.original_title,
                image: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
                href: `https://play.frembed.xyz/api/film.php?id=${movie.id}`
            }
        });

        console.log('Search results: ' + JSON.stringify(movieData));
        return JSON.stringify(movieData);
    } catch (error) {
        console.log('Fetch error in searchResults:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

// searchResults("Deadpool & Wolverine");
// extractDetails("https://play.frembed.xyz/api/film.php?id=533535");
// extractEpisodes("https://play.frembed.xyz/api/film.php?id=533535");
extractStreamUrl("https://play.frembed.xyz/api/film.php?id=533535");

async function extractDetails(url) {
    try {
        const match = url.match(/https:\/\/play\.frembed\.xyz\/api\/film\.php\?id=([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");
        const movieId = match[1];
        const responseText = await soraFetch(`https://frembed.xyz/api/public/movies/${movieId}`);
        const data = await responseText.json();

        const transformedResults = [{
            description: data.overview || 'N/A',
            aliases: 'N/A',
            airdate: 'N/A'
        }];

        console.log(JSON.stringify(transformedResults));
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
        const match = url.match(/https:\/\/play\.frembed\.xyz\/api\/film\.php\?id=([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");
        const movieId = match[1];

        const movie = JSON.stringify([
            { href: `https://play.frembed.xyz/api/film.php?id=${movieId}`, number: 1, title: "Full Movie" }
        ])

        console.log(movie)
        return movie;
    } catch (error) {
        console.log('Fetch error in extractEpisodes:', error);
        return JSON.stringify([]);
    }    
}

async function extractStreamUrl(url) {
    try {
        const match = url.match(/https:\/\/play\.frembed\.xyz\/api\/film\.php\?id=([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");
        const movieId = match[1];

        const responseText = await soraFetch(`https://frembed.lat/api/films?id=${movieId}&idType=tmdb`);
        const data = await responseText.json();

        console.log(`Stream URL: https://streamtales.cc:8443/videos/${movieId}.mp4`);
        return `https://streamtales.cc:8443/videos/${movieId}.mp4`;
    } catch (error) {
        console.log('Fetch error in extractStreamUrl:', error);
        return null;
    }
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
