// Yahoo! Auction to Flea Market Reseller Pro - Frontend Application Logic

const PILL_TRANSLATIONS = {
    "【極美品】": "[Mint Condition]",
    "【新品未使用】": "[Brand New]",
    "【送料無料】": "[Free Shipping]",
    "【即購入OK】": "[Instant Buy OK]",
    "【24時間以内発送】": "[Fast 24h Ship]",
    "【匿名配送】": "[Anonymous Delivery]",
    "【限定特価】": "[Special Sale]",
    "【おまけ付】": "[Bonus Included]",
    "【動作確認済】": "[Operation Tested]",
    "【正規品】": "[100% Authentic]"
};

// Rich Sample Products (Each with Multiple Photos, Proven Profit & Formatted Listing in English)
const SAMPLE_PRODUCTS = [
    {
        name: "Nintendo Switch OLED",
        title: "Nintendo Switch OLED White Joy-Con - Complete Box, Mint Condition",
        title_ja: "Nintendo Switch (有機ELモデル) Joy-Con ホワイト 美品 完品",
        buy_price: 24000,
        estimated_inbound_shipping: 0,
        sell_price: 31500,
        shipping_out: 750,
        condition: "Near Mint / No Scratches",
        condition_ja: "目立った傷や汚れなし",
        description: "Operation confirmed. Main console, Joy-Cons, dock, HDMI and AC adapter are fully included. Tempered glass screen protector applied from day one, screen is spotless with zero scratches. Sanitized and packed for fast dispatch.",
        description_ja: "動作確認済み、本体およびJoy-Con・ドック・ケーブル類すべて揃っております。画面にはガラスフィルムを貼っていたためキズ等なく非常に綺麗な状態です。丁寧かつ迅速に発送いたします。",
        images: [
            "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=800&q=80",
            "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&q=80",
            "https://images.unsplash.com/photo-1592478411213-6153e4ebc07d?w=800&q=80",
            "https://images.unsplash.com/photo-1612287271032-bb953ce0a3e3?w=800&q=80"
        ]
    },
    {
        name: "Casio G-Shock",
        title: "CASIO G-SHOCK GW-M5610U Solar Radio Multi-Band 6 Black - Mint",
        title_ja: "CASIO G-SHOCK GW-M5610U 電波ソーラー ブラック 極美品",
        buy_price: 8000,
        estimated_inbound_shipping: 0,
        sell_price: 13500,
        shipping_out: 210,
        condition: "Like New / Pristine",
        condition_ja: "未使用に近い",
        description: "Listing from personal collection. Radio time reception and solar charging operating flawlessly. Comes complete with original box and manual. Clean with zero noticeable scratches or scuffs.",
        description_ja: "コレクション整理のため出品いたします。電波受信・ソーラー充電ともに正常稼働中。箱・取扱説明書完備。目立った傷やスレのない極美品です。",
        images: [
            "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&q=80",
            "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80",
            "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80",
            "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?w=800&q=80",
            "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80"
        ]
    },
    {
        name: "Sony Headphones",
        title: "Sony WH-1000XM4 Wireless Noise Cancelling Headphones Black",
        title_ja: "Sony WH-1000XM4 ワイヤレス ノイズキャンセリング ヘッドホン ブラック",
        buy_price: 16000,
        estimated_inbound_shipping: 0,
        sell_price: 23000,
        shipping_out: 520,
        condition: "Very Good Condition",
        condition_ja: "目立った傷や汚れなし",
        description: "Premium sound quality and active noise cancellation. Battery health is great, ear pads and headband are clean without wear. Comes with carrying case, airplane adapter, and USB-C cable. Instant purchase is welcome.",
        description_ja: "高音質ノイズキャンセリングヘッドホンです。バッテリー持ちも良好で目立つ汚れはありません。専用ケース、航空機アダプタ、充電ケーブル付属。即購入大歓迎です。",
        images: [
            "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
            "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&q=80",
            "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&q=80",
            "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&q=80"
        ]
    },
    {
        name: "Canon Lens",
        title: "Canon EF 50mm F1.8 STM Prime Lens with Filter & Hood - Sharp & Clean",
        title_ja: "Canon 単焦点レンズ EF 50mm F1.8 STM フィルター・フード付 美品",
        buy_price: 14000,
        estimated_inbound_shipping: 0,
        sell_price: 20500,
        shipping_out: 520,
        condition: "Clean Optics / Very Good",
        condition_ja: "目立った傷や汚れなし",
        description: "Bright prime lens perfect for portraits and everyday photography with smooth bokeh. Optics are pristine with no haze or fungus. Includes front/rear lens caps, ES-68 lens hood, and UV protection filter.",
        description_ja: "ポートレートや日常スナップに最適な明るい単焦点レンズです。くもり・カビ等なくクリアな光学系です。前後キャップ、レンズフード、プロテクトフィルターをお付けします。",
        images: [
            "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80",
            "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80",
            "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80"
        ]
    }
];

let currentAuction = {
    auction_id: "",
    url: "",
    title: "",
    buy_price: 0,
    buy_it_now_price: 0,
    description: "",
    condition: "目立った傷や汚れなし",
    shipping_buyer_pays: true,
    estimated_inbound_shipping: 0,
    images: [],
    seller_id: ""
};

let currentPlatform = "yahoo_flea";
let metaData = {
    shipping_methods: [],
    platforms: {},
    templates: [],
    keyword_pills: []
};

let currentSuggestions = {};
let inventoryFilter = "all";
let inventorySearchQuery = "";

const SEARCH_HISTORY_KEY = "reseller_search_history_v1";
const LAST_SEARCH_KEY = "reseller_last_search_v1";

