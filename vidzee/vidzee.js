async function searchResults(keyword) {
    try {
        let transformedResults = [];

        const keywordGroups = {
            trending: ["!trending", "!hot", "!tr", "!!"],
            topRatedMovie: ["!top-rated-movie", "!topmovie", "!tm", "??"],
            topRatedTV: ["!top-rated-tv", "!toptv", "!tt", "::"],
            popularMovie: ["!popular-movie", "!popmovie", "!pm", ";;"],
            popularTV: ["!popular-tv", "!poptv", "!pt", "++"],
        };

        const skipTitleFilter = Object.values(keywordGroups).flat();

        const shouldFilter = !matchesKeyword(keyword, skipTitleFilter);

        // --- TMDB Section ---
        const encodedKeyword = encodeURIComponent(keyword);
        let baseUrl = null;

        if (matchesKeyword(keyword, keywordGroups.trending)) {
            baseUrl = `https://api.themoviedb.org/3/trending/all/week?api_key=9801b6b0548ad57581d111ea690c85c8&include_adult=false&page=`;
        } else if (matchesKeyword(keyword, keywordGroups.topRatedMovie)) {
            baseUrl = `https://api.themoviedb.org/3/movie/top_rated?api_key=9801b6b0548ad57581d111ea690c85c8&include_adult=false&page=`;
        } else if (matchesKeyword(keyword, keywordGroups.topRatedTV)) {
            baseUrl = `https://api.themoviedb.org/3/tv/top_rated?api_key=9801b6b0548ad57581d111ea690c85c8&include_adult=false&page=`;
        } else if (matchesKeyword(keyword, keywordGroups.popularMovie)) {
            baseUrl = `https://api.themoviedb.org/3/movie/popular?api_key=9801b6b0548ad57581d111ea690c85c8&include_adult=false&page=`;
        } else if (matchesKeyword(keyword, keywordGroups.popularTV)) {
            baseUrl = `https://api.themoviedb.org/3/tv/popular?api_key=9801b6b0548ad57581d111ea690c85c8&include_adult=false&page=`;
        } else {
            baseUrl = `https://api.themoviedb.org/3/search/multi?api_key=9801b6b0548ad57581d111ea690c85c8&query=${encodedKeyword}&include_adult=false&page=`;
        }

        let dataResults = [];

        if (baseUrl) {
            const pagePromises = Array.from({ length: 5 }, (_, i) =>
                soraFetch(baseUrl + (i + 1)).then(r => r.json())
            );
            const pages = await Promise.all(pagePromises);
            dataResults = pages.flatMap(p => p.results || []);
        }

        if (dataResults.length > 0) {
            transformedResults = transformedResults.concat(
                dataResults
                    .map(result => {
                        if (result.media_type === "movie" || result.title) {
                            return {
                                title: result.title || result.name || result.original_title || result.original_name || "Untitled",
                                image: result.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : "",
                                href: `movie/${result.id}`,
                            };
                        } else if (result.media_type === "tv" || result.name) {
                            return {
                                title: result.name || result.title || result.original_name || result.original_title || "Untitled",
                                image: result.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : "",
                                href: `tv/${result.id}/1/1`,
                            };
                        }
                    })
                    .filter(Boolean)
                    .filter(result => result.title !== "Overflow")
                    .filter(result => result.title !== "My Marriage Partner Is My Student, a Cocky Troublemaker")
                    .filter(r => !shouldFilter || r.title.toLowerCase().includes(keyword.toLowerCase()))
            );
        }

        console.log("Transformed Results: " + JSON.stringify(transformedResults));
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log("Fetch error in searchResults: " + error);
        return JSON.stringify([{ title: "Error", image: "", href: "" }]);
    }
}

function matchesKeyword(keyword, commands) {
    const lower = keyword.toLowerCase();
    return commands.some(cmd => lower.startsWith(cmd.toLowerCase()));
}

