const app = require('./app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// --- Self-ping to prevent Render sleep ---
const http = require('http');
const https = require('https');

const PING_URLS = [
  'https://google.com',
  'http://1.1.1.1',
  'https://example.com',
  'https://cloudflare.com',
  'https://bing.com'
];

function randomPingInterval() {
  // 5 to 10 minutes in milliseconds
  return (5 + Math.random() * 5) * 60 * 1000;
}

function pingRandomSite() {
  const url = PING_URLS[Math.floor(Math.random() * PING_URLS.length)];
  const client = url.startsWith('https') ? https : http;
  client.get(url, (res) => {
    console.log(`Pinged ${url}: ${res.statusCode}`);
  }).on('error', (e) => {
    console.error(`Ping error for ${url}: ${e.message}`);
  });
  setTimeout(pingRandomSite, randomPingInterval());
}

setTimeout(pingRandomSite, randomPingInterval());
