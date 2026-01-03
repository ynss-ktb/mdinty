/***********************
 * Weather (MDINTY)
 * - City selector Rabat/Salé/Temara
 * - 5 or 7 day forecast
 * - No API key (Open-Meteo)
 ***********************/

const CITY_LABEL = {
  "Rabat": "الرباط",
  "Salé": "سلا",
  "Temara": "تمارة"
};

// state
let city = localStorage.getItem("weatherCity") || "Rabat";
let days = Number(localStorage.getItem("weatherDays") || "5");

// DOM
const cityPill = document.getElementById("cityPill");
const updatedAt = document.getElementById("updatedAt");
const todayTitle = document.getElementById("todayTitle");
const todayDesc = document.getElementById("todayDesc");
const todayTemp = document.getElementById("todayTemp");
const forecastList = document.getElementById("forecastList");
const statusEl = document.getElementById("status");
const refreshBtn = document.getElementById("refreshBtn");

const cityButtons = document.querySelectorAll(".city-btn");
const daysButtons = document.querySelectorAll(".days-btn");

function setStatus(msg){ statusEl.textContent = msg; }

function pad(n){ return String(n).padStart(2,"0"); }

function nowStamp(){
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dayNameArabic(dateStr){
  const d = new Date(dateStr + "T00:00:00");
  const names = ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
  return names[d.getDay()];
}

// Open-Meteo weathercode to Arabic short text
function codeToText(code){
  const map = {
    0: "صافي",
    1: "غالباً صافي",
    2: "غائم جزئياً",
    3: "غائم",
    45: "ضباب",
    48: "ضباب كثيف",
    51: "رذاذ خفيف",
    53: "رذاذ متوسط",
    55: "رذاذ قوي",
    61: "مطر خفيف",
    63: "مطر متوسط",
    65: "مطر قوي",
    71: "ثلج خفيف",
    73: "ثلج متوسط",
    75: "ثلج قوي",
    80: "زخات خفيفة",
    81: "زخات متوسطة",
    82: "زخات قوية",
    95: "عاصفة رعدية"
  };
  return map[code] || "طقس متغيّر";
}

async function geocodeCity(cityName){
  // Geocoding via Open-Meteo
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=fr&format=json`;
  const res = await fetch(url);
  const json = await res.json();
  const item = json?.results?.[0];
  if(!item) throw new Error("No geocode result");
  return { lat: item.latitude, lon: item.longitude };
}

async function fetchForecast(lat, lon){
  // Daily forecast (max/min temp + weathercode)
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min` +
    `&current_weather=true&timezone=Africa%2FCasablanca`;
  const res = await fetch(url);
  const json = await res.json();
  return json;
}

function renderUI(data){
  // Top
  cityPill.textContent = CITY_LABEL[city] || city;
  updatedAt.textContent = `آخر تحديث: ${nowStamp()}`;

  // Today summary
  const current = data.current_weather;
  if(current){
    todayTemp.textContent = `${Math.round(current.temperature)}°`;
    todayTitle.textContent = `الآن: ${codeToText(current.weathercode)}`;
    todayDesc.textContent = `الرياح: ${Math.round(current.windspeed)} كم/س`;
  } else {
    todayTemp.textContent = `--°`;
    todayTitle.textContent = `تعذر جلب الحالة الحالية`;
    todayDesc.textContent = ``;
  }

  // Forecast list
  const d = data.daily;
  const time = d.time || [];
  const maxT = d.temperature_2m_max || [];
  const minT = d.temperature_2m_min || [];
  const code = d.weathercode || [];

  forecastList.innerHTML = "";

  const count = Math.min(days, time.length);
  for(let i=0; i<count; i++){
    const row = document.createElement("div");
    row.className = "day-row";

    const name = dayNameArabic(time[i]);
    const desc = codeToText(code[i]);
    const tmax = Math.round(maxT[i]);
    const tmin = Math.round(minT[i]);

    row.innerHTML = `
      <div>
        <div class="day-name">${name}</div>
        <div class="day-meta">${time[i]} • ${desc}</div>
      </div>
      <div class="day-right">
        <div class="day-temp">${tmax}° / ${tmin}°</div>
      </div>
    `;
    forecastList.appendChild(row);
  }
}

async function loadWeather(){
  try{
    setStatus("جاري تحميل الطقس...");
    const { lat, lon } = await geocodeCity(city);
    const data = await fetchForecast(lat, lon);
    renderUI(data);
    setStatus("تم تحديث الطقس.");
  } catch (e){
    setStatus("وقع خطأ أثناء تحميل الطقس.");
  }
}

// city buttons
cityButtons.forEach(btn => {
  btn.classList.toggle("active", btn.dataset.city === city);
  btn.addEventListener("click", () => {
    cityButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    city = btn.dataset.city;
    localStorage.setItem("weatherCity", city);
    loadWeather();
  });
});

// days buttons
daysButtons.forEach(btn => {
  btn.classList.toggle("active", Number(btn.dataset.days) === days);
  btn.addEventListener("click", () => {
    daysButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    days = Number(btn.dataset.days);
    localStorage.setItem("weatherDays", String(days));
    loadWeather();
  });
});

// refresh
refreshBtn.addEventListener("click", loadWeather);

// boot
loadWeather();
// auto refresh كل ساعة
setInterval(loadWeather, 60 * 60 * 1000);
