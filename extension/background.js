// Yahoo! Auction Reseller Assistant - Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  console.log("Yahoo! Auction Reseller Assistant Extension Installed.");
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "update_badge") {
    const count = request.count || 0;
    if (count > 0 && sender.tab && sender.tab.id) {
      chrome.action.setBadgeText({ tabId: sender.tab.id, text: count.toString() });
      chrome.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color: "#10b981" }); // Emerald green
    } else if (sender.tab && sender.tab.id) {
      chrome.action.setBadgeText({ tabId: sender.tab.id, text: "" });
    }
    sendResponse({ status: "ok" });
    return true;
  }

  if (request.action === "open_xray_in_tab") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "toggle_xray" });
      }
    });
    sendResponse({ status: "ok" });
    return true;
  }
});
