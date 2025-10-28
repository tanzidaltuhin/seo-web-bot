const tg = window.Telegram.WebApp;
tg.ready();
let auditData = {};

async function runFullAudit() {
  const url = document.getElementById('url').value.trim();
  if (!url) return alert("URL দিন!");
  const fullUrl = url.startsWith('http') ? url : 'https://' + url;

  document.getElementById('result-technical').innerHTML = "চলছে...";
  document.getElementById('result-onpage').innerHTML = "";
  document.getElementById('result-offpage').innerHTML = "";
  document.getElementById('result-ux').innerHTML = "";
  document.getElementById('downloadBtn').style.display = 'none';

  auditData = { url: fullUrl };

  try {
    // Technical
    await Promise.all([
      checkIndexing(fullUrl),
      checkSitemap(fullUrl),
      checkRobots(fullUrl),
      checkHTTPS(fullUrl),
      checkPageSpeed(fullUrl)
    ]);

    // On-Page
    await Promise.all([
      checkMetaTags(fullUrl),
      checkHeadings(fullUrl),
      checkImageAlt(fullUrl),
      checkKeywordDensity(fullUrl, "seo")
    ]);

    // Off-Page
    await checkBacklinks(url);

    // UX
    await checkMobileFriendly(fullUrl);

    document.getElementById('downloadBtn').style.display = 'block';
  } catch (e) {
    alert("Error: " + e.message);
  }
}

async function checkIndexing(url) {
  const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent('https://www.google.com/search?q=site:' + url)}`);
  const data = await res.json();
  const match = data.contents.match(/About ([\d,]+) results/);
  const count = match ? match[1] : 'N/A';
  document.getElementById('result-technical').innerHTML += `<p><b>Indexed Pages:</b> ~${count}</p>`;
  auditData.indexed = count;
}

async function checkSitemap(url) {
  const sitemap = `${url}/sitemap.xml`;
  const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(sitemap)}`);
  const valid = res.ok && res.headers.get('content-type').includes('xml');
  document.getElementById('result-technical').innerHTML += `<p><b>Sitemap:</b> ${valid ? 'Found' : 'Missing'}</p>`;
}

async function checkRobots(url) {
  const robots = `${url}/robots.txt`;
  const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(robots)}`);
  const valid = res.ok;
  document.getElementById('result-technical').innerHTML += `<p><b>robots.txt:</b> ${valid ? 'Found' : 'Missing'}</p>`;
}

function checkHTTPS(url) {
  const secure = url.startsWith('https://');
  document.getElementById('result-technical').innerHTML += `<p><b>HTTPS:</b> ${secure ? 'Yes' : 'No'}</p>`;
}

async function checkPageSpeed(url) {
  const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${url}&key=AIzaSyADcu8EMFShaERnLXi3E9lXAdhOZcUr-nY`);
  const data = await res.json();
  const score = data.lighthouseResult.categories.performance.score * 100;
  document.getElementById('result-ux').innerHTML += `<p><b>Speed Score:</b> ${score.toFixed(0)}/100</p>`;
  auditData.speed = score;
}

async function checkMetaTags(url) {
  const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
  const data = await res.json();
  const parser = new DOMParser();
  const doc = parser.parseFromString(data.contents, 'text/html');
  const title = doc.querySelector('title')?.textContent || 'N/A';
  const desc = doc.querySelector('meta[name="description"]')?.content || 'N/A';
  document.getElementById('result-onpage').innerHTML += `<p><b>Title:</b> ${title.substring(0,60)}...</p><p><b>Meta Desc:</b> ${desc.substring(0,160)}...</p>`;
}

async function checkHeadings(url) {
  const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
  const data = await res.json();
  const parser = new DOMParser();
  const doc = parser.parseFromString(data.contents, 'text/html');
  const h1 = doc.querySelectorAll('h1').length;
  document.getElementById('result-onpage').innerHTML += `<p><b>H1 Tags:</b> ${h1}</p>`;
}

async function checkImageAlt(url) {
  const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
  const data = await res.json();
  const parser = new DOMParser();
  const doc = parser.parseFromString(data.contents, 'text/html');
  const images = doc.querySelectorAll('img');
  const missing = Array.from(images).filter(img => !img.alt).length;
  document.getElementById('result-onpage').innerHTML += `<p><b>Missing Alt Text:</b> ${missing} images</p>`;
}

async function checkKeywordDensity(url, keyword) {
  const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
  const data = await res.json();
  const text = data.contents.toLowerCase();
  const words = text.split(/\s+/);
  const count = words.filter(w => w.includes(keyword.toLowerCase())).length;
  const density = ((count / words.length) * 100).toFixed(2);
  document.getElementById('result-onpage').innerHTML += `<p><b>Keyword "${keyword}" Density:</b> ${density}%</p>`;
}

async function checkBacklinks(domain) {
  const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent('https://www.google.com/search?q=link:' + domain)}`);
  const data = await res.json();
  const match = data.contents.match(/About ([\d,]+) results/);
  const count = match ? match[1] : 'N/A';
  document.getElementById('result-offpage').innerHTML += `<p><b>Backlinks (approx):</b> ~${count}</p>`;
}

async function checkMobileFriendly(url) {
  const res = await fetch(`https://searchconsole.googleapis.com/v1/urlTestingTools/mobileFriendlyTest:run?key=AIzaSyADcu8EMFShaERnLXi3E9lXAdhOZcUr-nY`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  const data = await res.json();
  const status = data.mobileFriendliness || 'Unknown';
  document.getElementById('result-ux').innerHTML += `<p><b>Mobile Friendly:</b> ${status}</p>`;
}

function openTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
  document.getElementById(tabName).style.display = 'block';
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
}

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