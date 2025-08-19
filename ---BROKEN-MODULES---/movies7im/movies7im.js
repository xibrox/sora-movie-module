async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await soraFetch(`https://movies7.im/api/search-suggestions.php?q=${encodedKeyword}`);
        const data = await responseText.json();

        const transformedResults = data.map(result => {
            if(result.type === "Movie") {
                return {
                    title: result.title,
                    image: result.thumbnail,
                    href: `https://movies7.im/movie/${result.imdb}`
                };
            } else if (result.type === "Series") {
                return {
                    title: result.title,
                    image: result.thumbnail,
                    href: `https://movies7.im/series/${result.imdb}`
                };
            }
        });

        console.log(transformedResults);
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in searchResults:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

// searchResults("breaking bad");

// extractDetails("https://movies7.im/series/tt0903747");
// extractEpisodes("https://movies7.im/series/tt0903747");
// extractStreamUrl("https://movies7.im/watch/series/tt0903747/1/1");

// extractDetails("https://movies7.im/movie/tt27675583");
// extractEpisodes("https://movies7.im/movie/tt27675583");
// extractStreamUrl("https://movies7.im/watch/movie/tt27675583");

async function extractDetails(url) {
    try {
        const responseText = await soraFetch(url);
        const html = await responseText.text();

        // Description
        const descriptionMatch = html.match(/<p[^>]*class="[^"]*?leading-relaxed[^"]*?"[^>]*>([\s\S]*?)<\/p>/);
        const description = descriptionMatch ? descriptionMatch[1]
            .replace(/<\/p>\s*<p>/gi, ' ') // join broken paragraphs
            .replace(/<[^>]+>/g, '')       // remove tags
            .replace(/\s+/g, ' ')          // normalize spacing
            .trim() : 'No description available';

        // Rating
        const ratingMatch = html.match(/<span[^>]*class="[^"]*?font-bold[^"]*?"[^>]*>([\d.]+)<\/span>/);
        const rating = ratingMatch ? `Rating: ${ratingMatch[1]}` : "";

        // Year
        const yearMatch = html.match(/<span>\s*(\d{4})\s*<\/span>/);
        const airdate = yearMatch ? `Aired: ${yearMatch[1]}` : 'Aired: Unknown';

        // Seasons
        const seasonsMatch = html.match(/<span>\s*(\d+)\s+Seasons?\s*<\/span>/i);
        const seasons = seasonsMatch ? `Seasons: ${seasonsMatch[1]}` : "";

        // Episodes
        const episodesMatch = html.match(/<span>\s*(\d+)\s+Episodes?\s*<\/span>/i);
        const episodes = episodesMatch ? `Episodes: ${episodesMatch[1]}` : "";

        // Genres
        const genreMatches = Array.from(html.matchAll(/<a[^>]*class="genre-tag[^"]*"[^>]*>([^<]+)<\/a>/g));
        const genreList = genreMatches.map(m => m[1].trim()).filter(Boolean);
        const genres = genreList.length ? `Genres: ${genreList.join(', ')}` : "";

        // Assemble aliases
        const aliasesParts = [rating, seasons, episodes, genres].filter(Boolean);
        const aliases = aliasesParts.length ? aliasesParts.join('\n') : 'No additional info';

        const transformedResults = [{
            description,
            aliases,
            airdate
        }];

        console.log(transformedResults);
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Details error:', error);
        return JSON.stringify([{
            description: 'Error loading description',
            aliases: 'No additional info',
            airdate: 'Aired: Unknown'
        }]);
    }
}

async function extractEpisodes(url) {
    try {
        const responseText = await soraFetch(url);
        const html = await responseText.text();
        
        let allEpisodes = [];

        // Seasons
        const seasonsMatch = html.match(/<span>\s*(\d+)\s+Seasons?\s*<\/span>/i);
        const seasons = seasonsMatch ? seasonsMatch[1] : null;

        // Episodes
        const episodesMatch = html.match(/<span>\s*(\d+)\s+Episodes?\s*<\/span>/i);
        const episodes = episodesMatch ? episodesMatch[1] : null;

        if (seasons !== null && episodes !== null) {
            const episodesSeasonOne = await getEpisodes(html);

            allEpisodes.push(...episodesSeasonOne);

            for (let i = 2; i <= seasons; i++) {
                const responseSeason = await soraFetch(`${url}?season=${i}`);
                const htmlSeason = await responseSeason.text();

                const episodesSeason = await getEpisodes(htmlSeason);

                allEpisodes.push(...episodesSeason);
            }
        } else {
            const match = url.match(/movies7\.im\/movie\/([^?]+)/);
            if (!match) throw new Error('Invalid URL format');

            const id = match[1];

            allEpisodes.push({
                href: `https://movies7.im/watch/movie/${id}`,
                number: 1
            });
        }
        
        console.log(allEpisodes);
        return JSON.stringify(allEpisodes);
    } catch (error) {
        console.log('Fetch error in extractEpisodes:', error);
        return JSON.stringify([]);
    }    
}

async function getEpisodes(html) {
    const episodeRegex = /<a href="(\/watch\/series\/[^"]+?)"[^>]*>[\s\S]*?<h3[^>]*>\s*(\d+)\./g;

    const transformedResults = [];
    let match;

    while ((match = episodeRegex.exec(html)) !== null) {
        const href = match[1].trim();
        const number = parseInt(match[2], 10);

        transformedResults.push({
            href: `https://movies7.im${href}`,
            number
        });
    }

    return transformedResults;
}

