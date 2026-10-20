/**
 * Traktor — Web Platformasi
 * O'zbekistonda dehqonlar va yer egalari uchun yaqin atrofdagi traktorchilarni
 * narxi va qulayliklariga qarab tanlash va buyurtma qilish tizimi.
 */

// ==========================================
// 1. DATA: REGIONS & NEARBY TRACTORS
// ==========================================

const REGIONS = {
    parkent: {
        name: "Toshkent vil. Parkent tumani (Soyliq)",
        short: "Parkent",
        fieldCoords: [41.2941, 69.6765]
    },
    chirchiq: {
        name: "Toshkent vil. Yuqori Chirchiq (Bardanko'l)",
        short: "Yuqori Chirchiq",
        fieldCoords: [41.2825, 69.4589]
    },
    zangiota: {
        name: "Toshkent vil. Zangiota (Nazarbek)",
        short: "Zangiota",
        fieldCoords: [41.2580, 69.1550]
    },
    yangiyol: {
        name: "Toshkent vil. Yangiyo'l tumani",
        short: "Yangiyo'l",
        fieldCoords: [41.1158, 69.0494]
    },
    buka: {
        name: "Toshkent vil. Bo'ka tumani",
        short: "Bo'ka",
        fieldCoords: [40.8108, 69.1989]
    }
};

// Traktorchilar ro'yxati. Ma'lumotlar REST API (GET /api/drivers) dan olinib, shu massivga
// yoziladi (massiv havolasi o'zgarmaydi, shuning uchun hamma joyda ishlayveradi).
// Boshlang'ich ma'lumotlar: data/drivers.json
const NEARBY_DRIVERS = [];

// ==========================================
// 2. AGRICULTURAL SERVICES LIST (12 TA XIZMAT)
// ==========================================

const AGRI_SERVICES = [
    { id: "plow", name: "Yer haydash", icon: "🚜", desc: "Tuproqni ag‘darish va yumshatish." },
    { id: "chisel", name: "Chizellash", icon: "⛏️", desc: "Tuproqni chuqur yumshatish, zich qatlamlarni buzish." },
    { id: "disk", name: "Diskalash", icon: "⚙️", desc: "Tuproq kesaklarini maydalash va yuzasini tekislash." },
    { id: "harrow", name: "Boronalash", icon: "🌾", desc: "Tuproqning ustki qatlamini yumshatish va tekislash." },
    { id: "cultivate", name: "Kultivatsiya", icon: "🌱", desc: "Begona o‘tlarni yo‘qotish va tuproqni ekishga tayyorlash." },
    { id: "level", name: "Tekislash", icon: "📐", desc: "Yer yuzasini bir xil holatga keltirish, ayniqsa sug‘oriladigan yerlarda muhim." },
    { id: "furrow", name: "Ekiladigan egatlarni ochish", icon: "🌿", desc: "Urug‘ yoki ko‘chat ekish uchun egatlar tayyorlash." },
    { id: "interrow", name: "Qator oralariga ishlov berish", icon: "🚜", desc: "Ekinlar orasidagi tuproqni yumshatish va begona o‘tlarni yo‘qotish." },
    { id: "fertilize", name: "Yerga o‘g‘it solish", icon: "🧪", desc: "Organik yoki mineral o‘g‘itlarni tuproqqa kiritish." },
    { id: "irrigation_ditch", name: "Sug‘orish uchun ariqlar ochish", icon: "💧", desc: "Suvning dalada to‘g‘ri taqsimlanishini ta’minlash." },
    { id: "melioration", name: "Meliorativ ishlov", icon: "🏞️", desc: "Sho‘rlangan yoki ortiqcha namlangan yerlarni yaxshilash." },
    { id: "mulch", name: "Mulchalash", icon: "🍂", desc: "Tuproq yuzasini somon, o‘simlik qoldiqlari yoki maxsus material bilan qoplash." }
];

// ==========================================
// 3. APPLICATION STATE
// ==========================================

// Traktorchilar ro'yxati REST API dan (GET /api/drivers) olinadi va NEARBY_DRIVERS ga yoziladi.
// Profil = serverdagi yozuv + xotiradagi jonli holat (liniyada/yo'qligi, buyurtmalar, tarix...).

// Server yozuvidan profilga doim yangilanib turadigan maydonlar
const PROFILE_STATIC_FIELDS = [
    'name', 'phone', 'avatar', 'tractorModel', 'plate', 'licenseSeries', 'completedJobs',
    'prices', 'amenities', 'districts', 'distanceKm', 'latOffset', 'lngOffset', 'recommended'
];

// HTML ga qo'yiladigan matnlarni xavfsiz qiladi
function escapeHtml(value) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => map[ch]);
}

// Rasmi yo'q traktorchi uchun ism bosh harflaridan avatar (SVG)
function avatarFor(name) {
    const parts = String(name || '?').trim().split(/\s+/);
    const initials = ((parts[0] || '?').charAt(0) + (parts[1] ? parts[1].charAt(0) : '')).toUpperCase();
    let hue = 0;
    for (const ch of String(name)) hue = (hue * 31 + ch.charCodeAt(0)) % 360;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">` +
        `<rect width="120" height="120" fill="hsl(${hue},45%,38%)"/>` +
        `<text x="60" y="76" font-family="Arial,sans-serif" font-size="46" font-weight="700" fill="#fff" text-anchor="middle">${escapeHtml(initials)}</text></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function normalizeRecord(rec) {
    return {
        ...rec,
        avatar: rec.avatar || avatarFor(rec.name),
        prices: { ...(rec.prices || {}) },
        amenities: [...(rec.amenities || [])],
        districts: [...(rec.districts || [])]
    };
}

// Server yozuvidan to'liq profil quradi
function buildProfile(rec) {
    const p = normalizeRecord(rec);
    p.ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, ...(rec.ratingDist || {}) };
    p.history = (rec.history || []).map(h => ({ ...h }));
    p.isOnline = !!rec.isOnline;
    p.dailyIncome = rec.dailyIncome || 0;
    p.walletBalance = rec.walletBalance || 0;
    p.totalSotixWorked = rec.totalSotixWorked || 0;
    p.jobsToday = rec.jobsToday || 0;
    syncRating(p);
    return p;
}

// Profilni serverga yuborish uchun yozuvga aylantiradi (PUT uchun)
function toRecord(p) {
    return {
        name: p.name,
        phone: p.phone,
        avatar: /^data:image\/svg\+xml/.test(p.avatar || '') ? '' : p.avatar,
        tractorModel: p.tractorModel,
        plate: p.plate,
        licenseSeries: p.licenseSeries,
        completedJobs: p.completedJobs,
        prices: { ...p.prices },
        amenities: [...p.amenities],
        districts: [...p.districts],
        distanceKm: p.distanceKm,
        latOffset: p.latOffset,
        lngOffset: p.lngOffset,
        recommended: p.recommended,
        isOnline: p.isOnline,
        ratingDist: { ...p.ratingDist },
        dailyIncome: p.dailyIncome,
        walletBalance: p.walletBalance,
        totalSotixWorked: p.totalSotixWorked,
        jobsToday: p.jobsToday,
        history: p.history.map(h => ({ ...h }))
    };
}

// Sahifalash tugmalari (‹ 1 2 … 9 ›)
function paginationHtml(page, pages) {
    if (pages <= 1) return '';
    const set = new Set([1, pages, page - 1, page, page + 1]);
    if (pages <= 7) for (let i = 1; i <= pages; i++) set.add(i);
    const sorted = [...set].filter(n => n >= 1 && n <= pages).sort((a, b) => a - b);

    const items = [];
    let prev = 0;
    sorted.forEach(n => {
        if (n - prev > 1) items.push('…');
        items.push(n);
        prev = n;
    });

    const btn = (n, label, disabled, active) =>
        `<button type="button" class="pg-btn${active ? ' active' : ''}" data-page="${n}"${disabled ? ' disabled' : ''}${active ? ' aria-current="page"' : ''}>${label}</button>`;

    return `<nav class="pager" aria-label="Sahifalar">` +
        btn(page - 1, '‹ Oldingi', page <= 1, false) +
        items.map(n => n === '…' ? '<span class="pg-gap">…</span>' : btn(n, n, false, n === page)).join('') +
        btn(page + 1, 'Keyingi ›', page >= pages, false) +
        `</nav>`;
}

// Traktorchilar ombori: NEARBY_DRIVERS (serverdagi yozuvlar) va profillarni bir-biriga moslab turadi
const DriverStore = {
    syncProfile(rec) {
        const existing = AppState.driverProfiles[rec.id];
        if (!existing) {
            AppState.driverProfiles[rec.id] = buildProfile(rec);
            return AppState.driverProfiles[rec.id];
        }
        const n = normalizeRecord(rec);
        PROFILE_STATIC_FIELDS.forEach(k => { existing[k] = n[k]; });
        return existing;
    },

    replaceAll(records) {
        const ids = new Set(records.map(r => r.id));
        NEARBY_DRIVERS.length = 0;
        records.forEach(r => NEARBY_DRIVERS.push(normalizeRecord(r)));
        Object.keys(AppState.driverProfiles).forEach(id => {
            if (!ids.has(id)) delete AppState.driverProfiles[id];
        });
        NEARBY_DRIVERS.forEach(r => this.syncProfile(r));
    },

    upsert(record) {
        const n = normalizeRecord(record);
        const i = NEARBY_DRIVERS.findIndex(d => d.id === n.id);
        if (i === -1) NEARBY_DRIVERS.push(n); else NEARBY_DRIVERS[i] = n;
        this.syncProfile(n);
        return n;
    },

    remove(id) {
        const i = NEARBY_DRIVERS.findIndex(d => d.id === id);
        if (i !== -1) NEARBY_DRIVERS.splice(i, 1);
        delete AppState.driverProfiles[id];
    }
};

const AppState = {
    currentRole: 'user', // 'user', 'driver', 'admin', 'split'
    isMobileView: false,

    // Selected Agricultural Service
    selectedService: 'Yer haydash',
    selectedServiceId: 'plow',

    // Land details
    landSize: 15,
    landUnit: 'sotix', // 'sotix' or 'gektar' (1 gektar = 100 sotix)
    selectedRegionKey: 'parkent',

    // Traktorchilarni qidirish holati: 'idle' | 'searching' | 'done' | 'error'
    searchStatus: 'idle',

    // Bozor (3-qadam): API so'rovi parametrlari va oxirgi javob
    market: { q: '', district: 'all', limit: 3, page: 1, pages: 1, total: 0, items: [], loading: false, error: '', trace: '' },

    // Active order between User and Driver
    activeOrder: null, // { id, driverId, driverName, serviceName, serviceId, landSotix, distanceKm, price, status, stage, etaMinutes }
    // status: 'IDLE' | 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'ON_THE_WAY' | 'ARRIVED' | 'WORKING' | 'COMPLETED'

    // Barcha traktorchilarning profillari (id bo'yicha)
    driverProfiles: {},
    // Traktorchi bo'limida hozir qaysi profil ochiq
    currentDriverId: 'driver-rustam',
    // Ish tarixi ko'rinadimi (traktorchi bo'limi) va admin panelidagi ochiq tarixlar
    historyVisible: true,
    // Mijoz baholashi kutilayotgan yakunlangan ish
    pendingRating: null,
    adminHistoryOpen: {},
    // Admin jadvalida narxi ko'rsatiladigan xizmat
    adminServiceId: 'plow',
    // Admin jadvali: API so'rovi parametrlari va oxirgi javob (status: idle | loading | ready | error)
    admin: { q: '', limit: 5, page: 1, pages: 1, total: 0, items: [], status: 'idle', error: '', trace: '' },

    // Traktorchi bo'limida hozir ochiq turgan profil
    get myDriverProfile() {
        return this.driverProfiles[this.currentDriverId];
    }
};

// ------------------------------------------
// Yordamchi funksiyalar
// ------------------------------------------
function getServiceById(id) {
    return AGRI_SERVICES.find(s => s.id === id) || AGRI_SERVICES[0];
}

// Traktorchining tanlangan xizmat bo'yicha 1 sotix narxi
function getDriverPrice(driverId, serviceId = AppState.selectedServiceId) {
    const profile = AppState.driverProfiles[driverId];
    return profile ? (profile.prices[serviceId] || 0) : 0;
}

// Traktorchi holati: ishlamoqda / liniyada / dam olishda
function getDriverStatus(driverId) {
    const order = AppState.activeOrder;
    const isWorking = !!order && order.driverId === driverId &&
        ['ON_THE_WAY', 'ARRIVED', 'WORKING'].includes(order.status);
    if (isWorking) return { key: 'working', label: 'Ishlamoqda', tag: 'blue' };
    if (AppState.driverProfiles[driverId].isOnline) return { key: 'online', label: 'Liniyada', tag: 'green' };
    return { key: 'rest', label: 'Dam olishda', tag: 'gold' };
}

// Ko'z belgisi: ochiq = tarix ko'rinadi, ustidan chiziq tortilgan = yashirilgan
function eyeIcon(open) {
    const slash = open ? '' : '<line x1="3" y1="3" x2="21" y2="21"/>';
    return `<svg class="eye-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>${slash}</svg>`;
}

