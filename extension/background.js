// Yahoo! Auction Reseller Assistant - Background Service Worker (Manifest V3)

chrome.runtime.onInstalled.addListener(() => {
  console.log("Yahoo! Auction Reseller Assistant Extension Installed.");
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
