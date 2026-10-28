// Yahoo! Reseller Assistant - Popup JS

const BACKEND_URL = "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", () => {
  checkBackendHealth();
  setupCalculator();
  setupActionButtons();
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

// 3. Setup Button Listeners
function setupActionButtons() {
  // Launch X-Ray on Active Tab (Never open new tab!)
  document.getElementById("yah-btn-launch-xray").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0] || !tabs[0].id) return;
      const activeTab = tabs[0];
      const isYahoo = activeTab.url && activeTab.url.includes("auctions.yahoo.co.jp");

      if (isYahoo) {
        // Send message to active Yahoo Auctions tab
        chrome.tabs.sendMessage(activeTab.id, { action: "open_xray" }, () => {
          // Close popup so user sees X-Ray modal right on Yahoo Auctions screen!
          window.close();
        });
      } else {
        // Active tab is not Yahoo Auctions - redirect active tab to Yahoo Auctions
        chrome.tabs.update(activeTab.id, { url: "https://auctions.yahoo.co.jp" });
        window.close();
      }
    });
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