async function extractStreamUrl(url) {
    if (!_0xCheck()) return 'https://files.catbox.moe/avolvc.mp4';

    try {
        const response = await soraFetch(url);
        const html = await response.text();

        const match = html.match(/<iframe[^>]*src="([^"]+)"[^>]*>/);
        const iframeUrl = match ? match[1] : null;
        if (!iframeUrl) throw new Error("Iframe not found");
        const iframeResponse = await soraFetch(iframeUrl);
        const iframeHtml = await iframeResponse.text();

        const playlistItemRegex = /tracks:\s*setDefaultTrack\([^,]+,\s*(\[[^\]]+\])\)[^}]*sources:\s*(\[[^\]]+\])/gs;
        let itemMatch;
        const results = [];

        while ((itemMatch = playlistItemRegex.exec(iframeHtml)) !== null) {
            // Tracks
            let tracksArr = [];
            try {
                // Try to parse as JSON
                tracksArr = JSON.parse(itemMatch[1].replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":'));
            } catch (e) {
                // Fallback: extract manually
                const trackRegex = /{[^}]*file\s*:\s*['"]([^'"]+)['"][^}]*code\s*:\s*['"]([^'"]+)['"][^}]*label\s*:\s*['"]([^'"]+)['"][^}]*}/g;
                let tMatch;
                while ((tMatch = trackRegex.exec(itemMatch[1])) !== null) {
                    tracksArr.push({
                        file: tMatch[1],
                        code: tMatch[2],
                        label: tMatch[3]
                    });
                }
            }
            // Sources
            let sourcesArr = [];
            try {
                sourcesArr = JSON.parse(itemMatch[2].replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":'));
            } catch (e) {
                // Fallback: extract manually
                const sourceRegex = /{[^}]*file\s*:\s*['"]([^'"]+)['"][^}]*}/g;
                let sMatch;
                while ((sMatch = sourceRegex.exec(itemMatch[2])) !== null) {
                    sourcesArr.push({
                        file: sMatch[1]
                    });
                }
            }

            results.push({
                tracks: tracksArr.map(t => ({
                    file: t.file,
                    code: t.code,
                    label: t.label
                })),
                sources: sourcesArr.map(s => ({
                    file: s.file
                }))
            });
        }

        // console.log(JSON.stringify(results));

        let streams = [];
        streams.push(`https://embed.lc${results[0].sources[0].file}/1080p`);
        const subtitlesFile = results[0].tracks.find(t => t.code === "en").file;
        const subtitles = `https://embed.lc${subtitlesFile}`;

        const result = {
            streams,
            subtitles
        };

        console.log('Result: ' + JSON.stringify(result));
        return JSON.stringify(result);
    } catch (error) {
        console.log('Fetch error in extractStreamUrl: ' + error);

        const result = {
            streams: "",
            subtitles: ""
        };

        return JSON.stringify(result);
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