// Baholar taqsimotidan o'rtacha reyting va baholar sonini hisoblaydi
function syncRating(profile) {
    let count = 0, sum = 0;
    Object.entries(profile.ratingDist).forEach(([stars, n]) => {
        count += n;
        sum += Number(stars) * n;
    });
    profile.ratingCount = count;
    profile.rating = count ? sum / count : 0;
}

// Yandex kabi 2 xonali reyting (masalan 4.92)
function formatRating(value) {
    return value > 0 ? value.toFixed(2) : 'Yangi';
}

// O'rtacha reytingga qarab qisman to'ldirilgan 5 yulduz
function starsHtml(value) {
    return `<span class="stars-static" style="--fill:${(value / 5) * 100}%" aria-label="${formatRating(value)} / 5">★★★★★</span>`;
}

const RATING_LABELS = { 1: "Juda yomon", 2: "Yomon", 3: "O'rtacha", 4: "Yaxshi", 5: "Ajoyib!" };

function historyRowsHtml(history) {
    if (!history.length) {
        return '<div class="history-hidden-note">Hali bajarilgan ish yo‘q</div>';
    }
    return history.map(item => `
        <div class="h-row">
            <div class="h-icon">🌾</div>
            <div class="h-details">
                <strong>${item.title}</strong>
                <small>${item.place} • ${item.time}</small>
            </div>
            <div class="h-sum text-green">+${item.amount.toLocaleString()} so'm</div>
        </div>
    `).join('');
}

// ==========================================
// 3. AUDIO SYNTHESIZER (Web Audio API)
// ==========================================

const SoundEngine = {
    ctx: null,
    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) this.ctx = new AudioContext();
        }
    },
    playOrderPing() {
        this.init();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, t); // E5
        osc.frequency.setValueAtTime(880, t + 0.15); // A5
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.5);
    },
    playSuccessChime() {
        this.init();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, t); // C5
        osc.frequency.setValueAtTime(659.25, t + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, t + 0.2); // G5
        osc.frequency.setValueAtTime(1046.50, t + 0.3); // C6
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.6);
    }
};

// ==========================================
// 4. MAP ENGINE (Leaflet.js)
// ==========================================

const MapEngine = {
    map: null,
    fieldMarker: null,
    driverMarkers: {},
    movingTractorMarker: null,
    routeLine: null,
    animTimer: null,

    init() {
        const container = document.getElementById('user-map');
        if (!container || this.map) return;

        const region = REGIONS[AppState.selectedRegionKey];

        this.map = L.map('user-map', {
            zoomControl: true,
            attributionControl: false
        }).setView(region.fieldCoords, 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18
        }).addTo(this.map);

        this.renderAllMarkers();
    },

    renderAllMarkers() {
        if (!this.map) return;

        const region = REGIONS[AppState.selectedRegionKey];

        // 1. User's Field Marker
        const fieldIcon = L.divIcon({
            className: 'custom-map-field-pin',
            html: '📍',
            iconSize: [36, 36],
            iconAnchor: [18, 36]
        });

        if (this.fieldMarker) {
            this.fieldMarker.setLatLng(region.fieldCoords);
        } else {
            this.fieldMarker = L.marker(region.fieldCoords, { icon: fieldIcon })
                .addTo(this.map)
                .bindPopup("<b>Sizning Yer Maydoningiz</b><br>Haydalishi kerak bo'lgan joy");
        }

        // 2. Nearby Tractor Drivers Markers (narx tanlangan xizmatga qarab; faqat qidiruvdan keyin)
        const bounds = [region.fieldCoords];
        const showDrivers = AppState.searchStatus === 'done';
        const visibleIds = new Set((AppState.market.items || []).map(i => i.id));

        // Ro'yxatda yo'q (filtrlangan yoki o'chirilgan) traktorchilar markerlarini olib tashlaymiz
        Object.keys(this.driverMarkers).forEach(id => {
            if (!showDrivers || !visibleIds.has(id)) {
                this.map.removeLayer(this.driverMarkers[id]);
                delete this.driverMarkers[id];
            }
        });

        NEARBY_DRIVERS.forEach(driver => {
            if (!showDrivers || !visibleIds.has(driver.id)) return;

            const coords = [
                region.fieldCoords[0] + driver.latOffset,
                region.fieldCoords[1] + driver.lngOffset
            ];
            bounds.push(coords);

            const price = getDriverPrice(driver.id);
            const shortPrice = `${Math.round(price / 1000)}k`;
            const tractorIcon = L.divIcon({
                className: 'custom-map-tractor-pin',
                html: `<span>🚜</span><span>${shortPrice}</span>`,
                iconSize: [80, 30],
                iconAnchor: [40, 15]
            });
            const popupHtml = `
                <strong>${driver.name}</strong><br>
                ${driver.tractorModel}<br>
                <b>${price.toLocaleString()} so'm/sotix</b> (${AppState.selectedService})<br>
                Masofa: ${driver.distanceKm} km
            `;

            if (this.driverMarkers[driver.id]) {
                this.driverMarkers[driver.id].setLatLng(coords);
                this.driverMarkers[driver.id].setIcon(tractorIcon);
                this.driverMarkers[driver.id].setPopupContent(popupHtml);
            } else {
                const marker = L.marker(coords, { icon: tractorIcon })
                    .addTo(this.map)
                    .bindPopup(popupHtml);

                marker.on('click', () => {
                    UI.highlightDriverCard(driver.id);
                });

                this.driverMarkers[driver.id] = marker;
            }
        });

        // Fit bounds
        if (bounds.length > 1) {
            this.map.fitBounds(bounds, { padding: [40, 40] });
        } else {
            this.map.setView(region.fieldCoords, 13);
        }
    },

    setRegion(regionKey) {
        AppState.selectedRegionKey = regionKey;
        this.renderAllMarkers();
    },

    startTractorRouteAnimation(driverCoords, fieldCoords, onDone) {
        if (!this.map) return;

        if (this.routeLine) this.map.removeLayer(this.routeLine);
        if (this.movingTractorMarker) this.map.removeLayer(this.movingTractorMarker);

        // Draw animated dashed route
        this.routeLine = L.polyline([driverCoords, fieldCoords], {
            color: '#16a34a',
            weight: 4,
            dashArray: '8, 8',
            opacity: 0.8
        }).addTo(this.map);

        const tractorIcon = L.divIcon({
            className: 'custom-map-tractor-pin',
            html: `<span>🚜</span><span>Yo'lda</span>`,
            iconSize: [80, 30],
            iconAnchor: [40, 15]
        });

        this.movingTractorMarker = L.marker(driverCoords, { icon: tractorIcon }).addTo(this.map);

        const steps = 40;
        let currentStep = 0;
        const totalDist = 2.4;
        const totalMinutes = 8;

        if (this.animTimer) clearInterval(this.animTimer);

        this.animTimer = setInterval(() => {
            currentStep++;
            const progress = currentStep / steps;

            const lat = driverCoords[0] + (fieldCoords[0] - driverCoords[0]) * progress;
            const lng = driverCoords[1] + (fieldCoords[1] - driverCoords[1]) * progress;

            this.movingTractorMarker.setLatLng([lat, lng]);

            // Update remaining ETA in UI
            const remKm = Math.max(0.1, (totalDist * (1 - progress))).toFixed(1);
            const remMins = Math.max(1, Math.round(totalMinutes * (1 - progress)));

            const userEtaElem = document.getElementById('user-eta-display');
            if (userEtaElem) userEtaElem.textContent = `~${remMins} daqiqa (${remKm} km)`;

            const driverEtaElem = document.getElementById('driver-nav-eta');
            if (driverEtaElem) driverEtaElem.textContent = `${remKm} km (~${remMins} daqiqa)`;

            if (currentStep >= steps) {
                clearInterval(this.animTimer);
                if (userEtaElem) userEtaElem.textContent = "Traktor dalaga yetib keldi! (0 daqiqa)";
                if (driverEtaElem) driverEtaElem.textContent = "0 km (Dalaga yetib keldingiz)";
                if (onDone) onDone();
            }
        }, 350);
    },

    resetAnimation() {
        if (this.animTimer) clearInterval(this.animTimer);
        if (this.routeLine) this.map.removeLayer(this.routeLine);
        if (this.movingTractorMarker) this.map.removeLayer(this.movingTractorMarker);
    }
};

// ==========================================
// 5. MAIN UI CONTROLLER
// ==========================================

