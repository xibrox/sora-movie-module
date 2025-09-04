async function searchResults(keyword) {
    const results = [];
    const response = await soraFetch(`https://sites.google.com/view/borucut`);
    const html = await response.text();

    // --- Regex patterns ---
    const arcRegex = /<span class="C9DxTc "[^>]*>([^<]*Arc)<\/span>/g;
    const linkRegex = /<a[^>]*href="([^"]+)"[^>]*>\s*<div class="NsaAfc">\s*<p>.*?<\/p>/g;
    const imageRegex = /<img src="([^"]+)"[^>]*>/g;

    // --- Extract arcs ---
    let arcs = [];
    let match;
    while ((match = arcRegex.exec(html)) !== null) {
        arcs.push(match[1].trim());
    }

    // --- Extract links ---
    let hrefs = [];
    while ((match = linkRegex.exec(html)) !== null) {
        hrefs.push(match[1]);
    }

    // --- Extract ALL images ---
    let allImages = [];
    while ((match = imageRegex.exec(html)) !== null) {
        allImages.push(match[1]);
    }

    // 🔑 Filter images: keep only the ones that appear after arcs start
    // In your case, the "real" arc images start from index 4 onward
    let images = allImages.slice(allImages.length - arcs.length);

    // --- Zip arcs + hrefs + images together ---
    for (let i = 0; i < arcs.length; i++) {
        results.push({
            title: arcs[i] || "",
            href: hrefs[i] || "",
            image: images[i] || ""
        });
    }

    for (const item of results) {
        const match = item.href.match(/q=(https[^&]+)/);
        if (match) {
            item.href = decodeURIComponent(match[1]);
        }
    }

    console.log("Results:", results);
    return JSON.stringify(results);
}

async function extractDetails(url) {
    const match = url.match(/https:\/\/pixeldrain\.com\/l\/([^\/]+)/);
    if (!match) throw new Error("Invalid URL format");

    const arcId = match[1];

    const response = await soraFetch(`https://pixeldrain.net/api/list/${arcId}`);
    const data = await response.json();    

    const transformedResults = [{
        description: `Title: ${data.title}\nFile Count: ${data.file_count}`,
        aliases: `Title: ${data.title}\nFile Count: ${data.file_count}`,
        airdate: ''
    }];

    console.log(`Details: ${JSON.stringify(transformedResults)}`);
    return JSON.stringify(transformedResults);
}

async function extractEpisodes(url) {
    const match = url.match(/https:\/\/pixeldrain\.com\/l\/([^\/]+)/);
    if (!match) throw new Error("Invalid URL format");

    const arcId = match[1];

    const response = await soraFetch(`https://pixeldrain.net/api/list/${arcId}`);
    const data = await response.json();

    const transformedResults = data.files.map((result, index) => {
        return {
            href: `${result.id}`,
            number: index + 1,
        };
    });

    console.log(`Episodes: ${JSON.stringify(transformedResults)}`);
    return JSON.stringify(transformedResults);
}

// searchResults("all");
// extractDetails("https://pixeldrain.net/l/dX3cF5Q3");
// extractEpisodes("https://pixeldrain.net/l/dX3cF5Q3");
// extractStreamUrl(`EDg7Q9Uu`);

async function extractStreamUrl(url) {
    return `https://pixeldrain.net/api/file/${url}?download`;
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
