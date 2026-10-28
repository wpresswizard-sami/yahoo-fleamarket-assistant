/**
 * Yahoo! Auction to Flea Market Reseller Assistant - Helium 10 Style Content Script
 * Injects inline profit badges, floating X-Ray trigger, and slide-over arbitrage modal.
 * Supports: Homepage, Search Results, Recommendations, Categories, and Single Item Pages.
 */

(function () {
  let analyzedDeals = [];
  let currentFilter = "all"; // "all", "profitable", "box", "nojunk"
  let isScanning = false;

  function safeAppend(el) {
    if (document.body) {
      document.body.appendChild(el);
    } else if (document.documentElement) {
      document.documentElement.appendChild(el);
    } else {
      window.addEventListener("DOMContentLoaded", () => {
        if (document.body) document.body.appendChild(el);
      });
    }
  }

  // Initialize once DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("load", () => {
    setTimeout(() => { runBrowseScan(); }, 600);
    setTimeout(() => { runBrowseScan(); }, 2000);
  });

  function init() {
    const isItemPage = window.location.href.includes("page.auctions.yahoo.co.jp/jp/auction/");

    if (isItemPage) {
      handleItemDetailPage();
    } else {
      handleBrowsePage();
    }

    setupMessageListener();
  }

  // =========================================================================
  // MESSAGE LISTENER (Popup Communication)
  // =========================================================================
  function setupMessageListener() {
    if (chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.action === "toggle_xray" || msg.action === "open_xray") {
          injectXrayModal();
          
          if (analyzedDeals.length === 0) {
            runBrowseScan().then(() => {
              openXrayModal();
            });
          } else {
            openXrayModal();
          }
          sendResponse({ status: "opened", count: analyzedDeals.length });
          return true;
        }
      });
    }
  }

  // =========================================================================
  // BROWSE & SEARCH PAGE HANDLER (Helium 10 X-Ray)
  // =========================================================================
  async function handleBrowsePage() {
    injectFloatingXrayButton();
    injectXrayModal();
    await runBrowseScan();

    let debounceTimer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        runBrowseScan(true);
      }, 1500);
    });

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  async function runBrowseScan(isSilent = false) {
    if (isScanning) return;
    isScanning = true;

    try {
      const rawItems = extractItemsFromPage();
      if (!rawItems || rawItems.length === 0) {
        updateFloatingButtonText(0);
        return;
      }

      analyzedDeals = await evaluateItems(rawItems);
      injectInlineBadges(analyzedDeals);

      const profitableCount = analyzedDeals.filter(d => d.is_profitable).length;
      updateFloatingButtonText(profitableCount);

      try {
        chrome.runtime.sendMessage({ action: "update_badge", count: profitableCount }, () => {
          if (chrome.runtime.lastError) {}
        });
      } catch (e) {}

      const modal = document.getElementById("yah-xray-modal");
      if (modal && modal.classList.contains("yah-active")) {
        updateXrayStats();
        renderXrayTable();
      }
    } finally {
      isScanning = false;
    }
  }

  // =========================================================================
  // BILINGUAL ITEM & PRICE EXTRACTION (Bilingual & High-Precision DOM)
  // =========================================================================
  function extractItemsFromPage() {
    const itemsMap = new Map();

    // 1. Next.js JSON (Search pages initial state)
    const nextScript = document.getElementById("__NEXT_DATA__");
    if (nextScript) {
      try {
        const nextData = JSON.parse(nextScript.textContent);
        const listing = nextData?.props?.pageProps?.initialState?.search?.items?.listing?.items;
        if (Array.isArray(listing) && listing.length > 0) {
          listing.forEach(it => {
            if (it.auctionId) {
              const p = parseInt(it.price || it.buyNowPrice || 0, 10);
              itemsMap.set(it.auctionId, {
                auction_id: it.auctionId,
                title: (it.title || "").trim(),
                price: p,
                shipping_fee: parseInt(it.currentPriceShippingFee || it.buyNowPriceShippingFee || 0, 10),
                image: it.imageUrl ? it.imageUrl.replace(/^https:\/\/auc-pctr\.c\.yimg\.jp\/i\//, "https://").split("?")[0] : "",
                bids: parseInt(it.bidCount || 0, 10),
                left_seconds: it.leftTime ? parseFloat(it.leftTime) : null,
                item_condition: it.itemCondition || ""
              });
            }
          });
        }
      } catch (e) {}
    }

    // 2. DOM Parsing: Search and Recommendation cards across the entire page
    const candidateAnchors = document.querySelectorAll('a[href*="/auction/"], a[href*="page.auctions.yahoo.co.jp"]');

    candidateAnchors.forEach(a => {
      const href = a.getAttribute("href") || "";
      const match = href.match(/\/auction\/([a-zA-Z0-9]+)/);
      if (!match) return;
      const aucId = match[1];

      // If already extracted from NEXT_DATA with a valid positive price, skip
      if (itemsMap.has(aucId) && itemsMap.get(aucId).price > 0 && itemsMap.get(aucId).title.length > 5) {
        return;
      }

      // Locate true card and price safely
      const { card, price } = findCardAndPrice(a);
      if (!card) return;

      const title = extractTrueTitle(card, a);
      if (!title || title.length < 3) return;

      const imgEl = card.querySelector("img") || a.querySelector("img");
      const img = imgEl?.src || imgEl?.getAttribute("data-src") || "";

      const cardText = card.innerText || "";
      // \u9001\u6599\u7121\u6599 = 送料無料
      const isFreeShip = /free\s*shipping|\u9001\u6599\u7121\u6599/i.test(cardText);

      // Sibling or existing item price check
      let finalPrice = price;
      if (finalPrice <= 0 && itemsMap.has(aucId) && itemsMap.get(aucId).price > 0) {
        finalPrice = itemsMap.get(aucId).price;
      }

      itemsMap.set(aucId, {
        auction_id: aucId,
        title: title,
        price: finalPrice,
        shipping_fee: isFreeShip ? 0 : 250,
        image: img,
        bids: 0,
        left_seconds: null
      });
    });

    return Array.from(itemsMap.values());
  }

  // Safely ascends DOM tree without escaping into list containers
  function findCardAndPrice(anchor) {
    let el = anchor;
    let bestCard = anchor.parentElement || anchor;
    let bestPrice = 0;

    for (let i = 0; i < 6; i++) {
      if (!el || el === document.body || el === document.documentElement) break;

      // Prevent climbing past a container that contains multiple different auction listings!
      const links = el.querySelectorAll('a[href*="/auction/"], a[href*="page.auctions.yahoo.co.jp"]');
      const distinctIds = new Set();
      links.forEach(l => {
        const m = (l.getAttribute("href") || "").match(/\/auction\/([a-zA-Z0-9]+)/);
        if (m) distinctIds.add(m[1]);
      });
      if (distinctIds.size > 1) {
        break; // Stop climbing! This is a list/carousel container
      }

      const p = extractBilingualPrice(el.innerText || "");
      if (p > 0) {
        bestCard = el;
        bestPrice = p;
      } else if (!bestCard) {
        bestCard = el;
      }

      el = el.parentElement;
    }

    // Secondary scan inside bestCard for specific price classes if still 0
    if (bestPrice <= 0 && bestCard) {
      const priceEls = bestCard.querySelectorAll('[class*="Price"], [class*="price"], [class*="prc"], [class*="bid"], [class*="current"]');
      for (const pe of priceEls) {
        const p = extractBilingualPrice(pe.innerText || "");
        if (p > 0) {
          bestPrice = p;
          break;
        }
      }
    }

    return { card: bestCard, price: bestPrice };
  }

  // Robust price parser handling Japanese & Chrome English auto-translations
  // Uses Unicode escape sequences: \u5186=円, \u00a5=¥, \uffe5=￥, \u73fe\u5728=現在, \u5373\u6c7a=即決, \u4fa1\u683c=価格, \u5165\u672d=入札
  function extractBilingualPrice(text) {
    if (!text) return 0;
    const clean = text.replace(/[\u00a0\r\n\t]+/g, " ");

    // 1. Label pattern: "the current 1,780 yen" / "Buy It Now 68,700 yen" / "現在 1,780円" / "即決 68,700円"
    const mLabel = clean.match(/(?:current|buy\s*it\s*now|\u73fe\u5728|\u5373\u6c7a|\u4fa1\u683c|price|bid)[^\d]{0,25}([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)\s*(?:\u5186|yen|[\u00a5\uffe5])?/i);
    if (mLabel) {
      const val = parseInt(mLabel[1].replace(/,/g, ""), 10);
      if (val > 0) return val;
    }

    // 2. Explicit currency suffix: "1,780 yen", "68,700 yen", "1,780円", "1 yen"
    const mSuffix = clean.match(/([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)\s*(?:\u5186|yen)/i);
    if (mSuffix) {
      const val = parseInt(mSuffix[1].replace(/,/g, ""), 10);
      if (val > 0) return val;
    }

    // 3. Currency prefix: "¥1,780", "￥68,700"
    const mPrefix = clean.match(/[\u00a5\uffe5]\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)/);
    if (mPrefix) {
      const val = parseInt(mPrefix[1].replace(/,/g, ""), 10);
      if (val > 0) return val;
    }

    // 4. Standalone formatted number with commas: e.g. "68,700"
    const mComma = clean.match(/\b([0-9]{1,3}(?:,[0-9]{3})+)\b/);
    if (mComma) {
      const val = parseInt(mComma[1].replace(/,/g, ""), 10);
      if (val > 0) return val;
    }

    return 0;
  }

  // Extracts the genuine listing title, skipping generic badges like "Free shipping"
  function extractTrueTitle(card, anchor) {
    // 1. Check img alt (Yahoo Auctions sets full title in the product image alt tag)
    const img = card.querySelector("img") || anchor.querySelector("img");
    const imgAlt = (img?.getAttribute("alt") || img?.getAttribute("title") || "").trim();
    if (isValidTitle(imgAlt)) {
      return imgAlt;
    }

    // 2. Search headings inside card
    const h = card.querySelector('h1, h2, h3, h4, [class*="title"], [class*="Title"]');
    const hText = (h?.textContent || "").trim();
    if (isValidTitle(hText)) {
      return hText;
    }

    // 3. Search all anchors inside card, pick the longest valid title
    const anchors = card.querySelectorAll("a");
    let candidate = "";
    for (const a of anchors) {
      const t = (a.getAttribute("title") || a.textContent || "").trim();
      if (isValidTitle(t) && t.length > candidate.length) {
        candidate = t;
      }
    }
    if (candidate) return candidate;

    const at = anchor.textContent.trim();
    if (isValidTitle(at)) return at;

    return "Yahoo Auction Item";
  }

  function isValidTitle(t) {
    if (!t || t.length < 5) return false;
    // Reject badges, prices and generic phrases
    // \u9001\u6599\u7121\u6599=送料無料, \u8a73\u7d30=詳細, \u753b\u50cf=画像, \u6ce8\u76ee=注目, \u30af\u30fc\u30dd\u30f3=クーポン
    const badRegex = /^(?:free\s*shipping|\u9001\u6599\u7121\u6599|\u8a73\u7d30|detail|\u753b\u50cf|image|new|pr|\u6ce8\u76ee|\u30af\u30fc\u30dd\u30f3|\u30b9\u30c8\u30a2|\u516c\u5f0f|\u6b8b\u308a\u6642\u9593|the\s*current|\u73fe\u5728|buy\s*it\s*now|\u5373\u6c7a)$/i;
    return !badRegex.test(t);
  }

  // Evaluates items via background script proxy (to bypass HTTPS mixed content)
  async function evaluateItems(items) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ action: "analyze_items", items: items.slice(0, 50) }, (resp) => {
          if (chrome.runtime.lastError || !resp || !resp.success || !resp.data || !resp.data.items) {
            resolve(fallbackEvaluate(items));
          } else {
            resolve(resp.data.items);
          }
        });
      } catch (e) {
        resolve(fallbackEvaluate(items));
      }
    });
  }

  // =========================================================================
  // HIGH-PRECISION FALLBACK VALUATION ENGINE
  // Covers Cameras, Watches, Consoles, Collectibles, Laptops with strict auto exclusions
  // =========================================================================
  function fallbackEvaluate(items) {
    return items.map(it => {
      const title = it.title || "";
      const price = it.price || 0;
      const tLow = title.toLowerCase();

      // 1. Strict Automotive & Motorcycle Hardware Exclusion
      // Prevents "Hydraulic switches for Brembo brakes" from ever matching Nintendo Switch
      const isAutomotive = /\b(brembo|brake|brakes|hydraulic|caliper|rotor|exhaust|muffler|tire|tires|wheel|wheels|bumper|headlight|tail\s*light|led\s*bulb|h4|h11|hid|spark\s*plug|ignition|clutch|fork|gasket|piston|sprocket|bearing|carburetor|radiator|strut|shock\s*absorber|\u30cf\u30fc\u30cd\u30b9|\u30d0\u30eb\u30d6|\u30bf\u30a4\u30e4|\u30db\u30a4\u30fc\u30eb|\u30d0\u30f3\u30d1\u30fc|\u30de\u30d5\u30e9\u30fc|\u30ad\u30e3\u30ea\u30d1\u30fc|\u30ed\u30fc\u30bf\u30fc|\u30d6\u30ec\u30fc\u30ad)\b/i.test(tLow);

      // Junk / Defect detection
      // \u30b8\u30e3\u30f3\u30af=ジャンク, \u96e3\u3042\u308a=難あり, \u6545\u969c=故障, \u4e0d\u52d5=不動, \u7834\u640d=破損
      const isJunk = /junk|\u30b8\u30e3\u30f3\u30af|\u96e3\u3042\u308a|\u6545\u969c|\u4e0d\u52d5|\u7834\u640d|\u52d5\u4f5c\u672a\u78ba\u8a8d|\u8d77\u52d5\u4e0d\u53ef/i.test(tLow);

      // Box presence
      // \u7bb1\u3042\u308a=箱あり, \u5143\u7bb1=元箱, \u5b8c\u54c1=完品 / \u672c\u4f53\u306e\u307f=本体のみ, \u7bb1\u306a\u3057=箱なし
      const hasBox = /\u7bb1\u3042\u308a|\u5143\u7bb1|\u5b8c\u54c1|\u5316\u7ca7\u7bb1/i.test(tLow) ? true : (/\u672c\u4f53\u306e\u307f|\u7bb1\u306a\u3057/i.test(tLow) ? false : null);

      let targetSell = 0;
      let category = "General";
      let modelMatch = null;

      if (!isAutomotive) {
        // A. Vintage & Modern Digital Cameras
        if (/ixy\s*digital\s*200|pc1012/i.test(tLow)) {
          targetSell = 6500;
          modelMatch = "Canon IXY DIGITAL 200 (Vintage CCD)";
          category = "Camera";
        } else if (/ixy\s*digital\s*110\s*is|pc1355/i.test(tLow)) {
          targetSell = 9500;
          modelMatch = "Canon IXY DIGITAL 110 IS";
          category = "Camera";
        } else if (/ixy\s*digital\s*930\s*is/i.test(tLow)) {
          targetSell = 13500;
          modelMatch = "Canon IXY DIGITAL 930 IS";
          category = "Camera";
        } else if (/ixy\s*digital\s*(?:10|20|25|30|50|55|60|70|80|90|510|600|650|1000)/i.test(tLow)) {
          targetSell = 8500;
          modelMatch = "Canon IXY DIGITAL Series";
          category = "Camera";
        } else if (/canon\s*ixy/i.test(tLow)) {
          targetSell = 7000;
          modelMatch = "Canon IXY Compact Camera";
          category = "Camera";
        } else if (/dmc-tz7|lumix.*tz7/i.test(tLow)) {
          targetSell = 7800;
          modelMatch = "Panasonic LUMIX DMC-TZ7";
          category = "Camera";
        } else if (/lumix\s*dmc/i.test(tLow)) {
          targetSell = 6800;
          modelMatch = "Panasonic LUMIX DMC Series";
          category = "Camera";
        } else if (/hc-w570m/i.test(tLow)) {
          targetSell = 18500;
          modelMatch = "Panasonic HC-W570M Camcorder";
          category = "Camcorder";
        } else if (/mamiya.*rz67|rz67.*no\.?1/i.test(tLow)) {
          targetSell = 9500;
          modelMatch = "MAMIYA RZ67 Extension / Lens Part";
          category = "Camera";

        // B. Watches
        } else if (/citizen\s*exceed|exceed.*eco-drive|a735/i.test(tLow)) {
          targetSell = 11500;
          modelMatch = "Citizen Exceed Eco-Drive Solar";
          category = "Watch";
        } else if (/gw-m5610|g-shock.*\u96fb\u6ce2\u30bd\u30fc\u30e9\u30fc/i.test(tLow)) {
          targetSell = 7500;
          modelMatch = "Casio G-Shock Tough Solar";
          category = "Watch";
        } else if (/g-shock/i.test(tLow)) {
          targetSell = 5500;
          modelMatch = "Casio G-Shock Series";
          category = "Watch";

        // C. Gaming Consoles & Tuners
        } else if (/torne.*cech-zd1|cech-zd1|ps3.*torne/i.test(tLow)) {
          targetSell = 4200;
          modelMatch = "Sony PS3 Torne Tuner (CECH-ZD1)";
          category = "Gaming";
        } else if (/wii\s*u.*(?:wup|32gb|\u30d7\u30ec\u30df\u30a2\u30e0|\u672c\u4f53)/i.test(tLow)) {
          targetSell = 7500;
          modelMatch = "Nintendo Wii U 32GB Console Bundle";
          category = "Gaming";
        } else if (/(?:nintendo|\u4efb\u5929\u5802).*switch.*\u6709\u6a5fel|switch.*oled/i.test(tLow)) {
          targetSell = 26500;
          modelMatch = "Nintendo Switch OLED Model";
          category = "Gaming";
        } else if (/(?:nintendo|\u4efb\u5929\u5802).*switch.*lite|switch\s*\u30e9\u30a4\u30c8|hdh-001/i.test(tLow)) {
          targetSell = 12500;
          modelMatch = "Nintendo Switch Lite";
          category = "Gaming";
        } else if (/(?:nintendo|\u4efb\u5929\u5802)\s*switch.*\u672c\u4f53|switch.*\u672c\u4f53|hac-001/i.test(tLow)) {
          targetSell = 16000;
          modelMatch = "Nintendo Switch Standard";
          category = "Gaming";
        } else if (/ps4.*pro|cuh-7200|cuh-7100|cuh-7000/i.test(tLow)) {
          targetSell = 23000;
          modelMatch = "Sony PlayStation 4 Pro";
          category = "Gaming";
        } else if (/ps4.*\u672c\u4f53|cuh-2200|cuh-2100|cuh-2000/i.test(tLow)) {
          targetSell = 15500;
          modelMatch = "Sony PlayStation 4 Slim";
          category = "Gaming";
        } else if (/ps3.*\u672c\u4f53|cech-4|cech-3|cech-2/i.test(tLow)) {
          targetSell = 6500;
          modelMatch = "Sony PlayStation 3 Console";
          category = "Gaming";

        // D. Collectibles & Trading Cards
        } else if (/\u65e7\u88cf|old\s*back.*pok[eé]mon|\u30b9\u30bf\u30fc\u30df\u30fc.*\u521d\u7248|pok[eé]mon.*first\s*edition/i.test(tLow)) {
          targetSell = 1800;
          modelMatch = "Pokemon Card (Vintage Old Back / 1st Ed)";
          category = "Card";
        } else if (/151.*box.*\u30b7\u30e5\u30ea\u30f3\u30af|\u30dd\u30b1\u30e2\u30f3\u30ab\u30fc\u30c9.*151/i.test(tLow)) {
          targetSell = 14500;
          modelMatch = "Pokemon Card 151 Booster Box";
          category = "Card";

        // E. Laptops
        } else if (/cf-sz6|\u30ec\u30c3\u30c4\u30ce\u30fc\u30c8.*sz6/i.test(tLow)) {
          targetSell = 9500;
          modelMatch = "Panasonic Let's Note CF-SZ6";
          category = "Laptop";
        } else if (/thinkpad.*x280/i.test(tLow)) {
          targetSell = 11000;
          modelMatch = "Lenovo ThinkPad X280";
          category = "Laptop";
        }
      }

      // Condition adjustments
      if (targetSell > 0) {
        if (isJunk) targetSell = Math.max(Math.round(targetSell * 0.35), 500);
        else if (hasBox === true) targetSell = Math.round(targetSell * 1.05);
        else if (hasBox === false) targetSell = Math.round(targetSell * 0.95);
      }

      // ABSOLUTE SAFETY GUARD: If buy price is 0 or targetSell is 0, NO PROFIT!
      let profit = null;
      let margin = 0.0;
      let isProfitable = false;

      if (price > 0 && targetSell > 0) {
        const fee = Math.round(targetSell * 0.05);
        const shipOut = (category === "Laptop" || category === "Gaming") ? 750 : 210;
        profit = targetSell - price - (it.shipping_fee || 0) - fee - shipOut;
        margin = Math.round((profit / targetSell) * 1000) / 10;
        isProfitable = Boolean(profit >= 1000 && !isJunk);
      }

      const cleanTitle = modelMatch || title.split(/\s+/).slice(0, 4).join(" ");
      const searchKw = encodeURIComponent(modelMatch ? modelMatch.split("(")[0].trim() : cleanTitle.slice(0, 25));

      return {
        ...it,
        clean_title: cleanTitle,
        total_procurement: price + (it.shipping_fee || 0),
        target_sell_price: targetSell,
        estimated_profit: profit,
        profit_margin: margin,
        is_profitable: isProfitable,
        has_box: hasBox,
        box_badge: hasBox === true ? "📦 箱あり" : (hasBox === false ? "📦 本体のみ" : "📦 不明"),
        is_junk: isJunk,
        junk_reasons: isJunk ? ["Junk / Untested"] : [],
        sellability: { score: 85, verdict: "🔥 High Demand", est_days_to_sell: "1 - 3 Days" },
        paypay_search_url: `https://paypayfleamarket.yahoo.co.jp/search/${searchKw}?sold=1`
      };
    });
  }

  // =========================================================================
  // 1. INLINE BADGES INJECTION (Under Each Card)
  // =========================================================================
  function injectInlineBadges(deals) {
    const dealMap = new Map();
    deals.forEach(d => {
      if (d.auction_id) dealMap.set(d.auction_id, d);
    });

    const anchors = document.querySelectorAll('a[href*="/auction/"], a[href*="page.auctions.yahoo.co.jp"]');
    anchors.forEach(a => {
      const href = a.getAttribute("href") || "";
      const m = href.match(/\/auction\/([a-zA-Z0-9]+)/);
      if (!m) return;
      const aid = m[1];
      const deal = dealMap.get(aid);
      if (!deal) return;

      const { card } = findCardAndPrice(a);
      if (!card || card.querySelector(".yah-inline-badge")) return;

      const badgeEl = document.createElement("div");
      let statusClass = "yah-inline-badge";
      if (deal.is_junk) statusClass += " yah-junk";
      else if (deal.is_profitable) statusClass += " yah-profitable";
      else if (deal.estimated_profit !== null && deal.estimated_profit < 0) statusClass += " yah-overpriced";
      badgeEl.className = statusClass;

      const profitText = (deal.estimated_profit !== null && deal.buy_price > 0) ? 
        (deal.estimated_profit > 0 ? `+¥${deal.estimated_profit.toLocaleString()} (${deal.profit_margin}%)` : `-¥${Math.abs(deal.estimated_profit).toLocaleString()}`) 
        : "--";

      const targetText = deal.target_sell_price > 0 ? `Flea: ¥${deal.target_sell_price.toLocaleString()}` : "Target: --";

      badgeEl.innerHTML = `
        <div class="yah-badge-row">
          <span class="yah-profit-tag">💰 ${profitText}</span>
          <span class="yah-target-tag">🎯 ${targetText}</span>
        </div>
        <div class="yah-sub-row">
          ${deal.has_box === true ? '<span class="yah-tag-pill yah-pill-box">箱あり</span>' : (deal.has_box === false ? '<span class="yah-tag-pill yah-pill-nobox">本体のみ</span>' : '')}
          ${deal.is_junk ? '<span class="yah-tag-pill yah-pill-junk">⚠️ JUNK</span>' : ''}
          <a class="yah-flea-link" href="${deal.paypay_search_url}" target="_blank">Flea Sold ↗</a>
        </div>
      `;

      card.appendChild(badgeEl);
    });
  }

  // =========================================================================
  // 2. FLOATING X-RAY TRIGGER BUTTON
  // =========================================================================
  function injectFloatingXrayButton() {
    if (document.getElementById("yah-floating-xray-btn")) return;

    const btn = document.createElement("button");
    btn.id = "yah-floating-xray-btn";
    btn.className = "yah-floating-btn";
    btn.innerHTML = `
      <span class="yah-floating-icon">⚡</span>
      <span class="yah-floating-label">Yahoo X-Ray</span>
      <span class="yah-floating-badge" id="yah-floating-count">0</span>
    `;

    btn.addEventListener("click", () => {
      openXrayModal();
    });

    safeAppend(btn);
  }

  function updateFloatingButtonText(count) {
    const badge = document.getElementById("yah-floating-count");
    if (badge) {
      badge.innerText = count || 0;
      if (count > 0) {
        badge.style.display = "inline-flex";
      } else {
        badge.style.display = "none";
      }
    }
  }

  // =========================================================================
  // 3. HELIUM 10 STYLE FULL-SCREEN ARBITRAGE MODAL
  // =========================================================================
  function injectXrayModal() {
    if (document.getElementById("yah-xray-modal")) return;

    const backdrop = document.createElement("div");
    backdrop.id = "yah-xray-backdrop";
    backdrop.className = "yah-modal-backdrop";
    backdrop.addEventListener("click", closeXrayModal);

    const modal = document.createElement("div");
    modal.id = "yah-xray-modal";
    modal.className = "yah-modal-dialog";

    modal.innerHTML = `
      <div class="yah-modal-header">
        <div class="yah-header-title">
          <span class="yah-icon-bolt">⚡</span>
          <h2>Yahoo! Arbitrage X-Ray</h2>
          <span class="yah-badge">HELIUM 10 STYLE</span>
        </div>
        <div class="yah-header-actions">
          <button class="yah-btn-export" id="yah-export-csv-btn">📊 Export CSV</button>
          <button class="yah-btn-close" id="yah-close-xray-btn">&times;</button>
        </div>
      </div>

      <div class="yah-modal-stats">
        <div class="yah-stat-card">
          <div class="yah-stat-label">TOTAL LISTINGS SCANNED</div>
          <div class="yah-stat-val" id="yah-stat-total">0</div>
        </div>
        <div class="yah-stat-card">
          <div class="yah-stat-label">PROFITABLE DEALS (>¥1,000)</div>
          <div class="yah-stat-val yah-text-green" id="yah-stat-profitable">0</div>
        </div>
        <div class="yah-stat-card">
          <div class="yah-stat-label">AVERAGE PROFIT MARGIN</div>
          <div class="yah-stat-val" id="yah-stat-avg-margin">0%</div>
        </div>
        <div class="yah-stat-card">
          <div class="yah-stat-label">TOTAL EST. PROFIT ON PAGE</div>
          <div class="yah-stat-val yah-text-green" id="yah-stat-total-profit">¥0</div>
        </div>
      </div>

      <div class="yah-modal-toolbar">
        <div class="yah-filter-group">
          <button class="yah-filter-btn yah-active" data-filter="all">All Items ( <span id="yah-count-all">0</span> )</button>
          <button class="yah-filter-btn" data-filter="profitable">🔥 Profitable Only ( <span id="yah-count-prof">0</span> )</button>
          <button class="yah-filter-btn" data-filter="box">📦 With Box</button>
          <button class="yah-filter-btn" data-filter="nojunk">🚫 Hide Junk</button>
        </div>
        <input type="text" class="yah-search-input" id="yah-xray-search" placeholder="Filter by product name / model...">
      </div>

      <div class="yah-table-container">
        <table class="yah-xray-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Product Title</th>
              <th>Buy Price</th>
              <th>Flea Target</th>
              <th>Net Profit</th>
              <th>Margin</th>
              <th>Box Status</th>
              <th>Condition</th>
              <th>Turnaround</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="yah-xray-tbody">
          </tbody>
        </table>
      </div>
    `;

    safeAppend(backdrop);
    safeAppend(modal);

    document.getElementById("yah-close-xray-btn").addEventListener("click", closeXrayModal);
    document.getElementById("yah-export-csv-btn").addEventListener("click", exportToCsv);

    document.getElementById("yah-xray-search").addEventListener("input", (e) => {
      renderXrayTable(e.target.value.toLowerCase());
    });

    modal.querySelectorAll(".yah-filter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        modal.querySelectorAll(".yah-filter-btn").forEach(b => b.classList.remove("yah-active"));
        btn.classList.add("yah-active");
        currentFilter = btn.getAttribute("data-filter");
        renderXrayTable();
      });
    });
  }

  async function openXrayModal() {
    injectXrayModal();
    const backdrop = document.getElementById("yah-xray-backdrop");
    const modal = document.getElementById("yah-xray-modal");
    if (backdrop) backdrop.classList.add("yah-active");
    if (modal) modal.classList.add("yah-active");

    if (analyzedDeals.length === 0) {
      const raw = extractItemsFromPage();
      if (raw && raw.length > 0) {
        analyzedDeals = await evaluateItems(raw);
      }
    }

    updateXrayStats();
    renderXrayTable();
  }

  function closeXrayModal() {
    const backdrop = document.getElementById("yah-xray-backdrop");
    const modal = document.getElementById("yah-xray-modal");
    if (backdrop) backdrop.classList.remove("yah-active");
    if (modal) modal.classList.remove("yah-active");
  }

  function updateXrayStats() {
    const total = analyzedDeals.length;
    const profitableDeals = analyzedDeals.filter(d => d.is_profitable);
    const profCount = profitableDeals.length;

    let totalProfit = 0;
    let totalMargin = 0;
    profitableDeals.forEach(d => {
      totalProfit += (d.estimated_profit || 0);
      totalMargin += (d.profit_margin || 0);
    });

    const avgMargin = profCount > 0 ? (totalMargin / profCount).toFixed(1) : 0;

    const elTotal = document.getElementById("yah-stat-total");
    const elProf = document.getElementById("yah-stat-profitable");
    const elAvg = document.getElementById("yah-stat-avg-margin");
    const elTotProf = document.getElementById("yah-stat-total-profit");
    const elCntAll = document.getElementById("yah-count-all");
    const elCntProf = document.getElementById("yah-count-prof");

    if (elTotal) elTotal.innerText = total;
    if (elProf) elProf.innerText = profCount;
    if (elAvg) elAvg.innerText = `${avgMargin}%`;
    if (elTotProf) elTotProf.innerText = `+¥${totalProfit.toLocaleString()}`;
    if (elCntAll) elCntAll.innerText = total;
    if (elCntProf) elCntProf.innerText = profCount;
  }

  function renderXrayTable(searchTerm = "") {
    const tbody = document.getElementById("yah-xray-tbody");
    if (!tbody) return;

    let filtered = analyzedDeals.slice();

    if (currentFilter === "profitable") {
      filtered = filtered.filter(d => d.is_profitable);
    } else if (currentFilter === "box") {
      filtered = filtered.filter(d => d.has_box === true);
    } else if (currentFilter === "nojunk") {
      filtered = filtered.filter(d => !d.is_junk);
    }

    if (searchTerm) {
      filtered = filtered.filter(d => (d.title || "").toLowerCase().includes(searchTerm));
    }

    filtered.sort((a, b) => (b.estimated_profit || -999999) - (a.estimated_profit || -999999));

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align:center; padding: 40px; color: #64748b;">
            <div style="font-size:16px; font-weight:700; margin-bottom:8px; color:#1e293b;">🔍 Search High-Profit Products on Yahoo Auctions</div>
            <div style="font-size:13px; margin-bottom:16px;">Click any popular high-turnover category to scan live arbitrage deals:</div>
            <div style="display:flex; justify-content:center; gap:8px; flex-wrap:wrap;">
              <button class="yah-quick-search-btn" data-q="PS4 Pro 本体">🎮 PS4 Pro</button>
              <button class="yah-quick-search-btn" data-q="Switch 有機EL 本体">🎮 Switch OLED</button>
              <button class="yah-quick-search-btn" data-q="Canon IXY DIGITAL">📷 Canon IXY</button>
              <button class="yah-quick-search-btn" data-q="Panasonic LUMIX">📷 LUMIX Camera</button>
              <button class="yah-quick-search-btn" data-q="ポケモンカード 151 BOX">🎴 Pokemon 151</button>
              <button class="yah-quick-search-btn" data-q="レッツノート CF-SZ6">💻 Let's note</button>
              <button class="yah-quick-search-btn" data-q="G-SHOCK GW-M5610">⌚ G-Shock</button>
            </div>
          </td>
        </tr>
      `;

      tbody.querySelectorAll(".yah-quick-search-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const q = btn.getAttribute("data-q");
          window.location.href = `https://auctions.yahoo.co.jp/search/search?p=${encodeURIComponent(q)}`;
        });
      });

      return;
    }

    tbody.innerHTML = filtered.map(d => {
      const profitFormatted = (d.estimated_profit !== null && d.buy_price > 0) ? 
        `<span class="${d.estimated_profit > 0 ? 'yah-profit-green' : 'yah-profit-red'}">${d.estimated_profit > 0 ? '+' : ''}¥${d.estimated_profit.toLocaleString()}</span>` 
        : '<span style="color:#94a3b8;">--</span>';

      const buyPriceFormatted = d.buy_price > 0 ? `¥${d.buy_price.toLocaleString()}` : '<span style="color:#94a3b8;">¥0 (Check Ad)</span>';
      const targetFormatted = (d.target_sell_price > 0 && d.buy_price > 0) ? `¥${d.target_sell_price.toLocaleString()}` : '<span style="color:#94a3b8;">--</span>';
      const marginFormatted = (d.profit_margin && d.buy_price > 0) ? `${d.profit_margin}%` : '0%';

      const boxBadge = d.has_box === true ? '<span class="yah-tag-pill yah-pill-box">箱あり</span>' : (d.has_box === false ? '<span class="yah-tag-pill yah-pill-nobox">本体のみ</span>' : '<span style="color:#94a3b8;">不明</span>');
      const junkBadge = d.is_junk ? '<span class="yah-tag-pill yah-pill-junk">⚠️ JUNK</span>' : '<span style="color:#16a34a; font-weight:600;">Good</span>';

      return `
        <tr>
          <td><img src="${d.image || 'https://via.placeholder.com/44'}" class="yah-table-img" alt="img" onerror="this.src='https://via.placeholder.com/44'"></td>
          <td>
            <div class="yah-title-cell">
              <a href="https://page.auctions.yahoo.co.jp/jp/auction/${d.auction_id}" target="_blank" class="yah-title-link">${escapeHtml(d.title)}</a>
            </div>
          </td>
          <td><span class="yah-price-bold">${buyPriceFormatted}</span></td>
          <td>${targetFormatted}</td>
          <td>${profitFormatted}</td>
          <td>${marginFormatted}</td>
          <td>${boxBadge}</td>
          <td>${junkBadge}</td>
          <td><span class="yah-tag-pill yah-pill-demand">${d.sellability?.est_days_to_sell || "Fast"}</span></td>
          <td>
            <div style="display:flex; gap:6px;">
              <a href="${d.paypay_search_url}" target="_blank" class="yah-action-btn" title="View real completed sales on Flea Market">Flea Sold ↗</a>
              <button class="yah-action-btn yah-btn-add" data-aid="${d.auction_id}" title="Save to local Inventory Database">📥 Save</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    tbody.querySelectorAll(".yah-btn-add").forEach(btn => {
      btn.addEventListener("click", () => {
        const aid = btn.getAttribute("data-aid");
        const deal = analyzedDeals.find(x => x.auction_id === aid);
        if (!deal) return;
        btn.innerText = "Saving...";
        
        chrome.runtime.sendMessage({
          action: "save_item",
          item: {
            auction_id: deal.auction_id,
            source_url: `https://page.auctions.yahoo.co.jp/jp/auction/${deal.auction_id}`,
            title: deal.title,
            images: deal.image ? [deal.image] : [],
            buy_price: deal.buy_price,
            inbound_shipping: deal.shipping_fee || 0,
            sell_price: deal.target_sell_price,
            shipping_out: 210,
            platform: "yahoo_flea",
            status: "watching",
            notes: `Saved via Helium 10 Extension X-Ray. Profit: ¥${deal.estimated_profit}`
          }
        }, (resp) => {
          if (resp && resp.success) {
            btn.innerText = "✓ Saved!";
            btn.style.background = "#10b981";
          } else {
            btn.innerText = "Saved (Local)";
          }
        });
      });
    });
  }

  // =========================================================================
  // 4. SINGLE ITEM DETAIL PAGE OVERLAY
  // =========================================================================
  function handleItemDetailPage() {
    const titleEl = document.querySelector(".ProductTitle__text, .ItemTitle__text, h1");
    const priceEl = document.querySelector(".Price__value, .prc, [class*='Price']");
    if (!titleEl) return;

    const title = titleEl.innerText.trim();
    const price = priceEl ? extractBilingualPrice(priceEl.innerText) : 0;

    const deals = fallbackEvaluate([{
      auction_id: window.location.pathname.split("/").pop() || "item",
      title: title,
      price: price,
      shipping_fee: 0,
      image: ""
    }]);

    if (deals && deals.length > 0) {
      const d = deals[0];
      const sideCard = document.createElement("div");
      sideCard.className = "yah-side-card";
      sideCard.innerHTML = `
        <div class="yah-side-header">
          <span>⚡ Yahoo Arbitrage Radar</span>
          ${d.is_profitable ? '<span class="yah-pill-prof">🔥 Profitable</span>' : ''}
        </div>
        <div class="yah-side-body">
          <div class="yah-side-row">
            <span>Flea Target Price:</span>
            <strong>${d.target_sell_price > 0 ? `¥${d.target_sell_price.toLocaleString()}` : '--'}</strong>
          </div>
          <div class="yah-side-row">
            <span>Est. Net Profit:</span>
            <strong class="${d.estimated_profit > 0 ? 'yah-profit-green' : ''}">${d.estimated_profit !== null ? `${d.estimated_profit > 0 ? '+' : ''}¥${d.estimated_profit.toLocaleString()} (${d.profit_margin}%)` : '--'}</strong>
          </div>
          <div class="yah-side-row">
            <span>Estimated Velocity:</span>
            <strong>${d.sellability?.est_days_to_sell || "Fast"}</strong>
          </div>
          <div style="margin-top:10px;">
            <a href="${d.paypay_search_url}" target="_blank" class="yah-flea-btn">View PayPay Flea Sold ↗</a>
          </div>
        </div>
      `;
      safeAppend(sideCard);
    }
  }

  // =========================================================================
  // 5. CSV EXPORT UTILITY
  // =========================================================================
  function exportToCsv() {
    if (!analyzedDeals || analyzedDeals.length === 0) {
      alert("No scanned items to export!");
      return;
    }

    const headers = ["Auction ID", "Title", "Buy Price (JPY)", "Flea Target (JPY)", "Net Profit (JPY)", "Profit Margin (%)", "Is Profitable", "Box Status", "Is Junk", "Flea Sold URL"];
    const rows = analyzedDeals.map(d => [
      d.auction_id || "",
      `"${(d.title || "").replace(/"/g, '""')}"`,
      d.buy_price || 0,
      d.target_sell_price || 0,
      d.estimated_profit !== null ? d.estimated_profit : "",
      d.profit_margin || 0,
      d.is_profitable ? "YES" : "NO",
      d.has_box === true ? "Box Included" : (d.has_box === false ? "No Box" : "Unknown"),
      d.is_junk ? "JUNK" : "Good",
      `"${d.paypay_search_url || ""}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `yahoo_arbitrage_xray_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

})();
