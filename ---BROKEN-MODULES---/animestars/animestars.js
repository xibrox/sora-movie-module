async function searchResults(keyword) {
    try {
        const responseText = await soraFetch(`https://animestars.org/?do=search&subaction=search&search_start=0&full_search=0&story=${keyword}`);
        const html = await responseText.text();

        const regex = /<a\s+class="poster[^"]*"\s+href="([^"]+)">[\s\S]*?<img[^>]+src="([^"]+)"[^>]*>[\s\S]*?<h3[^>]*class="poster__title[^"]*"[^>]*>([^<]+)<\/h3>/g;

        const results = [];
        let match;

        while ((match = regex.exec(html)) !== null) {
            results.push({
                title: match[3].trim(),
                image: `https://animestars.org${match[2].trim()}`,
                href: `https://animestars.org${match[1].trim()}`
            });
        }

        console.log(results);
        return JSON.stringify(results);
    } catch (error) {
        console.log('Fetch error in searchResults:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

// searchResults('one punch');
// extractDetails('https://animestars.org/aniserials/videos/comedy/15-vanpanchmen-one-punch-man-animestars-2015.html');
// extractEpisodes('https://animestars.org/aniserials/videos/comedy/15-vanpanchmen-one-punch-man-animestars-2015.html');
// extractStreamUrl('https://animestars.org/aniserials/videos/comedy/15-vanpanchmen-one-punch-man-animestars-2015.html|1');

async function extractDetails(url) {
    try {
        const responseText = await soraFetch(url);
        const html = await responseText.text();

        const descriptionMatch = html.match(/<h2 class="page__subtitle">Про что аниме<\/h2>\s*<div class="page__text[^>]*">([\s\S]*?)<\/div>/);
        const description = descriptionMatch ? descriptionMatch[1]
            .replace(/<\/p>\s*<p>/gi, ' ')   // добавить пробел между абзацами
            .replace(/<[^>]+>/g, '')         // удалить все теги
            .replace(/\s+/g, ' ')            // нормализовать пробелы
            .trim() : 'Описание недоступно';

        const durationMatch = html.match(/Просмотр:<\/span>\s*<span>([^<]+)<\/span>/);
        const duration = durationMatch ? `Длительность: ${durationMatch[1]}` : null;

        const studioMatch = html.match(/Студия:<\/span>\s*<span><a[^>]*>([^<]+)<\/a><\/span>/);
        const studio = studioMatch ? `Студия: ${studioMatch[1]}` : null;

        const genresMatch = html.match(/<li class="pcoln__list-genres">[\s\S]*?<span>Жанр:<\/span>\s*<span>([\s\S]*?)<\/span>/);
        let genres = null;
        if (genresMatch) {
            const genreList = Array.from(genresMatch[1].matchAll(/<a[^>]*>([^<]+)<\/a>/g)).map(m => m[1]);
            genres = `Жанры: ${genreList.join(', ')}`;
        }

        const ratingMatch = html.match(/<div class="pmovie__ratings-score[^>]*">\s*<span>([\d.]+)<\/span>/);
        const rating = ratingMatch ? `Оценка: ${ratingMatch[1]}` : null;

        const aliasesParts = [duration, genres, studio, rating].filter(Boolean);
        const aliases = aliasesParts.length ? aliasesParts.join('\n') : 'Информация недоступна';

        const airdateMatch = html.match(/Год выпуска:<\/span>\s*<span><a[^>]*>(\d{4})<\/a><\/span>/);
        const airdate = airdateMatch ? `Год выхода: ${airdateMatch[1]}` : 'Год выхода: неизвестен';

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
            description: 'Ошибка загрузки описания',
            aliases: 'Информация недоступна',
            airdate: 'Год выхода: неизвестен'
        }]);
    }
}

async function extractEpisodes(url) {
    try {
        const responseText = await soraFetch(url);
        const html = await responseText.text();

        const episodeCountMatch = html.match(/Серий:\s*\d+-\d+\s+из\s+(\d+)/i);
        const episodesCount = episodeCountMatch ? parseInt(episodeCountMatch[1], 10) : 0;

        const transformedResults = [];

        for (let i = 1; i <= episodesCount; i++) {
            transformedResults.push({
                href: `${url}|${i}`,
                number: i
            });
        }

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
        const [url2, episode] = url.split('|');

        const responseText = await soraFetch(url2);
        const html = await responseText.text();

        const playerTagMatch = html.match(/<video-player[^>]+>/i);
        if (!playerTagMatch) throw new Error("video-player tag not found");

        const tag = playerTagMatch[0];

        const getAttr = (name) => {
            const match = tag.match(new RegExp(`${name}="([^"]+)"`));
            return match ? match[1] : null;
        };

        const publisherId = getAttr('data-publisher-id');
        const aggregator = getAttr('data-aggregator');
        const titleId = getAttr('data-title-id');

        let url3 = "";

        if (publisherId && aggregator && titleId) {
            url3 = `https://plapi.cdnvideohub.com/api/v1/player/sv/playlist?pub=${publisherId}&aggr=${aggregator}&id=${titleId}`;
        } else {
            throw new Error("Missing required attributes");
        }

        const responseText2 = await soraFetch(url3);
        const data = await responseText2.json();

        console.log(data.items);

        const filteredItems = data.items.filter(item => item.episode === Number(episode));

        console.log(filteredItems);

        let streams = [];

        for (const stream of filteredItems) {
            const streamStudio = stream.voiceStudio;
            const streamType = stream.voiceType;
            const streamId = stream.vkId;

            const apiUrl = `https://plapi.cdnvideohub.com/api/v1/player/sv/video/${streamId}`;
            const responseText = await soraFetch(apiUrl);
            const data = await responseText.json();

            let streamUrl = "";

            if (data.sources.mpeg4kUrl !== "") {
                streamUrl = data.sources.mpeg4kUrl;
            } else if (data.sources.mpeg2kUrl !== "") {
                streamUrl = data.sources.mpeg2kUrl;
            } else if (data.sources.mpegQhdUrl !== "") {
                streamUrl = data.sources.mpegQhdUrl;
            } else if (data.sources.mpegFullHdUrl !== "") {
                streamUrl = data.sources.mpegFullHdUrl;
            } else if (data.sources.mpegHighUrl !== "") {
                streamUrl = data.sources.mpegHighUrl;
            } else if (data.sources.mpegMediumUrl !== "") {
                streamUrl = data.sources.mpegMediumUrl;
            } else if (data.sources.mpegLowUrl !== "") {
                streamUrl = data.sources.mpegLowUrl;
            } else if (data.sources.mpegTinyUrl !== "") {
                streamUrl = data.sources.mpegTinyUrl;
            } else if (data.sources.mpegLowestUrl !== "") {
                streamUrl = data.sources.mpegLowestUrl;
            } else {
                streamUrl = data.sources.hlsUrl;
            }

            streams.push({
                title: streamStudio !== "" && streamType !== "" ? `${streamStudio} (${streamType})` : 'Дубляж',
                streamUrl,
                headers: {}
            });
        }

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
