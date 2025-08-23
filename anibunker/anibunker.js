async function searchResults(keyword) {
  try {
    const encodedKeyword = encodeURIComponent(keyword);
    const response = await soraFetch(`https://anibunker.com/search?q=${encodedKeyword}`);
    const html = await response.text();

    const results = [];

    const cardRegex = /<a\s+href="(\/anime\/[^"]+)"\s*>\s*<div[^>]*class="perfil--content"[^>]*title="([^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/g;

    let match;
    while ((match = cardRegex.exec(html)) !== null) {
        const href = "https://anibunker.com" + match[1];
        const title = match[2];
        const image = match[3];

        results.push({
            title: title.trim(),
            href: href.trim(),
            image: image.trim(),
        });
    }

    console.log(results);
    return JSON.stringify(results);
  } catch (error) {
    console.error("Fetch error in searchResults: " + error);
    return [{ title: "Error", image: "", href: "" }];
  }
}

async function extractDetails(url) {
    try {
        const responseText = await soraFetch(url);
        const html = await responseText.text();

        const details = [];

        const descriptionMatch = html.match(/<p class="small">([\s\S]*?)<\/p>/i);
        const description = descriptionMatch 
            ? descriptionMatch[1].replace(/<[^>]+>/g, '').trim()
            : 'N/A';

        const extractField = (label) => {
            const regex = new RegExp(`<strong>${label}:\\s*<\\/strong>([\\s\\S]*?)<\\/div>`, 'i');
            const match = html.match(regex);
            return match
                ? match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
                : 'N/A';
        };

        const producers = extractField("Produtores");
        const studios = extractField("Estúdios");
        const directors = extractField("Diretores");

        const alias = `Produtores: ${producers} | Estúdios: ${studios} | Diretores: ${directors}`;

        const airdateMatch = html.match(/<strong>Ano:\s*<\/strong>\s*(\d{4})/i);
        const airdate = airdateMatch ? airdateMatch[1].trim() : 'N/A';

        details.push({
            description,
            alias,
            airdate
        });

        console.log(details);
        return JSON.stringify(details);
    } catch (error) {
        console.log('Details error:', error);
        return [{
            description: 'Error loading description',
            alias: 'N/A',
            airdate: 'N/A'
        }];
    }
}

async function extractEpisodes(url) {
    try {
        const responseText = await soraFetch(url);
        const html = await responseText.text();

        const episodes = [];

        const idContent = html.match(/<input id='idContent' type="hidden" value="(\d+)">/)?.[1] || "";
        const subtitled = html.match(/<input id='subtitled' type="hidden" value="(\d+)">/)?.[1] || "";
        const vpp = html.match(/<input id="vpp" type="hidden" value="(\d+)">/)?.[1] || "";
        const order = html.match(/<input id="order" type="hidden" value="(\d+)">/)?.[1] || "";

        console.log(idContent, subtitled, vpp, order);

        const pageMatches = [...html.matchAll(/<option value="(\d+)">/g)];
        const maxPage = pageMatches.length > 0
            ? Math.max(...pageMatches.map(m => parseInt(m[1], 10)))
            : 1;

        console.log("Max page:", maxPage);

        function parseEpisodeBlocks(blocks) {
            blocks.forEach(block => {
                const hrefMatch = block.match(/<a href="([^"]+)"/);
                const numberMatch = block.match(/<div class="ep_number">(\d+)<\/div>/);
                const titleMatch = block.match(/<div class="title full--text">([^<]+)<\/div>/);

                if (hrefMatch && numberMatch) {
                    episodes.push({
                        href: `https://anibunker.com${hrefMatch[1].trim()}`,
                        number: Number(numberMatch[1].trim()),
                        title: titleMatch ? titleMatch[1].trim() : ""
                    });
                }
            });
        }

        const firstPageBlocks = html.match(/<a href="([^"]+)">\s*<div class="card">([\s\S]*?)<\/div>\s*<\/a>/g);
        if (firstPageBlocks) parseEpisodeBlocks(firstPageBlocks);

        if (maxPage > 1) {
            const pageRequests = [];
            for (let pg = 2; pg <= maxPage; pg++) {
                pageRequests.push(
                    soraFetch(`https://anibunker.com/php/geteps.php`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: `{"id":"${idContent}","subtitled":"${subtitled}","currentPG":${pg},"vpp":"${vpp}","order":"${order}"}`
                    }).then(res => res.json())
                      .catch(() => [])
                );
            }

            const pagesData = await Promise.all(pageRequests);

            pagesData.forEach(data => {
                if (Array.isArray(data)) {
                    data.forEach(ep => {
                        episodes.push({
                            href: `${url}-episodio-${ep.number}-legendado`,
                            number: Number(ep.number),
                            title: ep.title.trim(),
                        });
                    });
                }
            });
        }

        const isAscending = episodes.every((ep, i, arr) => 
            i === 0 || arr[i - 1].number <= ep.number
        );

        if (!isAscending) {
            episodes.reverse();
        }

        console.log(episodes);
        return JSON.stringify(episodes);
    } catch (error) {
        console.log("Fetch error in extractEpisodes:", error);
        return JSON.stringify([]);
    }
}

