async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const apiUrl = `https://yummy-anime.ru/api/search?q=${encodedKeyword}&limit=20&offset=0`;

        const responseText = await soraFetch(apiUrl);
        const data = await responseText.json();

        const transformedResults = data.response.map(result => {
            if (result.title === "Мой жених – своенравный и инфантильный ученик") {
                return {
                    title: 'Error',
                    image: '',
                    href: ''
                };
            }

            return {
                title: result.title,
                image: `https:${result.poster.fullsize}`,
                href: `https://yummy-anime.ru/catalog/item/${result.anime_url}?id=${result.anime_id}`,
            };
        });

        console.log(JSON.stringify(transformedResults));
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in searchResults:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        const match = url.match(/https:\/\/yummy-anime\.ru\/catalog\/item\/([^\/]+)\?id=([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");

        const animeSlug = match[1];
        const animeId = match[2];

        const responseText = await soraFetch(`https://yummy-anime.ru/api/anime/${animeId}`);
        const animeData = await responseText.json();

        const data = animeData.response;

        const transformedResults = [{
            description: data.description || 'Без описания',
            aliases: `Все названия: ${data.other_titles.join(', ')}` || 'Без дополнительных названий',
            airdate: `Год выхода: ${data.year ? data.year : 'Без года выхода'}`,
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
        const match = url.match(/https:\/\/yummy-anime\.ru\/catalog\/item\/([^\/]+)\?id=([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");

        const animeSlug = match[1];
        const animeId = match[2];

        const responseText = await soraFetch(`https://yummy-anime.ru/api/anime/${animeId}/videos`);
        const animeData = await responseText.json();

        const data = animeData.response.filter(result => result.data.dubbing === "Субтитры SovetRomantica");

        console.log(data);

        const transformedResults = data.map(result => {
            const episodeNumber = result.number;

            const epNum = parseInt(episodeNumber);

            return {
                href: `https:${result.iframe_url}`,
                number: epNum
            };
        });

        console.log(transformedResults);
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error in extractEpisodes:', error);
        return JSON.stringify([]);
    }    
}

async function extractStreamUrl(url) {
    if (!_0xCheck()) return 'https://files.catbox.moe/avolvc.mp4';

    try {
        const responseText = await soraFetch(url);
        const data = await responseText.text();

        const regex = /"file":"(https:\/\/scu\d+\.sovetromantica\.com\/anime\/[^"]+\.m3u8)"/g;

        const matches = Array.from(data.matchAll(regex), m => m[1]);

        console.log(matches);
        return matches;
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
