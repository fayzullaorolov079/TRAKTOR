/**
 * Traktor — Mock REST API (brauzer ichidagi "server")
 * ---------------------------------------------------
 * Loyiha serversiz ishlashi uchun `fetch('/api/...')` so'rovlarini shu fayl ushlab oladi
 * va haqiqiy REST server kabi javob qaytaradi (HTTP status kodlari, sarlavhalar, JSON).
 * Boshqa barcha so'rovlar oddiy fetch orqali ketadi.
 *
 * Endpointlar:
 *   GET    /api/drivers          ?q= &district= &service= &sort= &_page= &_limit=   (X-Total-Count sarlavhasi)
 *   GET    /api/drivers/:id
 *   POST   /api/drivers          -> 201 | 409 | 422
 *   PUT    /api/drivers/:id      -> 200 | 404 | 409 | 422   (to'liq almashtirish)
 *   PATCH  /api/drivers/:id      -> 200 | 404 | 409 | 422   (qisman yangilash)
 *   DELETE /api/drivers/:id      -> 204 | 404 | 409
 *   POST   /api/reset            -> boshlang'ich ma'lumotlarni tiklash (faqat sinov uchun)
 *
 * Ma'lumotlar bazasi: boshlang'ich holat `data/drivers.json` dan (fetch) olinadi;
 * file:// da brauzer buni bloklasa `data/drivers-seed.js` dagi nusxa ishlatiladi.
 * O'zgarishlar localStorage da saqlanadi.
 *
 * Keyingi bosqichda (5-mavzu) bu fayl olib tashlanib, `/api/...` haqiqiy backendga ulanadi —
 * frontend kodiga (api.js, script.js) o'zgartirish kiritish shart emas.
 */
