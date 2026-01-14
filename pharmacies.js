// pharmacies.js (front) — cleaned & no duplication
const API_BASE = "http://localhost:3000"; // منين تولي نفس الدومين خليه ""

const listEl = document.getElementById("phList");
const statusEl = document.getElementById("phStatus");
const btns = document.querySelectorAll(".city-btn");

let currentCity = "rabat";

/** ---------- Helpers ---------- */
function esc(s = "") {
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[m]));
}

function cityLabel(code) {
  if (code === "rabat") return "الرباط";
  if (code === "sale") return "سلا";
  return "تمارة";
}

function buildAddress(it) {
  const area = (it.area || "").toString().trim();
  const city = cityLabel(currentCity);
  const address = (it.address || "").toString().trim();
  // إذا كاين address فـ API نستعملوه، إلا لا نركّبو من area + city
  const finalText = address || (area ? `${area} • ${city}` : city);
  return finalText;
}

function phoneClean(p) {
  // نخلي غير الأرقام و + باش tel: يخدم مزيان
  return String(p || "").trim().replace(/[^\d+]/g, "");
}

/** ---------- Render ---------- */
function render(items) {
  if (!items || !items.length) {
    listEl.innerHTML = `<div class="card note"><p>ما لقيت حتى صيدلية حراسة اليوم.</p></div>`;
    return;
  }

  listEl.innerHTML = items.map((it) => {
    const name = esc(it.name || "صيدلية");
    const addressText = esc(buildAddress(it));
    const hours = it.hours ? esc(it.hours) : "";
    const sourceUrl = it.sourceUrl ? esc(it.sourceUrl) : "";

    const rawPhone = phoneClean(it.phone);
    const hasPhone = !!rawPhone;

    // Call button (icon only) — click shows number then calls
    const callBtn = `
      <button class="call-icon ${hasPhone ? "" : "disabled"}"
              type="button"
              data-phone="${esc(rawPhone)}"
              aria-label="اتصال">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path fill="currentColor" d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1C10.07 21 3 13.93 3 5a1 1 0 011-1h3.5a1 1 0 011 1c0 1.24.2 2.45.57 3.57a1 1 0 01-.24 1.02l-2.21 2.2z"/>
        </svg>
      </button>
    `;

    return `
      <section class="card pharmacy-card">
        <div class="top">
          <div class="info">
            <h2>${name}</h2>
          </div>
          ${callBtn}
        </div>

        <div class="details">
          <p class="address"><strong>العنوان:</strong> ${addressText}</p>
          ${hours ? `<p><strong>الوقت:</strong> ${hours}</p>` : ""}
          ${sourceUrl ? `
            <p><strong>المصدر:</strong>
              <a class="link" href="${sourceUrl}" target="_blank" rel="noopener">فتح</a>
            </p>` : ""}
        </div>
      </section>
    `;
  }).join("");
}

/** ---------- Events ---------- */
// City buttons
btns.forEach((b) => {
  b.addEventListener("click", () => {
    btns.forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    currentCity = b.dataset.city;
    loadPharmacies(currentCity);
  });
});

// Event delegation for call icon (works after render)
listEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".call-icon");
  if (!btn) return;

  const phone = (btn.dataset.phone || "").trim();
  if (!phone) return; // disabled

  const ok = confirm(`رقم الهاتف:\n${phone}\n\nواش بغيت تتاصل؟`);
  if (ok) window.location.href = `tel:${phone}`;
});

/** ---------- Fetch ---------- */
async function loadPharmacies(city) {
  try {
    statusEl.textContent = `جاري تحميل صيدليات الحراسة: ${cityLabel(city)}...`;

    const res = await fetch(`${API_BASE}/api/pharmacies?city=${encodeURIComponent(city)}`);
    if (!res.ok) throw new Error("HTTP " + res.status);

    const data = await res.json();
    render(data.items || []);

    statusEl.textContent = "جاهز ✅";
  } catch (e) {
    statusEl.textContent = "تعذر تحميل الصيدليات (API/CORS/Server).";
    listEl.innerHTML = "";
  }
}

loadPharmacies(currentCity);
