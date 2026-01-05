// news.js — robust per-feed loading + https jina proxy

const FEEDS = [
  "https://www.hespress.com/feed/",

  // Google News RSS (محلي) — ممكن واحد/جوج فالبداية، من بعد زيد الباقي
  "https://news.google.com/rss/search?q=Rabat&hl=fr&gl=MA&ceid=MA:fr",
  "https://news.google.com/rss/search?q=Sal%C3%A9&hl=fr&gl=MA&ceid=MA:fr",
  "https://news.google.com/rss/search?q=T%C3%A9mara&hl=fr&gl=MA&ceid=MA:fr",
];

const CITY_KEYWORDS = [
  "الرباط","رباط","سلا","تمارة",
  "rabat","sale","salé","temara","témara",
  "rabat-salé-kénitra","rabat sale kenitra","جهة الرباط سلا القنيطرة"
];

const MAX_ITEMS = 5;

const listEl = document.getElementById("newsList");
const statusEl = document.getElementById("newsStatus");

function normalizeText(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matchesCities(text) {
  const t = normalizeText(text);
  return CITY_KEYWORDS.some(k => t.includes(normalizeText(k)));
}

/** Build proxy urls (try multiple) */
function proxyUrls(url) {
  const enc = encodeURIComponent(url);
  const isHttps = url.startsWith("https://");
  const jina = isHttps
    ? `https://r.jina.ai/https://${url.replace(/^https?:\/\//, "")}`
    : `https://r.jina.ai/http://${url.replace(/^https?:\/\//, "")}`;

  return [
    `https://api.allorigins.win/raw?url=${enc}`,
    `https://corsproxy.io/?${enc}`,
    `https://thingproxy.freeboard.io/fetch/${url}`,
    jina, // ✅ مهم: دابا كيدعم https
  ];
}

/** fetch with timeout */
async function fetchText(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

/** Try proxies one by one */
async function fetchRssThroughProxies(feedUrl) {
  const candidates = proxyUrls(feedUrl);
  let lastErr = null;

  for (const u of candidates) {
    try {
      const txt = await fetchText(u);
      // Quick sanity: contains rss/feed marker
      if (txt.includes("<rss") || txt.includes("<feed") || txt.includes("<item")) return txt;
      // still return to allow parsing attempt
      return txt;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("All proxies failed");
}

function parseRss(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml");
  const items = Array.from(doc.querySelectorAll("item"));

  return items.map(item => {
    const title = item.querySelector("title")?.textContent?.trim() || "";
    const link = item.querySelector("link")?.textContent?.trim() || "";
    const pubDate = item.querySelector("pubDate")?.textContent?.trim() || "";

    const description = item.querySelector("description")?.textContent?.trim() || "";
    const contentNode = Array.from(item.childNodes).find(n => n.nodeName?.toLowerCase() === "content:encoded");
    const content = contentNode?.textContent?.trim() || "";

    const haystack = `${title} ${description} ${content}`;
    return { title, link, pubDate, haystack };
  });
}

function render(items) {
  listEl.innerHTML = "";

  if (!items.length) {
    listEl.innerHTML = `<li>ما كايناش أخبار حالياً.</li>`;
    return;
  }

  items.slice(0, MAX_ITEMS).forEach(it => {
    const li = document.createElement("li");
    li.innerHTML = `<a href="${it.link}" target="_blank" rel="noopener">${it.title}</a>`;
    listEl.appendChild(li);
  });
}

async function loadNews() {
  statusEl.textContent = "جاري تحميل الأخبار...";
  listEl.innerHTML = "";

  let all = [];
  let failed = 0;

  for (const feedUrl of FEEDS) {
    try {
      const xml = await fetchRssThroughProxies(feedUrl);
      const items = parseRss(xml);
      all = all.concat(items);
    } catch (e) {
      console.warn("Feed failed:", feedUrl, e);
      failed++;
      // ✅ ما نطيحوش التطبيق بسبب مصدر واحد
    }
  }

  // إذا فشل كلشي
  if (!all.length) {
    statusEl.textContent = "تعذر تحميل RSS (Proxy/CORS).";
    listEl.innerHTML = `<li>جرّب حدّث الصفحة أو جرّب شبكة أخرى.</li>`;
    return;
  }

  // Deduplicate by link
  const unique = [];
  const seen = new Set();
  for (const it of all) {
    if (!it.link || seen.has(it.link)) continue;
    seen.add(it.link);
    unique.push(it);
  }

  // Filter by city keywords
  const local = unique.filter(it => matchesCities(it.haystack));

  statusEl.textContent = local.length
    ? `أخبار الرباط/سلا/تمارة (${local.length})`
    : `ما لقيتش محلي بزاف — كنوري آخر الأخبار. (مصادر فاشلة: ${failed})`;

  render(local.length ? local : unique);
}

loadNews();
