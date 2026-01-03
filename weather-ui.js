const statusEl = document.getElementById("weatherStatus");
const iconEl = document.getElementById("weatherIcon");
const cardEl = document.getElementById("weatherNowCard");

function setTheme(type){
  cardEl.classList.remove("theme-sunny", "theme-cloudy", "theme-rain");

  if(type === "sunny"){
    cardEl.classList.add("theme-sunny");
    iconEl.src = "images/weather-sunny.png";
    iconEl.alt = "صحو";
  } else if(type === "rain"){
    cardEl.classList.add("theme-rain");
    iconEl.src = "images/weather-rain.png";
    iconEl.alt = "مطر";
  } else {
    cardEl.classList.add("theme-cloudy");
    iconEl.src = "images/weather-cloudy.png";
    iconEl.alt = "غائم";
  }
}

// قراءة الحالة من النص (مثلاً: "غائم" / "صحو" / "مطر")
const statusText = (statusEl.textContent || "").trim();

if(statusText.includes("صحو") || statusText.includes("مشمس")){
  setTheme("sunny");
} else if(statusText.includes("مطر") || statusText.includes("زخات")){
  setTheme("rain");
} else {
  setTheme("cloudy");
}