async function extractDetails(url) {
    try {
        if(url.includes('movie')) {
            const match = url.match(/movie\/([^\/]+)/);
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
            const match = url.match(/tv\/([^\/]+)/);
            if (!match) throw new Error("Invalid URL format");

            const showId = match[1];
            const responseText = await soraFetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=ad301b7cc82ffe19273e55e4d4206885`);
            const data = await responseText.json();

            const transformedResults = [{
                description: data.overview || 'No description available',
                aliases: `Duration: ${data.episode_run_time && data.episode_run_time.length ? data.episode_run_time.join(', ') + " minutes" : 'Unknown'}`,
                airdate: `Aired: ${data.first_air_date ? data.first_air_date : 'Unknown'}`
            }];

            console.log(JSON.stringify(transformedResults));
            return JSON.stringify(transformedResults);
        } else {
            throw new Error("Invalid URL format");
        }
    } catch (error) {
        console.log('Details error: ' + error);
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
            const match = url.match(/movie\/([^\/]+)/);
            
            if (!match) throw new Error("Invalid URL format");
            
            const movieId = match[1];
            
            const movie = [
                { href: `movie/${movieId}`, number: 1, title: "Full Movie" }
            ];

            console.log(movie);
            return JSON.stringify(movie);
        } else if(url.includes('tv')) {
            const match = url.match(/tv\/([^\/]+)\/([^\/]+)\/([^\/]+)/);
            
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
                        href: `tv/${showId}/${seasonNumber}/${episode.episode_number}`,
                        number: episode.episode_number,
                        title: episode.name || ""
                    }));
                    allEpisodes = allEpisodes.concat(episodes);
                }
            }
            
            console.log(allEpisodes);
            return JSON.stringify(allEpisodes);
        } else {
            throw new Error("Invalid URL format");
        }
    } catch (error) {
        console.log('Fetch error in extractEpisodes: ' + error);
        return JSON.stringify([]);
    }    
}

// searchResults("!trending");

// searchResults("/op");
// extractDetails("https://pixeldrain.net/l/VmpS467P");
// extractEpisodes("https://pixeldrain.net/l/VmpS467P");
// extractStreamUrl("pixeldrain/3Yuxg9Y9");

// searchResults("clannad");
// extractDetails("tv/24835/1/1");
// extractEpisodes("tv/24835/1/1");
// extractStreamUrl("tv/24835/1/1");

// extractDetails("anime/2167");
// extractEpisodes("anime/2167");
// extractStreamUrl("anime/130003/1");

// searchResults("One piece");
// extractEpisodes("anime/21");

async function extractStreamUrl(url) {
    try {
        const match = url.match(/^(movie|tv)\/([^?#]+)/);
        if (!match) throw new Error('Invalid URL format');
        const [, type, path] = match;

        let streams = [];
        let subtitles = "";

        if (type === 'movie' || type === 'tv') {
            // --- Vidzee fetch (parallel 5 servers) ---
            const fetchVidzee = async () => {
                const vidzeePromises = Array.from({ length: 5 }, (_, i) => {
                    const sr = i + 1;
                    let apiUrl;

                    if (type === 'movie') {
                        apiUrl = `https://player.vidzee.wtf/api/server?id=${path}&sr=${sr}`;
                    } else if (type === 'tv') {
                        const [showId, seasonNumber, episodeNumber] = path.split('/');
                        apiUrl = `https://player.vidzee.wtf/api/server?id=${showId}&sr=${sr}&ss=${seasonNumber}&ep=${episodeNumber}`;
                    } else {
                        return null;
                    }

                    return soraFetch(apiUrl)
                        .then(res => res.json())
                        .then(data => {
                            if (!data.url) return null;
                            const stream = data.url.find(source =>
                                source.lang?.toLowerCase() === 'english'
                            );
                            if (!stream) return null;

                            return {
                                title: `Vidzee - ${data.provider}`,
                                streamUrl: stream.link,
                                headers: {
                                    'Origin': 'https://player.vidzee.wtf',
                                    'Referer': data.headers?.Referer || ''
                                }
                            };
                        })
                        .catch(() => null);
                });

                const results = await Promise.allSettled(vidzeePromises);
                return results
                    .filter(r => r.status === 'fulfilled' && r.value)
                    .map(r => r.value);
            };

            // --- Subtitle fetch ---
            const fetchSubtitles = async () => {
                try {
                    let subtitleApiUrl;

                    if (type === 'movie') {
                        subtitleApiUrl = `https://sub.wyzie.ru/search?id=${path}`
                    } else if (type === 'tv') {
                        const [showId, seasonNumber, episodeNumber] = path.split('/');
                        subtitleApiUrl = `https://sub.wyzie.ru/search?id=${showId}&season=${seasonNumber}&episode=${episodeNumber}`;
                    } else {
                        return "";
                    }

                    const subtitleTrackResponse = await soraFetch(subtitleApiUrl);
                    const subtitleTrackData = await subtitleTrackResponse.json();

                    let subtitleTrack = subtitleTrackData.find(track =>
                        track.display.includes('English') && ['ASCII', 'UTF-8'].includes(track.encoding)
                    ) || subtitleTrackData.find(track =>
                        track.display.includes('English') && track.encoding === 'CP1252'
                    ) || subtitleTrackData.find(track =>
                        track.display.includes('English') && track.encoding === 'CP1250'
                    ) || subtitleTrackData.find(track =>
                        track.display.includes('English') && track.encoding === 'CP850'
                    );

                    if (subtitleTrack) {
                        return subtitleTrack.url;
                    }
                } catch {
                    console.log('Subtitle extraction failed silently.');
                }
                return "";
            };

            // Run all fetches in parallel
            const [
                vidzeeStreams,
                subtitleUrl
            ] = await Promise.allSettled([
                fetchVidzee(),
                fetchSubtitles()
            ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : (Array.isArray(r.value) ? [] : "")));

            // Collect streams from all sources
            streams.push(...(vidzeeStreams || []));

            if (subtitleUrl) {
                subtitles = subtitleUrl;
            }
        }

        const result = { streams, subtitles };
        console.log('Result: ' + JSON.stringify(result));
        return JSON.stringify(result);
    } catch (error) {
        console.log('Fetch error in extractStreamUrl:', error);
        return JSON.stringify({ streams: [], subtitles: "" });
    }
}