// Get search history from localStorage
function getLocalSearchHistory() {
    try {
        const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

// Save a search to history and remember as last active search
function saveSearchToHistory(query, resultsCount = 0, items = []) {
    if (!query || !query.trim()) return;
    const cleanQuery = query.trim();

    // 1. Save last search state with items so reload restores everything!
    try {
        localStorage.setItem(LAST_SEARCH_KEY, JSON.stringify({
            query: cleanQuery,
            resultsCount: resultsCount,
            items: items || [],
            timestamp: Date.now()
        }));
    } catch (e) {}

    // 2. Update list of recent searches (unique, max 12)
    let history = getLocalSearchHistory();
    history = history.filter(h => (typeof h === 'string' ? h : h.query).toLowerCase() !== cleanQuery.toLowerCase());
    history.unshift({
        query: cleanQuery,
        count: resultsCount,
        timestamp: Date.now()
    });
    if (history.length > 12) history = history.slice(0, 12);

    try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {}

    renderSearchHistory(history);
}

// Render search history chips in the UI
function renderSearchHistory(history = null) {
    const container = document.getElementById("search-history-container");
    const chipsBox = document.getElementById("search-history-chips");
    if (!container || !chipsBox) return;

    if (!history) {
        history = getLocalSearchHistory();
    }

    if (!history || history.length === 0) {
        container.classList.add("hidden");
        chipsBox.innerHTML = "";
        return;
    }

    container.classList.remove("hidden");
    chipsBox.innerHTML = "";

    history.forEach(item => {
        const queryText = typeof item === 'string' ? item : item.query;
        const count = typeof item === 'object' && item.count ? item.count : null;

        const chip = document.createElement("div");
        chip.className = "inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg text-xs font-bold transition group";
        
        chip.innerHTML = `
            <button type="button" class="flex items-center space-x-1" title="Click to search '${queryText}' again">
                <i data-lucide="clock" class="w-3 h-3 text-blue-500"></i>
                <span>${queryText}</span>
                ${count ? `<span class="text-[10px] bg-blue-200/80 text-blue-800 px-1.5 py-0.2 rounded-full font-bold ml-1">${count}</span>` : ''}
            </button>
            <button type="button" class="text-blue-400 hover:text-rose-600 transition ml-1 p-0.5" title="Remove '${queryText}' from history">
                <i data-lucide="x" class="w-3 h-3"></i>
            </button>
        `;

        // Click on query -> triggers search
        const searchBtn = chip.querySelector("button:first-child");
        searchBtn.onclick = () => quickSearch(queryText);

        // Click on X -> removes item
        const removeBtn = chip.querySelector("button:last-child");
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removeSearchHistoryItem(queryText);
        };

        chipsBox.appendChild(chip);
    });

    if (window.lucide) {
        try { lucide.createIcons(); } catch(e) {}
    }
}

// Remove single query from history
function removeSearchHistoryItem(query) {
    let history = getLocalSearchHistory();
    history = history.filter(h => (typeof h === 'string' ? h : h.query).toLowerCase() !== query.toLowerCase());
    try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {}

    try {
        const lastRaw = localStorage.getItem(LAST_SEARCH_KEY);
        if (lastRaw) {
            const last = JSON.parse(lastRaw);
            if (last.query && last.query.toLowerCase() === query.toLowerCase()) {
                localStorage.removeItem(LAST_SEARCH_KEY);
            }
        }
    } catch (e) {}

    // Sync with backend API
    fetch(`/api/search-history?query=${encodeURIComponent(query)}`, { method: "DELETE" }).catch(() => {});

    renderSearchHistory(history);
    showToast(`Removed "${query}" from search history`);
}

// Clear all search history
function clearSearchHistory() {
    try {
        localStorage.removeItem(SEARCH_HISTORY_KEY);
        localStorage.removeItem(LAST_SEARCH_KEY);
    } catch (e) {}

    // Sync with backend API
    fetch("/api/search-history", { method: "DELETE" }).catch(() => {});

    renderSearchHistory([]);
    showToast("Search history cleared");
}

// Restore last search upon page reload
function restoreLastSearch() {
    try {
        const raw = localStorage.getItem(LAST_SEARCH_KEY);
        if (!raw) return false;
        const last = JSON.parse(raw);
        if (!last || !last.query) return false;

        const input = document.getElementById("input-url");
        if (input) {
            input.value = last.query;
        }

        renderSearchHistory();

        // If we saved the results, render them immediately so user sees their previous cards!
        if (last.items && last.items.length > 0) {
            renderSearchResults(last.items, last.query);
            // Load the top item into editor
            scrapeAuctionById(last.items[0].auction_id, true);
            showToast(`Restored search for "${last.query}" (${last.items.length} items)`);
            return true;
        } else {
            handleScrape();
            return true;
        }
    } catch (e) {
        return false;
    }
}

// Initialize App
document.addEventListener("DOMContentLoaded", async () => {
    if (window.lucide) {
        try { lucide.createIcons(); } catch(e) {}
    }
    renderSearchHistory();
    await loadMetadata();
    await loadInventory();
    await loadStats();

    // Check if user had a previous search before reload!
    const restored = restoreLastSearch();
    if (!restored) {
        // Only load first sample product if there is no previous search to restore
        loadSampleProduct(0);
    }
});

// Render Keyword Pills
function renderKeywordPills() {
    const pillsContainer = document.getElementById("keyword-pills-container");
    if (!pillsContainer) return;
    pillsContainer.innerHTML = "";
    (metaData.keyword_pills || []).forEach(pill => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "px-2 py-0.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-slate-200 rounded text-[11px] font-bold text-slate-700 transition flex items-center space-x-1";
        btn.innerText = PILL_TRANSLATIONS[pill] || pill;
        btn.onclick = () => insertKeywordPill(pill);
        pillsContainer.appendChild(btn);
    });
}

// Load Metadata from API
async function loadMetadata() {
    try {
        const res = await fetch("/api/meta");
        metaData = await res.json();
        
        // Sync search history from backend if local history is empty
        if (metaData.search_history && metaData.search_history.length > 0) {
            let local = getLocalSearchHistory();
            if (local.length === 0) {
                try {
                    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(metaData.search_history));
                } catch(e) {}
            }
        }
        renderSearchHistory();

        renderKeywordPills();

        // Populate Outbound Shipping Methods Dropdown in English
        const shipSelect = document.getElementById("calc-shipping-method");
        if (shipSelect) {
            shipSelect.innerHTML = "";
            const englishShippingNames = {
                "nekopos": "Nekopos (Yamato) - A4, up to 3cm / 1kg",
                "yu_packet_post": "Yu-Packet Post - Postbox slot / up to 2kg",
                "takkyubin_compact": "Takkyubin Compact (Box incl.) - Small box 25x20x5cm",
                "takkyubin_60": "Takkyubin 60 Size - Up to 60cm / 2kg",
                "takkyubin_80": "Takkyubin 80 Size - Up to 80cm / 5kg",
                "takkyubin_100": "Takkyubin 100 Size - Up to 100cm / 10kg",
                "custom": "Custom Shipping - Manual Input"
            };
            metaData.shipping_methods.forEach(method => {
                const opt = document.createElement("option");
                opt.value = method.cost;
                const enName = englishShippingNames[method.id] || method.name;
                opt.innerText = `${enName} (¥${method.cost.toLocaleString()})`;
                opt.dataset.id = method.id;
                shipSelect.appendChild(opt);
            });
        }

    } catch (err) {
        console.error("Failed to load metadata:", err);
    }
}

// Load Sample Product with Multiple Photos
function loadSampleProduct(index) {
    const item = SAMPLE_PRODUCTS[index];
    if (!item) return;

    currentAuction = {
        auction_id: `SAMPLE-0${index+1}`,
        url: `https://page.auctions.yahoo.co.jp/jp/auction/sample_0${index+1}`,
        title: item.title,
        buy_price: item.buy_price,
        description: item.description,
        condition: item.condition,
        estimated_inbound_shipping: item.estimated_inbound_shipping || 0,
        images: item.images || []
    };

    const urlInput = document.getElementById("input-url");
    if (urlInput) urlInput.value = currentAuction.auction_id;

    populateScrapedData(currentAuction);
    
    const sellEl = document.getElementById("calc-sell-price");
    if (sellEl) sellEl.value = item.sell_price;

    const shipOutEl = document.getElementById("calc-shipping-out");
    if (shipOutEl) shipOutEl.value = item.shipping_out;

    runLiveCalculation();
    showToast(`Loaded ${item.name} with ${item.images.length} photos!`);
}

// Tab Switching
function switchTab(tab) {
    const sourcingTab = document.getElementById("tab-sourcing");
    const inventoryTab = document.getElementById("tab-inventory");
    const sourcingBtn = document.getElementById("tab-btn-sourcing");
    const inventoryBtn = document.getElementById("tab-btn-inventory");

    if (!sourcingTab || !inventoryTab) return;

    if (tab === "sourcing") {
        sourcingTab.classList.remove("hidden");
        inventoryTab.classList.add("hidden");
        if (sourcingBtn) sourcingBtn.className = "px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center space-x-1.5 bg-white text-slate-900 shadow-sm";
        if (inventoryBtn) inventoryBtn.className = "px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center space-x-1.5 text-slate-600 hover:text-slate-900";
    } else {
        sourcingTab.classList.add("hidden");
        inventoryTab.classList.remove("hidden");
        if (inventoryBtn) inventoryBtn.className = "px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center space-x-1.5 bg-white text-slate-900 shadow-sm";
        if (sourcingBtn) sourcingBtn.className = "px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center space-x-1.5 text-slate-600 hover:text-slate-900";
        loadInventory();
        loadStats();
    }
    if (window.lucide) {
        try { lucide.createIcons(); } catch(e) {}
    }
}

let currentSearchResults = [];
let activeSearchAuctionId = "";

