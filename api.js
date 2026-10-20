/**
 * Traktor — REST API mijozi (fetch asosida)
 * ------------------------------------------
 * Frontend serverga faqat shu fayl orqali murojaat qiladi.
 * Barcha funksiyalar Promise qaytaradi va xatolik bo'lsa ApiError tashlaydi,
 * shuning uchun chaqiruvchi joyda try...catch ishlatiladi.
 */
(function () {
    'use strict';

    const BASE = '/api';

    class ApiError extends Error {
        constructor(message, details) {
            super(message);
            this.name = 'ApiError';
            const d = details || {};
            this.status = d.status || 0;        // HTTP status (tarmoq xatosida 0)
            this.errors = d.errors || null;     // maydonlar bo'yicha xatolar (422/409)
            this.network = !!d.network;         // serverga umuman ulanib bo'lmadi
        }
    }

    function buildUrl(path, query) {
        let url = BASE + path;
        if (query) {
            const qs = new URLSearchParams();
            Object.keys(query).forEach(key => {
                const v = query[key];
                if (v !== undefined && v !== null && v !== '') qs.append(key, v);
            });
            const s = qs.toString();
            if (s) url += '?' + s;
        }
        return url;
    }

    async function request(method, path, opts) {
        const options = opts || {};
        const url = buildUrl(path, options.query);
        const init = { method, headers: { Accept: 'application/json' } };
        if (options.body !== undefined) {
            init.headers['Content-Type'] = 'application/json';
            init.body = JSON.stringify(options.body);
        }

        let res;
        try {
            res = await fetch(url, init);
        } catch (err) {
            throw new ApiError("Serverga ulanib bo'lmadi. Internet aloqasini tekshirib, qayta urinib ko'ring.", { network: true });
        }

        let data = null;
        if (res.status !== 204) {
            try { data = await res.json(); } catch (e) { data = null; }
        }

        if (!res.ok) {
            const fallback = res.status >= 500
                ? "Serverda xatolik yuz berdi. Birozdan so'ng qayta urinib ko'ring."
                : `So'rov bajarilmadi (${res.status}).`;
            throw new ApiError(res.status >= 500 ? fallback : ((data && data.message) || fallback), {
                status: res.status,
                errors: data && data.errors
            });
        }
        return { data, headers: res.headers, status: res.status, url: `${method} ${url}` };
    }

    const drivers = {
        /**
         * Ro'yxat. page/limit berilsa sahifalanadi (jami son X-Total-Count sarlavhasidan olinadi).
         * Qaytaradi: { items, total, page, limit, pages, url }
         */
        async list(params) {
            const p = params || {};
            const paged = p.limit > 0;
            const res = await request('GET', '/drivers', {
                query: {
                    q: p.q,
                    district: p.district && p.district !== 'all' ? p.district : undefined,
                    service: p.service,
                    sort: p.sort,
                    _page: paged ? (p.page || 1) : undefined,
                    _limit: paged ? p.limit : undefined
                }
            });
            const items = Array.isArray(res.data) ? res.data : [];
            const total = Number(res.headers.get('X-Total-Count')) || items.length;
            return {
                items,
                total,
                page: paged ? (p.page || 1) : 1,
                limit: paged ? p.limit : total,
                pages: paged ? Math.max(1, Math.ceil(total / p.limit)) : 1,
                url: res.url
            };
        },
        async get(id) {
            return (await request('GET', '/drivers/' + encodeURIComponent(id))).data;
        },
        async create(data) {
            return (await request('POST', '/drivers', { body: data })).data;
        },
        async replace(id, data) {
            return (await request('PUT', '/drivers/' + encodeURIComponent(id), { body: data })).data;
        },
        async update(id, patch) {
            return (await request('PATCH', '/drivers/' + encodeURIComponent(id), { body: patch })).data;
        },
        async remove(id) {
            await request('DELETE', '/drivers/' + encodeURIComponent(id));
        }
    };

    window.ApiError = ApiError;
    window.Api = {
        drivers,
        async reset() {
            return (await request('POST', '/reset')).data;
        }
    };
})();