async function soraFetch(url, options = { headers: {}, method: 'GET', body: null, encoding: 'utf-8' }) {
    try {
        return await fetchv2(
            url,
            options.headers ?? {},
            options.method ?? 'GET',
            options.body ?? null,
            true,
            options.encoding ?? 'utf-8'
        );
    } catch(e) {
        try {
            return await fetch(url, options);
        } catch(error) {
            return null;
        }
    }
}

class Unbaser {
    constructor(base) {
        /* Functor for a given base. Will efficiently convert
          strings to natural numbers. */
        this.ALPHABET = {
            62: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
            95: "' !\"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~'",
        };
        this.dictionary = {};
        this.base = base;
        // fill elements 37...61, if necessary
        if (36 < base && base < 62) {
            this.ALPHABET[base] = this.ALPHABET[base] ||
                this.ALPHABET[62].substr(0, base);
        }
        // If base can be handled by int() builtin, let it do it for us
        if (2 <= base && base <= 36) {
            this.unbase = (value) => parseInt(value, base);
        }
        else {
            // Build conversion dictionary cache
            try {
                [...this.ALPHABET[base]].forEach((cipher, index) => {
                    this.dictionary[cipher] = index;
                });
            }
            catch (er) {
                throw Error("Unsupported base encoding.");
            }
            this.unbase = this._dictunbaser;
        }
    }
    _dictunbaser(value) {
        /* Decodes a value to an integer. */
        let ret = 0;
        [...value].reverse().forEach((cipher, index) => {
            ret = ret + ((Math.pow(this.base, index)) * this.dictionary[cipher]);
        });
        return ret;
    }
}

function detect(source) {
    /* Detects whether `source` is P.A.C.K.E.R. coded. */
    return source.replace(" ", "").startsWith("eval(function(p,a,c,k,e,");
}

function unpack(source) {
    /* Unpacks P.A.C.K.E.R. packed js code. */
    let { payload, symtab, radix, count } = _filterargs(source);
    if (count != symtab.length) {
        throw Error("Malformed p.a.c.k.e.r. symtab.");
    }
    let unbase;
    try {
        unbase = new Unbaser(radix);
    }
    catch (e) {
        throw Error("Unknown p.a.c.k.e.r. encoding.");
    }
    function lookup(match) {
        /* Look up symbols in the synthetic symtab. */
        const word = match;
        let word2;
        if (radix == 1) {
            //throw Error("symtab unknown");
            word2 = symtab[parseInt(word)];
        }
        else {
            word2 = symtab[unbase.unbase(word)];
        }
        return word2 || word;
    }
    source = payload.replace(/\b\w+\b/g, lookup);
    return _replacestrings(source);
    function _filterargs(source) {
        /* Juice from a source file the four args needed by decoder. */
        const juicers = [
            /}\('(.*)', *(\d+|\[\]), *(\d+), *'(.*)'\.split\('\|'\), *(\d+), *(.*)\)\)/,
            /}\('(.*)', *(\d+|\[\]), *(\d+), *'(.*)'\.split\('\|'\)/,
        ];
        for (const juicer of juicers) {
            //const args = re.search(juicer, source, re.DOTALL);
            const args = juicer.exec(source);
            if (args) {
                let a = args;
                if (a[2] == "[]") {
                    //don't know what it is
                    // a = list(a);
                    // a[1] = 62;
                    // a = tuple(a);
                }
                try {
                    return {
                        payload: a[1],
                        symtab: a[4].split("|"),
                        radix: parseInt(a[2]),
                        count: parseInt(a[3]),
                    };
                }
                catch (ValueError) {
                    throw Error("Corrupted p.a.c.k.e.r. data.");
                }
            }
        }
        throw Error("Could not make sense of p.a.c.k.e.r data (unexpected code structure)");
    }
    function _replacestrings(source) {
        /* Strip string lookup table (list) and replace values in source. */
        /* Need to work on this. */
        return source;
    }
}