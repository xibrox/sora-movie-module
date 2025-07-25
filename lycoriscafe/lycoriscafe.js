async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await soraFetch(`https://www.lycoris.cafe/api/search?page=1&pageSize=12&search=${encodedKeyword}&sortField=popularity&sortDirection=desc&preferRomaji=true`);
        const data = await responseText.json();

        const transformedResults = data.data.map(result => {
            return {
                title: result.englishTitle || result.title,
                image: result.poster,
                // href: `https://www.lycoris.cafe/anime/${result.id}/${generateSlug(result.title)}`
                href: `https://www.lycoris.cafe/anime/${result.id}/undefined`
            };
        });

        console.log(transformedResults);
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in searchResults:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        const match = url.match(/https:\/\/www\.lycoris\.cafe\/anime\/(\d+)\/(.*)/);
        if (!match) throw new Error("Invalid URL format");

        const animeId = match[1];

        const response = await soraFetch(`https://www.lycoris.cafe/api/anime/${animeId}`);
        const data = await response.json();

        const description = decodeHTMLEntities(data.anime.synopsis) || 'No description available';
        const airdate = `Released: ${data.anime.startDate ? `${data.anime.startDate}` : 'Unknown'}`

        const aliases = `
English Title: ${data.anime.englishTitle ? data.anime.englishTitle : 'Unknown'}
Japanese Title: ${data.anime.nativeTitle ? data.anime.nativeTitle : 'Unknown'}
Romaji Title: ${data.anime.title ? data.anime.title : 'Unknown'}
Format: ${data.anime.format ? data.anime.format : 'Unknown'}
Genres: ${data.anime.genres ? data.anime.genres.map(genre => genre).join(', ') : 'Unknown'}
Studio: ${data.anime.studio ? data.anime.studio : 'Unknown'}
Status: ${data.anime.airingStatus ? data.anime.airingStatus : 'Unknown'}
Rating: ${data.anime.rating ? data.anime.rating : 'Unknown'}
Episode Duration: ${data.anime.duration ? data.anime.duration : 'Unknown'}
Total Episodes: ${data.anime.totalEpisodes ? data.anime.totalEpisodes : 'Unknown'}
        `.trim();

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
            aliases: 'Unknown',
            airdate: 'Unknown'
        }]);
    }
}

async function extractEpisodes(url) {
    try {
        const match = url.match(/https:\/\/www\.lycoris\.cafe\/anime\/(\d+)\/(.*)/);
        if (!match) throw new Error("Invalid URL format");

        const animeId = match[1];

        const response = await soraFetch(`https://www.lycoris.cafe/api/anime/${animeId}`);
        const data = await response.json();

        let allEpisodes = [];
        for (const episode of data.anime.episodes) {
            allEpisodes.push({
                href: `https://www.lycoris.cafe/anime/${animeId}/undefined/watch/${episode.number}`,
                number: episode.number,
                title: episode.title || ""
            });
        }
        
        console.log(allEpisodes);
        return JSON.stringify(allEpisodes);
    } catch (error) {
        console.log('Fetch error in extractEpisodes:', error);
        return JSON.stringify([]);
    }
}

async function extractStreamUrl(url) {
    if (!_0xCheck()) return 'https://files.catbox.moe/avolvc.mp4';

    try {
        const match = url.match(/https:\/\/www\.lycoris\.cafe\/anime\/(\d+)\/undefined\/watch\/(\d+)/);
        if (!match) throw new Error("Invalid URL format");

        const animeId = match[1];
        const episodeNumber = parseInt(match[2]);

        const response = await soraFetch(`https://www.lycoris.cafe/api/anime/${animeId}`);
        const data = await response.json();

        const episode = data.anime.episodes.find(ep => ep.number === episodeNumber);
        if (!episode || !episode.secondarySource) {
            throw new Error("Episode or stream data not found");
        }

        const qualityOrder = ["FHD", "HD", "SD"];

        const streams = Object.entries(episode.secondarySource)
            .filter(([quality, streamUrl]) =>
                !["Source", "SourceMKV"].includes(quality) &&
                !streamUrl.toLowerCase().endsWith(".mkv")
            )
            .sort(([a], [b]) => qualityOrder.indexOf(a) - qualityOrder.indexOf(b))
            .map(([quality, streamUrl]) => ({
                title: quality,
                streamUrl,
                headers: {
                    Referer: "https://www.lycoris.cafe/"
                }
            }));

        const result = {
            streams,
            subtitles: ""
        };

        console.log(result);
        return JSON.stringify(result);
    } catch (error) {
        console.log('Fetch error in extractStreamUrl: ' + error);

        const result = {
            streams: [],
            subtitles: ""
        };

        console.log(result);
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

function generateSlug(title) {
    return title
        .toLowerCase()                      // Convert to lowercase
        .normalize('NFD')                   // Normalize accented characters
        .replace(/[\u0300-\u036f]/g, '')    // Remove diacritics
        .replace(/[^a-z0-9\s-]/g, '')       // Remove non-alphanumeric characters except spaces and hyphens
        .trim()                             // Remove leading/trailing whitespace
        .replace(/\s+/g, '-')               // Replace spaces with hyphens
        .replace(/-+/g, '-');               // Collapse multiple hyphens
}

function decodeHTMLEntities(text) {
    text = text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
    
    const entities = {
        '&quot;': '"',
        '&amp;': '&',
        '&apos;': "'",
        '&lt;': '<',
        '&gt;': '>'
    };
    
    for (const entity in entities) {
        text = text.replace(new RegExp(entity, 'g'), entities[entity]);
    }

    return text;
}

// extractStreamUrl('https://www.lycoris.cafe/anime/167143/undefined/watch/1');