const UI = {
    marketToken: 0,   // eskirgan javoblarni e'tiborsiz qoldirish uchun
    adminToken: 0,

    init() {
        this.bindRoleTabs();
        this.bindDeviceToggle();
        this.bindLandInputs();
        this.bindDriverActions();
        this.bindDriverSearch();
        this.bindHistoryToggle();
        this.bindAdminControls();
        this.bindAdminTable();
        this.bindWithdrawModal();
        this.bindMarketFilters();
        this.bindAdminCrud();
        this.bindDriverForm();
        this.bindBoot();

        // Render agricultural services selector
        this.renderAgriServices();
        this.renderMarketFilters();

        // Traktorchilarni qidirish paneli (natijalar qidiruvdan keyin chiqadi)
        this.updateSearchPanel();
        this.updateSearchSummary();

        // Traktorchilar API dan yuklanadi; tayyor bo'lgach profil, jadval va xarita chiziladi
        this.bootstrap();
    },

    // ------------------------------------------
    // Navigation & Device Mode
    // ------------------------------------------
    bindRoleTabs() {
        const tabs = document.querySelectorAll('.nav-tab-btn, .mobile-bottom-nav .nav-item');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const role = tab.dataset.role;
                this.switchRole(role);
            });
        });
    },

    switchRole(role) {
        AppState.currentRole = role;

        // Top tabs active state
        document.querySelectorAll('.nav-tab-btn').forEach(btn => btn.classList.remove('active'));
        const topBtn = document.getElementById(`tab-${role}`);
        if (topBtn) topBtn.classList.add('active');

        // Bottom nav active state
        document.querySelectorAll('.mobile-bottom-nav .nav-item').forEach(btn => btn.classList.remove('active'));
        const bBtn = document.getElementById(`bnav-${role}`);
        if (bBtn) bBtn.classList.add('active');

        // Screens visibility
        document.querySelectorAll('.screen-view').forEach(s => s.classList.remove('active'));
        const targetScreen = document.getElementById(`screen-${role}`);
        if (targetScreen) targetScreen.classList.add('active');

        if (role === 'split') {
            this.renderSplitView();
        }

        if (role === 'driver') {
            this.renderDriverSwitcher();
            this.renderDriverOrderPanels();
        }

        if (role === 'admin') {
            this.bindAdminTable();
        }

        if (role === 'user' && MapEngine.map) {
            setTimeout(() => MapEngine.map.invalidateSize(), 100);
        }
    },

    bindDeviceToggle() {
        const toggleBtn = document.getElementById('btn-toggle-device');
        const iconEl = document.getElementById('device-btn-icon');
        const textEl = document.getElementById('device-btn-text');

        toggleBtn.addEventListener('click', () => {
            AppState.isMobileView = !AppState.isMobileView;
            if (AppState.isMobileView) {
                document.body.className = 'mobile-mode';
                iconEl.textContent = '🖥️';
                textEl.textContent = 'Keng Ekran';
            } else {
                document.body.className = 'desktop-mode';
                iconEl.textContent = '📱';
                textEl.textContent = 'Mobil Rejim';
            }
            if (MapEngine.map) {
                setTimeout(() => MapEngine.map.invalidateSize(), 150);
            }
        });
    },

    // ------------------------------------------
    // Land Inputs & Dynamic Price Recalculation
    // ------------------------------------------
    bindLandInputs() {
        const inputSize = document.getElementById('input-land-size');
        const btnMinus = document.getElementById('btn-size-minus');
        const btnPlus = document.getElementById('btn-size-plus');
        const unitSotix = document.getElementById('unit-sotix');
        const unitGektar = document.getElementById('unit-gektar');
        const unitText = document.getElementById('unit-display-text');
        const regionSelect = document.getElementById('select-user-region');
        const sortSelect = document.getElementById('select-sort-drivers');

        const updateSize = (val) => {
            AppState.landSize = Math.max(1, parseInt(val) || 1);
            inputSize.value = AppState.landSize;
            this.renderDriversMarket();
            this.updateSearchSummary();
        };

        btnMinus.addEventListener('click', () => {
            updateSize(AppState.landSize - (AppState.landUnit === 'gektar' ? 1 : 1));
        });

        btnPlus.addEventListener('click', () => {
            updateSize(AppState.landSize + (AppState.landUnit === 'gektar' ? 1 : 1));
        });

        inputSize.addEventListener('input', (e) => {
            updateSize(e.target.value);
        });

        // Unit toggles
        unitSotix.addEventListener('click', () => {
            if (AppState.landUnit !== 'sotix') {
                AppState.landUnit = 'sotix';
                unitSotix.classList.add('active');
                unitGektar.classList.remove('active');
                unitText.textContent = 'Sotix';
                updateSize(AppState.landSize * 100); // 1 ga = 100 sotix
            }
        });

        unitGektar.addEventListener('click', () => {
            if (AppState.landUnit !== 'gektar') {
                AppState.landUnit = 'gektar';
                unitGektar.classList.add('active');
                unitSotix.classList.remove('active');
                unitText.textContent = 'Gektar';
                updateSize(Math.max(1, Math.round(AppState.landSize / 100)));
            }
        });

        // Preset Badges
        document.querySelectorAll('.preset-badges .badge-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.preset-badges .badge-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                const val = parseInt(chip.dataset.val);
                if (val >= 100 && AppState.landUnit === 'gektar') {
                    updateSize(1);
                } else {
                    AppState.landUnit = 'sotix';
                    unitSotix.classList.add('active');
                    unitGektar.classList.remove('active');
                    unitText.textContent = 'Sotix';
                    updateSize(val);
                }
            });
        });

        // Region select
        regionSelect.addEventListener('change', (e) => {
            MapEngine.setRegion(e.target.value);
            this.updateSearchSummary();
        });

        // Sort select
        sortSelect.addEventListener('change', () => {
            this.refreshMarket({ resetPage: true });
        });

        // User cancel order button
        document.getElementById('btn-user-cancel-order').addEventListener('click', () => {
            this.cancelActiveOrder("Buyurtmachi tomonidan bekor qilindi");
        });
    },

    getNormalizedSotix() {
        return AppState.landUnit === 'gektar' ? AppState.landSize * 100 : AppState.landSize;
    },

    // ------------------------------------------
    // Agricultural Services Selector (12 ta xizmat)
    // ------------------------------------------
    renderAgriServices() {
        const grid = document.getElementById('agri-services-grid');
        if (!grid) return;

        grid.innerHTML = '';
        AGRI_SERVICES.forEach(serv => {
            const chip = document.createElement('div');
            chip.className = `agri-service-chip ${AppState.selectedService === serv.name ? 'active' : ''}`;
            chip.setAttribute('role', 'button');
            chip.dataset.service = serv.id;
            chip.setAttribute('tabindex', '0');
            chip.innerHTML = `
                <span class="chip-icon">${serv.icon}</span>
                <span class="chip-name">${serv.name}</span>
                <span class="chip-tip" role="tooltip"><strong>${serv.name}</strong>${serv.desc}</span>
            `;

            const select = () => {
                this.selectService(serv);

                // Sichqoncha bo'lmagan qurilmalarda (telefon) bosganda ta'rif qisqa vaqt ko'rinadi
                if (window.matchMedia('(hover: none)').matches) {
                    this.positionChipTip(chip);
                    chip.classList.add('tip-open');
                    clearTimeout(chip._tipTimer);
                    chip._tipTimer = setTimeout(() => chip.classList.remove('tip-open'), 2600);
                }
            };

            chip.addEventListener('click', select);
            chip.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    select();
                }
            });
            chip.addEventListener('mouseenter', () => this.positionChipTip(chip));
            chip.addEventListener('focus', () => this.positionChipTip(chip));
            grid.appendChild(chip);
        });
    },

    // Ta'rif oynasi ekran chetidan chiqib ketmasligi uchun joyini moslaydi
    positionChipTip(chip) {
        const tip = chip.querySelector('.chip-tip');
        if (!tip) return;

        chip.classList.remove('tip-below');
        tip.style.setProperty('--tip-shift', '0px');

        const frame = chip.closest('.device-frame') || document.body;
        const frameRect = frame.getBoundingClientRect();
        const left = Math.max(frameRect.left, 0);
        const right = Math.min(frameRect.right, window.innerWidth);
        const pad = 8;

        const r = tip.getBoundingClientRect();
        let shift = 0;
        if (r.left < left + pad) shift = left + pad - r.left;
        else if (r.right > right - pad) shift = right - pad - r.right;
        tip.style.setProperty('--tip-shift', `${shift}px`);

        // Tepada joy yetmasa, ta'rif chipning pastida chiqadi
        let topLimit = 0;
        if (document.body.classList.contains('mobile-mode')) {
            const scroller = chip.closest('.app-main-content');
            if (scroller) topLimit = scroller.getBoundingClientRect().top;
        } else {
            const nav = document.querySelector('.app-navbar');
            if (nav && ['sticky', 'fixed'].includes(getComputedStyle(nav).position)) {
                topLimit = nav.getBoundingClientRect().bottom;
            }
        }
        if (r.top < topLimit + 4) chip.classList.add('tip-below');
    },

    // ------------------------------------------
    // Traktorchilarni qidirish (3-QADAM) — REST API: GET /api/drivers
    // ------------------------------------------
    bindDriverSearch() {
        const btnSearch = document.getElementById('btn-search-drivers');
        const btnResearch = document.getElementById('btn-research-drivers');
        const btnRetry = document.getElementById('btn-search-retry');
        if (btnSearch) btnSearch.addEventListener('click', () => this.searchDrivers());
        if (btnResearch) btnResearch.addEventListener('click', () => this.searchDrivers());
        if (btnRetry) btnRetry.addEventListener('click', () => this.searchDrivers());
    },

    // Qidirish paneli: tuman va xizmat ro'yxatlarini to'ldiradi
    renderMarketFilters() {
        const district = document.getElementById('market-district');
        if (district) {
            district.innerHTML = '<option value="all">📍 Barcha tumanlar</option>' +
                Object.keys(REGIONS).map(k => `<option value="${k}">${REGIONS[k].short}</option>`).join('');
            district.value = AppState.market.district;
        }
        const service = document.getElementById('market-service');
        if (service) {
            service.innerHTML = AGRI_SERVICES.map(s => `<option value="${s.id}">${s.icon} ${s.name}</option>`).join('');
            service.value = AppState.selectedServiceId;
        }
    },

    bindMarketFilters() {
        const search = document.getElementById('market-search');
        const district = document.getElementById('market-district');
        const service = document.getElementById('market-service');
        const clear = document.getElementById('market-filter-clear');
        const container = document.getElementById('drivers-cards-container');
        const pager = document.getElementById('market-pagination');

        // Ism bo'yicha qidirish: yozishni to'xtatgandan keyin so'rov yuboriladi (debounce)
        if (search) {
            search.addEventListener('input', () => {
                clearTimeout(this.marketSearchTimer);
                this.marketSearchTimer = setTimeout(() => {
                    AppState.market.q = search.value.trim();
                    this.refreshMarket({ resetPage: true });
                }, 350);
            });
        }
        if (district) {
            district.addEventListener('change', () => {
                AppState.market.district = district.value;
                this.refreshMarket({ resetPage: true });
            });
        }
        if (service) {
            service.addEventListener('change', () => this.selectService(getServiceById(service.value)));
        }
        if (clear) clear.addEventListener('click', () => this.clearMarketFilters());

        // Kartochkalar ichidagi tugmalar (qayta urinish, filtrlarni tozalash)
        if (container) {
            container.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action]');
                if (!btn) return;
                if (btn.dataset.action === 'retry') this.refreshMarket();
                if (btn.dataset.action === 'clear-filters') this.clearMarketFilters();
            });
        }

        // Sahifalash
        if (pager) {
            pager.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-page]');
                if (!btn || btn.disabled) return;
                this.refreshMarket({ page: Number(btn.dataset.page) });
                const section = document.getElementById('drivers-market-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }
    },

    clearMarketFilters() {
        clearTimeout(this.marketSearchTimer);
        AppState.market.q = '';
        AppState.market.district = 'all';
        const search = document.getElementById('market-search');
        const district = document.getElementById('market-district');
        if (search) search.value = '';
        if (district) district.value = 'all';
        this.refreshMarket({ resetPage: true });
    },

    // Xizmat turini tanlash (chiplar va filtr ro'yxati uchun umumiy)
    selectService(serv) {
        AppState.selectedService = serv.name;
        AppState.selectedServiceId = serv.id;
        document.querySelectorAll('.agri-service-chip').forEach(c => {
            c.classList.toggle('active', c.dataset.service === serv.id);
        });
        const marketService = document.getElementById('market-service');
        if (marketService) marketService.value = serv.id;

        this.updateSearchSummary();
        if (AppState.searchStatus === 'done') {
            // Narx va "xizmatni bajaradiganlar" ro'yxati xizmatga bog'liq — serverdan qayta olinadi
            this.refreshMarket({ resetPage: true });
        } else if (AppState.searchStatus === 'searching') {
            this.searchDrivers({ force: true });
        }
        MapEngine.renderAllMarkers();
    },

    // 1-qidiruv: to'liq "Loading..." ekrani bilan
    async searchDrivers({ force = false } = {}) {
        if (AppState.searchStatus === 'searching' && !force) return;

        AppState.searchStatus = 'searching';
        AppState.market.page = 1;
        AppState.market.error = '';
        AppState.market.loading = false;
        this.updateSearchPanel();
        MapEngine.renderAllMarkers();

        const messages = [
            "Joylashuvingiz aniqlanmoqda...",
            "Yaqin atrofdagi traktorchilar qidirilmoqda...",
            "Narxlar va masofalar hisoblanmoqda..."
        ];
        const textEl = document.getElementById('search-loading-text');
        let idx = 0;
        if (textEl) textEl.textContent = messages[0];

        clearInterval(this.searchMsgTimer);
        this.searchMsgTimer = setInterval(() => {
            idx = Math.min(idx + 1, messages.length - 1);
            if (textEl) textEl.textContent = messages[idx];
        }, 750);

        const token = ++this.marketToken;
        try {
            await this.fetchMarketPage(1, token);
            if (token !== this.marketToken) return;      // eskirgan javob
            clearInterval(this.searchMsgTimer);
            AppState.searchStatus = 'done';
            this.updateSearchPanel();
            this.renderDriversMarket();
            MapEngine.renderAllMarkers();
        } catch (err) {
            if (token !== this.marketToken) return;
            clearInterval(this.searchMsgTimer);
            AppState.searchStatus = 'error';
            AppState.market.error = err.message;
            this.updateSearchPanel();
            MapEngine.renderAllMarkers();
        }
    },

    // GET /api/drivers?q=&district=&service=&sort=&_page=&_limit=
    async fetchMarketPage(page, token) {
        const m = AppState.market;
        const sort = (document.getElementById('select-sort-drivers') || {}).value || 'distance';
        const params = { q: m.q, district: m.district, service: AppState.selectedServiceId, sort, limit: m.limit };

        let res = await Api.drivers.list({ ...params, page });
        // So'ralgan sahifa chegaradan chiqib qolgan bo'lsa (masalan, o'chirishdan keyin) — oxirgisini olamiz
        if (res.total > 0 && res.items.length === 0 && page > 1) {
            res = await Api.drivers.list({ ...params, page: res.pages });
        }
        if (token !== undefined && token !== this.marketToken) return;

        m.items = res.items.map(normalizeRecord);
        m.total = res.total;
        m.page = res.page;
        m.pages = res.pages;
        m.trace = res.url;
    },

    // Natijalar chiqib bo'lgach filtr / saralash / sahifa o'zgarsa: ro'yxat joyida yangilanadi
    async refreshMarket({ page, resetPage = false } = {}) {
        if (AppState.searchStatus !== 'done') return;
        const m = AppState.market;
        const target = resetPage ? 1 : (page || m.page);

        m.loading = true;
        m.error = '';
        this.renderDriversMarket();

        const token = ++this.marketToken;
        try {
            await this.fetchMarketPage(target, token);
        } catch (err) {
            if (token !== this.marketToken) return;
            m.error = err.message;
            m.items = [];
        }
        if (token !== this.marketToken) return;
        m.loading = false;
        this.renderDriversMarket();
        MapEngine.renderAllMarkers();
    },

    resetSearch() {
        clearInterval(this.searchMsgTimer);
        this.marketToken++;                 // yo'ldagi so'rovlar natijasi e'tiborsiz qoldiriladi
        AppState.searchStatus = 'idle';
        AppState.market.loading = false;
        AppState.market.error = '';
        this.updateSearchPanel();
        this.updateSearchSummary();
        MapEngine.renderAllMarkers();
    },

    updateSearchPanel() {
        const status = AppState.searchStatus;
        const show = (id, on) => {
            const el = document.getElementById(id);
            if (el) el.style.display = on ? '' : 'none';
        };
        show('search-idle-panel', status === 'idle');
        show('search-loading-panel', status === 'searching');
        show('search-error-panel', status === 'error');
        show('search-results-panel', status === 'done');
        show('sort-selector-wrap', status === 'done');

        const errText = document.getElementById('search-error-text');
        if (errText) errText.textContent = AppState.market.error || '';

        const sub = document.getElementById('market-subtitle');
        if (sub) {
            sub.textContent = status === 'done'
                ? "Narxi va qulayliklariga qarab o'zingizga ma'qulini tanlang:"
                : "Xizmat va maydonni tanlab, traktorchilarni qidiring:";
        }
    },

    updateSearchSummary() {
        const el = document.getElementById('search-summary');
        if (!el) return;
        const region = REGIONS[AppState.selectedRegionKey];
        el.innerHTML = `
            <span>🌾 <strong>${AppState.selectedService}</strong></span>
            <span>📐 <strong>${this.getNormalizedSotix()} sotix</strong></span>
            <span>📍 <strong>${region.name}</strong></span>
        `;
    },

    // ------------------------------------------
    // Drivers Market Rendering (The Core Choice!)
    // ------------------------------------------
    renderDriversMarket() {
        const container = document.getElementById('drivers-cards-container');
        if (!container) return;
        const pager = document.getElementById('market-pagination');

        // Qidiruv bosilmaguncha traktorchilar ko'rsatilmaydi
        if (AppState.searchStatus !== 'done') {
            container.innerHTML = '';
            if (pager) pager.innerHTML = '';
            return;
        }

        const m = AppState.market;
        const countEl = document.getElementById('drivers-found-count');
        const traceEl = document.getElementById('market-api-trace');
        if (traceEl) {
            let trace = m.trace || '';
            try { trace = decodeURIComponent(trace.replace(/\+/g, ' ')); } catch (e) { /* o'zgarishsiz */ }
            traceEl.textContent = trace ? `📡 ${trace}` : '';
        }

        // 1) Yuklanmoqda
        if (m.loading) {
            if (countEl) countEl.textContent = '⏳ Loading...';
            container.innerHTML = `
                <div class="market-state loading">
                    <div class="search-spinner small"></div>
                    <strong>Loading...</strong>
                    <span>Traktorchilar ro'yxati yangilanmoqda</span>
                    <div class="skeleton-list">
                        <div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div>
                    </div>
                </div>`;
            if (pager) pager.innerHTML = '';
            return;
        }

        // 2) Xatolik
        if (m.error) {
            if (countEl) countEl.textContent = '⚠️ Xatolik yuz berdi';
            container.innerHTML = `
                <div class="market-state error">
                    <div class="ms-icon">⚠️</div>
                    <strong>Ma'lumotni yuklab bo'lmadi</strong>
                    <span>${escapeHtml(m.error)}</span>
                    <button type="button" class="btn btn-primary btn-sm" data-action="retry">🔄 Qayta urinib ko'rish</button>
                </div>`;
            if (pager) pager.innerHTML = '';
            return;
        }

        const filtered = !!m.q || m.district !== 'all';
        if (countEl) {
            countEl.textContent = `✅ ${m.total} ta traktorchi topildi${filtered ? ' (filtr bo\'yicha)' : ''}`;
        }

        // 3) Hech narsa topilmadi
        if (!m.items.length) {
            container.innerHTML = `
                <div class="market-state empty">
                    <div class="ms-icon">🔍</div>
                    <strong>Mos traktorchi topilmadi</strong>
                    <span>"${escapeHtml(AppState.selectedService)}" xizmatini bajaradigan, shu shartlarga mos traktorchi yo'q.</span>
                    ${filtered ? '<button type="button" class="btn btn-secondary btn-sm" data-action="clear-filters">✕ Filtrlarni tozalash</button>' : ''}
                </div>`;
            if (pager) pager.innerHTML = '';
            return;
        }

        // 4) Kartochkalar
        const sotix = this.getNormalizedSotix();
        const serviceName = AppState.selectedService;

        container.innerHTML = '';
        const known = new Set(NEARBY_DRIVERS.map(d => d.id));
        m.items.forEach(item => {
            if (!known.has(item.id)) return;       // o'chirilgan traktorchi (kesh eskirgan)
            const profile = DriverStore.syncProfile(item);
            const currentPrice = profile.prices[AppState.selectedServiceId] || 0;
            const totalPrice = sotix * currentPrice;
            const driver = { ...item, rating: profile.rating, ratingCount: profile.ratingCount };

            const card = document.createElement('div');
            card.className = `driver-market-card ${driver.recommended ? 'recommended' : ''}`;
            card.id = `card-${driver.id}`;

            card.innerHTML = `
                ${driver.recommended ? '<span class="ribbon-tag">⭐ Tavsiya etiladi</span>' : ''}

                <div class="card-top-row">
                    <img src="${escapeHtml(driver.avatar)}" alt="${escapeHtml(driver.name)}" class="driver-avatar-thumb">
                    <div class="driver-name-block">
                        <h4>${escapeHtml(driver.name)} <span style="font-size:12px; color:#d97706;">⭐ ${formatRating(driver.rating)} <small style="color:#94a3b8;">(${driver.ratingCount})</small></span></h4>
                        <p class="driver-tractor-desc">🚜 ${escapeHtml(driver.tractorModel)} • <span class="plate">${escapeHtml(driver.plate)}</span></p>
                    </div>
                    <div class="distance-pill">
                        <span>📍 ${driver.distanceKm} km</span>
                    </div>
                </div>

                <div class="pricing-block">
                    <div class="rate-item">
                        <span class="label">1 sotix narxi (${serviceName}):</span>
                        <strong class="rate-val">${currentPrice.toLocaleString()} so'm</strong>
                    </div>
                    <div class="total-item">
                        <span class="label">${sotix} sotix uchun jami:</span>
                        <strong class="total-val">${totalPrice.toLocaleString()} so'm</strong>
                    </div>
                </div>

                <div class="amenities-wrap">
                    ${driver.amenities.map(a => `<span class="amenity-badge">✓ ${escapeHtml(a)}</span>`).join('')}
                </div>

                <button class="btn-order-driver" onclick="UI.orderDriver('${driver.id}')">
                    <span>🚜</span>
                    <span>Shu Traktorchini Chaqirish (${serviceName} • ${totalPrice.toLocaleString()} so'm)</span>
                </button>
            `;

            container.appendChild(card);
        });

        if (pager) pager.innerHTML = paginationHtml(m.page, m.pages);
    },

    highlightDriverCard(driverId) {
        const card = document.getElementById(`card-${driverId}`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.style.borderColor = '#16a34a';
            card.style.boxShadow = '0 0 20px rgba(22, 163, 74, 0.4)';
            setTimeout(() => {
                card.style.borderColor = '';
                card.style.boxShadow = '';
            }, 1800);
        }
    },

    // ------------------------------------------
    // Order Placement & Driver Dispatch
    // ------------------------------------------
    orderDriver(driverId) {
        const driver = NEARBY_DRIVERS.find(d => d.id === driverId);
        if (!driver) return;

        const unitPrice = getDriverPrice(driver.id);
        if (!(unitPrice > 0)) {
            alert(`❌ ${driver.name} "${AppState.selectedService}" xizmatini bajarmaydi. Iltimos, boshqa traktorchini tanlang.`);
            return;
        }

        const sotix = this.getNormalizedSotix();
        const price = sotix * unitPrice;
        const region = REGIONS[AppState.selectedRegionKey];

        AppState.activeOrder = {
            id: 'TRK-' + Math.floor(1000 + Math.random() * 9000),
            driverId: driver.id,
            driverName: driver.name,
            driverAvatar: driver.avatar,
            tractorModel: driver.tractorModel,
            plate: driver.plate,
            phone: driver.phone,
            serviceName: AppState.selectedService,
            serviceId: AppState.selectedServiceId,
            distanceKm: driver.distanceKm,
            landSotix: sotix,
            price: price,
            regionName: region.name,
            status: 'PENDING',
            stage: 1
        };

        // Show User Tracking Card
        const trackingCard = document.getElementById('user-tracking-card');
        trackingCard.style.display = 'block';
        document.getElementById('user-tracking-status-title').textContent = `${driver.name} ga buyurtma yuborildi... Javob kutilmoqda`;

        document.getElementById('track-driver-photo').src = driver.avatar;
        document.getElementById('track-driver-name').textContent = driver.name;
        const trackRating = document.getElementById('track-driver-rating');
        if (trackRating) trackRating.textContent = `⭐ ${formatRating(AppState.driverProfiles[driver.id].rating)}`;
        document.getElementById('track-tractor-title').innerHTML = `🚜 ${driver.tractorModel} • <span class="plate">${driver.plate}</span>`;
        document.getElementById('track-fare-size').textContent = `${sotix} sotix`;
        document.getElementById('track-fare-amount').textContent = `${price.toLocaleString()} so'm`;
        const trackFareServ = document.getElementById('track-fare-service');
        if (trackFareServ) trackFareServ.textContent = AppState.selectedService;
        document.getElementById('track-call-btn').href = `tel:${driver.phone}`;

        this.updateUserProgressStep(1);

        // Hide Market list while order is in progress
        document.getElementById('drivers-market-section').style.display = 'none';

        // Trigger Incoming Request on Driver Screen!
        this.triggerIncomingOrderForDriver(driver);
    },

    triggerIncomingOrderForDriver(driver) {
        // So'rov faqat tanlangan traktorchining profilida ko'rinadi.
        // Boshqa profil ochiq bo'lsa, ro'yxatda faqat tanlangan traktorchida 🔔 belgisi paydo bo'ladi.
        this.stopOrderTimer();
        this.renderDriverSwitcher();
        this.renderDriverOrderPanels();
        this.bindAdminTable();
    },

    // Ochiq turgan traktorchi profiliga tegishli buyurtma panellarini ko'rsatadi/yashiradi
    renderDriverOrderPanels() {
        const reqCard = document.getElementById('incoming-request-card');
        const hud = document.getElementById('active-driver-hud');
        if (!reqCard || !hud) return;

        const order = AppState.activeOrder;
        const mine = !!order && order.driverId === AppState.currentDriverId;
        const pending = mine && order.status === 'PENDING';
        const active = mine && ['ON_THE_WAY', 'ARRIVED', 'WORKING'].includes(order.status);

        reqCard.style.display = pending ? 'block' : 'none';
        hud.style.display = active ? 'block' : 'none';

        if (pending) {
            this.fillIncomingOrderCard();
            // Taymer so'rov traktorchiga ko'ringan paytdan boshlanadi
            if (!this.orderTimerInterval) {
                SoundEngine.playOrderPing();
                this.startOrderTimer();
            }
        }
        if (active) {
            this.fillActiveHud();
        }
    },

    fillIncomingOrderCard() {
        const sotix = AppState.activeOrder.landSotix;
        const dist = AppState.activeOrder.distanceKm;
        const price = AppState.activeOrder.price;

        const incServ = document.getElementById('inc-order-service');
        if (incServ) incServ.textContent = AppState.activeOrder.serviceName;

        document.getElementById('inc-order-size').textContent = `${sotix} Sotix`;
        document.getElementById('inc-order-dist').textContent = `${dist} km`;
        document.getElementById('inc-order-price').textContent = `${price.toLocaleString()} so'm`;
        document.getElementById('inc-order-loc').textContent = AppState.activeOrder.regionName;

        // ECONOMIC FEASIBILITY ANALYSIS (User's primary requirement!)
        // Analyze whether the distance vs land size is economically viable for the driver
        const econBox = document.getElementById('inc-economic-box');
        const econIcon = document.getElementById('econ-icon');
        const econTitle = document.getElementById('econ-title');
        const econDesc = document.getElementById('econ-desc');

        // If distance is far (e.g. > 5 km) and area is small (< 8 sotix), it's not economically feasible!
        if (dist > 5 && sotix < 8) {
            econBox.className = 'economic-analysis-box warning';
            econIcon.textContent = '⚠️';
            econTitle.textContent = "Diqqat: Xarajat foydadan yuqori bo'lishi mumkin!";
            econDesc.textContent = `Oraliq masofa ancha uzoq (${dist} km), lekin maydon juda kichik (${sotix} sotix, ${price.toLocaleString()} so'm). Yoqilg'i sarfi va yo'lga ketgan vaqt daromadni deyarli qoplamaydi. Buyurtmani bekor qilish tavsiya etiladi!`;
        } else {
            econBox.className = 'economic-analysis-box';
            econIcon.textContent = '💡';
            econTitle.textContent = "Foydali buyurtma:";
            econDesc.textContent = `Oraliq masofa (${dist} km) va yer maydoni (${sotix} sotix, ${price.toLocaleString()} so'm) bir-biriga to'liq mos. Yoqilg'i xarajati to'liq qoplanadi va yaxshi sof foyda beradi!`;
        }
    },

    fillActiveHud() {
        const order = AppState.activeOrder;
        const hudServ = document.getElementById('hud-job-service');
        if (hudServ) hudServ.textContent = order.serviceName;
        document.getElementById('hud-job-size').textContent = `${order.landSotix} Sotix`;
        document.getElementById('hud-job-fare').textContent = `${order.price.toLocaleString()} so'm`;

        const badge = document.getElementById('driver-hud-stage-badge');
        const btn = document.getElementById('btn-driver-next-step');
        if (order.stage === 1) {
            badge.textContent = "1-BOSQICH: DALAGA YO'L OLISH";
            btn.textContent = "📍 Dalaga Yetib Keldim";
        } else if (order.stage === 2) {
            badge.textContent = "2-BOSQICH: DALAGA YETIB BORILDI";
            btn.textContent = `🌾 ${order.serviceName}ni Boshlash`;
        } else if (order.stage === 3) {
            badge.textContent = `3-BOSQICH: ${order.serviceName.toUpperCase()} JARAYONDA...`;
            btn.textContent = "✅ Ishni Yakunlash va To'lovni Olish";
        }
    },

    startOrderTimer() {
        this.stopOrderTimer();

        // 15 seconds countdown
        let seconds = 15;
        const timerEl = document.getElementById('incoming-timer');
        timerEl.textContent = `${seconds}s`;

        this.orderTimerInterval = setInterval(() => {
            seconds--;
            timerEl.textContent = `${seconds}s`;
            if (seconds <= 0) {
                this.stopOrderTimer();
                if (AppState.activeOrder && AppState.activeOrder.status === 'PENDING') {
                    // Default auto-action: if not touched, decline due to timeout
                    this.driverDeclineOrder("Vaqt tugadi");
                }
            }
        }, 1000);
    },

    stopOrderTimer() {
        if (this.orderTimerInterval) {
            clearInterval(this.orderTimerInterval);
            this.orderTimerInterval = null;
        }
    },

    // ------------------------------------------
    // Driver Actions
    // ------------------------------------------
    bindDriverActions() {
        // Line toggle
        const btnToggleLine = document.getElementById('btn-driver-line-toggle');
        btnToggleLine.addEventListener('click', () => {
            this.toggleDriverLine();
        });

        // Save custom prices (har bir xizmat uchun alohida)
        document.getElementById('btn-save-driver-rate').addEventListener('click', () => {
            this.saveDriverPrices();
        });

        // Accept order
        document.getElementById('btn-driver-accept').addEventListener('click', () => {
            this.driverAcceptOrder();
        });

        // Decline order
        document.getElementById('btn-driver-decline').addEventListener('click', () => {
            this.driverDeclineOrder("Masofa uzoq / Maydon kichik");
        });

        // Next Stage Step button
        document.getElementById('btn-driver-next-step').addEventListener('click', () => {
            this.driverAdvanceStage();
        });
    },

    toggleDriverLine(driverId = AppState.currentDriverId) {
        const profile = AppState.driverProfiles[driverId];
        if (!profile) return;
        profile.isOnline = !profile.isOnline;

        this.renderLineStatus();
        this.renderDriverSwitcher();
        this.bindAdminTable();
    },

    // Ochiq turgan profilning "Liniyaga chiqish" holatini ko'rsatadi
    renderLineStatus() {
        const isOnline = AppState.myDriverProfile.isOnline;

        const btn = document.getElementById('btn-driver-line-toggle');
        const text = document.getElementById('btn-line-text');
        const title = document.getElementById('driver-status-title');
        const dot = document.getElementById('driver-status-dot');
        const navDot = document.getElementById('nav-driver-dot');

        if (isOnline) {
            btn.className = 'btn-line-toggle online';
            text.textContent = 'Liniyadasiz (Faol)';
            title.textContent = '🟢 Liniyadasiz — Buyurtmalar kelmoqda';
            dot.className = 'status-indicator-dot online';
            navDot.className = 'dot-status online';
        } else {
            btn.className = 'btn-line-toggle offline';
            text.textContent = 'Liniyaga Chiqish';
            title.textContent = 'Liniyada emassiz (Dam olish)';
            dot.className = 'status-indicator-dot';
            navDot.className = 'dot-status';
        }
    },

    // ------------------------------------------
    // Traktorchi profillari (har bir traktorchi alohida kiradi)
    // ------------------------------------------
    renderDriverScreen() {
        this.renderDriverSwitcher();
        this.renderDriverProfileHeader();
        this.renderRatingStats();
        this.renderLineStatus();
        this.renderDriverSettings();
        this.renderDriverOrderPanels();
        this.renderDriverFinance();
    },

    switchDriverProfile(driverId) {
        if (!AppState.driverProfiles[driverId]) return;
        AppState.currentDriverId = driverId;
        this.renderDriverScreen();
    },

    renderDriverSwitcher() {
        const wrap = document.getElementById('driver-switcher');
        if (!wrap) return;

        wrap.innerHTML = '';
        NEARBY_DRIVERS.forEach(d => {
            const profile = AppState.driverProfiles[d.id];
            const status = getDriverStatus(d.id);
            const hasNewOrder = !!AppState.activeOrder &&
                AppState.activeOrder.driverId === d.id &&
                AppState.activeOrder.status === 'PENDING';

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'driver-switch-chip' +
                (d.id === AppState.currentDriverId ? ' active' : '') +
                (hasNewOrder ? ' has-order' : '');
            btn.innerHTML = `
                <img src="${profile.avatar}" alt="${profile.name}">
                <span class="ds-info">
                    <strong>${profile.name}</strong>
                    <small><i class="ds-dot ${status.key}"></i>${status.label}</small>
                </span>
                ${hasNewOrder ? '<span class="ds-bell" title="Yangi buyurtma">🔔</span>' : ''}
            `;
            btn.addEventListener('click', () => this.switchDriverProfile(d.id));
            wrap.appendChild(btn);
        });
    },

    // Reyting statistikasi: o'rtacha ball va yulduzlar bo'yicha taqsimot
    renderRatingStats() {
        const box = document.getElementById('driver-rating-stats');
        if (!box) return;
        const p = AppState.myDriverProfile;
        const total = p.ratingCount;

        const rows = [5, 4, 3, 2, 1].map(n => {
            const c = p.ratingDist[n];
            const pct = total ? Math.round((c / total) * 100) : 0;
            return `<div class="rs-row"><span class="rs-label">${n} ★</span><div class="rs-bar"><i style="width:${pct}%"></i></div><span class="rs-count">${c}</span></div>`;
        }).join('');

        box.innerHTML = `
            <div class="rs-title">⭐ Mijozlar bahosi</div>
            <div class="rs-body">
                <div class="rs-summary">
                    <div class="rs-big">${formatRating(p.rating)}</div>
                    ${starsHtml(p.rating)}
                    <small>${total} ta baho</small>
                </div>
                <div class="rs-bars">${rows}</div>
            </div>
        `;
    },

    // ------------------------------------------
    // Mijoz xizmatni baholaydi (5 yulduzli tizim)
    // ------------------------------------------
    requestRating(info) {
        AppState.pendingRating = { ...info, stars: 0, hover: 0, done: false };
        this.renderRatingCard();
    },

    renderRatingCard() {
        const card = document.getElementById('user-rating-card');
        if (!card) return;
        const r = AppState.pendingRating;

        // "Mijoz" tugmasida baho kutilayotgani haqida nuqta
        document.querySelectorAll('#tab-user, #bnav-user').forEach(el => {
            el.classList.toggle('needs-rating', !!r && !r.done);
        });

        if (!r) {
            card.style.display = 'none';
            card.innerHTML = '';
            return;
        }

        const p = AppState.driverProfiles[r.driverId];
        card.style.display = 'block';

        if (r.done) {
            card.innerHTML = `
                <div class="rating-done">
                    <div class="rating-done-icon">✅</div>
                    <strong>Rahmat! Bahoyingiz qabul qilindi</strong>
                    <p>${p.name} ga <b>${r.stars} ★</b> berdingiz.</p>
                    <p class="rating-change">Traktorchi reytingi: <b>${formatRating(r.before)}</b> → <b>${formatRating(r.after)}</b> (${p.ratingCount} ta baho)</p>
                </div>
            `;
            return;
        }

        card.innerHTML = `
            <div class="rating-head">
                <span class="badge-mini">ISH YAKUNLANDI</span>
                <h3>Xizmatni baholang</h3>
            </div>
            <div class="rating-driver">
                <img src="${p.avatar}" alt="${p.name}">
                <div>
                    <strong>${p.name}</strong>
                    <small>${r.serviceName} • ${r.sotix} sotix • ${r.price.toLocaleString()} so'm</small>
                </div>
            </div>
            <div class="rating-stars" id="rating-stars">
                ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="star-btn" data-star="${n}" aria-label="${n} yulduz">★</button>`).join('')}
            </div>
            <div class="rating-label" id="rating-label"></div>
            <div class="rating-actions">
                <button type="button" class="btn btn-secondary" id="btn-skip-rating">Keyinroq</button>
                <button type="button" class="btn btn-primary" id="btn-submit-rating" disabled>Baholash</button>
            </div>
        `;

        const btns = card.querySelectorAll('.star-btn');
        const label = card.querySelector('#rating-label');
        const submit = card.querySelector('#btn-submit-rating');

        const paint = () => {
            const active = r.hover || r.stars;
            btns.forEach((b, i) => b.classList.toggle('on', i < active));
            label.textContent = active ? RATING_LABELS[active] : "Yulduzchani tanlang";
            label.classList.toggle('chosen', !!active);
        };

        btns.forEach((b, i) => {
            b.addEventListener('mouseenter', () => { r.hover = i + 1; paint(); });
            b.addEventListener('mouseleave', () => { r.hover = 0; paint(); });
            b.addEventListener('click', () => {
                r.stars = i + 1;
                r.hover = 0;
                submit.disabled = false;
                paint();
            });
        });
        submit.addEventListener('click', () => this.submitRating());
        card.querySelector('#btn-skip-rating').addEventListener('click', () => {
            AppState.pendingRating = null;
            this.renderRatingCard();
        });
        paint();
    },

    submitRating() {
        const r = AppState.pendingRating;
        if (!r || !r.stars || r.done) return;

        const p = AppState.driverProfiles[r.driverId];
        r.before = p.rating;
        p.ratingDist[r.stars] += 1;
        syncRating(p);
        r.after = p.rating;
        r.done = true;

        // Yangi baholar taqsimoti serverga yuboriladi (PATCH /api/drivers/:id)
        Api.drivers.update(r.driverId, { ratingDist: { ...p.ratingDist } })
            .catch(err => console.warn("Reytingni serverga yozib bo'lmadi:", err.message));

        this.renderRatingCard();
        this.renderRatingStats();
        this.renderDriverProfileHeader();
        this.renderDriversMarket();
        this.bindAdminTable();

        setTimeout(() => {
            if (AppState.pendingRating === r) {
                AppState.pendingRating = null;
                this.renderRatingCard();
            }
        }, 6000);
    },

    renderDriverProfileHeader() {
        const p = AppState.myDriverProfile;
        const avatar = document.getElementById('driver-profile-avatar');
        avatar.src = p.avatar;
        avatar.alt = p.name;
        document.getElementById('driver-profile-name').textContent = p.name;
        document.getElementById('driver-profile-rating').textContent = `⭐ ${formatRating(p.rating)}`;
        document.getElementById('driver-profile-tractor').innerHTML =
            `🚜 <strong>${p.tractorModel}</strong> • <span class="plate-badge">${p.plate}</span>`;
        document.getElementById('driver-profile-license').innerHTML =
            `📋 O'zAgroinspeksiya: <strong class="text-green">FAOL (Seriya ${p.licenseSeries})</strong>`;
    },

    // Narxlar (har bir xizmat uchun) va qulayliklar
    renderDriverSettings() {
        const p = AppState.myDriverProfile;

        const grid = document.getElementById('driver-prices-grid');
        if (grid) {
            grid.innerHTML = '';
            AGRI_SERVICES.forEach(serv => {
                const row = document.createElement('label');
                row.className = 'price-row';
                row.innerHTML = `
                    <span class="pr-name">${serv.icon} ${serv.name}</span>
                    <input type="number" data-service="${serv.id}" value="${p.prices[serv.id] ?? ''}" placeholder="bajarmayman" step="500" min="500">
                    <span class="pr-unit">so'm/sotix</span>
                `;
                grid.appendChild(row);
            });
        }

        const amenities = document.getElementById('driver-my-amenities');
        if (amenities) {
            amenities.innerHTML = p.amenities.map(a => `<span class="amenity-chip active">✅ ${a}</span>`).join('');
        }
    },

    // PATCH /api/drivers/:id  { prices }
    async saveDriverPrices() {
        const p = AppState.myDriverProfile;
        const inputs = document.querySelectorAll('#driver-prices-grid input[data-service]');
        const newPrices = {};
        let hasInvalid = false;

        inputs.forEach(inp => {
            const raw = inp.value.trim();
            if (raw === '') {                       // bo'sh = bu xizmatni bajarmayman
                inp.classList.remove('invalid');
                return;
            }
            const val = Number(raw);
            const bad = !Number.isInteger(val) || val < 500;
            inp.classList.toggle('invalid', bad);
            if (bad) hasInvalid = true;
            else newPrices[inp.dataset.service] = val;
        });

        if (hasInvalid) {
            alert("❌ Narx 500 so'mdan kam bo'lmagan butun son bo'lishi kerak (bajarmaydigan xizmat narxini bo'sh qoldiring).");
            return;
        }
        if (!Object.keys(newPrices).length) {
            alert("❌ Kamida bitta xizmat uchun 1 sotix narxini kiriting.");
            return;
        }

        const btn = document.getElementById('btn-save-driver-rate');
        const label = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Saqlanmoqda...';

        try {
            const rec = await Api.drivers.update(p.id, { prices: newPrices });
            DriverStore.upsert(rec);
            this.replaceAdminItem(rec);

            this.renderDriverSettings();
            this.bindAdminTable();
            if (AppState.searchStatus === 'done') this.refreshMarket();
            MapEngine.renderAllMarkers();
            alert(`✅ ${p.name}, ${Object.keys(newPrices).length} ta xizmat uchun 1 sotix narxlaringiz muvaffaqiyatli saqlandi! Fermerlar tanlangan xizmatga qarab shu narxlarni ko'radi.`);
        } catch (err) {
            alert(`❌ Narxlarni saqlab bo'lmadi: ${err.message}`);
        } finally {
            btn.disabled = false;
            btn.textContent = label;
        }
    },

    driverAcceptOrder() {
        this.stopOrderTimer();
        SoundEngine.playSuccessChime();

        AppState.activeOrder.status = 'ON_THE_WAY';
        AppState.activeOrder.stage = 1;

        // Hide incoming card, show Active HUD (faqat shu traktorchi profilida)
        this.renderDriverOrderPanels();
        this.renderDriverSwitcher();
        // Traktorchi ish boshladi: adminda "Ishlamoqda" ko'rinadi
        this.bindAdminTable();

        // Update User Screen
        document.getElementById('user-tracking-status-title').textContent = `Traktorchi "${AppState.activeOrder.serviceName}" buyurtmasini qabul qildi! Dalangiz tomon yo'lga chiqdi 🚜`;
        this.updateUserProgressStep(2);

        // Start route animation on the map!
        const region = REGIONS[AppState.selectedRegionKey];
        const driver = NEARBY_DRIVERS.find(d => d.id === AppState.activeOrder.driverId) || NEARBY_DRIVERS[0];
        const driverCoords = [
            region.fieldCoords[0] + driver.latOffset,
            region.fieldCoords[1] + driver.lngOffset
        ];

        MapEngine.startTractorRouteAnimation(driverCoords, region.fieldCoords, () => {
            if (AppState.activeOrder && AppState.activeOrder.stage === 1) {
                this.driverArrivedAtField();
            }
        });
    },

    driverDeclineOrder(reason) {
        this.stopOrderTimer();
        document.getElementById('incoming-request-card').style.display = 'none';

        // Notify user
        alert(`❌ Traktorchi buyurtmani bekor qildi.\nSababi: ${reason}.\nIltimos, yaqinroqdagi boshqa traktorchini tanlang!`);

        this.cancelActiveOrder();
    },

    driverAdvanceStage() {
        if (!AppState.activeOrder) return;

        if (AppState.activeOrder.stage === 1) {
            this.driverArrivedAtField();
        } else if (AppState.activeOrder.stage === 2) {
            this.driverStartPlowing();
        } else if (AppState.activeOrder.stage === 3) {
            this.driverCompleteJob();
        }
    },

    driverArrivedAtField() {
        AppState.activeOrder.stage = 2;
        AppState.activeOrder.status = 'ARRIVED';

        document.getElementById('driver-hud-stage-badge').textContent = "2-BOSQICH: DALAGA YETIB BORILDI";
        document.getElementById('btn-driver-next-step').textContent = `🌾 ${AppState.activeOrder.serviceName}ni Boshlash`;

        document.getElementById('user-tracking-status-title').textContent = `Traktor dalangizga yetib keldi! ${AppState.activeOrder.serviceName} ishi boshlanmoqda.`;
        this.updateUserProgressStep(3);
    },

    driverStartPlowing() {
        AppState.activeOrder.stage = 3;
        AppState.activeOrder.status = 'WORKING';

        document.getElementById('driver-hud-stage-badge').textContent = `3-BOSQICH: ${AppState.activeOrder.serviceName.toUpperCase()} JARAYONDA...`;
        document.getElementById('btn-driver-next-step').textContent = "✅ Ishni Yakunlash va To'lovni Olish";

        document.getElementById('user-tracking-status-title').textContent = `Traktor maydoningizda "${AppState.activeOrder.serviceName}" ishini bajarmoqda... 🚜💨`;
        this.updateUserProgressStep(4);
    },

    driverCompleteJob() {
        AppState.activeOrder.stage = 4;
        AppState.activeOrder.status = 'COMPLETED';

        SoundEngine.playSuccessChime();

        const fare = AppState.activeOrder.price;
        const ratingRequest = {
            driverId: AppState.activeOrder.driverId,
            serviceName: AppState.activeOrder.serviceName,
            sotix: AppState.activeOrder.landSotix,
            price: AppState.activeOrder.price
        };
        const commission = Math.round(fare * 0.05);
        const netEarnings = fare - commission;

        // Update Driver stats (buyurtma tegishli bo'lgan traktorchi hisobiga)
        const worker = AppState.driverProfiles[AppState.activeOrder.driverId] || AppState.myDriverProfile;
        worker.dailyIncome += netEarnings;
        worker.walletBalance += netEarnings;
        worker.totalSotixWorked += AppState.activeOrder.landSotix;
        worker.jobsToday += 1;

        worker.history.unshift({
            title: `${AppState.activeOrder.serviceName} (${AppState.activeOrder.landSotix} sotix)`,
            place: AppState.activeOrder.regionName.split('(')[0],
            time: "Hozirgina",
            amount: netEarnings
        });

        this.renderDriverFinance();
        this.updateUserProgressStep(5);

        alert(`🎉 Tabriklaymiz! "${AppState.activeOrder.serviceName}" ishi muvaffaqiyatli yakunlandi.\n\nUmumiy to'lov: ${fare.toLocaleString()} so'm\nTexnopark komissiyasi (5%): -${commission.toLocaleString()} so'm\nHaydovchi hisobiga tushdi: +${netEarnings.toLocaleString()} so'm\n\n⭐ Endi Mijoz bo'limida xizmatni baholash so'raladi.`);

        // Reset
        document.getElementById('active-driver-hud').style.display = 'none';
        this.cancelActiveOrder();
        // Yangi buyurtma uchun traktorchilarni qaytadan qidirish kerak
        this.resetSearch();
        // Mijozdan xizmatni baholash so'raladi
        this.requestRating(ratingRequest);
    },

    cancelActiveOrder() {
        this.stopOrderTimer();
        AppState.activeOrder = null;
        MapEngine.resetAnimation();

        document.getElementById('user-tracking-card').style.display = 'none';
        document.getElementById('drivers-market-section').style.display = 'block';
        this.renderDriverOrderPanels();
        this.renderDriverSwitcher();
        this.bindAdminTable();
    },

    updateUserProgressStep(stepNum) {
        const stepIds = ['p-step-1', 'p-step-2', 'p-step-3', 'p-step-4', 'p-step-5'];
        stepIds.forEach((id, idx) => {
            const el = document.getElementById(id);
            if (el) {
                if (idx + 1 <= stepNum) {
                    el.className = 'bar-step active';
                } else {
                    el.className = 'bar-step';
                }
            }
        });
    },

    bindHistoryToggle() {
        const btn = document.getElementById('btn-toggle-driver-history');
        if (!btn) return;
        btn.addEventListener('click', () => {
            AppState.historyVisible = !AppState.historyVisible;
            this.renderDriverFinance();
        });
    },

    renderDriverFinance() {
        const p = AppState.myDriverProfile;
        document.getElementById('fin-daily-income').textContent = `${p.dailyIncome.toLocaleString()} so'm`;
        document.getElementById('fin-wallet-balance').textContent = `${p.walletBalance.toLocaleString()} so'm`;
        document.getElementById('fin-total-sotix').textContent = `${p.totalSotixWorked} Sotix`;
        const jobsEl = document.getElementById('fin-jobs-today');
        if (jobsEl) jobsEl.textContent = `Bugun ${p.jobsToday} ta tomorqa/dala`;

        const container = document.getElementById('driver-history-container');
        if (!container) return;

        const visible = AppState.historyVisible;
        const countEl = document.getElementById('driver-history-count');
        if (countEl) countEl.textContent = `(${p.history.length} ta)`;

        const btn = document.getElementById('btn-toggle-driver-history');
        if (btn) {
            btn.classList.toggle('is-hidden', !visible);
            btn.setAttribute('aria-pressed', String(!visible));
            btn.title = visible ? 'Tarixni yashirish' : "Tarixni ko'rsatish";
            btn.innerHTML = `${eyeIcon(visible)}<span>${visible ? 'Yashirish' : "Ko'rsatish"}</span>`;
        }

        if (visible) {
            container.innerHTML = historyRowsHtml(p.history);
        } else {
            container.innerHTML = `<div class="history-hidden-note">Ish tarixi yashirilgan (${p.history.length} ta yozuv). Ko'rish uchun ko'z belgisini bosing.</div>`;
        }
    },

    // ------------------------------------------
    // Admin Fleet Table
    // ------------------------------------------
    bindAdminControls() {
        const select = document.getElementById('admin-service-select');
        if (!select) return;
        select.innerHTML = AGRI_SERVICES.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        select.value = AppState.adminServiceId;
        select.addEventListener('change', (e) => {
            AppState.adminServiceId = e.target.value;
            this.bindAdminTable();
        });
    },

    // ------------------------------------------
    // Boshlang'ich yuklash (GET /api/drivers) va xabarlar
    // ------------------------------------------
    bindBoot() {
        const retry = document.getElementById('btn-boot-retry');
        if (retry) retry.addEventListener('click', () => this.bootstrap());
    },

    setBoot(state, message) {
        const boot = document.getElementById('app-boot');
        if (!boot) return;
        const isError = state === 'error';
        boot.style.display = state === 'ready' ? 'none' : 'flex';
        document.getElementById('boot-spinner').style.display = isError ? 'none' : '';
        document.getElementById('boot-icon').style.display = isError ? '' : 'none';
        document.getElementById('btn-boot-retry').style.display = isError ? '' : 'none';
        document.getElementById('boot-title').textContent = isError ? "Ma'lumotlarni yuklab bo'lmadi" : 'Loading...';
        document.getElementById('boot-text').textContent = isError
            ? (message || 'Noma\'lum xatolik')
            : "Traktorchilar ma'lumotlari serverdan yuklanmoqda";
    },

    async bootstrap() {
        this.setBoot('loading');
        try {
            const { items } = await Api.drivers.list({});
            if (!items.length) throw new Error("Ma'lumotlar bazasida traktorchilar yo'q.");

            DriverStore.replaceAll(items);
            if (!AppState.driverProfiles[AppState.currentDriverId]) {
                AppState.currentDriverId = NEARBY_DRIVERS[0].id;
            }
            this.setBoot('ready');
            this.renderDriverScreen();
            this.loadAdminTable();

            if (!this.mapStarted) {
                this.mapStarted = true;
                setTimeout(() => MapEngine.init(), 150);
            }
        } catch (err) {
            this.setBoot('error', err.message);
        }
    },

    toast(message, type = 'success') {
        const wrap = document.getElementById('toast-wrap');
        if (!wrap) return;
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.textContent = (type === 'error' ? '⚠️ ' : '✅ ') + message;
        wrap.appendChild(el);
        setTimeout(() => el.classList.add('hide'), 3600);
        setTimeout(() => el.remove(), 4000);
    },

    // ------------------------------------------
    // Admin: traktorchilar jadvali (GET / POST / PUT / PATCH / DELETE /api/drivers)
    // ------------------------------------------
    bindAdminCrud() {
        const search = document.getElementById('admin-search');
        const addBtn = document.getElementById('btn-admin-add-driver');
        const tbody = document.getElementById('admin-fleet-table');
        const pager = document.getElementById('admin-pagination');
        const mode = document.getElementById('api-mode');
        const reset = document.getElementById('btn-api-reset');

        if (search) {
            search.addEventListener('input', () => {
                clearTimeout(this.adminSearchTimer);
                this.adminSearchTimer = setTimeout(() => {
                    AppState.admin.q = search.value.trim();
                    AppState.admin.page = 1;
                    this.loadAdminTable();
                }, 350);
            });
        }
        if (addBtn) addBtn.addEventListener('click', () => this.openDriverForm(null));

        if (tbody) {
            tbody.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-act]');
                if (!btn) return;
                const id = btn.dataset.id;
                if (btn.dataset.act === 'edit') this.openDriverForm(id);
                else if (btn.dataset.act === 'delete') this.deleteDriver(id);
                else if (btn.dataset.act === 'star') this.toggleRecommended(id);
                else if (btn.dataset.act === 'retry') this.loadAdminTable();
            });
        }

        if (pager) {
            pager.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-page]');
                if (!btn || btn.disabled) return;
                AppState.admin.page = Number(btn.dataset.page);
                this.loadAdminTable();
            });
        }

        if (mode) {
            mode.addEventListener('change', () => {
                window.MockServer.setMode(mode.value);
                this.toast(mode.value === 'normal' ? 'Server normal holatga qaytdi' : 'Server holati o\'zgartirildi: so\'rovlar xato bilan tugaydi', mode.value === 'normal' ? 'success' : 'error');
            });
        }
        if (reset) reset.addEventListener('click', () => this.resetApiData());
    },

    // GET /api/drivers?q=&_page=&_limit=
    async loadAdminTable() {
        const a = AppState.admin;
        a.status = 'loading';
        a.error = '';
        this.bindAdminTable();

        const token = ++this.adminToken;
        try {
            let res = await Api.drivers.list({ q: a.q, page: a.page, limit: a.limit });
            if (res.total > 0 && res.items.length === 0 && a.page > 1) {
                res = await Api.drivers.list({ q: a.q, page: res.pages, limit: a.limit });
            }
            if (token !== this.adminToken) return;

            a.items = res.items.map(normalizeRecord);
            a.items.forEach(r => DriverStore.upsert(r));
            a.total = res.total;
            a.page = res.page;
            a.pages = res.pages;
            a.trace = res.url;
            a.status = 'ready';
        } catch (err) {
            if (token !== this.adminToken) return;
            a.status = 'error';
            a.error = err.message;
            a.items = [];
        }
        this.bindAdminTable();
    },

    renderAdminStats() {
        const set = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };
        const profiles = NEARBY_DRIVERS.map(d => AppState.driverProfiles[d.id]).filter(Boolean);
        const online = NEARBY_DRIVERS.filter(d => getDriverStatus(d.id).key === 'online').length;
        const sotix = profiles.reduce((sum, p) => sum + p.totalSotixWorked, 0);
        const net = profiles.reduce((sum, p) => sum + p.dailyIncome, 0);
        const commission = Math.round(net / 0.95 * 0.05);

        set('admin-tractors-count', `${NEARBY_DRIVERS.length} ta`);
        set('admin-online-count', `${online} ta`);
        set('admin-today-sotix', `${sotix} Sotix`);
        set('admin-commission', `${commission.toLocaleString()} so'm`);
    },

    // Jadvalni keshdagi (serverdan olingan) ma'lumotlardan chizadi
    bindAdminTable() {
        const tbody = document.getElementById('admin-fleet-table');
        if (!tbody) return;

        const a = AppState.admin;
        const service = getServiceById(AppState.adminServiceId);
        const th = document.getElementById('admin-price-th');
        if (th) th.innerHTML = `1 Sotix Narxi<small class="th-sub">${service.name}</small>`;

        this.renderAdminStats();

        const traceEl = document.getElementById('admin-api-trace');
        if (traceEl) {
            let trace = a.trace || '';
            try { trace = decodeURIComponent(trace.replace(/\+/g, ' ')); } catch (e) { /* o'zgarishsiz */ }
            traceEl.textContent = trace ? `📡 ${trace}` : '';
        }
        const pager = document.getElementById('admin-pagination');
        const COLS = 9;

        if (a.status === 'idle' || a.status === 'loading') {
            tbody.innerHTML = `<tr class="table-state-row"><td colspan="${COLS}"><div class="table-state"><div class="search-spinner small"></div><strong>Loading...</strong><span>Traktorchilar ro'yxati yuklanmoqda</span></div></td></tr>`;
            if (pager) pager.innerHTML = '';
            return;
        }
        if (a.status === 'error') {
            tbody.innerHTML = `<tr class="table-state-row"><td colspan="${COLS}"><div class="table-state error"><div class="ms-icon">⚠️</div><strong>Ro'yxatni yuklab bo'lmadi</strong><span>${escapeHtml(a.error)}</span><button type="button" class="btn btn-primary btn-sm" data-act="retry">🔄 Qayta urinib ko'rish</button></div></td></tr>`;
            if (pager) pager.innerHTML = '';
            return;
        }
        if (!a.items.length) {
            tbody.innerHTML = `<tr class="table-state-row"><td colspan="${COLS}"><div class="table-state"><div class="ms-icon">🔍</div><strong>Traktorchi topilmadi</strong><span>${a.q ? `"${escapeHtml(a.q)}" bo'yicha natija yo'q.` : "Ro'yxat bo'sh."}</span></div></td></tr>`;
            if (pager) pager.innerHTML = '';
            return;
        }

        tbody.innerHTML = '';
        a.items.forEach(rec => {
            const p = AppState.driverProfiles[rec.id];
            if (!p) return;                         // o'chirilgan traktorchi (kesh eskirgan)
            const status = getDriverStatus(rec.id);
            const open = !!AppState.adminHistoryOpen[rec.id];
            const price = p.prices[service.id];
            const districts = p.districts.map(k => (REGIONS[k] ? REGIONS[k].short : k)).join(', ');

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${escapeHtml(p.name)}</strong>${p.recommended ? ' <span title="Tavsiya etilgan">⭐</span>' : ''}<br><small class="admin-rating">⭐ ${formatRating(p.rating)} (${p.ratingCount} ta baho)</small></td>
                <td>${escapeHtml(p.tractorModel)}<br><small class="muted-line">📍 ${escapeHtml(districts)}</small></td>
                <td><span class="plate">${escapeHtml(p.plate)}</span></td>
                <td>${price ? `<strong class="text-green">${price.toLocaleString()} so'm</strong>` : '<span class="muted-dash">— bajarmaydi</span>'}</td>
                <td><small>${escapeHtml(p.amenities.slice(0, 2).join(', '))}</small></td>
                <td><span class="tag green">Faol</span></td>
                <td><span class="tag ${status.tag}">${status.key === 'working' ? '🚜 ' : ''}${status.label}</span></td>
                <td>
                    <button type="button" class="btn-eye btn-eye-sm ${open ? '' : 'is-hidden'}" data-driver="${rec.id}"
                        aria-pressed="${!open}" title="${open ? 'Tarixni yashirish' : "Tarixni ko'rsatish"}">
                        ${eyeIcon(open)}<span>${p.history.length} ta</span>
                    </button>
                </td>
                <td class="actions-cell">
                    <button type="button" class="icon-btn" data-act="star" data-id="${rec.id}" title="${p.recommended ? "Tavsiyadan olish (PATCH)" : "Tavsiya etilgan qilish (PATCH)"}">${p.recommended ? '★' : '☆'}</button>
                    <button type="button" class="icon-btn" data-act="edit" data-id="${rec.id}" title="Tahrirlash (PUT)">✏️</button>
                    <button type="button" class="icon-btn danger" data-act="delete" data-id="${rec.id}" title="O'chirish (DELETE)">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);

            if (open) {
                const hr = document.createElement('tr');
                hr.className = 'admin-history-row';
                hr.innerHTML = `
                    <td colspan="${COLS}">
                        <div class="admin-history-box">
                            <h5>📋 ${escapeHtml(p.name)} — bajarilgan ishlar tarixi (${p.history.length} ta)</h5>
                            <div class="history-items">${historyRowsHtml(p.history)}</div>
                        </div>
                    </td>
                `;
                tbody.appendChild(hr);
            }
        });

        tbody.querySelectorAll('.btn-eye').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.driver;
                AppState.adminHistoryOpen[id] = !AppState.adminHistoryOpen[id];
                this.bindAdminTable();
            });
        });

        if (pager) {
            pager.innerHTML = paginationHtml(a.page, a.pages) + `<span class="pg-total">Jami: ${a.total} ta</span>`;
        }
    },

    // Keshdagi bitta qatorni serverdan kelgan yangi yozuv bilan almashtiradi
    replaceAdminItem(record) {
        const a = AppState.admin;
        a.items = a.items.map(i => i.id === record.id ? normalizeRecord(record) : i);
    },

    // PATCH /api/drivers/:id  { recommended }
    async toggleRecommended(id) {
        const p = AppState.driverProfiles[id];
        if (!p) return;
        this.adminBusy = this.adminBusy || new Set();
        if (this.adminBusy.has(id)) return;
        this.adminBusy.add(id);
        try {
            const rec = await Api.drivers.update(id, { recommended: !p.recommended });
            DriverStore.upsert(rec);
            this.replaceAdminItem(rec);
            this.bindAdminTable();
            if (AppState.searchStatus === 'done') this.refreshMarket();
            this.toast(rec.recommended ? `${rec.name} "Tavsiya etiladi" qilindi` : `${rec.name} tavsiyadan olindi`);
        } catch (err) {
            this.toast(err.message, 'error');
        } finally {
            this.adminBusy.delete(id);
        }
    },

    // DELETE /api/drivers/:id
    async deleteDriver(id) {
        const p = AppState.driverProfiles[id];
        if (!p) return;
        const hasOrder = !!AppState.activeOrder && AppState.activeOrder.driverId === id;
        const text = `"${p.name}" traktorchisini ro'yxatdan o'chirishni tasdiqlaysizmi?` +
            (hasOrder ? "\n\nDiqqat: unga yuborilgan joriy buyurtma bekor qilinadi." : '');
        if (!confirm(text)) return;

        this.adminBusy = this.adminBusy || new Set();
        if (this.adminBusy.has(id)) return;
        this.adminBusy.add(id);
        try {
            await Api.drivers.remove(id);
        } catch (err) {
            this.adminBusy.delete(id);
            this.toast(err.message, 'error');
            return;
        }
        this.adminBusy.delete(id);

        DriverStore.remove(id);
        AppState.admin.items = AppState.admin.items.filter(i => i.id !== id);
        AppState.market.items = AppState.market.items.filter(i => i.id !== id);
        if (AppState.currentDriverId === id) AppState.currentDriverId = NEARBY_DRIVERS[0].id;
        if (AppState.pendingRating && AppState.pendingRating.driverId === id) {
            AppState.pendingRating = null;
            this.renderRatingCard();
        }
        if (hasOrder) this.cancelActiveOrder();
        this.renderDriverScreen();

        if (AppState.admin.items.length === 1 && AppState.admin.page > 1) AppState.admin.page--;
        this.toast(`${p.name} o'chirildi`);
        if (AppState.searchStatus === 'done') this.refreshMarket();
        await this.loadAdminTable();
    },

    // POST /api/reset
    async resetApiData() {
        if (!confirm("Barcha traktorchilar (qo'shilgan, tahrirlangan va o'chirilganlar) boshlang'ich holatga qaytariladi. Davom etasizmi?")) return;
        try {
            await Api.reset();
            const { items } = await Api.drivers.list({});
            AppState.driverProfiles = {};
            DriverStore.replaceAll(items);
            AppState.currentDriverId = AppState.driverProfiles['driver-rustam'] ? 'driver-rustam' : NEARBY_DRIVERS[0].id;
            AppState.pendingRating = null;
            this.renderRatingCard();
            if (AppState.activeOrder) this.cancelActiveOrder();

            AppState.admin.q = '';
            AppState.admin.page = 1;
            const search = document.getElementById('admin-search');
            if (search) search.value = '';

            this.renderDriverScreen();
            this.toast("Boshlang'ich ma'lumotlar tiklandi");
            await this.loadAdminTable();
            if (AppState.searchStatus === 'done') this.refreshMarket({ resetPage: true });
        } catch (err) {
            this.toast(err.message, 'error');
        }
    },

    // ------------------------------------------
    // Traktorchi qo'shish / tahrirlash formasi (POST / PUT)
    // ------------------------------------------
    bindDriverForm() {
        const form = document.getElementById('driver-form');
        const modal = document.getElementById('driver-modal');
        if (!form || !modal) return;

        // Tumanlar (checkbox) va 12 ta xizmat narxi maydonlari bir marta quriladi
        document.getElementById('df-districts').innerHTML = Object.keys(REGIONS).map(k =>
            `<label class="check-chip"><input type="checkbox" name="district" value="${k}"><span>${REGIONS[k].short}</span></label>`
        ).join('');
        document.getElementById('df-prices').innerHTML = AGRI_SERVICES.map(s => `
            <label class="price-row">
                <span class="pr-name">${s.icon} ${s.name}</span>
                <input type="number" data-service="${s.id}" step="500" min="500" placeholder="—">
                <span class="pr-unit">so'm</span>
            </label>`).join('');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitDriverForm();
        });
        const close = () => this.closeDriverForm();
        document.getElementById('btn-close-driver-modal').addEventListener('click', close);
        document.getElementById('btn-cancel-driver-modal').addEventListener('click', close);
        modal.addEventListener('mousedown', (e) => { if (e.target === modal) close(); });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display !== 'none') close();
        });
    },

    openDriverForm(id) {
        const modal = document.getElementById('driver-modal');
        const form = document.getElementById('driver-form');
        const p = id ? AppState.driverProfiles[id] : null;
        if (id && !p) return;

        this.driverFormId = id || null;
        form.reset();
        this.clearFormErrors();

        document.getElementById('driver-modal-title').textContent = p
            ? `✏️ Traktorchini tahrirlash — ${p.name}`
            : "➕ Yangi traktorchi qo'shish";

        const val = (fid, v) => { document.getElementById(fid).value = v == null ? '' : v; };
        val('df-name', p && p.name);
        val('df-phone', p ? p.phone : '+998 ');
        val('df-tractor', p && p.tractorModel);
        val('df-plate', p && p.plate);
        val('df-license', p && p.licenseSeries);
        val('df-distance', p && p.distanceKm);
        val('df-avatar', p && !/^data:image\/svg\+xml/.test(p.avatar) ? p.avatar : '');
        val('df-amenities', p ? p.amenities.join('\n') : '');
        document.getElementById('df-recommended').checked = !!(p && p.recommended);

        document.querySelectorAll('#df-districts input').forEach(cb => {
            cb.checked = !!p && p.districts.indexOf(cb.value) !== -1;
        });
        document.querySelectorAll('#df-prices input[data-service]').forEach(inp => {
            const price = p ? p.prices[inp.dataset.service] : undefined;
            inp.value = price ? price : '';
        });

        modal.style.display = 'flex';
        setTimeout(() => document.getElementById('df-name').focus(), 50);
    },

    closeDriverForm() {
        document.getElementById('driver-modal').style.display = 'none';
        this.driverFormId = null;
    },

    collectDriverForm() {
        const text = (id) => document.getElementById(id).value.trim();
        const asNumber = (raw) => {
            const n = Number(String(raw).replace(',', '.'));
            return raw !== '' && Number.isFinite(n) ? n : raw;
        };

        const prices = {};
        document.querySelectorAll('#df-prices input[data-service]').forEach(inp => {
            const raw = inp.value.trim();
            if (raw !== '') prices[inp.dataset.service] = asNumber(raw);
        });

        return {
            name: text('df-name'),
            phone: text('df-phone'),
            tractorModel: text('df-tractor'),
            plate: text('df-plate'),
            licenseSeries: text('df-license'),
            distanceKm: asNumber(text('df-distance')),
            avatar: text('df-avatar'),
            districts: Array.from(document.querySelectorAll('#df-districts input:checked')).map(cb => cb.value),
            prices,
            amenities: document.getElementById('df-amenities').value.split('\n').map(s => s.trim()).filter(Boolean),
            recommended: document.getElementById('df-recommended').checked
        };
    },

    clearFormErrors() {
        document.querySelectorAll('#driver-form [data-err]').forEach(el => { el.textContent = ''; });
        document.querySelectorAll('#driver-form .invalid').forEach(el => el.classList.remove('invalid'));
        const banner = document.getElementById('driver-form-banner');
        if (banner) { banner.style.display = 'none'; banner.textContent = ''; }
    },

    // Server (422 / 409) qaytargan maydon xatolarini formada ko'rsatadi
    showFormErrors(err) {
        const errors = err.errors || {};
        const fieldMap = {
            name: 'df-name', phone: 'df-phone', tractorModel: 'df-tractor', plate: 'df-plate',
            licenseSeries: 'df-license', distanceKm: 'df-distance', avatar: 'df-avatar', amenities: 'df-amenities'
        };
        let shown = 0;
        let priceError = false;

        Object.keys(errors).forEach(key => {
            if (key.indexOf('prices.') === 0) {
                const inp = document.querySelector(`#df-prices input[data-service="${key.slice(7)}"]`);
                if (inp) inp.classList.add('invalid');
                priceError = true;
                shown++;
                return;
            }
            const target = document.querySelector(`#driver-form [data-err="${key}"]`);
            if (target) {
                target.textContent = errors[key];
                shown++;
            }
            if (fieldMap[key]) document.getElementById(fieldMap[key]).classList.add('invalid');
        });
        if (priceError) {
            document.querySelector('#driver-form [data-err="prices"]').textContent =
                "Qizil bilan belgilangan narxlar 500 so'mdan kam bo'lmagan butun son bo'lishi kerak.";
        }

        const banner = document.getElementById('driver-form-banner');
        banner.textContent = shown ? "Iltimos, belgilangan maydonlarni to'g'rilang." : err.message;
        banner.style.display = 'block';
        banner.scrollIntoView({ block: 'nearest' });
    },

    // POST /api/drivers  yoki  PUT /api/drivers/:id
    async submitDriverForm() {
        const editingId = this.driverFormId;
        const submit = document.getElementById('btn-save-driver-form');
        const label = submit.textContent;
        this.clearFormErrors();

        const data = this.collectDriverForm();
        submit.disabled = true;
        submit.textContent = 'Saqlanmoqda...';

        try {
            let rec;
            if (editingId) {
                const current = AppState.driverProfiles[editingId];
                if (!current) throw new ApiError("Bu traktorchi allaqachon o'chirilgan.", { status: 404 });
                rec = await Api.drivers.replace(editingId, { ...toRecord(current), ...data });
            } else {
                rec = await Api.drivers.create(data);
            }

            DriverStore.upsert(rec);
            this.closeDriverForm();
            this.renderDriverScreen();

            if (!editingId) {
                // Yangi traktorchi ro'yxat oxiriga tushadi — shu sahifani ochamiz
                AppState.admin.q = '';
                const search = document.getElementById('admin-search');
                if (search) search.value = '';
                AppState.admin.page = Math.ceil(NEARBY_DRIVERS.length / AppState.admin.limit);
            }
            this.toast(editingId ? `${rec.name} ma'lumotlari yangilandi` : `${rec.name} ro'yxatga qo'shildi`);
            await this.loadAdminTable();
            if (AppState.searchStatus === 'done') this.refreshMarket();
        } catch (err) {
            this.showFormErrors(err);
        } finally {
            submit.disabled = false;
            submit.textContent = label;
        }
    },

    // ------------------------------------------
    // Split View Setup
    // ------------------------------------------
    renderSplitView() {
        const left = document.getElementById('split-user-body');
        const right = document.getElementById('split-driver-body');
        const sotix = this.getNormalizedSotix();

        // Sinov uchun Rustam Qodirov; u o'chirilgan bo'lsa — ro'yxatdagi birinchi traktorchi
        const driverId = AppState.driverProfiles['driver-rustam'] ? 'driver-rustam' : NEARBY_DRIVERS[0].id;
        const dr = AppState.driverProfiles[driverId];
        const price = getDriverPrice(driverId);
        const offers = price > 0;
        const name = escapeHtml(dr.name);

        const paneTitle = document.querySelector('#split-driver-pane .pane-header h3');
        if (paneTitle) paneTitle.textContent = `🚜 2. Traktorchi (${dr.name})`;

        left.innerHTML = `
            <div style="background:#f8fafc; padding:12px; border-radius:10px; margin-bottom:12px;">
                <p style="font-size:12px; color:#475569;">Xizmat turi: <strong class="text-primary">${AppState.selectedService}</strong></p>
                <p style="font-size:12px; color:#475569;">Yer maydoni: <strong>${sotix} Sotix</strong></p>
                <p style="font-size:12px; color:#475569;">Tanlangan: <strong>${name} (${offers ? price.toLocaleString() + " so'm/sotix" : 'bu xizmatni bajarmaydi'})</strong></p>
            </div>
            <button class="btn btn-primary btn-large btn-block" ${offers ? '' : 'disabled'} onclick="UI.orderDriver('${driverId}')">
                🚜 ${name}ga Buyurtma Yuborish (${AppState.selectedService})
            </button>
        `;

        right.innerHTML = `
            <div style="background:#1e293b; color:#fff; padding:12px; border-radius:10px; margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong>${name}</strong> (${escapeHtml(dr.plate)})<br>
                        <small style="color:#94a3b8;">${offers ? price.toLocaleString() + " so'm/sotix (" + AppState.selectedService + ')' : 'Bu xizmatni bajarmaydi'}</small>
                    </div>
                    <button class="btn ${dr.isOnline ? 'btn-success' : 'btn-secondary'} btn-sm" onclick="UI.toggleDriverLine('${driverId}'); UI.renderSplitView();">
                        ${dr.isOnline ? '🟢 Liniyadasiz' : '🔴 Oflayn'}
                    </button>
                </div>
            </div>
            <p style="font-size:12px; color:#64748b;">Chap tarafdan buyurtma bering. O'ng tarafga avtomatik tarzda tushadi.</p>
        `;
    },

    // ------------------------------------------
    // Withdraw Modal
    // ------------------------------------------
    bindWithdrawModal() {
        const modal = document.getElementById('withdraw-modal');
        const btnOpen = document.getElementById('btn-driver-withdraw');
        const btnClose = document.getElementById('btn-close-withdraw');
        const btnCancel = document.getElementById('btn-cancel-withdraw-modal');
        const btnConfirm = document.getElementById('btn-confirm-withdraw-modal');

        btnOpen.addEventListener('click', () => {
            document.getElementById('withdraw-available-balance').textContent = `${AppState.myDriverProfile.walletBalance.toLocaleString()} so'm`;
            modal.style.display = 'flex';
        });

        const close = () => { modal.style.display = 'none'; };
        btnClose.addEventListener('click', close);
        btnCancel.addEventListener('click', close);

        btnConfirm.addEventListener('click', () => {
            const amount = parseInt(document.getElementById('withdraw-amount-val').value) || 0;
            const card = document.getElementById('withdraw-card-number').value;

            if (amount <= 0 || amount > AppState.myDriverProfile.walletBalance) {
                alert("Xatolik: Balansda yetarli mablag' mavjud emas!");
                return;
            }

            AppState.myDriverProfile.walletBalance -= amount;
            this.renderDriverFinance();
            close();
            alert(`✅ ${amount.toLocaleString()} so'm ${card} kartasiga o'tkazildi!`);
        });
    }
};

// Launch when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});
