async function searchResults(keyword) {
    try {
        const responseText = await soraFetch(`https://novelbuddy.com/search?sort=views&q=${encodeURIComponent(keyword)}`);
        const html = await responseText.text();

        const results = [];

        const regex = /<div class="book-item">[\s\S]*?<a title="([^"]+)" href="([^"]+)"[^>]*>[\s\S]*?data-src="([^"]+)"/g;

        let match;
        while ((match = regex.exec(html)) !== null) {
            results.push({
                title: match[1].trim(),
                href: `https://novelbuddy.com${match[2].trim()}`,
                image: match[3].startsWith('//') ? 'https:' + match[3].trim() : match[3].trim()
            });
        }

        console.log(results);
        return JSON.stringify(results);
    } catch (error) {
        console.log('Fetch error in searchResults: ' + error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

async function extractDetails(url) {
    try {
        const response = await soraFetch(url);
        const htmlText = await response.text();

        let description = 'No description available';
        const descMatch = htmlText.match(/<p class="content"[^>]*>([\s\S]*?)<\/p>/);
        if (descMatch) {
            description = descMatch[1]
                .replace(/<\/?[^>]+>/g, '')  // Remove any nested tags (just in case)
                .replace(/&quot;/g, '"')
                .replace(/&nbsp;/g, ' ')
                .replace(/&ldquo;/g, '“')
                .replace(/&rdquo;/g, '”')
                .replace(/&rsquo;/g, '’')
                .replace(/&lsquo;/g, '‘')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/\s+/g, ' ')
                .trim();
        }

        let authors = 'Unknown';
        const authorMatch = htmlText.match(/<strong>Authors\s*:<\/strong>([\s\S]*?)<\/p>/);
        if (authorMatch) {
            const authorRegex = /<span>([^<]+)<\/span>/g;
            let match;
            const authorList = [];
            while ((match = authorRegex.exec(authorMatch[1])) !== null) {
                authorList.push(match[1].trim());
            }
            if (authorList.length) authors = authorList.join(', ');
        }

        const statusMatch = htmlText.match(/<strong>Status\s*:<\/strong>\s*<a[^>]*>\s*<span>([^<]+)<\/span>/);
        const status = statusMatch ? statusMatch[1].trim() : 'Unknown';

        let genres = 'Unknown';
        const genreMatch = htmlText.match(/<strong>Genres\s*:<\/strong>([\s\S]*?)<\/p>/);
        if (genreMatch) {
            const genreRegex = /<a[^>]*>\s*([^<\n,]+)\s*(?:,)?\s*<\/a>/g;
            const genreList = [];
            let gMatch;
            while ((gMatch = genreRegex.exec(genreMatch[1])) !== null) {
                genreList.push(gMatch[1].trim());
            }
            if (genreList.length) genres = genreList.join(', ');
        }

        const chaptersMatch = htmlText.match(/<strong>Chapters:\s*<\/strong>\s*<span>(\d+)<\/span>/);
        const chapters = chaptersMatch ? chaptersMatch[1] : 'Unknown';

        const updateMatch = htmlText.match(/<strong>Last update:\s*<\/strong>\s*<span>([^<]+)<\/span>/);
        const lastUpdate = updateMatch ? updateMatch[1].trim() : 'Unknown';

        const aliases = `
Author(s): ${authors}
Status: ${status}
Genres: ${genres}
Chapters: ${chapters}
Last update: ${lastUpdate}
        `.trim();

        const transformedResults = [{
            description,
            aliases,
            airdate: ''
        }];

        console.log(transformedResults);
        return JSON.stringify(transformedResults);

    } catch (error) {
        console.log('Details error: ' + error);
        return JSON.stringify([{
            description: 'Error loading description',
            aliases: 'Unknown',
            airdate: ''
        }]);
    }
}

async function extractChapters(url) {
    try {
        const response = await soraFetch(url);
        const htmlText = await response.text();

        const chapterRegex = /<li[^>]*>\s*<a href="([^"]+)"[^>]*>\s*<div>\s*<strong class="chapter-title">([^<]+)<\/strong>/g;

        const tempChapters = [];
        let match;

        while ((match = chapterRegex.exec(htmlText)) !== null) {
            const href = match[1].trim();
            const title = match[2].trim();

            tempChapters.push({
                href: href.startsWith('http') ? href : `https://novelbuddy.com${href}`,
                title
            });
        }

        const chapters = tempChapters.reverse().map((ch, i) => ({
            ...ch,
            number: i + 1
        }));

        console.log(chapters);
        return JSON.stringify(chapters);
    } catch (error) {
        console.log('Fetch error in extractChapters: ' + error);
        return JSON.stringify([]);
    }
}


async function extractText(url) {
    try {
        const response = await soraFetch(url);
        const htmlText = await response.text();

        const startIndex = htmlText.indexOf('<div class="content-inner">');
        if (startIndex === -1) throw new Error("content-inner div not found");

        const subHtml = htmlText.slice(startIndex);

        const pTagRegex = /<p[^>]*>[\s\S]*?<\/p>/g;

        const pMatches = subHtml.match(pTagRegex);

        if (!pMatches || pMatches.length === 0) throw new Error("No <p> tags found");

        // Filter out unwanted <p> tags by:
        // - Ignoring <p> with class mt-4
        // - Ignoring <p> tags containing specific texts (case-insensitive)
        const filtered = pMatches.filter(p => {
            if (p.includes('class="mt-4"')) return false;  // exclude by class
            // exclude by text inside <p>, normalize lowercase and trim
            const text = p.replace(/<[^>]*>/g, '').trim().toLowerCase();
            if (
                text === '©novelbuddy' ||
                text === 'or login with' ||
                text === 'or login with mangabuddy account'
            ) return false;
            return true;
        });

        const content = filtered.join('\n').trim();

        console.log(content);
        return content;

    } catch (error) {
        console.log("Fetch error in extractText: " + error);
        return JSON.stringify({ text: 'Error extracting text' });
    }
}

// searchResults("classroom of")
// extractDetails("https://novelbuddy.com/novel/classroom-of-the-elite");
// extractChapters("https://novelbuddy.com/novel/classroom-of-the-elite");
// extractText("https://novelbuddy.com/novel/classroom-of-the-elite/vol-0-chapter-0-prologue");
// extractText("https://novelbuddy.com/novel/classroom-of-the-elite/chapter-1vol-welcome-to-my-dream-like-school-life-intro");

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