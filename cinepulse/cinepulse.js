async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await soraFetch(`https://api.cinepulse.to/content/advanced-search?query=${encodedKeyword}&sortBy=pertinence`);
        const data = await responseText.json();

        const transformedResults = data.data.items.medias.movies.map(result => {
            return {
                title: result.title,
                image: result.posterPath,
                href: `https://cinepulse.to/watch/${result.tmdbId}`
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
        const match = url.match(/cinepulse\.to\/watch\/([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");

        const movieId = match[1];
        const responseText = await soraFetch(`https://api.cinepulse.to/sheet/details?type=movie&tmdbId=${movieId}`);
        const data = await responseText.json();

        const description = data.data.items.overview || 'No description available';

        const genres = data.data.items.genres.map(genre => genre.label).join(", ");

        const durationInMinutes = data.data.items.duration ? data.data.items.duration / 60 : 'Unknown';
        const duration = data.data.items.duration ? durationInMinutes + " minutes" : 'Unknown';

        const rating = data.data.items.tmdbRating ? data.data.items.tmdbRating : 'Unknown';

        const date = new Date(data.data.items.releasedAt);
        const formatted = `${date.getUTCDate()}.${date.getUTCMonth() + 1}.${date.getUTCFullYear()}`;
        const releasedAt = data.data.items.releasedAt ? formatted : 'Unknown';

        const transformedResults = [{
            description: description,
            aliases: `Duration: ${duration}\nGenres: ${genres}\nRating: ${rating}`,
            airdate: `Released: ${releasedAt}`
        }];

        console.log(transformedResults);
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
        const match = url.match(/cinepulse\.to\/watch\/([^\/]+)/);
        if (!match) throw new Error("Invalid URL format");

        const movieId = match[1];
        
        const movie = [
            { href: `https://cinepulse.to/watch/${movieId}`, number: 1, title: "Full Movie" }
        ];

        console.log(movie);
        return JSON.stringify(movie);
    } catch (error) {
        console.log('Fetch error in extractEpisodes:', error);
        return JSON.stringify([]);
    }    
}

async function extractStreamUrl(url) {
    try {
        if (url.includes('watch')) {
            const match = url.match(/https:\/\/cinepulse\.to\/watch\/([^\/]+)/);
            
            if (!match) throw new Error("Invalid URL format");
            
            const movieId = match[1];

            const apiUrl = generateCinePulseUrl(movieId, 'movie');

            const responseText = await soraFetch(apiUrl);
            const data = await responseText.json();

            const streams = data.data.items
            .filter(item => item.url.includes('mp4') || item.url.includes('m3u8') || item.url.includes('hls'))
            .map(item => ({
                title: item.label || "Stream",
                streamUrl: item.url,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0",
                    "Origin": "https://cinepulse.to",
                    "Referer": "https://cinepulse.to/"
                }
            }));

            const result = {
                streams,
                subtitles: ""
            };

            console.log(result);
            return JSON.stringify(result);
        } else {
            throw new Error("Invalid URL format");
        }
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

// searchResults("flash");
// extractDetails("https://cinepulse.to/watch/298618");
// extractEpisodes("https://cinepulse.to/watch/298618");
// extractStreamUrl("https://cinepulse.to/watch/157336");

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

// Helper Functions

/**
 * @name CinePulseExtractor
 * @description This module provides functions to obfuscate parameters for the CinePulse API.
 * @version 1.0.0
 * @license MIT 
 * @requires btoa
 * @requires atob
 * @author paul
 */

function generateRandomKey(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }
  
  function encodeNumericString(str) {
    return str.split('').map(char => {
      if (/\d/.test(char)) {
        return String.fromCharCode(48 + parseInt(char));
      }
      return char;
    }).join('');
  }
  
  function encodeValue(keyPrefix, value) {
    const str = String(value);
  
    if (keyPrefix === 'exp') {
      const timestamp = str.split('').map(char => {
        if (/\d/.test(char)) {
          return String.fromCharCode(48 + parseInt(char));
        }
        return char;
      }).join('');
      return `x${btoa(timestamp)}`;
    }
  
    if (keyPrefix === 'id') {
      let encoded = '';
      for (let i = 0; i < str.length; i++) {
        const char = str.charAt(i);
        if (/\d/.test(char)) {
          encoded += ((parseInt(char, 10) + 7) % 10).toString();
        } else {
          encoded += char;
        }
      }
      return `c${btoa(encoded)}`;
    }
  
    if (keyPrefix === 'type') {
      let encoded = '';
      const key = 'k';
      for (let i = 0; i < str.length; i++) {
        encoded += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(0));
      }
      return `t${btoa(encoded)}`;
    }
  
    if (keyPrefix === 'season') {
      const num = parseInt(str, 10);
      const added = String(num + 5);
      let encoded = '';
      for (let i = 0; i < added.length; i++) {
        const char = added.charAt(i);
        encoded += ((parseInt(char, 10) + 3) % 10).toString();
      }
      return `s${encoded}`;
    }
  
    if (keyPrefix === 'episode') {
      const num = parseInt(str, 10);
      const hex = num.toString(16);
      let encoded = '';
      for (let i = 0; i < hex.length; i++) {
        encoded += ((parseInt(hex.charAt(i), 16) + 7) % 16).toString(16);
      }
      return `x${btoa(encoded)}`;
    }
  
    return `d${btoa(str)}`;
  }
  
  function obfuscateParams(input) {
    const obfuscated = {};
  
    const salt = Date.now() + 60000;
    obfuscated[generateRandomKey()] = encodeValue('exp', salt);
  
    if (input.tmdbId) {
      obfuscated[generateRandomKey()] = encodeValue('id', input.tmdbId);
    }
  
    if (input.type) {
      obfuscated[generateRandomKey()] = encodeValue('type', input.type);
    }
  
    if (input.season !== undefined) {
      obfuscated[generateRandomKey()] = encodeValue('season', input.season);
    }
  
    if (input.episode !== undefined) {
      obfuscated[generateRandomKey()] = encodeValue('episode', input.episode);
    }
  
    const noiseChars = ["p", "z", "w", "h", "q"];
    const noiseCount = 15; 
  
    for (let i = 0; i < noiseCount; i++) {
      const noiseKey = generateRandomKey();
      const noiseValPrefix = noiseChars[Math.floor(Math.random() * noiseChars.length)];
      const randomLength = 8 + Math.floor(Math.random() * 5);
      const randomStr = generateRandomKey(randomLength);
      const noiseData = btoa(randomStr);
      obfuscated[noiseKey] = `${noiseValPrefix}${noiseData}`;
    }
  
    return obfuscated;
  }
  
  function encodeQueryParams(params) {
    const query = [];
    for (const key in params) {
      if (params.hasOwnProperty(key)) {
        const encodedKey = encodeURIComponent(key);
        const encodedValue = encodeURIComponent(params[key]);
        query.push(`${encodedKey}=${encodedValue}`);
      }
    }
    return query.join('&');
  }
  
  function buildObfuscatedUrl(baseUrl, params) {
    const obfuscated = obfuscateParams(params);
    const queryString = encodeQueryParams(obfuscated);
    return `${baseUrl}?${queryString}`;
  }
  
  
  function buildParams({ tmdbId, type, season, episode }) {
    const params = { tmdbId, type };
    if (type === "tv" && season !== undefined) params.season = season;
    if (type === "tv" && episode !== undefined) params.episode = episode;
    return params;
  }
  
  function generateCinePulseUrl(tmdbId, type, season, episode) {
    const cleanParams = buildParams({ tmdbId, type, season, episode });
    const baseUrl = "https://api.cinepulse.to/watch/sources";
    return buildObfuscatedUrl(baseUrl, cleanParams);
  }
  
  // Example usage
  // TV shows don't work for now, only movies
//   console.log(generateCinePulseUrl(157336, 'movie'));  