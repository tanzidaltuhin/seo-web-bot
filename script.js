const tg = window.Telegram.WebApp;
tg.ready();
let auditData = {};

async function runFullAudit() {
  const urlInput = document.getElementById('url').value.trim();
  if (!urlInput) return alert("URL দিন!");
  const fullUrl = urlInput.startsWith('http') ? urlInput : 'https://' + urlInput;

  // Clear previous results
  document.getElementById('result-technical').innerHTML = "চলছে...";
  document.getElementById('result-onpage').innerHTML = "";
  document.getElementById('result-offpage').innerHTML = "";
  document.getElementById('result-ux').innerHTML = "";
  document.getElementById('downloadBtn').style.display = 'none';

  auditData = { url: fullUrl };

  try {
    // === Technical SEO ===
    await checkIndexing(fullUrl);
    await checkSitemap(fullUrl);
    await checkRobots(fullUrl);
    checkHTTPS(fullUrl);
    await checkBrokenLinks(fullUrl);

    // === On-Page SEO ===
    await checkMetaTags(fullUrl);
    await checkHeadings(fullUrl);
    await checkImageAlt(fullUrl);
    await checkKeywordDensity(fullUrl, "seo");
    await checkContentQuality(fullUrl);

    // === Off-Page SEO ===
    await checkBacklinks(urlInput);
    await checkDomainAuthority(urlInput);

    // === UX & Performance ===
    await checkPageSpeed(fullUrl);
    await checkMobileFriendly(fullUrl);
    await checkCoreWebVitals(fullUrl);

    document.getElementById('downloadBtn').style.display = 'block';
  } catch (e) {
    alert("Error: " + e.message);
  }
}

// === Technical ===
async function checkIndexing(url) {
  const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent('https://www.google.com/search?q=site:' + url)}`);
  const data = await res.json();
  const match = data.contents.match(/About ([\d,]+) results/);
  const count = match ? match[1] : 'N/A';
  addResult('technical', `Indexed Pages`, `~${count}`);
  auditData.indexed = count;
}

async function checkSitemap(url) {
  const sitemap = `${url}/sitemap.xml`;
  const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(sitemap)}`);
  const valid = res.ok;
  addResult('technical', `Sitemap`, valid ? 'Found' : 'Missing');
}

async function checkRobots(url) {
  const robots = `${url}/robots.txt`;
  const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(robots)}`);
  const valid = res.ok;
  addResult('technical', `robots.txt`, valid ? 'Found' : 'Missing');
}

function checkHTTPS(url) {
  const secure = url.startsWith('https://');
  addResult('technical', `HTTPS`, secure ? 'Yes' : 'No');
}

async function checkBrokenLinks(url) {
  const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
  const data = await res.json();
  const parser = new DOMParser();
  const doc = parser.parseFromString(data.contents, 'text/html');
  const links = Array.from(doc.querySelectorAll('a[href]')).map(a => a.href);
  let broken = 0;
  for (let link of links.slice(0, 5)) {
    try {
      const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(link)}`);
      if (!r.ok) broken++;
    } catch { broken++; }
  }
  addResult('technical', `Broken Links (sample)`, broken > 0 ? `${broken} found` : 'None');
}

// === On-Page ===
async function checkMetaTags(url) {
  const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
  const data = await res.json();
  const parser = new DOMParser();
  const doc = parser.parseFromString(data.contents, 'text/html');
  const title = doc.querySelector('title')?.textContent || 'N/A';
  const desc = doc.querySelector('meta[name="description"]')?.content || 'N/A';
  addResult('onpage', `Title`, title.substring(0,60) + (title.length > 60 ? '...' : ''));
  addResult('onpage', `Meta Description`, desc.substring(0,160) + (desc.length > 160 ? '...' : ''));
}

async function checkHeadings(url) {
  const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
  const data = await res.json();
  const parser = new DOMParser();
  const doc = parser.parseFromString(data.contents, 'text/html');
  const h1 = doc.querySelectorAll('h1').length;
  const h2 = doc.querySelectorAll('h2').length;
  addResult('onpage', `H1 Tags`, h1);
  addResult('onpage', `H2 Tags`, h2);
}

async function checkImageAlt(url) {
  const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
  const data = await res.json();
  const parser = new DOMParser();
  const doc = parser.parseFromString(data.contents, 'text/html');
  const images = doc.querySelectorAll('img');
  const missing = Array.from(images).filter(img => !img.alt || img.alt.trim() === '').length;
  addResult('onpage', `Missing Alt Text`, `${missing} images`);
}

async function checkKeywordDensity(url, keyword) {
  const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
  const data = await res.json();
  const text = data.contents.toLowerCase().replace(/<[^>]*>/g, '');
  const words = text.split(/\s+/).filter(w => w.length > 2);
  const count = words.filter(w => w.includes(keyword.toLowerCase())).length;
  const density = words.length > 0 ? ((count / words.length) * 100).toFixed(2) : '0';
  addResult('onpage', `Keyword "${keyword}" Density`, `${density}%`);
}

async function checkContentQuality(url) {
  const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
  const data = await res.json();
  const text = data.contents.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = text.split(' ').length;
  addResult('onpage', `Word Count`, wordCount);
}

// === Off-Page ===
async function checkBacklinks(domain) {
  const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent('https://www.google.com/search?q=link:' + domain)}`);
  const data = await res.json();
  const match = data.contents.match(/About ([\d,]+) results/);
  const count = match ? match[1] : 'N/A';
  addResult('offpage', `Backlinks (Google)`, `~${count}`);
}

async function checkDomainAuthority(domain) {
  addResult('offpage', `Domain Authority`, `Free API needed (Moz)`);
}

// === UX & Performance ===
async function checkPageSpeed(url) {
  const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${url}&key=AIzaSyADcu8EMFShaERnLXi3E9lXAdhOZcUr-nY`);
  const data = await res.json();
  const score = data.lighthouseResult.categories.performance.score * 100;
  addResult('ux', `Performance Score`, `${score.toFixed(0)}/100`);
  auditData.speed = score;
}

async function checkMobileFriendly(url) {
  const res = await fetch(`https://searchconsole.googleapis.com/v1/urlTestingTools/mobileFriendlyTest:run?key=AIzaSyADcu8EMFShaERnLXi3E9lXAdhOZcUr-nY`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  const data = await res.json();
  const status = data.mobileFriendliness || 'Unknown';
  addResult('ux', `Mobile Friendly`, status);
}

async function checkCoreWebVitals(url) {
  const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${url}&key=AIzaSyADcu8EMFShaERnLXi3E9lXAdhOZcUr-nY`);
  const data = await res.json();
  const lcp = data.lighthouseResult.audits['largest-contentful-paint'].displayValue;
  addResult('ux', `LCP`, lcp);
}

// === Helper ===
function addResult(tab, label, value) {
  const container = document.getElementById(`result-${tab}`);
  container.innerHTML += `<p><b>${label}:</b> ${value}</p>`;
}

// === Tab System (Fixed!) ===
function openTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
  document.getElementById(tabName).style.display = 'block';
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
}

// === PDF Download ===
function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("SEO Audit Report", 105, 20, { align: 'center' });
  doc.setFontSize(12);
  let y = 40;
  for (const [key, value] of Object.entries(auditData)) {
    doc.text(`${key}: ${value}`, 20, y);
    y += 10;
  }
  doc.save("seo-audit-report.pdf");
}
