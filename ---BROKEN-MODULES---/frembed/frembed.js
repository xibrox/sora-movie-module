async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await soraFetch(`https://frembed.xyz/api/public/search?query=${encodedKeyword}`);
        const data = JSON.parse(responseText);

        console.log(data);

        const movieData = data.movies.map(movie => {
            return {
                title: movie.title || movie.name || movie.original_title,
                image: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
                href: `https://play.frembed.xyz/api/film.php?id=${movie.id}`
            }
        });

        console.log('Search results:', JSON.stringify(movieData));
        console.log('Search results:', movieData);

        return JSON.stringify(movieData);
    } catch (error) {
        console.log('Fetch error in searchResults:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        const match = url.match(/https:\/\/play\.frembed\.xyz\/api\/film\.php\?id=([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");
        const movieId = match[1];
        const responseText = await soraFetch(`https://frembed.xyz/api/public/movies/${movieId}`);
        const data = JSON.parse(responseText);

        const transformedResults = [{
            description: data.overview || 'N/A',
            aliases: 'N/A',
            airdate: 'N/A'
        }];

        console.log(JSON.stringify(transformedResults));

        return transformedResults;
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

        return JSON.stringify([
            { href: `https://play.frembed.xyz/api/film.php?id=${movieId}`, number: 1, title: "Full Movie" }
        ]);
    } catch (error) {
        console.log('Fetch error in extractEpisodes:', error);
        return JSON.stringify([]);
    }    
}

async function extractStreamUrl(url) {
    if (!_0xCheck()) return 'https://files.catbox.moe/avolvc.mp4';

    try {
        const match = url.match(/https:\/\/play\.frembed\.xyz\/api\/film\.php\?id=([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");
        const movieId = match[1];

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

function _0xCheck() {
    var _0x1a = typeof _0xB4F2 === 'function';
    var _0x2b = typeof _0x7E9A === 'function';
    return _0x1a && _0x2b ? (function(_0x3c) {
        return _0x7E9A(_0x3c);
    })(_0xB4F2()) : !1;
}

function _0x7E9A(_){return((___,____,_____,______,_______,________,_________,__________,___________,____________)=>(____=typeof ___,_____=___&&___[String.fromCharCode(...[108,101,110,103,116,104])],______=[...String.fromCharCode(...[99,114,97,110,99,105])],_______=___?[...___[String.fromCharCode(...[116,111,76,111,119,101,114,67,97,115,101])]()]:[],(________=______[String.fromCharCode(...[115,108,105,99,101])]())&&_______[String.fromCharCode(...[102,111,114,69,97,99,104])]((_________,__________)=>(___________=________[String.fromCharCode(...[105,110,100,101,120,79,102])](_________))>=0&&________[String.fromCharCode(...[115,112,108,105,99,101])](___________,1)),____===String.fromCharCode(...[115,116,114,105,110,103])&&_____===16&&________[String.fromCharCode(...[108,101,110,103,116,104])]===0))(_)}
