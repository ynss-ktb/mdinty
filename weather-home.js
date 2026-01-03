/***********************
 * Weather card (Index) - Robust
 ***********************/
document.addEventListener("DOMContentLoaded", () => {
  const city = localStorage.getItem("weatherCity") || "Rabat";

  const elDay   = document.getElementById("weatherDay");
  const elTemp  = document.getElementById("weatherTemp");
  const elDesc  = document.getElementById("weatherDesc");
  const elIcon  = document.getElementById("weatherIcon");
  const elStats = document.getElementById("weatherStats");

  // إذا شي ID ناقص، غادي نوقف ونقولك فين المشكل
  const missing = [];
  if(!elDay)   missing.push("weatherDay");
  if(!elTemp)  missing.push("weatherTemp");
  if(!elDesc)  missing.push("weatherDesc");
  if(!elIcon)  missing.push("weatherIcon");
  if(!elStats) missing.push("weatherStats");

  if(missing.length){
    console.error("Missing elements in index.html:", missing);
    return;
  }

  function dayNameArabic(dateObj){
    const names = ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
    return names[dateObj.getDay()];
  }

  function codeToText(code){
    const map = {
      0:"صافي",1:"غالباً صافي",2:"غائم جزئياً",3:"غائم",
      45:"ضباب",48:"ضباب كثيف",
      51:"رذاذ خفيف",53:"رذاذ متوسط",55:"رذاذ قوي",
      61:"مطر خفيف",63:"مطر متوسط",65:"مطر قوي",
      80:"زخات خفيفة",81:"زخات متوسطة",82:"زخات قوية",
      95:"عاصفة رعدية"
    };
    return map[code] || "طقس متغيّر";
  }

  function codeToIcon(code){
    if (code === 0) return "☀️";
    if (code === 1) return "🌤️";
    if (code === 2) return "⛅";
    if (code === 3) return "☁️";
    if (code === 45 || code === 48) return "🌫️";
    if ([51,53,55].includes(code)) return "🌦️";
    if ([61,63,65,80,81,82].includes(code)) return "🌧️";
    if ([71,73,75].includes(code)) return "❄️";
    if (code === 95) return "⛈️";
    return "🌤️";
  }

  async function geocodeCity(name){
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=fr&format=json`;
    const res = await fetch(url);
    const json = await res.json();
    const item = json?.results?.[0];
    if(!item) throw new Error("No geocode result for city: " + name);
    return { lat: item.latitude, lon: item.longitude };
  }

  async function fetchToday(lat, lon){
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current_weather=true` +
      `&hourly=relative_humidity_2m,precipitation_probability,precipitation` +
      `&timezone=Africa%2FCasablanca`;
    const res = await fetch(url);
    return await res.json();
  }

  function pickCurrentHourlyIndex(times){
    const now = new Date();
    let best = 0, bestDiff = Infinity;
    for(let i=0;i<times.length;i++){
      const t = new Date(times[i]);
      const diff = Math.abs(t - now);
      if(diff < bestDiff){ bestDiff = diff; best = i; }
    }
    return best;
  }

  async function loadWeatherCard(){
    try{
      elDesc.textContent = "جاري تحميل الطقس...";
      elTemp.textContent = "--°";
      elIcon.textContent = "⛅";
      elStats.innerHTML = `<span>💨 رياح: --</span><span>🌧️ مطر: --</span><span>💧 رطوبة: --</span>`;

      const { lat, lon } = await geocodeCity(city);
      const data = await fetchToday(lat, lon);

      elDay.textContent = dayNameArabic(new Date());

      const cw = data.current_weather;
      if(!cw) throw new Error("No current_weather in response");

      elTemp.textContent = `${Math.round(cw.temperature)}°`;
      elIcon.textContent = codeToIcon(cw.weathercode);
      elDesc.textContent = codeToText(cw.weathercode);

      const h = data.hourly;
      let humidity = null, rainProb = null;
      if(h?.time?.length){
        const idx = pickCurrentHourlyIndex(h.time);
        humidity = h.relative_humidity_2m?.[idx] ?? null;
        rainProb = h.precipitation_probability?.[idx] ?? null;
      }

      elStats.innerHTML = `
        <span>💨 رياح: ${Math.round(cw.windspeed)} كم/س</span>
        <span>🌧️ مطر: ${rainProb !== null ? rainProb + "%" : "--"}</span>
        <span>💧 رطوبة: ${humidity !== null ? humidity + "%" : "--"}</span>
      `;

      console.log("Weather card updated for:", city, lat, lon, cw);
    } catch (e){
      console.error("Weather card error:", e);
      elDesc.textContent = "ما قدرناش نحدّثو الطقس دابا.";
    }
  }

  loadWeatherCard();
  setInterval(loadWeatherCard, 30 * 60 * 1000);
});
