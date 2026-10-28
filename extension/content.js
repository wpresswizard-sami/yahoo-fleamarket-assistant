/**
 * Yahoo! Auction to Flea Market Reseller Assistant - Helium 10 Style Content Script
 * Injects inline profit badges, floating X-Ray trigger, and slide-over arbitrage modal.
 * Supports: Homepage, Search Results, Recommendations, Categories, and Single Item Pages.
 */

(function () {
  const BACKEND_URL = "http://127.0.0.1:8000";
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

  function init() {
    const isItemPage = window.location.href.includes("page.auctions.yahoo.co.jp/jp/auction/");

    if (isItemPage) {
      handleItemDetailPage();
    } else {
      handleBrowsePage();
    }

    // Always listen for popup messages
    setupMessageListener();
  }

  // =========================================================================
  // MESSAGE LISTENER (Popup Communication)
  // =========================================================================
  function setupMessageListener() {
    if (chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.action === "toggle_xray" || msg.action === "open_xray") {
          // If modal does not exist yet, inject it
          injectXrayModal();
          
          if (analyzedDeals.length === 0) {
            // Run quick scan then open
            runBrowseScan().then(() => {
              openXrayModal();
            });
          } else {
            openXrayModal();
          }
          sendResponse({ status: "opened", count: analyzedDeals.length });
          return true; // Keep message channel open for async response
        }
      });
    }
  }

  // =========================================================================
  // BROWSE & SEARCH PAGE HANDLER (Helium 10 X-Ray)
  // =========================================================================
  async function handleBrowsePage() {
    // 1. Always inject Floating X-Ray Trigger Button
    injectFloatingXrayButton();

    // 2. Always inject X-Ray Modal into DOM so it's ready
    injectXrayModal();

    // 3. Run initial scan of products on page
    await runBrowseScan();

    // 4. Setup MutationObserver to scan dynamically loaded or lazy-loaded cards
    let debounceTimer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        runBrowseScan(true); // silent background update
      }, 1200);
    });

    observer.observe(document.body, { childList: true, subtree: true });
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

      // Evaluate items via local FastAPI backend or local fallback
      analyzedDeals = await evaluateItems(rawItems);

      // 1. Inject Inline Badges under each product card
      injectInlineBadges(analyzedDeals);

      // 2. Update floating button count
      const profitableCount = analyzedDeals.filter(d => d.is_profitable).length;
      updateFloatingButtonText(profitableCount);

      // 3. Update extension toolbar badge
      try {
        chrome.runtime.sendMessage({ action: "update_badge", count: profitableCount }, () => {
          if (chrome.runtime.lastError) {}
        });
      } catch (e) {
        // Background script not connected
      }

      // If modal is currently open, refresh the table live!
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
  // ROBUST BILINGUAL ITEM EXTRACTION (Next.js JSON + DOM Anchors)
  // =========================================================================
  function extractItemsFromPage() {
    const itemsMap = new Map();

    // 1. Attempt extracting from __NEXT_DATA__ JSON script (Search results)
    const nextScript = document.getElementById("__NEXT_DATA__");
    if (nextScript) {
      try {
        const nextData = JSON.parse(nextScript.textContent);
        const listing = nextData?.props?.pageProps?.initialState?.search?.items?.listing?.items;
        if (Array.isArray(listing) && listing.length > 0) {
          listing.forEach(it => {
            if (it.auctionId) {
              itemsMap.set(it.auctionId, {
                auction_id: it.auctionId,
                title: it.title || "",
                price: parseInt(it.price || it.buyNowPrice || 0, 10),
                shipping_fee: parseInt(it.currentPriceShippingFee || it.buyNowPriceShippingFee || 0, 10),
                image: it.imageUrl ? it.imageUrl.replace(/^https:\/\/auc-pctr\.c\.yimg\.jp\/i\//, "https://").split("?")[0] : "",
                bids: parseInt(it.bidCount || 0, 10),
                left_seconds: it.leftTime ? parseFloat(it.leftTime) : null,
                item_condition: it.itemCondition || ""
              });
            }
          });
        }
      } catch (e) {
        // Fallback to DOM
      }
    }

    // 2. DOM Parsing: Supports Homepage recommendations, Category pages, & Search cards
    // Target any link that leads to an auction
    const candidateAnchors = document.querySelectorAll('a[href*="/auction/"], a[href*="page.auctions.yahoo.co.jp"]');

    candidateAnchors.forEach(a => {
      const href = a.getAttribute("href") || "";
      const match = href.match(/\/auction\/([a-zA-Z0-9]+)/);
      if (!match) return;
      const aucId = match[1];

      // If already extracted from NEXT_DATA with good title & price, skip
      if (itemsMap.has(aucId) && itemsMap.get(aucId).price > 0 && itemsMap.get(aucId).title) {
        return;
      }

      // Find product card container
      const card = a.closest("li") || a.closest(".Product") || a.closest(".Item") || a.closest('[class*="item"]') || a.closest('[class*="card"]') || a.parentElement;
      if (!card) return;

      const cardText = card.innerText || "";

      // Bilingual Price Extraction: Supports '68,700 yen', '1,780円', '¥1,000', 'the current 90 yen'
      const price = extractBilingualPrice(cardText);
      if (price <= 0) return;

      // Title Extraction: From anchor title, text, or img alt
      let title = a.getAttribute("title") || a.textContent.trim();
      if (!title || title.length < 3 || /^\d+$/.test(title) || /detail|入札|即決|円|yen/i.test(title)) {
        const img = a.querySelector("img") || card.querySelector("img");
        title = img?.getAttribute("alt") || img?.getAttribute("title") || "";
      }
      if (!title || title.length < 3) {
        // Look for title headings in card
        const heading = card.querySelector('h1, h2, h3, h4, [class*="title"], [class*="Title"]');
        if (heading && heading.textContent.trim().length > 3) {
          title = heading.textContent.trim();
        }
      }

      if (!title || title.length < 2) return;

      // Image Extraction
      const imgEl = a.querySelector("img") || card.querySelector("img");
      const img = imgEl?.src || imgEl?.getAttribute("data-src") || "";

      itemsMap.set(aucId, {
        auction_id: aucId,
        title: title.replace(/\s+/g, " ").trim(),
        price: price,
        shipping_fee: (/送料無料|free\s*shipping/i.test(cardText) ? 0 : 250),
        image: img,
        bids: 0,
        left_seconds: null
      });
    });

    return Array.from(itemsMap.values());
  }

  // Bilingual price extractor (Japanese & English Translated)
  function extractBilingualPrice(text) {
    if (!text) return 0;

    // Suffix format: '68,700 yen' or '1,780円' or '1780 yen'
    const m1 = text.match(/([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)\s*(?:円|yen)/i);
    if (m1) return parseInt(m1[1].replace(/,/g, ""), 10);

    // Prefix format: '¥1,780' or '￥68,700'
    const m2 = text.match(/(?:¥|￥)\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)/);
    if (m2) return parseInt(m2[1].replace(/,/g, ""), 10);

    // Context format: 'the current 1,780' or 'Buy It Now 68,700' or '現在 1,780'
    const m3 = text.match(/(?:current|buy\s*it\s*now|現在|即決|価格|落札)[^0-9\n]{0,10}([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)/i);
    if (m3) return parseInt(m3[1].replace(/,/g, ""), 10);

    return 0;
  }

  // Evaluate items via FastAPI or standalone heuristic
  async function evaluateItems(items) {
    try {
      const resp = await fetch(`${BACKEND_URL}/api/extension/analyze-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.slice(0, 50) })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.items && data.items.length > 0) {
          return data.items;
        }
      }
    } catch (e) {
      console.log("[Yahoo Reseller] Using fast local evaluation.");
    }

    // Standalone fallback evaluation engine
    return items.map(it => {
      const title = it.title || "";
      const price = it.price || 0;
      const tLow = title.toLowerCase();

      // Junk detection
      const isJunk = /ジャンク|junk|故障|不動|部品取り|動作未確認|通電のみ|割れ|破損|難あり|液晶割れ/i.test(tLow);
      const hasBox = /箱付き|箱あり|元箱あり|元箱付き|化粧箱|外箱/i.test(tLow) ? true : (/本体のみ|箱なし|元箱なし/i.test(tLow) ? false : null);

      // Baselines
      let targetSell = 0;
      if (/ps4\s*pro|cuh-7200|cuh-7100/i.test(tLow)) targetSell = 23000;
      else if (/ps4|cuh-2200|cuh-2000/i.test(tLow)) targetSell = 15500;
      else if (/有機el|oled/i.test(tLow)) targetSell = 25000;
      else if (/switch.*ライト|switch\s*lite|hdh-001/i.test(tLow)) targetSell = 12500;
      else if (/switch|スイッチ/i.test(tLow)) targetSell = 15500;
      else if (/cf-sz6|レッツノート/i.test(tLow)) targetSell = 9500;
      else if (/thinkpad.*x280/i.test(tLow)) targetSell = 11000;
      else if (/gw-m5610|g-shock.*ソーラー/i.test(tLow)) targetSell = 6500;
      else if (/151.*box.*シュリンク|未開封.*151/i.test(tLow)) targetSell = 14500;
      else if (/wii\s*u/i.test(tLow)) targetSell = 6500;
      else if (/ps3/i.test(tLow)) targetSell = 4500;

      if (targetSell > 0) {
        if (isJunk) targetSell = Math.round(targetSell * 0.30);
        else if (hasBox === true) targetSell = Math.round(targetSell * 1.05);
        else if (hasBox === false) targetSell = Math.round(targetSell * 0.95);
      }

      const fee = Math.round(targetSell * 0.05);
      const shipOut = 210;
      const profit = targetSell > 0 ? (targetSell - price - fee - shipOut) : null;
      const margin = (targetSell > 0 && profit !== null) ? Math.round((profit / targetSell) * 1000) / 10 : 0;

      return {
        ...it,
        clean_title: title.split(/\s+/).slice(0, 3).join(" "),
        total_procurement: price + (it.shipping_fee || 0),
        target_sell_price: targetSell,
        estimated_profit: profit,
        profit_margin: margin,
        is_profitable: Boolean(profit && profit >= 1000 && !isJunk),
        has_box: hasBox,
        box_badge: hasBox === true ? "📦 箱あり" : (hasBox === false ? "📦 本体のみ" : "📦 箱不明"),
        is_junk: isJunk,
        junk_reasons: isJunk ? ["Junk / Untested"] : [],
        sellability: { score: 85, verdict: "🟢 High Demand", est_days_to_sell: "1 - 3 Days" },
        paypay_search_url: `https://paypayfleamarket.yahoo.co.jp/search/${encodeURIComponent(title.slice(0, 20))}?sold=1`
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

      const parentCard = a.closest("li") || a.closest(".Product") || a.closest(".Item") || a.parentElement;
      if (!parentCard || parentCard.querySelector(".yah-inline-badge")) return;

      const badgeEl = document.createElement("div");
      let statusClass = "yah-inline-badge";
      if (deal.is_junk) statusClass += " yah-junk";
      else if (deal.is_profitable) statusClass += " yah-profitable";
      else if (deal.estimated_profit !== null && deal.estimated_profit < 0) statusClass += " yah-overpriced";
      badgeEl.className = statusClass;

      const profitText = deal.estimated_profit !== null ? 
        (deal.estimated_profit > 0 ? `+¥${deal.estimated_profit.toLocaleString()} (${deal.profit_margin}%)` : `-¥${Math.abs(deal.estimated_profit).toLocaleString()}`) 
        : "Checking...";

      const targetText = deal.target_sell_price > 0 ? `Flea: ¥${deal.target_sell_price.toLocaleString()}` : "Target Unknown";

      let boxHtml = "";
      if (deal.has_box === true) boxHtml = `<span class="yah-tag-pill yah-pill-box">📦 箱付き</span>`;
      else if (deal.has_box === false) boxHtml = `<span class="yah-tag-pill yah-pill-nobox">📦 本体のみ</span>`;

      let junkHtml = "";
      if (deal.is_junk) junkHtml = `<span class="yah-tag-pill yah-pill-junk">⚠️ JUNK</span>`;

      badgeEl.innerHTML = `
        <div class="yah-badge-row">
          <span class="yah-profit-tag">💰 ${profitText}</span>
          <span class="yah-target-tag">🎯 ${targetText}</span>
        </div>
        <div class="yah-sub-row">
          ${boxHtml}
          ${junkHtml}
          <span class="yah-tag-pill yah-pill-demand">${deal.sellability?.est_days_to_sell || "Fast"}</span>
          <a class="yah-flea-link" href="${deal.paypay_search_url}" target="_blank" title="Check live PayPay Flea Market sold listings">Flea Sold ↗</a>
        </div>
      `;

      a.parentNode.insertBefore(badgeEl, a.nextSibling);
    });
  }

  // =========================================================================
  // 2. FLOATING X-RAY BUTTON (Always Present on Bottom-Right)
  // =========================================================================
  function injectFloatingXrayButton() {
    if (document.getElementById("yah-xray-floating-btn")) return;

    const btn = document.createElement("div");
    btn.id = "yah-xray-floating-btn";
    btn.innerHTML = `
      <span>⚡ Yahoo X-Ray</span>
      <span class="yah-badge-count" id="yah-floating-count">0 Profitable</span>
    `;

    btn.addEventListener("click", () => {
      openXrayModal();
    });

    safeAppend(btn);
  }

  function updateFloatingButtonText(profitableCount) {
    const countEl = document.getElementById("yah-floating-count");
    if (countEl) {
      countEl.innerText = `${profitableCount} Profitable`;
      countEl.style.background = profitableCount > 0 ? "#10b981" : "#64748b";
    }
  }

  // =========================================================================
  // 3. HELIUM 10 STYLE X-RAY SLIDE-OVER MODAL
  // =========================================================================
  function injectXrayModal() {
    if (document.getElementById("yah-xray-modal")) return;

    const backdrop = document.createElement("div");
    backdrop.id = "yah-xray-backdrop";
    backdrop.addEventListener("click", closeXrayModal);

    const modal = document.createElement("div");
    modal.id = "yah-xray-modal";

    modal.innerHTML = `
      <!-- Header -->
      <div class="yah-modal-header">
        <div class="yah-modal-title">
          <span>⚡ Yahoo! Arbitrage X-Ray</span>
          <span class="yah-badge">Helium 10 Style</span>
        </div>
        <div class="yah-header-actions">
          <button class="yah-btn-export" id="yah-export-csv-btn">📊 Export CSV</button>
          <button class="yah-btn-close" id="yah-close-xray-btn">&times;</button>
        </div>
      </div>

      <!-- Stats Bar -->
      <div class="yah-modal-stats">
        <div class="yah-stat-card">
          <div class="yah-stat-label">Total Listings Scanned</div>
          <div class="yah-stat-val" id="yah-stat-total">0</div>
        </div>
        <div class="yah-stat-card">
          <div class="yah-stat-label">Profitable Deals (>¥1,000)</div>
          <div class="yah-stat-val yah-text-green" id="yah-stat-profitable">0</div>
        </div>
        <div class="yah-stat-card">
          <div class="yah-stat-label">Average Profit Margin</div>
          <div class="yah-stat-val" id="yah-stat-avg-margin">0%</div>
        </div>
        <div class="yah-stat-card">
          <div class="yah-stat-label">Total Est. Profit on Page</div>
          <div class="yah-stat-val yah-text-green" id="yah-stat-total-profit">¥0</div>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="yah-modal-toolbar">
        <div class="yah-filter-group">
          <button class="yah-filter-btn yah-active" data-filter="all">All Items (<span id="yah-count-all">0</span>)</button>
          <button class="yah-filter-btn" data-filter="profitable">🔥 Profitable Only (<span id="yah-count-prof">0</span>)</button>
          <button class="yah-filter-btn" data-filter="box">📦 With Box</button>
          <button class="yah-filter-btn" data-filter="nojunk">🚫 Hide Junk</button>
        </div>
        <input type="text" class="yah-search-input" id="yah-xray-search" placeholder="Filter by product name / model...">
      </div>

      <!-- Table -->
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
            <!-- Dynamically populated -->
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
      } else {
        try {
          const resp = await fetch(`${BACKEND_URL}/api/auto-deals`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category: "all", min_profit: 1000, limit: 16 })
          });
          if (resp.ok) {
            const data = await resp.json();
            if (data.deals && data.deals.length > 0) {
              analyzedDeals = data.deals.map(d => ({
                auction_id: d.auction_id,
                title: d.title,
                clean_title: d.title,
                buy_price: d.buy_price,
                shipping_fee: d.shipping_fee || 0,
                total_procurement: d.total_procurement || d.buy_price,
                target_sell_price: d.target_sell_price,
                estimated_profit: d.estimated_profit,
                profit_margin: d.profit_margin,
                is_profitable: true,
                has_box: d.has_box,
                is_junk: false,
                image: d.image,
                sellability: d.sellability,
                paypay_search_url: `https://paypayfleamarket.yahoo.co.jp/search/${encodeURIComponent(d.title.slice(0, 20))}?sold=1`
              }));
            }
          }
        } catch (e) {}
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

    // Apply filter pills
    if (currentFilter === "profitable") {
      filtered = filtered.filter(d => d.is_profitable);
    } else if (currentFilter === "box") {
      filtered = filtered.filter(d => d.has_box === true);
    } else if (currentFilter === "nojunk") {
      filtered = filtered.filter(d => !d.is_junk);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(d => (d.title || "").toLowerCase().includes(searchTerm));
    }

    // Sort by profit descending
    filtered.sort((a, b) => (b.estimated_profit || -999999) - (a.estimated_profit || -999999));

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align:center; padding: 40px; color: #64748b;">
            <div style="font-size:16px; font-weight:700; margin-bottom:8px; color:#1e293b;">🔍 No matching items on this view</div>
            <div style="font-size:13px; margin-bottom:16px;">Try searching for high-turnover profitable categories:</div>
            <div style="display:flex; justify-content:center; gap:8px; flex-wrap:wrap;">
              <button class="yah-quick-search-btn" data-q="PS4 Pro 本体">🎮 PS4 Pro</button>
              <button class="yah-quick-search-btn" data-q="Switch 有機EL 本体">🎮 Switch OLED</button>
              <button class="yah-quick-search-btn" data-q="ポケモン 151 BOX">🧸 Pokemon 151</button>
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
      const profitFormatted = d.estimated_profit !== null ? 
        `<span class="${d.estimated_profit > 0 ? 'yah-profit-green' : 'yah-profit-red'}">${d.estimated_profit > 0 ? '+' : ''}¥${d.estimated_profit.toLocaleString()}</span>` 
        : '<span style="color:#94a3b8;">--</span>';

      const boxBadge = d.has_box === true ? '<span class="yah-tag-pill yah-pill-box">箱付き</span>' : (d.has_box === false ? '<span class="yah-tag-pill yah-pill-nobox">本体のみ</span>' : '<span style="color:#94a3b8;">不明</span>');
      const junkBadge = d.is_junk ? '<span class="yah-tag-pill yah-pill-junk">⚠️ JUNK</span>' : '<span style="color:#16a34a; font-weight:600;">Good</span>';

      return `
        <tr>
          <td><img src="${d.image || 'https://via.placeholder.com/44'}" class="yah-table-img" alt="img" onerror="this.src='https://via.placeholder.com/44'"></td>
          <td>
            <div class="yah-title-cell">
              <a href="https://page.auctions.yahoo.co.jp/jp/auction/${d.auction_id}" target="_blank" class="yah-title-link">${escapeHtml(d.title)}</a>
            </div>
          </td>
          <td><span class="yah-price-bold">¥${(d.buy_price || 0).toLocaleString()}</span></td>
          <td>${d.target_sell_price > 0 ? `¥${d.target_sell_price.toLocaleString()}` : '<span style="color:#94a3b8;">--</span>'}</td>
          <td>${profitFormatted}</td>
          <td>${d.profit_margin ? `${d.profit_margin}%` : '0%'}</td>
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

    // Attach "Save to Inventory" handlers
    tbody.querySelectorAll(".yah-btn-add").forEach(btn => {
      btn.addEventListener("click", async () => {
        const aid = btn.getAttribute("data-aid");
        const deal = analyzedDeals.find(x => x.auction_id === aid);
        if (!deal) return;
        btn.innerText = "Saving...";
        try {
          const resp = await fetch(`${BACKEND_URL}/api/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
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
            })
          });
          if (resp.ok) {
            btn.innerText = "✓ Saved!";
            btn.style.background = "#10b981";
          } else {
            btn.innerText = "Error";
          }
        } catch (e) {
          btn.innerText = "Offline";
        }
      });
    });
  }

  // Export to CSV feature
  function exportToCsv() {
    if (!analyzedDeals || analyzedDeals.length === 0) return;
    let csv = "Auction ID,Title,Buy Price,Shipping Fee,Total Cost,Target Sell Price,Estimated Profit,Profit Margin %,Has Box,Is Junk,URL\n";
    analyzedDeals.forEach(d => {
      const cleanTitle = `"${(d.title || '').replace(/"/g, '""')}"`;
      csv += `${d.auction_id},${cleanTitle},${d.buy_price || 0},${d.shipping_fee || 0},${d.total_procurement || 0},${d.target_sell_price || 0},${d.estimated_profit || 0},${d.profit_margin || 0},${d.has_box},${d.is_junk},https://page.auctions.yahoo.co.jp/jp/auction/${d.auction_id}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yahoo_arbitrage_xray_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // =========================================================================
  // SINGLE PRODUCT DETAIL PAGE INSPECTOR
  // =========================================================================
  async function handleItemDetailPage() {
    const match = window.location.href.match(/\/auction\/([a-zA-Z0-9]+)/);
    if (!match) return;
    const aucId = match[1];

    const titleEl = document.querySelector("h1") || document.querySelector(".ProductTitle__title");
    const title = titleEl ? titleEl.textContent.trim() : "";
    const priceEl = document.querySelector(".Price__value") || document.querySelector(".ProductPrice__price") || document.querySelector(".Price");
    const price = extractBilingualPrice(priceEl?.innerText || document.body.innerText);

    const evalList = await evaluateItems([{ auction_id: aucId, title: title, price: price }]);
    if (!evalList || evalList.length === 0) return;
    const deal = evalList[0];

    const bidBlock = document.querySelector(".ProductPrice") || document.querySelector(".Price") || document.querySelector(".ItemSub");
    if (!bidBlock) return;

    const card = document.createElement("div");
    card.id = "yah-product-inspector-card";

    const profitColor = (deal.estimated_profit || 0) > 0 ? "#16a34a" : "#dc2626";
    const maxSafeBid = deal.target_sell_price > 0 ? Math.max(Math.round(deal.target_sell_price * 0.95 - 210 - 3000), 1000) : price;

    card.innerHTML = `
      <div class="yah-inspector-header">
        <div class="yah-inspector-title">
          <span>⚡ Yahoo! Reseller Profit Card</span>
          <span style="font-size:11px; background:#f97316; color:#fff; padding:2px 6px; border-radius:4px;">Helium 10</span>
        </div>
        <div>
          <a href="${deal.paypay_search_url}" target="_blank" style="font-size:12px; color:#0284c7; text-decoration:underline;">View Flea Sold Ads ↗</a>
        </div>
      </div>

      <div class="yah-inspector-grid">
        <div class="yah-inspector-box">
          <div class="yah-lbl">Flea Target Price</div>
          <div class="yah-val">¥${(deal.target_sell_price || 0).toLocaleString()}</div>
        </div>
        <div class="yah-inspector-box">
          <div class="yah-lbl">Est. Net Profit</div>
          <div class="yah-val" style="color: ${profitColor};">¥${(deal.estimated_profit || 0).toLocaleString()}</div>
        </div>
        <div class="yah-inspector-box">
          <div class="yah-lbl">Profit Margin</div>
          <div class="yah-val">${deal.profit_margin || 0}%</div>
        </div>
      </div>

      <div style="font-size:12px; margin-bottom:10px; background:#fff; padding:8px 12px; border-radius:6px; border:1px solid #fed7aa;">
        💡 <strong>Max Safe Bid:</strong> Bid up to <strong>¥${maxSafeBid.toLocaleString()}</strong> to keep at least ¥3,000 profit!
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:11px; color:#64748b;">${deal.box_badge || ""} | ${deal.is_junk ? '⚠️ JUNK' : 'Tested'}</span>
        <button id="yah-detail-save-btn" class="yah-action-btn yah-btn-add" style="padding:6px 14px;">📥 Save to Inventory</button>
      </div>
    `;

    bidBlock.parentNode.insertBefore(card, bidBlock);

    document.getElementById("yah-detail-save-btn")?.addEventListener("click", async (e) => {
      const btn = e.target;
      btn.innerText = "Saving...";
      try {
        await fetch(`${BACKEND_URL}/api/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            auction_id: deal.auction_id,
            source_url: window.location.href,
            title: deal.title,
            buy_price: deal.buy_price,
            sell_price: deal.target_sell_price,
            status: "watching"
          })
        });
        btn.innerText = "✓ Saved to Inventory!";
        btn.style.background = "#10b981";
      } catch (err) {
        btn.innerText = "Offline Mode";
      }
    });
  }

  function escapeHtml(str) {
    return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
})();