// Helper to detect if user input is a specific Yahoo Auction URL / ID or a search keyword
function isAuctionIdOrUrl(val) {
    if (!val) return false;
    val = val.trim();
    if (val.includes("auctions.yahoo.co.jp") || val.includes("/auction/")) {
        return true;
    }
    // Pure numeric ID 8 to 12 digits
    if (/^\d{8,12}$/.test(val)) {
        return true;
    }
    // Single letter followed by 8 to 11 digits (e.g. x1134261895, e1160359000)
    if (/^[a-zA-Z]\d{8,11}$/.test(val)) {
        return true;
    }
    return false;
}

// 1-Click Quick Keyword Search Tag
function quickSearch(keyword) {
    const input = document.getElementById("input-url");
    if (input) {
        input.value = keyword;
    }
    handleScrape();
}

let currentSearchSort = "default";

// Change search sorting (All, Ending Soonest, Most Bids, Buy It Now)
function changeSearchSort(sortType) {
    currentSearchSort = sortType;
    const buttons = ["default", "end", "bids", "fixed"];
    buttons.forEach(b => {
        const btn = document.getElementById(`sort-btn-${b}`);
        if (!btn) return;
        if (b === sortType) {
            btn.className = "px-2.5 py-1 rounded-lg text-xs font-bold transition bg-slate-900 text-white shadow-xs";
        } else {
            btn.className = "px-2.5 py-1 rounded-lg text-xs font-bold transition bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 flex items-center space-x-1";
        }
    });

    const urlInput = document.getElementById("input-url");
    const queryVal = urlInput ? urlInput.value.trim() : "";
    if (queryVal && !isAuctionIdOrUrl(queryVal)) {
        handleScrape(sortType);
    }
}

// Handle Search or Direct Auction Scrape
async function handleScrape(sort = currentSearchSort) {
    const urlInput = document.getElementById("input-url");
    let queryVal = urlInput ? urlInput.value.trim() : "";
    
    // Auto-fill sample if user clicked scrape with an empty input box
    if (!queryVal) {
        loadSampleProduct(0);
        return;
    }

    const btn = document.getElementById("btn-scrape");
    const loading = document.getElementById("scrape-loading");
    const loadingText = document.getElementById("loading-text");
    if (btn) btn.disabled = true;
    if (loading) loading.classList.remove("hidden");

    try {
        if (isAuctionIdOrUrl(queryVal)) {
            // Direct auction scrape
            if (loadingText) loadingText.innerText = "Analyzing Yahoo! Auction details & extracting photos...";
            const res = await fetch("/api/scrape", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: queryVal })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || "Failed to parse auction");
            }
            currentAuction = data;
            populateScrapedData(data);
            saveSearchToHistory(queryVal, 1, []);
            showToast("Product details fetched successfully!");
        } else {
            // Keyword live search
            const sortLabel = sort === 'end' ? 'ending soonest' : (sort === 'bids' ? 'most bids' : 'live items');
            if (loadingText) loadingText.innerText = `Searching Yahoo! Auctions live for "${queryVal}" (${sortLabel})...`;
            const res = await fetch("/api/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: queryVal, limit: 12, sort: sort })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || "Search failed");
            }

            if (!data.items || data.items.length === 0) {
                showToast(`No Yahoo! Auctions found for "${queryVal}". Try another keyword!`, true);
                renderSearchResults([], queryVal);
                return;
            }

            // Render matching items grid
            renderSearchResults(data.items, queryVal);
            saveSearchToHistory(queryVal, data.items.length, data.items);
            showToast(`Found ${data.items.length} matching auctions for "${queryVal}"!`);

            // Auto-load top item into price flow banner & editor
            await scrapeAuctionById(data.items[0].auction_id, true);
        }
    } catch (err) {
        showToast(err.message, true);
    } finally {
        if (btn) btn.disabled = false;
        if (loading) loading.classList.add("hidden");
    }
}

// Render Search Results Grid
function renderSearchResults(items, query) {
    currentSearchResults = items || [];
    const section = document.getElementById("search-results-section");
    const heading = document.getElementById("search-results-heading");
    const grid = document.getElementById("search-results-grid");
    if (!section || !grid) return;

    if (!items || items.length === 0) {
        section.classList.remove("hidden");
        if (heading) {
            heading.innerHTML = `
                <i data-lucide="alert-circle" class="w-4 h-4 text-amber-500"></i>
                <span>No results found for "${query}"</span>
            `;
        }
        grid.innerHTML = `
            <div class="col-span-full py-8 text-center text-slate-500 text-xs">
                No active auctions matched "<b>${query}</b>". Try another search keyword (e.g. iPhone, Switch, G-Shock, PS5).
            </div>
        `;
        if (window.lucide) {
            try { lucide.createIcons(); } catch(e) {}
        }
        return;
    }

    section.classList.remove("hidden");
    if (heading) {
        heading.innerHTML = `
            <i data-lucide="layout-grid" class="w-4 h-4 text-red-500"></i>
            <span>Yahoo! Auctions for "<span class="text-red-600 font-bold">${query}</span>" (${items.length} found):</span>
        `;
    }

    grid.innerHTML = "";
    items.forEach((item, idx) => {
        const card = document.createElement("div");
        const isSelected = item.auction_id === activeSearchAuctionId;
        card.id = `search-card-${item.auction_id}`;
        card.className = `cursor-pointer rounded-xl p-2.5 transition-all text-left border relative group bg-white hover:border-red-500 hover:shadow-md ${isSelected ? 'border-red-500 ring-2 ring-red-400/50 bg-red-50/20' : 'border-slate-200'}`;
        card.onclick = () => scrapeAuctionById(item.auction_id);

        const imgUrl = item.image || "https://placehold.co/150x150?text=No+Photo";
        const profitColor = item.estimated_profit >= 0 ? "text-emerald-600" : "text-rose-600";
        const profitBadge = item.estimated_profit >= 0 ? `+¥${item.estimated_profit.toLocaleString()}` : `-¥${Math.abs(item.estimated_profit).toLocaleString()}`;

        const cleanTitle = getCleanFleaMarketQuery(item.title);
        const encodedTitle = encodeURIComponent(cleanTitle || item.title || "");
        const fleaSearchUrl = `https://paypayfleamarket.yahoo.co.jp/search/${encodedTitle}`;
        const yahooAuctionUrl = item.url || `https://page.auctions.yahoo.co.jp/jp/auction/${item.auction_id}`;

        const timeBadgeHtml = item.remaining_time ? 
            `<span class="absolute top-1 right-1 ${item.is_ending_soon ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-900/80 text-amber-300'} text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center space-x-1">
                <span>⏰ ${item.remaining_time}</span>
            </span>` : (item.is_fixed_price ? '<span class="absolute top-1 right-1 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">⚡ Buy Now</span>' : '');

        card.innerHTML = `
            <div class="relative w-full h-24 rounded-lg overflow-hidden bg-slate-100 mb-1.5 border border-slate-100">
                <img src="${imgUrl}" alt="${item.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" onerror="this.src='https://placehold.co/150x150?text=No+Photo'">
                <span class="absolute top-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">#${idx+1}</span>
                ${item.is_free_shipping ? '<span class="absolute bottom-1 right-1 bg-emerald-600 text-white text-[9px] font-bold px-1 py-0.5 rounded">Free Ship</span>' : ''}
                ${timeBadgeHtml}
            </div>

            <!-- Auction Time Left & Bids Bar -->
            <div class="flex items-center justify-between text-[10px] mb-1.5 px-0.5 font-bold">
                <span class="flex items-center space-x-1 ${item.is_ending_soon ? 'text-rose-600 font-extrabold' : 'text-slate-600'}">
                    <i data-lucide="clock" class="w-3 h-3 ${item.is_ending_soon ? 'text-rose-600' : 'text-slate-400'}"></i>
                    <span>${item.remaining_time || (item.is_fixed_price ? '⚡ Buy Now' : 'Live Auction')}</span>
                </span>
                <span class="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60 text-[9px]">
                    ${item.is_fixed_price ? '⚡ Instant' : `${item.bids || 0} bids`}
                </span>
            </div>

            <div class="font-bold text-slate-800 text-[11px] line-clamp-2 leading-tight mb-2 h-7" title="${item.title}">
                ${item.title}
            </div>
            <div class="space-y-1 pt-1 border-t border-slate-100 text-[10px]">
                <div class="flex justify-between items-center text-slate-500">
                    <span>🛒 Buy Price:</span>
                    <b class="text-blue-700 font-bold text-xs">¥${item.buy_price.toLocaleString()}</b>
                </div>
                <div class="flex justify-between items-center text-slate-500">
                    <span>🏷️ Flea Target:</span>
                    <b class="text-amber-700 font-bold">¥${item.target_sell_price.toLocaleString()}</b>
                </div>
                <div class="flex justify-between items-center pt-0.5 border-t border-dashed border-slate-200">
                    <span class="font-bold text-slate-600">💰 Est Profit:</span>
                    <b class="font-black ${profitColor} text-xs">${profitBadge}</b>
                </div>
            </div>

            <!-- Direct Links Row: Yahoo Ad, Flea Market Ads & Past Sold History -->
            <div class="mt-2 grid grid-cols-3 gap-1 text-[10px] pt-1.5 border-t border-slate-100">
                <a href="${yahooAuctionUrl}" target="_blank" onclick="event.stopPropagation()" class="py-1 px-0.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 rounded-md font-bold transition flex items-center justify-center space-x-0.5 border border-blue-200 shadow-xs" title="Open original ad on Yahoo! Auction">
                    <span>🔗 Yahoo</span>
                </a>
                <a href="${fleaSearchUrl}" target="_blank" onclick="event.stopPropagation()" class="py-1 px-0.5 bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-800 rounded-md font-bold transition flex items-center justify-center space-x-0.5 border border-amber-200 shadow-xs" title="Open live competitor ads on Yahoo! Flea Market">
                    <span>🏷️ Flea</span>
                </a>
                <a href="https://jp.mercari.com/search?keyword=${encodedTitle}&status=sold_out" target="_blank" onclick="event.stopPropagation()" class="py-1 px-0.5 bg-purple-50 hover:bg-purple-600 hover:text-white text-purple-700 rounded-md font-bold transition flex items-center justify-center space-x-0.5 border border-purple-200 shadow-xs" title="Check past completed sales on Mercari">
                    <span>📊 Sold</span>
                </a>
            </div>

            <div class="mt-1.5 text-center">
                <button type="button" class="w-full py-1 bg-slate-100 group-hover:bg-red-600 group-hover:text-white text-slate-700 rounded-md text-[10px] font-bold transition flex items-center justify-center space-x-1">
                    <span>Analyze & Load Details</span>
                    <i data-lucide="arrow-right" class="w-3 h-3"></i>
                </button>
            </div>
        `;
        grid.appendChild(card);
    });

    if (window.lucide) {
        try { lucide.createIcons(); } catch(e) {}
    }
}

