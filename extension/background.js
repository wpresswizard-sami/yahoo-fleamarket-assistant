// Yahoo! Auction Reseller Assistant - Background Service Worker (Manifest V3)
// Acts as a privileged proxy between Content Script and local FastAPI backend to bypass HTTPS mixed-content restrictions.

const BACKEND_URL = "http://127.0.0.1:8000";

chrome.runtime.onInstalled.addListener(() => {
  console.log("Yahoo! Auction Reseller Assistant Background Worker Active.");
});

// Message Dispatcher
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 1. Analyze Items Batch via FastAPI Backend
  if (request.action === "analyze_items") {
    fetch(`${BACKEND_URL}/api/extension/analyze-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: request.items || [] })
    })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      sendResponse({ success: true, data: data });
    })
    .catch(err => {
      sendResponse({ success: false, error: err.message });
    });

    return true; // keep channel open for async response
  }

  // 2. Save Item to Inventory
  if (request.action === "save_item") {
    fetch(`${BACKEND_URL}/api/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request.item)
    })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      sendResponse({ success: true, data: data });
    })
    .catch(err => {
      sendResponse({ success: false, error: err.message });
    });

    return true;
  }

  // 3. Update Toolbar Badge Counter
  if (request.action === "update_badge") {
    const count = request.count || 0;
    if (sender.tab && sender.tab.id) {
      const tabId = sender.tab.id;
      if (count > 0) {
        chrome.action.setBadgeText({ tabId: tabId, text: count.toString() }, () => {
          if (chrome.runtime.lastError) {}
        });
        chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: "#10b981" }, () => {
          if (chrome.runtime.lastError) {}
        });
      } else {
        chrome.action.setBadgeText({ tabId: tabId, text: "" }, () => {
          if (chrome.runtime.lastError) {}
        });
      }
    }
    sendResponse({ status: "ok" });
    return true;
  }

  // 4. Trigger X-Ray in Tab
  if (request.action === "open_xray_in_tab") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "open_xray" }, () => {
          if (chrome.runtime.lastError) {}
        });
      }
    });
    sendResponse({ status: "ok" });
    return true;
  }
});
