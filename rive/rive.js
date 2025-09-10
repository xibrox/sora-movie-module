async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await soraFetch(`https://api.themoviedb.org/3/search/multi?api_key=68e094699525b18a70bab2f86b1fa706&query=${encodedKeyword}`);
        const data = await responseText.json();

        const transformedResults = data.results.map(result => {
            if(result.media_type === "movie" || result.title) {
                return {
                    title: result.title || result.name || result.original_title || result.original_name,
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://rivestream.org/watch?type=movie&id=${result.id}`
                };
            } else if(result.media_type === "tv" || result.name) {
                return {
                    title: result.name || result.title || result.original_name || result.original_title,
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://rivestream.org/watch?type=tv&id=${result.id}&season=1&episode=1`
                };
            } else {
                return {
                    title: result.title || result.name || result.original_name || result.original_title || "Untitled",
                    image: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                    href: `https://rivestream.org/watch?type=tv&id=${result.id}&season=1&episode=1`
                };
            }
        });

        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in searchResults:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        if(url.includes('movie')) {
            const match = url.match(/https:\/\/rivestream\.org\/watch\?type=movie&id=([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const movieId = match[1];
            const responseText = await soraFetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
            const data = await responseText.json();

            const transformedResults = [{
                description: data.overview || 'No description available',
                aliases: `Duration: ${data.runtime ? data.runtime + " minutes" : 'Unknown'}`,
                airdate: `Released: ${data.release_date ? data.release_date : 'Unknown'}`
            }];

            return JSON.stringify(transformedResults);
        } else if(url.includes('tv')) {
            const match = url.match(/https:\/\/rivestream\.org\/watch\?type=tv&id=([^\/]+)&season=([^\/]+)&episode=([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const showId = match[1];
            const responseText = await soraFetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
            const data = await responseText.json();

            const transformedResults = [{
                description: data.overview || 'No description available',
                aliases: `Duration: ${data.episode_run_time && data.episode_run_time.length ? data.episode_run_time.join(', ') + " minutes" : 'Unknown'}`,
                airdate: `Aired: ${data.first_air_date ? data.first_air_date : 'Unknown'}`
            }];

            return JSON.stringify(transformedResults);
        } else {
            throw new Error("Invalid URL format");
        }
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
        if(url.includes('movie')) {
            const match = url.match(/https:\/\/rivestream\.org\/watch\?type=movie&id=([^\/]+)/);
            
            if (!match) throw new Error("Invalid URL format");
            
            const movieId = match[1];
            
            return JSON.stringify([
                { href: `https://rivestream.org/watch?type=movie&id=${movieId}`, number: 1, title: "Full Movie" }
            ]);
        } else if(url.includes('tv')) {
            const match = url.match(/https:\/\/rivestream\.org\/watch\?type=tv&id=([^\/]+)&season=([^\/]+)&episode=([^\/]+)/);
            
            if (!match) throw new Error("Invalid URL format");
            
            const showId = match[1];
            
            const showResponseText = await soraFetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
            const showData = await showResponseText.json();
            
            let allEpisodes = [];
            for (const season of showData.seasons) {
                const seasonNumber = season.season_number;

                if(seasonNumber === 0) continue;
                
                const seasonResponseText = await soraFetch(`https://api.themoviedb.org/3/tv/${showId}/season/${seasonNumber}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
                const seasonData = await seasonResponseText.json();
                
                if (seasonData.episodes && seasonData.episodes.length) {
                    const episodes = seasonData.episodes.map(episode => ({
                        href: `https://rivestream.org/watch?type=tv&id=${showId}&season=${seasonNumber}&episode=${episode.episode_number}`,
                        number: episode.episode_number,
                        title: episode.name || ""
                    }));
                    allEpisodes = allEpisodes.concat(episodes);
                }
            }
            
            return JSON.stringify(allEpisodes);
        } else {
            throw new Error("Invalid URL format");
        }
    } catch (error) {
        console.log('Fetch error in extractEpisodes:', error);
        return JSON.stringify([]);
    }    
}

async function extractStreamUrl(url) {  
    const services = [
        // "flowcast",
        "primevids",
        "humpy",
        "loki",
        "asiacloud",
        "shadow",
        // "hindicast",
        "animez",
        "aqua",
        // "voyager",
        "yggdrasil",
        "putafilme",
        "ophim",
    ];

    const secretKeyUrl = await networkFetch(url, 7, {}, "secretKey");

    function getSecretKeyFromUrl(url) {
        const m = url.match(/[?&]secretKey=([^&]+)/);
        return m ? decodeURIComponent(m[1]) : null;
    }

    console.log("Secret Key Url: " + JSON.stringify(secretKeyUrl));
    console.log("Secret Key Url: " + getSecretKeyFromUrl(secretKeyUrl.requests.find(url => url.includes('secretKey'))));

    const secretKey = getSecretKeyFromUrl(secretKeyUrl.requests.find(url => url.includes('secretKey')));

    try {
        if (url.includes('movie')) {
            const match = url.match(/https:\/\/rivestream\.org\/watch\?type=movie&id=([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const movieId = match[1];

            let streams = [];

            for (let i = 0; i < services.length; i++) {
                const service = services[i];
                const apiUrl = `https://rivestream.org/api/backendfetch?requestID=movieVideoProvider&id=${movieId}&service=${service}&secretKey=${secretKey}&proxyMode=noProxy`;

                console.log("API URL: " + apiUrl);

                const response = await soraFetch(apiUrl);
                const data = await response.json();

                if (data.error) {
                    continue;
                }

                console.log("Stream Data: " + JSON.stringify(data));
                console.log("API response for service: " + service + JSON.stringify(data, null, 2));

                if (data.data && Array.isArray(data.data.sources) && data.data.sources.length > 0) {
                    for (let j = 0; j < data.data.sources.length; j++) {
                        const source = data.data.sources[j];

                        streams.push({
                            title: `${source.source}${source.quality ? ` (${source.quality})` : ''}${source.format ? ` (${source.format.toUpperCase()})` : ''}`,
                            streamUrl: source.url,
                            headers: {
                                'Referer': 'https://rivestream.org/',
                                'Origin': 'https://rivestream.org'
                            }
                        });
                    }
                }
            }

            const result = {
                streams,
                subtitles: ""
            };
            
            console.log(JSON.stringify(result));
            return JSON.stringify(result);
        } else if (url.includes('tv')) {
            const match = url.match(/https:\/\/rivestream\.org\/watch\?type=tv&id=([^\/]+)&season=([^\/]+)&episode=([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const showId = match[1];
            const seasonNumber = match[2];
            const episodeNumber = match[3];

            let streams = [];

            for (let i = 0; i < services.length; i++) {
                const service = services[i];
                const apiUrl = `https://rivestream.org/api/backendfetch?requestID=tvVideoProvider&id=${showId}&season=${seasonNumber}&episode=${episodeNumber}&service=${service}&secretKey=${secretKey}&proxyMode=noProxy`;
                
                console.log("API URL: " + apiUrl);

                const response = await soraFetch(apiUrl);
                const data = await response.json();

                if (data.error) {
                    continue;
                }

                console.log("Stream Data: " + JSON.stringify(data));
                console.log("API response for service: " + service + JSON.stringify(data, null, 2));

                if (data.data && Array.isArray(data.data.sources) && data.data.sources.length > 0) {
                    for (let j = 0; j < data.data.sources.length; j++) {
                        const source = data.data.sources[j];

                        streams.push({
                            title: `${source.source}${source.quality ? ` (${source.quality})` : ''}${source.format ? ` (${source.format.toUpperCase()})` : ''}`,
                            streamUrl: source.url,
                            headers: {
                                'Referer': 'https://rivestream.org/',
                                'Origin': 'https://rivestream.org'
                            }
                        });
                    }
                }
            }

            const result = {
                streams,
                subtitles: ""
            };

            console.log(JSON.stringify(result));
            return JSON.stringify(result);
        } else {
            throw new Error("Invalid URL format");
        }
    } catch (error) {
        console.log('Fetch error in extractStreamUrl: ' + error);
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