// Scrape Individual Auction Details by ID
async function scrapeAuctionById(auctionId, isSilent = false) {
    if (!auctionId) return;
    activeSearchAuctionId = auctionId;

    // Highlight card in grid
    document.querySelectorAll('[id^="search-card-"]').forEach(el => {
        el.className = "cursor-pointer rounded-xl p-2.5 transition-all text-left border relative group bg-white hover:border-red-500 hover:shadow-md border-slate-200";
    });
    const activeCard = document.getElementById(`search-card-${auctionId}`);
    if (activeCard) {
        activeCard.className = "cursor-pointer rounded-xl p-2.5 transition-all text-left border relative group bg-white border-red-500 ring-2 ring-red-400/50 bg-red-50/20 hover:shadow-md";
    }

    const btn = document.getElementById("btn-scrape");
    const loading = document.getElementById("scrape-loading");
    const loadingText = document.getElementById("loading-text");
    if (btn) btn.disabled = true;
    if (loading) loading.classList.remove("hidden");
    if (loadingText) loadingText.innerText = `Fetching full details & photos for auction ${auctionId}...`;

    try {
        const res = await fetch("/api/scrape", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: auctionId })
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.detail || "Failed to load auction");
        }

        currentAuction = data;
        populateScrapedData(data);

        // Update search input if user was viewing direct ID
        const input = document.getElementById("input-url");
        if (input && isAuctionIdOrUrl(input.value)) {
            input.value = auctionId;
        }

        if (!isSilent) {
            showToast(`Loaded: ${data.title ? data.title.substring(0, 30) + '...' : auctionId}`);
        }
    } catch (err) {
        console.error("Error loading auction by ID:", err);
        if (!isSilent) showToast(err.message, true);
    } finally {
        if (btn) btn.disabled = false;
        if (loading) loading.classList.add("hidden");
    }
}

// Clean noisy auction title to extract core brand & model for exact Flea Market search
function getCleanFleaMarketQuery(title) {
    if (!title) return "";
    let clean = title;
    // Remove brackets like 【極美品】, [新品], etc.
    clean = clean.replace(/【[^】]*】/g, ' ').replace(/\[[^\]]*\]/g, ' ');
    // Remove auction start price words (e.g. 1円〜, 100円スタート)
    clean = clean.replace(/^[0-9]+円〜?/g, ' ').replace(/[0-9]+円スタート/g, ' ');
    // Remove subjective condition adjectives that fail strict flea searches
    clean = clean.replace(/(美品|極美品|超美品|新品|未使用|中古|ジャンク|完品|動作品|動作確認済|送料無料|即決|正規品|未開封)/g, ' ');
    // Remove symbols and punctuation
    clean = clean.replace(/[\(\)（）\/\+\*\:：!！~〜・_]/g, ' ');
    // Extract top 3-4 keywords (Brand + Model)
    const tokens = clean.trim().split(/\s+/).filter(w => w.length > 0 && !/^(の|を|に|で|と|は)$/.test(w));
    if (tokens.length === 0) return title.trim();
    return tokens.slice(0, 4).join(" ");
}

