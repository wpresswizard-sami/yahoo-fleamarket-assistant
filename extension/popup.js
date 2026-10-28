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
  const launchBtn = document.getElementById("yah-btn-launch-xray");

  launchBtn.addEventListener("click", async () => {
    launchBtn.innerHTML = `<span>⏳ Opening X-Ray...</span>`;

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs || !tabs[0] || !tabs[0].id) {
        window.close();
        return;
      }
      const activeTab = tabs[0];
      const isYahoo = activeTab.url && activeTab.url.includes("auctions.yahoo.co.jp");

      if (!isYahoo) {
        // If not on Yahoo Auctions, open Yahoo Auctions in active tab
        chrome.tabs.update(activeTab.id, { url: "https://auctions.yahoo.co.jp" }, () => {
          if (chrome.runtime.lastError) {}
          window.close();
        });
        return;
      }

      // 1. Ensure content script is actively injected into tab
      if (chrome.scripting) {
        try {
          await chrome.scripting.insertCSS({
            target: { tabId: activeTab.id },
            files: ["content.css"]
          });
        } catch (e) {}

        try {
          await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ["content.js"]
          });
        } catch (e) {}
      }

      // 2. Send message to open modal
      setTimeout(() => {
        chrome.tabs.sendMessage(activeTab.id, { action: "open_xray" }, () => {
          if (chrome.runtime.lastError) {}
          window.close();
        });
      }, 100);

    } catch (err) {
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
