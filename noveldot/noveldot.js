async function searchResults(keyword) {
    try {
        const url = "https://www.noveldot.com/novel/lnsearchlive/index.php";

        const headers = {
            "Origin": "https://www.noveldot.com",
            "Referer": "https://www.noveldot.com/",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:138.0) Gecko/20100101 Firefox/138.0",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
        };

        const response = await soraFetch(url, { method: "POST", headers, body: `inputContent=${keyword}` });
        const data = await response.json();

        if (!data.success) throw new Error("Search failed");

        const html = data.resultview;
        const results = [];

        const regex = /<a\s+title="([^"]+)"\s+href="([^"]+)">[\s\S]*?<img\s+src="([^"]+)"[^>]*>[\s\S]*?<h4 class="novel-title[^>]*">[^<]+<\/h4>/g;

        let match;
        while ((match = regex.exec(html)) !== null) {
            results.push({
                title: match[1].trim(),
                href: match[2].trim(),
                image: match[3].trim()
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

        // Extract description
        const descriptionMatch = htmlText.match(/<p class="description">([\s\S]*?)<\/p>/);
        const description = descriptionMatch ? descriptionMatch[1].trim() : 'No description available';

        // Author(s)
        const authorMatch = htmlText.match(/<div class="author">[\s\S]*?<span>Author:<\/span>([\s\S]*?)<\/div>/);
        let authors = 'Unknown';
        if (authorMatch) {
            const authorRegex = /<span itemprop="author">([^<]+)<\/span>/g;
            const authorList = [];
            let aMatch;
            while ((aMatch = authorRegex.exec(authorMatch[1])) !== null) {
                authorList.push(aMatch[1].trim());
            }
            authors = authorList.join(', ');
        }

        // Rank
        const rankMatch = htmlText.match(/<strong>RANK (\d+)<\/strong>/);
        const rank = rankMatch ? rankMatch[1] : 'Unknown';

        // Rating (from <strong> or meta content)
        const ratingMatch = htmlText.match(/<meta itemprop="ratingValue" content="([\d.]+)"/);
        const rating = ratingMatch ? ratingMatch[1] : 'Unknown';

        // Chapters
        const chaptersMatch = htmlText.match(/<i class="icon-book-open"><\/i>\s*([\d,]+)<\/strong>\s*<small>Chapters<\/small>/);
        const chapters = chaptersMatch ? chaptersMatch[1] : 'Unknown';

        // Views
        const viewsMatch = htmlText.match(/<i class="icon-eye"><\/i>\s*([\d,]+)<\/strong>\s*<small>Views<\/small>/);
        const views = viewsMatch ? viewsMatch[1] : 'Unknown';

        // Status
        const statusMatch = htmlText.match(/<strong[^>]*>(Ongoing|Completed)<\/strong>\s*<small>Status<\/small>/);
        const status = statusMatch ? statusMatch[1] : 'Unknown';

        // Genres
        const genresMatch = htmlText.match(/<div class="categories">[\s\S]*?<ul>([\s\S]*?)<\/ul>/);
        let genres = 'Unknown';
        if (genresMatch) {
            const genreRegex = /<a[^>]+title="([^"]+)"[^>]*>/g;
            const genreList = [];
            let gMatch;
            while ((gMatch = genreRegex.exec(genresMatch[1])) !== null) {
                genreList.push(gMatch[1].trim());
            }
            genres = genreList.join(', ');
        }

        const aliases = `
Author(s): ${authors}
Rank: ${rank}
Rating: ${rating}
Chapters: ${chapters}
Views: ${views}
Status: ${status}
Genres: ${genres}
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
        const response = await soraFetch(url + "/chapters");
        const htmlText = await response.text();

        // Get number of chapter pages
        const chaptersMatch = htmlText.match(/<li class="PagedList-skipToLast"><a href="\?page=(\d+)&chorder=desc">&gt;&gt;<\/a><\/li>/);
        const chaptersNumber = chaptersMatch ? parseInt(chaptersMatch[1]) : 1;

        const chapters = [];

        for (let i = 1; i <= chaptersNumber; i++) {
            const response2 = await soraFetch(`${url}/chapters?page=${i}&chorder=asc`);
            const htmlText2 = await response2.text();

            // Regex to extract data-chapterno and href from each <li> block
            const regex = /<li[^>]+data-chapterno="(\d+)"[^>]*>[\s\S]*?<a href="([^"]+)"[^>]*>/g;

            let match;
            while ((match = regex.exec(htmlText2)) !== null) {
                chapters.push({
                    href: match[2],
                    number: parseInt(match[1]),
                    title: `Chapter ${match[1]}`
                });
            }
        }

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

        // Extract chapter title from <span class="chapter-title">
        const titleMatch = htmlText.match(/<span class="chapter-title">([\s\S]*?)<\/span>/);
        const chapterTitle = titleMatch ? `<p>${titleMatch[1].trim()}</p>\n` : '';

        // Extract all <p> content inside #chapter-container
        const contentMatch = htmlText.match(/<div id="chapter-container"[^>]*>([\s\S]*?)<\/div>/);
        if (!contentMatch) {
            throw new Error("Chapter container not found");
        }

        let content = contentMatch[1];

        // Remove unwanted notification boxes if they appear (optional line)
        content = content.replace(/<p class="box-notification fs-17">[\s\S]*?<\/p>\s*/g, '');

        // Extract only <p> tags
        const pTags = content.match(/<p>[\s\S]*?<\/p>/g);
        const cleanedParagraphs = pTags ? pTags.join('\n') : '';

        const finalContent = (chapterTitle + cleanedParagraphs).trim();

        console.log(decodeHTMLEntities(finalContent));
        return decodeHTMLEntities(finalContent);
    } catch (error) {
        console.log("Fetch error in extractText: " + error);
        return JSON.stringify({ text: 'Error extracting text' });
    }
}

// searchResults("classroom of the elite");
// extractDetails("https://www.noveldot.com/book-16808/Classroom-of-the-Elite-(LN)");
// extractChapters("https://www.noveldot.com/book-16808/Classroom-of-the-Elite-(LN)");
// extractText("https://www.noveldot.com/novel-16808-227546/Classroom-of-the-Elite-(LN)/chapter-1");

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

function decodeHTMLEntities(str) {
    const entities = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&apos;': "'",
        '&nbsp;': ' ',
        '&rsquo;': '’',
        '&lsquo;': '‘',
        '&rdquo;': '”',
        '&ldquo;': '“',
        '&hellip;': '…',
        '&mdash;': '—',
        '&ndash;': '–',
        '&eacute;': 'é',
        '&oacute;': 'ó',
        '&aacute;': 'á',
        '&iacute;': 'í',
        '&uacute;': 'ú',
        '&ntilde;': 'ñ',
        '&copy;': '©',
        '&reg;': '®',
        '&euro;': '€',
        '&yen;': '¥',
        '&pound;': '£'
        // Add more if needed
    };

    return str.replace(/&[a-zA-Z]+?;/g, match => entities[match] || match);
}