// Update Direct Links to Yahoo Auction Ad and Flea Market Competitor Ads
function updateExternalLinks(data) {
    if (!data) return;
    const auctionUrl = data.url || (data.auction_id ? `https://page.auctions.yahoo.co.jp/jp/auction/${data.auction_id}` : "");
    const rawTitle = data.title || "";
    // Clean to core model name so Flea Market opens exact matching product ads
    const cleanSearchTitle = getCleanFleaMarketQuery(rawTitle);
    const encodedTitle = encodeURIComponent(cleanSearchTitle || rawTitle);

    const fleaSearchUrl = `https://paypayfleamarket.yahoo.co.jp/search/${encodedTitle}`;
    const mercariSearchUrl = `https://jp.mercari.com/search?keyword=${encodedTitle}`;
    const mercariSoldUrl = `https://jp.mercari.com/search?keyword=${encodedTitle}&status=sold_out`;
    const yahooSoldUrl = `https://auctions.yahoo.co.jp/closedsearch/closedsearch?p=${encodedTitle}`;
    const fleaSellUrl = "https://paypayfleamarket.yahoo.co.jp/sell";
    const mercariSellUrl = "https://jp.mercari.com/sell/create";

    // 1. Box 1 Banner Link (Yahoo Auction Ad)
    const bannerBuyLink = document.getElementById("banner-buy-link");
    if (bannerBuyLink) {
        if (auctionUrl) {
            bannerBuyLink.href = auctionUrl;
            bannerBuyLink.classList.remove("pointer-events-none", "opacity-40");
            bannerBuyLink.title = `Open Yahoo Auction ad: ${data.auction_id || ''}`;
        } else {
            bannerBuyLink.href = "#";
            bannerBuyLink.classList.add("pointer-events-none", "opacity-40");
        }
    }

    // 2. Box 2 Banner Link (Matching Flea Market Ads, Sold History & Direct Sell Link)
    const bannerFleaLink = document.getElementById("banner-flea-link");
    if (bannerFleaLink) {
        if (currentPlatform === 'mercari') {
            bannerFleaLink.href = mercariSearchUrl;
            bannerFleaLink.innerHTML = `<span>🔴 Live Mercari</span><i data-lucide="external-link" class="w-3 h-3"></i>`;
            bannerFleaLink.title = `Search live ads for "${cleanSearchTitle}" on Mercari`;
        } else {
            bannerFleaLink.href = fleaSearchUrl;
            bannerFleaLink.innerHTML = `<span>🏷️ Live Flea</span><i data-lucide="external-link" class="w-3 h-3"></i>`;
            bannerFleaLink.title = `Search live ads for "${cleanSearchTitle}" on Yahoo! Flea Market`;
        }
    }

    const bannerSoldLink = document.getElementById("banner-sold-link");
    if (bannerSoldLink) {
        bannerSoldLink.href = mercariSoldUrl;
        bannerSoldLink.title = `Check completed sales and market price for "${cleanSearchTitle}" on Mercari`;
    }

    const bannerSellLink = document.getElementById("banner-flea-sell-link");
    if (bannerSellLink) {
        bannerSellLink.href = currentPlatform === 'mercari' ? mercariSellUrl : fleaSellUrl;
        bannerSellLink.title = `Open ${currentPlatform === 'mercari' ? 'Mercari' : 'Yahoo! Flea Market'} listing creation page`;
    }

    // 3. Title Optimizer Card External Links
    const linkYahoo = document.getElementById("link-external-yahoo");
    if (linkYahoo) {
        if (auctionUrl) {
            linkYahoo.href = auctionUrl;
            linkYahoo.classList.remove("pointer-events-none", "opacity-40");
        } else {
            linkYahoo.href = "#";
            linkYahoo.classList.add("pointer-events-none", "opacity-40");
        }
    }

    const linkFlea = document.getElementById("link-external-flea");
    if (linkFlea) {
        linkFlea.href = fleaSearchUrl;
    }

    const linkMercari = document.getElementById("link-external-mercari");
    if (linkMercari) {
        linkMercari.href = mercariSearchUrl;
    }

    const linkSold = document.getElementById("link-external-sold");
    if (linkSold) {
        linkSold.href = mercariSoldUrl;
    }

    const linkYahooSold = document.getElementById("link-external-yahoo-sold");
    if (linkYahooSold) {
        linkYahooSold.href = yahooSoldUrl;
    }

    const linkSell = document.getElementById("link-external-sell");
    if (linkSell) {
        linkSell.href = currentPlatform === 'mercari' ? mercariSellUrl : fleaSellUrl;
    }

    if (window.lucide) {
        try { lucide.createIcons(); } catch(e) {}
    }
}

// Populate Scraped Data in Form
function populateScrapedData(data) {
    const titleEl = document.getElementById("item-title");
    if (titleEl) titleEl.value = data.title || "";
    updateTitleCharCount();

    const descEl = document.getElementById("item-description");
    if (descEl) descEl.value = data.formatted_description || data.description || "";

    const buyPriceEl = document.getElementById("calc-buy-price");
    if (buyPriceEl) buyPriceEl.value = data.buy_price || 0;

    const inShipEl = document.getElementById("calc-inbound-shipping");
    if (inShipEl) inShipEl.value = data.estimated_inbound_shipping || 0;

    let initSell = Math.round(((data.buy_price || 0) + (data.estimated_inbound_shipping || 0) + 500) * 1.35);
    if (initSell < 1000) initSell = 1200;
    const sellPriceEl = document.getElementById("calc-sell-price");
    if (sellPriceEl) sellPriceEl.value = initSell;

    renderImages(data.images || []);
    updateExternalLinks(data);

    // Update live auction time and bids in Box 1
    const bannerTime = document.getElementById("banner-auction-time");
    if (bannerTime) {
        if (data.remaining_time) {
            const soon = data.is_ending_soon ? ' (Ending Soon!)' : '';
            const bidsText = data.bids !== undefined ? ` • ${data.bids} bids` : '';
            bannerTime.innerHTML = `<i data-lucide="clock" class="w-3 h-3 text-amber-400"></i><span>${data.remaining_time}${soon}${bidsText}</span>`;
            bannerTime.className = data.is_ending_soon ? "text-xs font-bold text-rose-400 flex items-center space-x-1 animate-pulse" : "text-xs font-bold text-amber-300 flex items-center space-x-1";
        } else if (data.is_fixed_price) {
            bannerTime.innerHTML = `<i data-lucide="zap" class="w-3 h-3 text-emerald-400"></i><span>⚡ Buy-It-Now (Instant)</span>`;
            bannerTime.className = "text-xs font-bold text-emerald-300 flex items-center space-x-1";
        } else {
            bannerTime.innerHTML = `<i data-lucide="clock" class="w-3 h-3 text-slate-400"></i><span>Live Auction</span>`;
            bannerTime.className = "text-xs font-bold text-slate-300 flex items-center space-x-1";
        }
        if (window.lucide) {
            try { lucide.createIcons(); } catch(e) {}
        }
    }

    runLiveCalculation();
}

// Render Scraped Images
function renderImages(images) {
    const gallery = document.getElementById("image-gallery");
    const badge = document.getElementById("img-count-badge");
    const btnZip = document.getElementById("btn-download-zip");

    const countText = `${(images || []).length} photos`;
    if (badge) badge.innerText = countText;
    if (btnZip) btnZip.disabled = !images || images.length === 0;

    if (!gallery) return;

    if (!images || images.length === 0) {
        gallery.innerHTML = `
            <div class="col-span-full text-center py-6 text-slate-400 text-xs">
                High-resolution photos will appear here after analyzing an auction URL
            </div>
        `;
        return;
    }

    gallery.innerHTML = "";
    images.forEach((imgUrl, index) => {
        const wrap = document.createElement("div");
        wrap.className = "relative group rounded-lg overflow-hidden border border-slate-200 bg-white";
        
        wrap.innerHTML = `
            <img src="${imgUrl}" alt="Photo ${index+1}" class="gallery-thumb w-full h-20 object-cover" onclick="window.open('${imgUrl}', '_blank')">
            <span class="absolute top-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">#${index+1}</span>
            <a href="${imgUrl}" download="item_img_${index+1}.jpg" target="_blank" class="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 bg-slate-900/80 hover:bg-slate-900 text-white p-1 rounded text-[10px] transition" title="Save Photo">
                <i data-lucide="download" class="w-3 h-3"></i>
            </a>
        `;
        gallery.appendChild(wrap);
    });
    if (window.lucide) {
        try { lucide.createIcons(); } catch(e) {}
    }
}

// Download Images as ZIP
async function downloadImagesZip() {
    if (!currentAuction.images || currentAuction.images.length === 0) return;
    showToast("Generating ZIP archive...");

    try {
        const res = await fetch("/api/download-zip", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                auction_id: currentAuction.auction_id || "yahoo_item",
                images: currentAuction.images
            })
        });

        if (!res.ok) throw new Error("ZIP download failed");

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${currentAuction.auction_id || "item"}_photos.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showToast("ZIP download started!");
    } catch (err) {
        showToast(err.message, true);
    }
}

// Title Character Counter (Limit: 40 chars)
function updateTitleCharCount() {
    const input = document.getElementById("item-title");
    const countBadge = document.getElementById("title-char-count");
    if (!input || !countBadge) return;
    const len = input.value.length;

    countBadge.innerText = `${len} / 40 chars`;
    countBadge.className = "text-xs px-2.5 py-0.5 rounded-full font-bold transition ";

    if (len <= 40) {
        countBadge.classList.add("bg-emerald-100", "text-emerald-700");
    } else {
        countBadge.classList.add("bg-red-100", "text-red-700");
    }
}