(function () {
    'use strict';

    const DB_KEY = 'traktor.mockdb.v1';
    const SEED_URL = 'data/drivers.json';
    const REGION_KEYS = ['parkent', 'chirchiq', 'zangiota', 'yangiyol', 'buka'];
    const SERVICE_IDS = ['plow', 'chisel', 'disk', 'harrow', 'cultivate', 'level', 'furrow',
        'interrow', 'fertilize', 'irrigation_ditch', 'melioration', 'mulch'];
    const MIN_PRICE = 500;
    const MAX_PRICE = 1000000;

    const originalFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;

    // Sinov uchun sozlamalar (admin paneldagi "API sinov paneli" shularni o'zgartiradi)
    const config = {
        mode: 'normal',      // 'normal' | 'offline' (tarmoq uzilgan) | 'server_error' (500)
        minDelay: 450,
        maxDelay: 900
    };

    let memoryDb = null;     // [{...driver}]
    const memoryStorage = {};

    // ------------------------------------------------------------------
    // Saqlash (localStorage; ishlamasa xotirada)
    // ------------------------------------------------------------------
    const storage = {
        get(key) {
            try { return window.localStorage.getItem(key); }
            catch (e) { return key in memoryStorage ? memoryStorage[key] : null; }
        },
        set(key, value) {
            try { window.localStorage.setItem(key, value); }
            catch (e) { memoryStorage[key] = value; }
        }
    };

    function persist() {
        storage.set(DB_KEY, JSON.stringify({ version: 1, drivers: memoryDb }));
    }

    async function loadSeed() {
        // file:// da brauzer fetch ni bloklaydi (konsolda keraksiz xato chiqmasligi uchun urinmaymiz)
        if (originalFetch && window.location.protocol !== 'file:') {
            try {
                const res = await originalFetch(SEED_URL, { cache: 'no-store' });
                if (res.ok) {
                    const json = await res.json();
                    if (json && Array.isArray(json.drivers)) return json;
                }
            } catch (e) { /* file:// da bloklanadi — zaxira nusxaga o'tamiz */ }
        }
        if (window.DRIVERS_SEED && Array.isArray(window.DRIVERS_SEED.drivers)) {
            return JSON.parse(JSON.stringify(window.DRIVERS_SEED));
        }
        throw new HttpError(500, "Boshlang'ich ma'lumotlar topilmadi (data/drivers.json).");
    }

    async function getDb() {
        if (memoryDb) return memoryDb;
        const raw = storage.get(DB_KEY);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (parsed && Array.isArray(parsed.drivers) && parsed.drivers.length) {
                    memoryDb = parsed.drivers;
                    return memoryDb;
                }
            } catch (e) { /* buzilgan yozuv — qaytadan yaratamiz */ }
        }
        const seed = await loadSeed();
        memoryDb = seed.drivers;
        persist();
        return memoryDb;
    }

    // ------------------------------------------------------------------
    // Yordamchilar
    // ------------------------------------------------------------------
    class HttpError extends Error {
        constructor(status, message, errors) {
            super(message);
            this.status = status;
            this.body = { message };
            if (errors) this.body.errors = errors;
        }
    }

    function delay() {
        const ms = config.minDelay + Math.random() * (config.maxDelay - config.minDelay);
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function jsonResponse(status, data, headers) {
        const h = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
        if (headers) Object.keys(headers).forEach(k => h.set(k, headers[k]));
        const body = status === 204 ? null : JSON.stringify(data);
        return new Response(body, { status, headers: h });
    }

    const clone = (v) => JSON.parse(JSON.stringify(v));

    function norm(s) {
        return String(s == null ? '' : s).toLowerCase().replace(/[’‘ʻʼ`´]/g, "'");
    }

    function avgRating(d) {
        let count = 0, sum = 0;
        Object.keys(d.ratingDist || {}).forEach(k => {
            count += d.ratingDist[k];
            sum += Number(k) * d.ratingDist[k];
        });
        return count ? sum / count : 0;
    }

    function formatPhone(digits) {
        return `+998 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`;
    }

    function makeId(name, db) {
        const slug = norm(name).replace(/[^a-z0-9]+/g, ' ').trim().split(' ')[0] || 'yangi';
        let id;
        do { id = `driver-${slug}-${Math.random().toString(36).slice(2, 6)}`; }
        while (db.some(d => d.id === id));
        return id;
    }

    const BAD_CHARS = /[<>"`]/;

    // ------------------------------------------------------------------
    // Validatsiya
    // ------------------------------------------------------------------
    function validate(input) {
        const errors = {};
        const out = {};

        // Ism
        const name = String(input.name == null ? '' : input.name).trim().replace(/\s+/g, ' ');
        if (name.length < 3) errors.name = "Ism kamida 3 ta belgidan iborat bo'lishi kerak.";
        else if (name.length > 60) errors.name = "Ism 60 ta belgidan oshmasligi kerak.";
        else if (BAD_CHARS.test(name)) errors.name = 'Ismda < > " ` belgilari mumkin emas.';
        out.name = name;

        // Telefon
        const digits = String(input.phone == null ? '' : input.phone).replace(/\D/g, '');
        if (!/^998\d{9}$/.test(digits)) errors.phone = "Telefon raqami +998 XX XXX XX XX ko'rinishida bo'lishi kerak.";
        else out.phone = formatPhone(digits);

        // Traktor rusumi
        const model = String(input.tractorModel == null ? '' : input.tractorModel).trim();
        if (model.length < 2) errors.tractorModel = 'Traktor rusumini kiriting.';
        else if (model.length > 50) errors.tractorModel = 'Rusum 50 ta belgidan oshmasligi kerak.';
        else if (BAD_CHARS.test(model)) errors.tractorModel = 'Rusumda < > " ` belgilari mumkin emas.';
        out.tractorModel = model;

        // Davlat raqami
        const plateRaw = String(input.plate == null ? '' : input.plate).toUpperCase().replace(/\s+/g, '');
        let plate = null;
        if (/^\d{2}\d{3}[A-Z]{3}$/.test(plateRaw)) plate = `${plateRaw.slice(0, 2)} ${plateRaw.slice(2, 5)} ${plateRaw.slice(5)}`;
        else if (/^\d{2}[A-Z]\d{3}[A-Z]{2}$/.test(plateRaw)) plate = `${plateRaw.slice(0, 2)} ${plateRaw[2]} ${plateRaw.slice(3, 6)} ${plateRaw.slice(6)}`;
        if (!plate) errors.plate = "Davlat raqami '01 777 TAA' yoki '01 A 777 AA' ko'rinishida bo'lishi kerak.";
        out.plate = plate;

        // Litsenziya (bo'sh bo'lsa avtomatik beriladi)
        const lic = String(input.licenseSeries == null ? '' : input.licenseSeries).trim().toUpperCase();
        if (lic && !/^AG-\d{4}-\d{4}$/.test(lic)) errors.licenseSeries = "Litsenziya seriyasi 'AG-2026-1234' ko'rinishida bo'lishi kerak.";
        out.licenseSeries = lic || `AG-${new Date().getFullYear()}-${String(1000 + Math.floor(Math.random() * 9000))}`;

        // Masofa
        const dist = typeof input.distanceKm === 'number' ? input.distanceKm : Number(String(input.distanceKm).replace(',', '.'));
        if (!(dist > 0) || dist > 50 || !Number.isFinite(dist)) errors.distanceKm = "Masofa 0 dan katta va 50 km dan oshmaydigan son bo'lishi kerak.";
        out.distanceKm = Math.round(dist * 10) / 10;

        // Tumanlar
        const districts = Array.isArray(input.districts) ? input.districts : [];
        const cleanDistricts = REGION_KEYS.filter(k => districts.indexOf(k) !== -1);
        if (!cleanDistricts.length) errors.districts = 'Kamida bitta xizmat ko\'rsatadigan tumanni belgilang.';
        out.districts = cleanDistricts;

        // Narxlar (bo'sh qoldirilgan xizmat = traktorchi bajarmaydi)
        const prices = {};
        const rawPrices = input.prices && typeof input.prices === 'object' ? input.prices : {};
        SERVICE_IDS.forEach(id => {
            const v = rawPrices[id];
            if (v === undefined || v === null || v === '') return;
            if (!Number.isInteger(v) || v < MIN_PRICE || v > MAX_PRICE) {
                errors['prices.' + id] = `Narx ${MIN_PRICE} dan ${MAX_PRICE.toLocaleString('en-US')} gacha butun son bo'lishi kerak.`;
            } else {
                prices[id] = v;
            }
        });
        if (!Object.keys(prices).length && !Object.keys(errors).some(k => k.indexOf('prices.') === 0)) {
            errors.prices = 'Kamida bitta xizmat uchun 1 sotix narxini kiriting.';
        }
        out.prices = prices;

        // Qulayliklar
        const amenitiesIn = Array.isArray(input.amenities) ? input.amenities : [];
        const amenities = amenitiesIn.map(a => String(a).trim()).filter(Boolean);
        if (amenities.length > 8) errors.amenities = "Qulayliklar soni 8 tadan oshmasligi kerak.";
        else if (amenities.some(a => a.length > 60)) errors.amenities = "Har bir qulaylik 60 ta belgidan oshmasligi kerak.";
        else if (amenities.some(a => BAD_CHARS.test(a))) errors.amenities = 'Qulayliklarda < > " ` belgilari mumkin emas.';
        out.amenities = amenities;

        // Rasm manzili (ixtiyoriy)
        const avatar = String(input.avatar == null ? '' : input.avatar).trim();
        if (avatar && !/^(https?:\/\/[^\s"'<>`]+|data:image\/[a-z+]+[;,][^\s"'<>`]+)$/i.test(avatar)) {
            errors.avatar = "Rasm manzili http:// yoki https:// bilan boshlanishi kerak.";
        }
        out.avatar = avatar;

        out.recommended = !!input.recommended;
        return { errors, clean: out };
    }

    function sanitizeRatingDist(v, fallback) {
        const src = v && typeof v === 'object' ? v : (fallback || {});
        const res = {};
        for (let s = 1; s <= 5; s++) {
            const n = Number(src[s]);
            res[s] = Number.isInteger(n) && n >= 0 ? n : 0;
        }
        return res;
    }

    function sanitizeHistory(v, fallback) {
        const src = Array.isArray(v) ? v : (fallback || []);
        return src
            .filter(h => h && typeof h === 'object')
            .map(h => ({
                title: String(h.title || '').slice(0, 80),
                place: String(h.place || '').slice(0, 60),
                time: String(h.time || '').slice(0, 30),
                amount: Number.isFinite(Number(h.amount)) ? Number(h.amount) : 0
            }))
            .filter(h => h.title && !BAD_CHARS.test(h.title + h.place + h.time));
    }

    function num(v, fallback, min) {
        const n = Number(v);
        return Number.isFinite(n) && n >= (min == null ? 0 : min) ? n : fallback;
    }

    // Tekshirilgan ma'lumot + mavjud yozuvdan to'liq yozuv yasaydi
    function buildRecord(clean, input, existing, db) {
        const base = existing || {};
        let latOffset = Number.isFinite(Number(input.latOffset)) && input.latOffset !== '' ? Number(input.latOffset) : base.latOffset;
        let lngOffset = Number.isFinite(Number(input.lngOffset)) && input.lngOffset !== '' ? Number(input.lngOffset) : base.lngOffset;

        if (latOffset === undefined || lngOffset === undefined) {
            // Yangi traktorchi: masofaga mos tasodifiy yo'nalishda joylashtiramiz
            const angle = Math.random() * Math.PI * 2;
            latOffset = Math.round((clean.distanceKm / 111) * Math.cos(angle) * 1e4) / 1e4;
            lngOffset = Math.round((clean.distanceKm / 84) * Math.sin(angle) * 1e4) / 1e4;
        } else if (existing && existing.distanceKm !== clean.distanceKm && existing.distanceKm > 0) {
            // Masofa o'zgargan: yo'nalishni saqlab, uzoqligini moslaymiz
            const ratio = clean.distanceKm / existing.distanceKm;
            latOffset = Math.round(latOffset * ratio * 1e4) / 1e4;
            lngOffset = Math.round(lngOffset * ratio * 1e4) / 1e4;
        }

        return {
            id: base.id || makeId(clean.name, db),
            name: clean.name,
            phone: clean.phone,
            avatar: clean.avatar,
            tractorModel: clean.tractorModel,
            plate: clean.plate,
            licenseSeries: clean.licenseSeries,
            completedJobs: Math.round(num(input.completedJobs, base.completedJobs || 0)),
            prices: clean.prices,
            amenities: clean.amenities,
            districts: clean.districts,
            distanceKm: clean.distanceKm,
            latOffset,
            lngOffset,
            recommended: clean.recommended,
            isOnline: typeof input.isOnline === 'boolean' ? input.isOnline : !!base.isOnline,
            ratingDist: sanitizeRatingDist(input.ratingDist, base.ratingDist),
            dailyIncome: Math.round(num(input.dailyIncome, base.dailyIncome || 0)),
            walletBalance: Math.round(num(input.walletBalance, base.walletBalance || 0)),
            totalSotixWorked: Math.round(num(input.totalSotixWorked, base.totalSotixWorked || 0)),
            jobsToday: Math.round(num(input.jobsToday, base.jobsToday || 0)),
            history: sanitizeHistory(input.history, base.history)
        };
    }

    function checkPlateUnique(db, plate, selfId) {
        if (db.some(d => d.plate === plate && d.id !== selfId)) {
            throw new HttpError(409, "Bu davlat raqami allaqachon ro'yxatdan o'tgan.", { plate: "Bu davlat raqami boshqa traktorchida mavjud." });
        }
    }

    // ------------------------------------------------------------------
    // GET /api/drivers  (qidirish, filtrlash, saralash, sahifalash)
    // ------------------------------------------------------------------
    function listDrivers(db, params) {
        let items = db.slice();

        const q = norm(params.get('q') || '').trim();
        if (q) {
            items = items.filter(d => [d.name, d.tractorModel, d.plate, d.phone].some(v => norm(v).indexOf(q) !== -1));
        }

        const district = params.get('district');
        if (district && district !== 'all') {
            items = items.filter(d => d.districts.indexOf(district) !== -1);
        }

        const service = params.get('service');
        if (service) {
            items = items.filter(d => d.prices[service] > 0);
        }

        const sort = params.get('sort');
        if (sort === 'distance') items.sort((a, b) => a.distanceKm - b.distanceKm);
        else if (sort === 'price_asc') items.sort((a, b) => (a.prices[service] || 0) - (b.prices[service] || 0));
        else if (sort === 'price_desc') items.sort((a, b) => (b.prices[service] || 0) - (a.prices[service] || 0));
        else if (sort === 'rating') items.sort((a, b) => avgRating(b) - avgRating(a));
        else if (sort === 'name') items.sort((a, b) => a.name.localeCompare(b.name, 'uz'));

        const total = items.length;
        const limit = parseInt(params.get('_limit'), 10);
        if (limit > 0) {
            const page = Math.max(1, parseInt(params.get('_page'), 10) || 1);
            items = items.slice((page - 1) * limit, page * limit);
        }
        return { items: clone(items), total };
    }

    // ------------------------------------------------------------------
    // Router
    // ------------------------------------------------------------------
    async function route(method, path, params, body) {
        if (path === '/api/reset') {
            if (method !== 'POST') throw new HttpError(405, 'Metod ruxsat etilmagan.');
            memoryDb = null;
            storage.set(DB_KEY, '');
            const seed = await loadSeed();
            memoryDb = seed.drivers;
            persist();
            return jsonResponse(200, { message: "Boshlang'ich ma'lumotlar tiklandi.", count: memoryDb.length });
        }

        const m = path.match(/^\/api\/drivers(?:\/([^/]+))?$/);
        if (!m) throw new HttpError(404, `Endpoint topilmadi: ${path}`);
        const id = m[1] ? decodeURIComponent(m[1]) : null;
        const db = await getDb();

        // --- Kolleksiya: /api/drivers ---
        if (!id) {
            if (method === 'GET') {
                const { items, total } = listDrivers(db, params);
                return jsonResponse(200, items, { 'X-Total-Count': String(total) });
            }
            if (method === 'POST') {
                if (!body || typeof body !== 'object') throw new HttpError(400, "So'rov tanasi noto'g'ri (JSON kutilgan).");
                const { errors, clean } = validate(body);
                if (Object.keys(errors).length) throw new HttpError(422, "Kiritilgan ma'lumotlarda xatolik bor.", errors);
                checkPlateUnique(db, clean.plate, null);
                const record = buildRecord(clean, body, null, db);
                db.push(record);
                persist();
                return jsonResponse(201, clone(record), { Location: `/api/drivers/${record.id}` });
            }
            throw new HttpError(405, 'Metod ruxsat etilmagan.');
        }

        // --- Bitta resurs: /api/drivers/:id ---
        const idx = db.findIndex(d => d.id === id);
        if (idx === -1) throw new HttpError(404, `Traktorchi topilmadi (id: ${id}).`);
        const existing = db[idx];

        if (method === 'GET') return jsonResponse(200, clone(existing));

        if (method === 'PUT' || method === 'PATCH') {
            if (!body || typeof body !== 'object') throw new HttpError(400, "So'rov tanasi noto'g'ri (JSON kutilgan).");
            // PUT — to'liq almashtirish; PATCH — mavjud yozuvga qo'shib yuborish (1-daraja)
            const input = method === 'PATCH' ? Object.assign({}, existing, body) : body;
            const { errors, clean } = validate(input);
            if (Object.keys(errors).length) throw new HttpError(422, "Kiritilgan ma'lumotlarda xatolik bor.", errors);
            checkPlateUnique(db, clean.plate, id);
            const record = buildRecord(clean, input, existing, db);
            db[idx] = record;
            persist();
            return jsonResponse(200, clone(record));
        }

        if (method === 'DELETE') {
            if (db.length <= 1) {
                throw new HttpError(409, "Kamida bitta traktorchi qolishi kerak (demo cheklovi).");
            }
            db.splice(idx, 1);
            persist();
            return jsonResponse(204, null);
        }

        throw new HttpError(405, 'Metod ruxsat etilmagan.');
    }

    async function handle(url, init) {
        const method = String((init && init.method) || 'GET').toUpperCase();
        const parsed = new URL(url, 'http://mock.local');
        let body = null;
        let badJson = false;
        if (init && typeof init.body === 'string' && init.body) {
            try { body = JSON.parse(init.body); } catch (e) { badJson = true; }
        }

        await delay();

        if (config.mode === 'offline') throw new TypeError('Failed to fetch');
        if (config.mode === 'server_error') {
            return jsonResponse(500, { message: 'Internal Server Error' });
        }

        try {
            if (badJson) throw new HttpError(400, "So'rov tanasi yaroqsiz JSON.");
            return await route(method, parsed.pathname, parsed.searchParams, body);
        } catch (err) {
            if (err instanceof HttpError) return jsonResponse(err.status, err.body);
            console.error('[mock-api] kutilmagan xato:', err);
            return jsonResponse(500, { message: 'Internal Server Error' });
        }
    }

    // fetch ni "o'rab" olamiz: faqat /api/ bilan boshlanadigan so'rovlar bizniki
    window.fetch = function (input, init) {
        const url = typeof input === 'string' ? input : (input && input.url) || String(input);
        if (/^\/api\//.test(url)) return handle(url, init || {});
        if (!originalFetch) return Promise.reject(new TypeError('fetch qo\'llab-quvvatlanmaydi'));
        return originalFetch(input, init);
    };

    window.MockServer = {
        config,
        setMode(mode) { config.mode = mode; }
    };
})();
