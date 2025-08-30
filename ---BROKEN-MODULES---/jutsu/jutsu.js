async function searchResults(keyword) {
    try {
        const url = "https://jut.su/anime/";

        const headers = {
            "Origin": "https://jut.su",
            "Referer": "https://jut.su/anime/",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:138.0) Gecko/20100101 Firefox/138.0",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
        };

        const response = await soraFetch(url, {
            method: "POST",
            headers,
            body: `ajax_load=yes&start_from_page=1&show_search=${keyword}&anime_of_user=`,
            encoding: `windows-1251`
        });

        const html = await response.text();

        let results = [];

        const regex = /<div class="all_anime_global[^>]*?>\s*<a href="([^"]+)">\s*<div class="all_anime">[\s\S]*?<div class="all_anime_image"\s+style="background:\s*url\('([^']+)'\)[^>]*>[\s\S]*?<div class="aaname">([^<]+)<\/div>/g;

        let match;
        while ((match = regex.exec(html)) !== null) {
            results.push({
                title: match[3].trim(),
                image: match[2].trim(),
                href: `https://jut.su${match[1].trim()}`,
            });
        }

        console.log(JSON.stringify(results));
        return JSON.stringify(results);
    } catch (error) {
        console.log('Fetch error in searchResults: ' + error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

// searchResults('one piece');
// extractDetails('https://jut.su/onepuunchman/');
// extractEpisodes('https://jut.su/onepuunchman/');
extractStreamUrl("https://jut.su/onepuunchman/season-1/episode-1.html");

async function extractDetails(url) {
    const results = [];

    const response = await soraFetch(url, { encoding: 'windows-1251' });
    const html = await response.text();

    const descriptionMatch = html.match(
        /<p class="under_video[^>]*">[\s\S]*?<span>([\s\S]*?)<\/span>/
    );
    const description = descriptionMatch
        ? descriptionMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
        : 'N/A';

    const aliasesBlockMatch = html.match(
        /<div class="under_video_additional[^>]*?">([\s\S]*?)<\/div>/
    );
    let aliases = 'N/A';
    let airdate = 'N/A';

    if (aliasesBlockMatch) {
        const block = aliasesBlockMatch[1];

        const genres = (block.match(/Жанры:\s*([\s\S]*?)<br>/) || [])[1] || '';
        const themes = (block.match(/Темы:\s*([\s\S]*?)<br>/) || [])[1] || '';
        const years = (block.match(/Годы выпуска:\s*([\s\S]*?)<br>/) || [])[1] || '';
        const originalTitle = (block.match(/Оригинальное название:\s*<b>(.*?)<\/b>/) || [])[1] || '';
        const ageRating = (block.match(/Возрастной рейтинг:\s*<span[^>]*?>(\d+)<small>\+<\/small><\/span>/) || [])[1] || '';

        const clean = s => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

        aliases = [
            genres && `Жанры: ${clean(genres).replace(/Аниме\s*/g, '')}`,
            themes && `Темы: ${clean(themes).replace(/Аниме\s*/g, '')}`,
            originalTitle && `Оригинальное название: ${originalTitle}`,
            ageRating && `Возрастной рейтинг: ${ageRating}+`
        ].filter(Boolean).join('\n');

        airdate = clean(years).replace(/Аниме\s*/g, '');
    }

    results.push({
        description,
        aliases,
        airdate
    });

    console.log(JSON.stringify(results));
    return JSON.stringify(results);
}

async function extractEpisodes(url) {
    const results = [];

    const response = await soraFetch(url, { encoding: 'windows-1251' });
    const html = await response.text();

    const regex = /<a href="([^"]+?\/episode-\d+\.html)"[^>]*>\s*<i>[^<]*<\/i>(\d+)\s+серия<\/a>/g;

    let match;
    while ((match = regex.exec(html)) !== null) {
        results.push({
            href: `https://jut.su${match[1].trim()}`,
            number: parseInt(match[2], 10)
        });
    }

    console.log(JSON.stringify(results));
    return JSON.stringify(results);
}

async function extractStreamUrl(url) {
    const response = await soraFetch(url, { encoding: 'windows-1251' });
    const html = await response.text();

    let streams = [];

    const regex = /<source\s+src="([^"]+)"[^>]*label="(\d+p)"[^>]*res="(\d+)"[^>]*>/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
        streams.push({
            title: match[2],
            streamUrl: `https://jut-proxy.onrender.com/proxy?url=${encodeURIComponent(match[1])}`,
            headers: {
                // "Referer": "https://jut.su/",
                // "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:140.0) Gecko/20100101 Firefox/140.0",
                // "Accept": "video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5",
                // "Range": "bytes=0-"
            }
        });
    }

    const results = {
        streams,
        subtitles: ""
    };

    console.log(JSON.stringify(results));
    return JSON.stringify(results);
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