// 1-Click Translation States & Cache
let isTitleTranslated = false;
let isDescTranslated = false;
let originalTitleCache = "";
let originalDescCache = "";

// Translate Title between English and Japanese
async function translateTitleToggle() {
    const titleInput = document.getElementById("item-title");
    const label = document.getElementById("label-translate-title");
    if (!titleInput) return;

    if (!isTitleTranslated) {
        originalTitleCache = titleInput.value;
        if (!originalTitleCache.trim()) {
            showToast("Please enter or load a title first", true);
            return;
        }
        if (label) label.innerText = "⏳ Translating...";
        try {
            const res = await fetch("/api/translate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: originalTitleCache, target_lang: "en" })
            });
            const data = await res.json();
            if (data.translated) {
                titleInput.value = data.translated;
                updateTitleCharCount();
                isTitleTranslated = true;
                if (label) label.innerText = "🇯🇵 Show Japanese";
                showToast("Title translated to English!");
            } else {
                if (label) label.innerText = "🌐 Translate to English";
            }
        } catch (e) {
            if (label) label.innerText = "🌐 Translate to English";
            showToast("Translation error: " + e.message, true);
        }
    } else {
        if (originalTitleCache) {
            titleInput.value = originalTitleCache;
            updateTitleCharCount();
        }
        isTitleTranslated = false;
        if (label) label.innerText = "🌐 Translate to English";
        showToast("Switched back to original Japanese title");
    }
}

// Translate Description between English and Japanese
async function translateDescToggle() {
    const descInput = document.getElementById("item-description");
    const label = document.getElementById("label-translate-desc");
    if (!descInput) return;

    if (!isDescTranslated) {
        originalDescCache = descInput.value;
        if (!originalDescCache.trim()) {
            showToast("Please enter or load a description first", true);
            return;
        }
        if (label) label.innerText = "⏳ Translating...";
        try {
            const res = await fetch("/api/translate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: originalDescCache, target_lang: "en" })
            });
            const data = await res.json();
            if (data.translated) {
                descInput.value = data.translated;
                isDescTranslated = true;
                if (label) label.innerText = "🇯🇵 Show Japanese";
                showToast("Description translated to English!");
            } else {
                if (label) label.innerText = "🌐 Translate to English";
            }
        } catch (e) {
            if (label) label.innerText = "🌐 Translate to English";
            showToast("Translation error: " + e.message, true);
        }
    } else {
        if (originalDescCache) {
            descInput.value = originalDescCache;
        }
        isDescTranslated = false;
        if (label) label.innerText = "🌐 Translate to English";
        showToast("Switched back to original Japanese description");
    }
}

// Insert Keyword Bracket Pill into Title (Clean English or Japanese Tag)
function insertKeywordPill(pill) {
    const input = document.getElementById("item-title");
    if (!input) return;
    const tag = PILL_TRANSLATIONS[pill] || pill;
    if (!input.value.includes(tag) && !input.value.includes(pill)) {
        input.value = `${tag} ${input.value}`.trim();
        updateTitleCharCount();
    }
}

// Description Template Change
async function onTemplateChange() {
    const select = document.getElementById("select-template");
    if (!select) return;
    const tplId = select.value;
    const titleEl = document.getElementById("item-title");
    const title = titleEl ? titleEl.value : "";
    const condition = currentAuction.condition || "目立った傷や汚れなし";
    const desc = currentAuction.description || "";

    try {
        const res = await fetch("/api/format-description", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                template_id: tplId,
                title: title,
                condition: condition,
                description: desc
            })
        });
        const data = await res.json();
        const descArea = document.getElementById("item-description");
        if (descArea) descArea.value = data.formatted;
        showToast("Template applied!");
    } catch (err) {
        console.error(err);
    }
}

// Set Platform (Yahoo Flea vs Mercari)
function setPlatform(platform) {
    currentPlatform = platform;
    const btnYahoo = document.getElementById("btn-platform-yahoo");
    const btnMercari = document.getElementById("btn-platform-mercari");

    if (platform === "yahoo_flea") {
        if (btnYahoo) btnYahoo.className = "px-2.5 py-1 text-xs font-bold rounded bg-white text-red-600 shadow-sm";
        if (btnMercari) btnMercari.className = "px-2.5 py-1 text-xs font-bold rounded text-slate-600 hover:text-slate-900";
    } else {
        if (btnMercari) btnMercari.className = "px-2.5 py-1 text-xs font-bold rounded bg-white text-red-600 shadow-sm";
        if (btnYahoo) btnYahoo.className = "px-2.5 py-1 text-xs font-bold rounded text-slate-600 hover:text-slate-900";
    }
    updateExternalLinks(currentAuction);
    runLiveCalculation();
}

// Outbound Shipping Method Select Change
function onShippingMethodChange() {
    const select = document.getElementById("calc-shipping-method");
    const cost = select ? (parseInt(select.value) || 0) : 0;
    const shipOut = document.getElementById("calc-shipping-out");
    if (shipOut) shipOut.value = cost;
    runLiveCalculation();
}

// Run Live Calculation & Update High-Contrast Comparison Banner
async function runLiveCalculation() {
    const buyPrice = parseInt((document.getElementById("calc-buy-price") || {}).value) || 0;
    const inboundShipping = parseInt((document.getElementById("calc-inbound-shipping") || {}).value) || 0;
    const sellPrice = parseInt((document.getElementById("calc-sell-price") || {}).value) || 0;
    const shippingOut = parseInt((document.getElementById("calc-shipping-out") || {}).value) || 0;
    const packaging = parseInt((document.getElementById("calc-packaging") || {}).value) || 0;

    try {
        const res = await fetch("/api/calculate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                buy_price: buyPrice,
                inbound_shipping: inboundShipping,
                sell_price: sellPrice,
                shipping_out: shippingOut,
                packaging_cost: packaging,
                platform: currentPlatform
            })
        });
        const data = await res.json();
        const calc = data.calc;
        const sug = data.suggestions;
        currentSuggestions = sug;

        // 1. UPDATE TOP ARBITRAGE PRICE FLOW BANNER (WHERE WE BUY VS WHERE WE SELL VS PROFIT)
        const bannerBuy = document.getElementById("banner-buy-price");
        if (bannerBuy) bannerBuy.innerText = `¥${buyPrice.toLocaleString()}`;

        const bannerInShip = document.getElementById("banner-inbound-ship");
        if (bannerInShip) bannerInShip.innerText = `(+¥${inboundShipping.toLocaleString()} ship)`;

        const bannerTotalCost = document.getElementById("banner-total-cost");
        if (bannerTotalCost) bannerTotalCost.innerText = `¥${calc.procurement_cost.toLocaleString()}`;

        const bannerSell = document.getElementById("banner-sell-price");
        if (bannerSell) bannerSell.innerText = `¥${sellPrice.toLocaleString()}`;

        const bannerPlatform = document.getElementById("banner-platform");
        if (bannerPlatform) bannerPlatform.innerText = currentPlatform === 'mercari' ? '(Mercari 10%)' : '(Yahoo Flea 5%)';

        const totalDeductions = calc.platform_fee + shippingOut + packaging;
        const bannerDeductions = document.getElementById("banner-deductions");
        if (bannerDeductions) bannerDeductions.innerText = `-¥${totalDeductions.toLocaleString()}`;

        const bannerNet = document.getElementById("banner-net-profit");
        if (bannerNet) {
            bannerNet.innerText = `¥${calc.net_profit.toLocaleString()}`;
            bannerNet.className = calc.net_profit >= 0 ? "text-2xl sm:text-3xl font-black text-emerald-400" : "text-2xl sm:text-3xl font-black text-rose-400";
        }

        const bannerMargin = document.getElementById("banner-margin");
        if (bannerMargin) bannerMargin.innerText = `(${calc.profit_margin}% Margin)`;

        // 2. UPDATE CALCULATOR CARD BREAKDOWN
        const statProc = document.getElementById("stat-procurement");
        if (statProc) statProc.innerText = `¥${calc.procurement_cost.toLocaleString()}`;
        
        const statFeePct = document.getElementById("stat-fee-percent");
        if (statFeePct) statFeePct.innerText = calc.fee_rate_percent;

        const statFee = document.getElementById("stat-fee");
        if (statFee) statFee.innerText = `¥${calc.platform_fee.toLocaleString()}`;

        const profitEl = document.getElementById("stat-profit");
        if (profitEl) {
            profitEl.innerText = `¥${calc.net_profit.toLocaleString()}`;
            profitEl.className = calc.net_profit >= 0 ? "text-3xl font-black text-emerald-400" : "text-3xl font-black text-rose-400";
        }

        const marginEl = document.getElementById("stat-margin");
        if (marginEl) {
            marginEl.innerText = `${calc.profit_margin}%`;
            if (calc.profit_margin >= 20) {
                marginEl.className = "text-emerald-400 font-bold";
            } else if (calc.profit_margin > 0) {
                marginEl.className = "text-amber-400 font-bold";
            } else {
                marginEl.className = "text-rose-400 font-bold";
            }
        }

        const statRoi = document.getElementById("stat-roi");
        if (statRoi) statRoi.innerText = `${calc.roi}%`;

        // 3. UPDATE SUGGESTED PRICING BUTTONS
        const sugBreak = document.getElementById("sug-breakeven");
        if (sugBreak && sug.breakeven_price) sugBreak.innerText = `¥${sug.breakeven_price.toLocaleString()}`;
        
        const sug1000 = document.getElementById("sug-1000");
        if (sug1000 && sug.target_profit_1000) sug1000.innerText = `¥${sug.target_profit_1000.toLocaleString()}`;

        const sug2000 = document.getElementById("sug-2000");
        if (sug2000 && sug.target_profit_2000) sug2000.innerText = `¥${sug.target_profit_2000.toLocaleString()}`;

        const sug3000 = document.getElementById("sug-3000");
        if (sug3000 && sug.target_profit_3000) sug3000.innerText = `¥${sug.target_profit_3000.toLocaleString()}`;

        const sugM25 = document.getElementById("sug-m25");
        if (sugM25 && sug.margin_25_percent) sugM25.innerText = `¥${sug.margin_25_percent.toLocaleString()}`;

        const sugM35 = document.getElementById("sug-m35");
        if (sugM35 && sug.margin_35_percent) sugM35.innerText = `¥${sug.margin_35_percent.toLocaleString()}`;

    } catch (err) {
        console.error("Calculation error:", err);
    }
}

