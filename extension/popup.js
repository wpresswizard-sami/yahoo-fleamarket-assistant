// Yahoo! Reseller Assistant - Popup JS

const BACKEND_URL = "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", () => {
  checkBackendHealth();
  setupCalculator();
  setupActionButtons();
  loadQuickDeals();
});

// 1. Check if local FastAPI server is running
async function checkBackendHealth() {
  const statusEl = document.getElementById("yah-server-status");
  const textEl = document.getElementById("yah-status-text");

  try {
    const resp = await fetch(`${BACKEND_URL}/api/category-insights`, { method: "GET" });
    if (resp.ok) {
      statusEl.classList.add("yah-online");
      textEl.innerText = "Online (Localhost)";
      return;
    }
  } catch (e) {
    // Not reachable
  }

  statusEl.classList.remove("yah-online");
  textEl.innerText = "Standalone";
}

// 2. Setup Instant Profit Calculator
function setupCalculator() {
  const buyInput = document.getElementById("calc-buy");
  const targetInput = document.getElementById("calc-target");
  const profitEl = document.getElementById("calc-net-profit");
  const marginEl = document.getElementById("calc-margin");

  function recalculate() {
    const buy = parseInt(buyInput.value || 0, 10);
    const target = parseInt(targetInput.value || 0, 10);

    if (target > 0) {
      const fee = Math.round(target * 0.05); // 5% Flea Market fee
      const shipOut = 210; // Nekopos standard
      const netProfit = target - buy - fee - shipOut;
      const margin = ((netProfit / target) * 100).toFixed(1);

      if (netProfit >= 0) {
        profitEl.innerText = `+¥${netProfit.toLocaleString()}`;
        profitEl.className = "yah-r-val yah-green";
      } else {
        profitEl.innerText = `-¥${Math.abs(netProfit).toLocaleString()}`;
        profitEl.className = "yah-r-val yah-red";
      }

      marginEl.innerText = `${margin}%`;
    } else {
      profitEl.innerText = "¥0";
      marginEl.innerText = "0%";
    }
  }

  buyInput.addEventListener("input", recalculate);
  targetInput.addEventListener("input", recalculate);
  recalculate();
}

// 3. Load Quick Deals into popup if available
async function loadQuickDeals() {
  try {
    const resp = await fetch(`${BACKEND_URL}/api/auto-deals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "gaming", min_profit: 2000, limit: 3 })
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.deals && data.deals.length > 0) {
        const sec = document.getElementById("yah-popup-deals-section");
        const list = document.getElementById("yah-popup-deals-list");
        if (sec && list) {
          sec.style.display = "block";
          document.getElementById("yah-popup-deals-count").innerText = `${data.count} found`;
          list.innerHTML = data.deals.map(d => `
            <div style="display:flex; align-items:center; justify-content:space-between; background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:6px 10px; font-size:11px;">
              <div style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:600;">
                ${d.title}
              </div>
              <div style="color:#16a34a; font-weight:800; white-space:nowrap;">
                +¥${d.estimated_profit.toLocaleString()}
              </div>
            </div>
          `).join("");
        }
      }
    }
  } catch (e) {}
}

// 4. Setup Button Listeners
function setupActionButtons() {
  // Launch X-Ray on Active Tab
  document.getElementById("yah-btn-launch-xray").addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;

      const isYahoo = tab.url && tab.url.includes("auctions.yahoo.co.jp");
      if (!isYahoo) {
        chrome.tabs.update(tab.id, { url: "https://auctions.yahoo.co.jp" });
        window.close();
        return;
      }

      // 1. Programmatically inject content.css & content.js into active tab
      try {
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ["content.css"]
        });
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"]
        });
      } catch (err) {
        // Script already injected or frame issue
      }

      // 2. Send open_xray message
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { action: "open_xray" }, () => {
          window.close();
        });
      }, 120);

    } catch (e) {
      window.close();
    }
  });

  // Open Full Web App Dashboard
  document.getElementById("yah-btn-open-dashboard").addEventListener("click", () => {
    chrome.tabs.create({ url: BACKEND_URL });
  });

  // Open Yahoo Auctions
  document.getElementById("yah-btn-open-yahoo").addEventListener("click", () => {
    chrome.tabs.create({ url: "https://auctions.yahoo.co.jp" });
  });
}