async function extractStreamUrl(url) {
    try {
        const responseText = await soraFetch(url);
        const html = await responseText.text();

        const matchId = html.match(/data-video-id="(\d+)"/);
        const videoId = matchId[1];

        const playerId = ["url_hd", "url_hd_2"];

        let streams = [];

        for (const pid of playerId) {
            const response = await soraFetch(
                `https://anibunker.com/php/loader.php`, 
                { 
                    method: "POST", 
                    headers: { "Content-Type": "application/x-www-form-urlencoded", "Origin": "https://anibunker.com" }, 
                    body: `player_id=${pid}&video_id=${videoId}&user_agent=Mozilla%2F5.0%20(Macintosh%3B%20Intel%20Mac%20OS%20X%2010.15%3B%20rv%3A141.0)%20Gecko%2F20100101%20Firefox%2F141.0` 
                }
            );

            const json = await response.json();

            // if (json.url.includes("short.icu") || json.url.includes("vk.ru") || json.url === "") continue;
            if (!json.url || (!json.url.includes(".mp4") && !json.url.includes(".m3u8"))) continue;

            streams.push({
                title: `Stream ${pid.toUpperCase()}`,
                streamUrl: json.url,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:141.0) Gecko/20100101 Firefox/141.0"
                }
            });
        }

        const results = {
            streams,
            subtitles: ""
        }

        console.log(JSON.stringify(results));
        return JSON.stringify(results);

        // const response = await soraFetch(
        //     `https://anibunker.com/php/loader.php`, 
        //     { 
        //         method: "POST", 
        //         headers: { "Content-Type": "application/x-www-form-urlencoded", "Origin": "https://anibunker.com" }, 
        //         body: `player_id=${playerId}&video_id=${videoId}&user_agent=Mozilla%2F5.0%20(Macintosh%3B%20Intel%20Mac%20OS%20X%2010.15%3B%20rv%3A141.0)%20Gecko%2F20100101%20Firefox%2F141.0` 
        //     }
        // );
        // const json = await response.json();

        // console.log(JSON.stringify(json));
        // return json.url;
    } catch (error) {
        console.error('extractStreamUrl error:', error);
        return null;
    }
}

// searchResults("one piece");
// extractDetails("https://anibunker.com/anime/one-piece-gyojin-tou-hen");
// extractEpisodes("https://anibunker.com/anime/one-piece-gyojin-tou-hen");
// extractStreamUrl("https://anibunker.com/anime/one-piece-gyojin-tou-hen-episodio-1-legendado");

// extractEpisodes("https://anibunker.com/anime/one-piece");

// extractStreamUrl("https://anibunker.com/anime/hibi-wa-sugiredo-meshi-umashi-episodio-1-legendado");

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