// Apply Suggested Price Pill
function applySuggestedPrice(type) {
    if (!currentSuggestions) return;
    let price = 0;
    if (type === "breakeven") price = currentSuggestions.breakeven_price;
    else if (type === "target_1000") price = currentSuggestions.target_profit_1000;
    else if (type === "target_2000") price = currentSuggestions.target_profit_2000;
    else if (type === "target_3000") price = currentSuggestions.target_profit_3000;
    else if (type === "margin_25") price = currentSuggestions.margin_25_percent;
    else if (type === "margin_35") price = currentSuggestions.margin_35_percent;

    if (price > 0) {
        const sellInput = document.getElementById("calc-sell-price");
        if (sellInput) sellInput.value = price;
        runLiveCalculation();
        showToast(`Selling price set to ¥${price.toLocaleString()}!`);
    }
}

// Save Item to SQLite Inventory
async function handleSaveItem() {
    const titleEl = document.getElementById("item-title");
    const title = titleEl ? titleEl.value.trim() : "";
    if (!title) {
        showToast("Please enter a product title", true);
        return;
    }

    const buyPrice = parseInt((document.getElementById("calc-buy-price") || {}).value) || 0;
    const inboundShipping = parseInt((document.getElementById("calc-inbound-shipping") || {}).value) || 0;
    const sellPrice = parseInt((document.getElementById("calc-sell-price") || {}).value) || 0;
    const shippingOut = parseInt((document.getElementById("calc-shipping-out") || {}).value) || 0;
    const packaging = parseInt((document.getElementById("calc-packaging") || {}).value) || 0;
    const status = (document.getElementById("save-status") || {}).value || "watching";
    const description = (document.getElementById("item-description") || {}).value || "";

    const payload = {
        auction_id: currentAuction.auction_id || "",
        source_url: currentAuction.url || "",
        title: title,
        images: currentAuction.images || [],
        buy_price: buyPrice,
        inbound_shipping: inboundShipping,
        sell_price: sellPrice,
        shipping_out: shippingOut,
        packaging_cost: packaging,
        platform: currentPlatform,
        condition: currentAuction.condition || "目立った傷や汚れなし",
        description: description,
        status: status,
        notes: currentAuction.seller_id ? `Seller: ${currentAuction.seller_id}` : ""
    };

    try {
        const res = await fetch("/api/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to save item");

        showToast("Saved to inventory!");
        await loadInventory();
        await loadStats();
    } catch (err) {
        showToast(err.message, true);
    }
}

// Load Inventory Items
async function loadInventory() {
    try {
        let url = `/api/items?status=${inventoryFilter}`;
        if (inventorySearchQuery) {
            url += `&search=${encodeURIComponent(inventorySearchQuery)}`;
        }
        const res = await fetch(url);
        const items = await res.json();
        renderInventoryTable(items);
        const badge = document.getElementById("badge-total-items");
        if (badge) badge.innerText = items.length;
    } catch (err) {
        console.error("Failed to load inventory:", err);
    }
}

// Render Inventory Table
function renderInventoryTable(items) {
    const tbody = document.getElementById("inventory-tbody");
    if (!tbody) return;
    if (!items || items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-12 text-slate-400">
                    No items registered yet
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = "";
    items.forEach(item => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50/80 transition";

        const thumb = (item.images && item.images.length > 0) ? item.images[0] : "";
        const procurement = item.buy_price + item.inbound_shipping;
        const profitColor = item.net_profit >= 0 ? "text-emerald-600" : "text-rose-600";

        tr.innerHTML = `
            <td class="py-3 px-4">
                <div class="flex items-center space-x-3">
                    <div class="w-12 h-12 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        ${thumb ? `<img src="${thumb}" class="w-full h-full object-cover">` : `<i data-lucide="image" class="w-5 h-5 text-slate-400"></i>`}
                    </div>
                    <div class="max-w-xs sm:max-w-md">
                        <div class="font-bold text-slate-800 line-clamp-1">${item.title}</div>
                        <div class="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                            ${item.auction_id ? `<span>ID: ${item.auction_id}</span>` : ""}
                            <span>${item.created_at ? item.created_at.split(' ')[0] : ""}</span>
                            ${item.source_url ? `<a href="${item.source_url}" target="_blank" class="text-blue-500 hover:underline">Source</a>` : ""}
                        </div>
                    </div>
                </div>
            </td>
            <td class="py-3 px-3 font-medium text-slate-700">
                ¥${procurement.toLocaleString()}
                <div class="text-[10px] text-slate-400">Buy: ¥${item.buy_price.toLocaleString()}</div>
            </td>
            <td class="py-3 px-3 font-bold text-slate-900">
                ¥${item.sell_price.toLocaleString()}
                <div class="text-[10px] text-slate-400">${item.platform === 'mercari' ? 'Mercari' : 'Yahoo! Flea'}</div>
            </td>
            <td class="py-3 px-3 font-black ${profitColor}">
                ¥${item.net_profit.toLocaleString()}
                <div class="text-[10px] font-semibold">${item.profit_margin}%</div>
            </td>
            <td class="py-3 px-3">
                <select onchange="updateItemStatus(${item.id}, this.value)" class="text-xs font-bold rounded-lg px-2 py-1 border border-slate-200 bg-white">
                    <option value="watching" ${item.status === 'watching' ? 'selected' : ''}>🎯 Watching</option>
                    <option value="won" ${item.status === 'won' ? 'selected' : ''}>🛒 Won</option>
                    <option value="in_stock" ${item.status === 'in_stock' ? 'selected' : ''}>📦 In Stock</option>
                    <option value="listed" ${item.status === 'listed' ? 'selected' : ''}>🏷️ Listed</option>
                    <option value="sold" ${item.status === 'sold' ? 'selected' : ''}>💰 Sold</option>
                </select>
            </td>
            <td class="py-3 px-4 text-right">
                <div class="flex items-center justify-end space-x-1">
                    <button onclick="loadItemToEditor(${item.id})" class="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition" title="Edit">
                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                    </button>
                    <button onclick="deleteItem(${item.id})" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Delete">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    if (window.lucide) {
        try { lucide.createIcons(); } catch(e) {}
    }
}

// Update Item Status
async function updateItemStatus(itemId, newStatus) {
    try {
        const res = await fetch(`/api/items/${itemId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus })
        });
        if (!res.ok) throw new Error("Failed to update status");
        showToast("Status updated successfully!");
        await loadStats();
        await loadInventory();
    } catch (err) {
        showToast(err.message, true);
    }
}

// Delete Item
async function deleteItem(itemId) {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
        const res = await fetch(`/api/items/${itemId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete item");
        showToast("Item deleted");
        await loadInventory();
        await loadStats();
    } catch (err) {
        showToast(err.message, true);
    }
}

// Load Item back into Sourcing Editor
async function loadItemToEditor(itemId) {
    try {
        const res = await fetch(`/api/items/${itemId}`);
        const item = await res.json();
        currentAuction = {
            auction_id: item.auction_id,
            url: item.source_url,
            title: item.title,
            buy_price: item.buy_price,
            description: item.description,
            condition: item.condition,
            estimated_inbound_shipping: item.inbound_shipping,
            images: item.images || []
        };
        populateScrapedData(currentAuction);
        const sellEl = document.getElementById("calc-sell-price");
        if (sellEl) sellEl.value = item.sell_price;
        const shipOutEl = document.getElementById("calc-shipping-out");
        if (shipOutEl) shipOutEl.value = item.shipping_out;
        const saveStatEl = document.getElementById("save-status");
        if (saveStatEl) saveStatEl.value = item.status;
        setPlatform(item.platform || "yahoo_flea");
        switchTab("sourcing");
        showToast("Loaded into editor!");
    } catch (err) {
        showToast(err.message, true);
    }
}

// Inventory Filtering
function setInventoryFilter(status) {
    inventoryFilter = status;
    const buttons = ["all", "watching", "won", "in_stock", "listed", "sold"];
    buttons.forEach(b => {
        const btn = document.getElementById(`filter-btn-${b}`);
        if (!btn) return;
        if (b === status) {
            btn.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white";
        } else {
            btn.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200";
        }
    });
    loadInventory();
}

// Inventory Search
function handleSearchInventory() {
    const searchEl = document.getElementById("inventory-search");
    inventorySearchQuery = searchEl ? searchEl.value.trim() : "";
    loadInventory();
}

// Export Inventory to CSV
async function exportInventoryCsv() {
    try {
        const res = await fetch("/api/items?status=all");
        const items = await res.json();
        if (!items || items.length === 0) {
            showToast("No data to export", true);
            return;
        }

        const headers = ["ID", "Auction_ID", "Title", "Buy_Price_JPY", "Inbound_Shipping_JPY", "Sell_Price_JPY", "Platform_Fee_JPY", "Shipping_Out_JPY", "Net_Profit_JPY", "Profit_Margin", "Status", "Created_At"];
        const rows = items.map(it => [
            it.id,
            it.auction_id,
            `"${(it.title || "").replace(/"/g, '""')}"`,
            it.buy_price,
            it.inbound_shipping,
            it.sell_price,
            it.platform_fee,
            it.shipping_out,
            it.net_profit,
            `${it.profit_margin}%`,
            it.status,
            it.created_at
        ]);

        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `yahoo_fleamarket_inventory_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("CSV exported successfully!");
    } catch (err) {
        showToast(err.message, true);
    }
}

// Load KPI Stats
async function loadStats() {
    try {
        const res = await fetch("/api/stats");
        const stats = await res.json();
        const revEl = document.getElementById("kpi-revenue");
        if (revEl) revEl.innerText = `¥${stats.total_revenue.toLocaleString()}`;
        const profEl = document.getElementById("kpi-profit");
        if (profEl) profEl.innerText = `¥${stats.total_profit.toLocaleString()}`;
        const listEl = document.getElementById("kpi-listed");
        if (listEl) listEl.innerText = `${stats.listed_count} items`;
        const invEl = document.getElementById("kpi-investment");
        if (invEl) invEl.innerText = `¥${stats.inventory_investment.toLocaleString()}`;
        const avgEl = document.getElementById("kpi-avg-margin");
        if (avgEl) avgEl.innerText = `${stats.avg_margin}%`;
    } catch (err) {
        console.error("Failed to load stats:", err);
    }
}

// Clipboard Copy Helper
async function copyToClipboard(elementId, typeKey) {
    const el = document.getElementById(elementId);
    if (!el || !el.value) return;
    try {
        await navigator.clipboard.writeText(el.value);
        let msg = "Copied to clipboard!";
        if (typeKey === "title_copied") {
            msg = "Title copied to clipboard!";
        } else if (typeKey === "desc_copied") {
            msg = "Description copied to clipboard!";
        }
        showToast(msg);
    } catch (err) {
        el.select();
        document.execCommand("copy");
        showToast("Copied to clipboard!");
    }
}

// Toast Notification
let toastTimer = null;
function showToast(message, isError = false) {
    const toast = document.getElementById("toast");
    const msg = document.getElementById("toast-message");
    if (!toast || !msg) return;
    msg.innerText = message;
    
    if (isError) {
        toast.className = "fixed bottom-6 right-6 z-50 bg-rose-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium flex items-center space-x-2 transition-all duration-300 opacity-100";
    } else {
        toast.className = "fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium flex items-center space-x-2 transition-all duration-300 opacity-100";
    }

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.add("opacity-0", "pointer-events-none");
    }, 2800);
}

// Explicit global exposure to guarantee all inline HTML onclick handlers work seamlessly
window.switchTab = switchTab;
window.handleScrape = handleScrape;
window.quickSearch = quickSearch;
window.changeSearchSort = changeSearchSort;
window.scrapeAuctionById = scrapeAuctionById;
window.loadSampleProduct = loadSampleProduct;
window.updateTitleCharCount = updateTitleCharCount;
window.copyToClipboard = copyToClipboard;
window.downloadImagesZip = downloadImagesZip;
window.onTemplateChange = onTemplateChange;
window.setPlatform = setPlatform;
window.onShippingMethodChange = onShippingMethodChange;
window.runLiveCalculation = runLiveCalculation;
window.applySuggestedPrice = applySuggestedPrice;
window.handleSaveItem = handleSaveItem;
window.setInventoryFilter = setInventoryFilter;
window.handleSearchInventory = handleSearchInventory;
window.exportInventoryCsv = exportInventoryCsv;
window.updateItemStatus = updateItemStatus;
window.deleteItem = deleteItem;
window.loadItemToEditor = loadItemToEditor;
window.insertKeywordPill = insertKeywordPill;
window.translateTitleToggle = translateTitleToggle;
window.translateDescToggle = translateDescToggle;
window.clearSearchHistory = clearSearchHistory;
window.removeSearchHistoryItem = removeSearchHistoryItem;
window.restoreLastSearch = restoreLastSearch;
