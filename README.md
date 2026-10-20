# 🚜 "Traktor" — O'zbekistonda Qishloq Xo'jaligi va Yer Haydash Xizmati Ilovasi

O'zbekistonda tomorqa va yer egalari (aholi va dehqonlar) uchun o'z yer maydoniga qarab qishloq xo'jaligi xizmati turini tanlash, eng yaqin va qulay traktorchini narxi hamda qulayliklariga qarab bevosita tanlab chaqirish platformasi.

Ilova **iOS va Android** mobil ilovalari uslubida ishlab chiqilgan bo'lib, veb-brauzer orqali to'liq ishlaydi.

---

## 🌾 Mavjud Qishloq Xo'jaligi Xizmatlari Turlari (12 ta):
1. **Yer haydash**
2. **Chizellash**
3. **Diskalash**
4. **Boronalash**
5. **Kultivatsiya**
6. **Tekislash**
7. **Ekiladigan egatlarni ochish**
8. **Qator oralariga ishlov berish**
9. **Yerga o‘g‘it solish**
10. **Sug‘orish uchun ariqlar ochish**
11. **Meliorativ ishlov**
12. **Mulchalash**

---

## 🌟 Tizimdagi Yangi Imkoniyatlar va Asosiy Qoidalar

### 1. 👤 Foydalanuvchi (User / Yer egasi) Bo'limi
- **1-QADAM: Xizmat turini tanlash**: Yuqoridagi 12 ta agrar xizmatdan birini bitta bosish bilan tanlaydi. Sichqoncha xizmat ustiga kelganda (telefonda bosganda) tepasida shu xizmatning qisqa **ta'rifi** chiqadi.
- **2-QADAM: Maydonni kiritish**:
  - Sotix yoki Gektar tanlash (masalan, 6 sotix, 15 sotix, 50 sotix yoki 1 gektar = 100 sotix).
  - Maydon o'zgarishi bilan xaritadagi barcha traktorchilarning umumiy narxi bir zumda qayta hisoblanadi.
- **3-QADAM: Yaqin atrofdagi traktorchilar bozori (Marketplace)**:
  - Boshida traktorchilar ko'rinmaydi. **"🔍 Traktorchilarni qidirish"** tugmasi bosilgach *"Traktorchilar qidirilmoqda... / Loading..."* holati chiqadi va ro'yxat **REST API** (`GET /api/drivers`) dan olinadi. Xatolik bo'lsa (`try...catch`) sabab ko'rsatiladi va **"Qayta urinib ko'rish"** tugmasi chiqadi.
  - **Qidirish va filtrlar:** ism / rusum / davlat raqami bo'yicha qidirish, **tuman** bo'yicha va **xizmat** bo'yicha filtrlash, saralash (eng yaqin, arzon, reyting).
  - **Sahifalash:** ro'yxat 3 tadan sahifalarga bo'linadi. Xizmatni bajarmaydigan traktorchilar ro'yxatda ko'rinmaydi.
  - Xizmat turi o'zgartirilsa, ro'yxatdagi narxlar shu xizmat bo'yicha traktorchi belgilagan narxga qarab darhol o'zgaradi.
  - Har bir traktorchining:
    - Rasmi, ismi, reytingi;
    - Traktor rusumi va davlat raqami;
    - **Tanlangan xizmat bo'yicha 1 sotix narxi (majburiy)** (har bir traktorchi har bir xizmat uchun narxni alohida belgilaydi);
    - **Sizning maydoningiz uchun jami narx** (masalan, 15 sotix $\times$ 25 000 = 375 000 so'm);
    - **Qulayliklari (ixtiyoriy)**: *"Chuqur haydash (35sm+)", "Yangi 3-korpusli plug", "15 daqiqada boraman", "Diskalash ham bor"*;
    - Oraliq masofasi (masalan, 1.8 km).
- **Bevosita tanlash va buyurtma berish**: Foydalanuvchi tanlagan xizmat turi buyurtmaga biriktirilib, aynan shu traktorchiga yuboriladi.
- **⭐ Xizmatni baholash**: Traktorchi ishni yakunlagach, mijozda "Xizmatni baholang" kartasi chiqadi. Mijoz 5 tadan nechta yulduzcha berishini tanlaydi (1 — juda yomon ... 5 — ajoyib). Baho traktorchining reytingiga qo'shiladi: reyting barcha baholarning o'rtachasi (Yandex kabi 2 xonali, masalan 4.92) sifatida hisoblanadi va yangi baho bilan yangilanib boradi. Yangilangan reyting mijozlar ro'yxatida, traktorchi profilida va adminda ko'rinadi.
- **Kuzatuv va Xarita**: Traktorchi qabul qilgach, uning rasmi, telefon raqami, xizmat turi va xaritada jonli harakatlanishi hamda **ETA** (yetib kelish vaqti) ko'rinadi.

---

### 2. 🚜 Traktorchi (Ishchi / Driver) Bo'limi
- **Xizmat Turini Aniq Ko'rish**:
  - Buyurtma kelganda traktorchi mijoz aynan qaysi xizmat turini (masalan: *"Ekiladigan egatlarni ochish"* yoki *"Chizellash"*) tanlaganini yaqqol ko'radi.
- **Profil tanlash**: Traktorchi bo'limida barcha traktorchilar profilini tanlash mumkin (Rustam Qodirov, Sanjarbek Aliyev, Jamshidbek Nurmatov, Nodirbek To'rayev). Mijoz kimni chaqirsa, buyurtma **faqat shu traktorchi profiliga** tushadi (ro'yxatda unda 🔔 belgisi ko'rinadi).
- **Har bir xizmat uchun 1 sotix narxini boshqarish**:
  - Traktorchi o'z profilida 12 ta xizmatning har biri uchun 1 sotix narxini alohida belgilaydi (`PATCH /api/drivers/:id`). **Bajarmaydigan xizmat narxi bo'sh qoldiriladi** (kamida bittasi kerak).
- **"Liniyaga chiqish" tugmasi**: Ishga tayyorlik holatini bitta tugma bilan yoqish/o'chirish.
- **Buyurtma kelishi va Iqtisodiy Tahlil (Ekonomik tavsiya)**:
  - Oraliq masofa va yer maydoni taqqoslanadi.
  - *Agar masofa uzoq (masalan, 7 km) va maydon kichik bo'lsa:* ⚠️ **"Diqqat: Masofa uzoq, yer kichik. Yoqilg'i xarajati daromadni qoplamasligi mumkin!"** — Traktorchi buyurtmani rad etishi mumkin.
  - *Agar masofa yaqin yoki maydon katta bo'lsa:* 💡 **"Foydali buyurtma: Yoqilg'i to'liq qoplanadi va yaxshi daromad keltiradi!"**
- **Bosqichma-bosqich boshqaruv**:
  - 1. *Dalaga yo'l olish* (Xaritada jonli animatsiya)
  - 2. *Dalaga yetib keldim*
  - 3. *Xizmatni boshlash* (Masalan: *"Ekiladigan egatlarni ochishni boshlash"*)
  - 4. *Ish yakunlandi va to'lov tushdi*
- **⭐ Reyting statistikasi**: Traktorchi profilida o'rtacha reyting, baholar soni va yulduzlar bo'yicha taqsimot (5★, 4★, ... 1★) ko'rinadi.
- **💰 "Pul" & Moliya bo'limi**:
  - Bugungi sof daromad, hamyon balansi, ishlangan sotixlar va 5% park komissiyasi.
  - Ishlar tarixida tanlangan xizmat nomi saqlanadi. Tarix ko'payib ketsa, **ko'z belgisi** orqali yashirish mumkin (ustiga chiziq tortilgan ko'z — tarix yashirilgan; ochiq ko'z — barcha tarix ko'rinadi).
  - Uzcard / Humo kartalariga pul yechish.

---

### 3. 🏢 Admin (Texnopark) & ⚡ Split Sinov
- **Texnopark Admin**: Parkdagi barcha traktorchilar, ularning shaxsiy narxlari (xizmat turi bo'yicha tanlab ko'rish mumkin), litsenziyalari va holati.
  - **To'liq CRUD:** ➕ qo'shish (`POST`), ✏️ tahrirlash (`PUT`), ⭐ tavsiya belgisi (`PATCH`), 🗑️ o'chirish (`DELETE`). Forma xatoliklari (422 / 409) maydonlar ostida ko'rsatiladi.
  - **Qidirish va sahifalash:** jadval 5 tadan sahifalanadi, qidiruv server tomonida bajariladi.
  - **🧪 API sinov paneli:** server holatini "Tarmoq uzilgan" yoki "Server xatosi (500)" ga o'tkazib, xatoliklar qanday ko'rsatilishini tekshirish; "Boshlang'ich ma'lumotlarni tiklash" tugmasi.
  - **Holati**: traktorchi buyurtma ustida ishlayotgan bo'lsa — *Ishlamoqda*; liniyada bo'lsa — *Liniyada*; aks holda — *Dam olishda*.
  - **Ish tarixi**: har bir traktorchining ish tarixi ko'z belgisi orqali ochiladi/yopiladi.
- **Split Sinov**: Chapda Foydalanuvchi xizmatni tanlaydi, o'ngda Traktorchiga darhol signal bilan aynan shu xizmat bo'yicha buyurtma tushadi.
- **📱 Mobil / 🖥️ Keng Ekran Rejimi**: Yuqoridagi tugma orqali ilovani iPhone/Android ko'rinishida yoki to'liq ekranda ko'rish mumkin.

---

## 🔌 REST API (4-mavzu)

Frontend serverga faqat `fetch('/api/...')` orqali murojaat qiladi (`api.js`). Loyiha serversiz ishlashi uchun
`mock-api.js` shu so'rovlarni ushlab, haqiqiy REST server kabi javob qaytaradi (status kodlari, `X-Total-Count`, JSON).
Ma'lumotlar `localStorage` da saqlanadi, shuning uchun sahifa yangilansa o'zgarishlar yo'qolmaydi.

| Metod | Manzil | Vazifasi |
|---|---|---|
| GET | `/api/drivers?q=&district=&service=&sort=&_page=&_limit=` | Qidirish, filtrlash, saralash, sahifalash |
| GET | `/api/drivers/:id` | Bitta traktorchi |
| POST | `/api/drivers` | Qo'shish (201 / 409 / 422) |
| PUT | `/api/drivers/:id` | To'liq almashtirish |
| PATCH | `/api/drivers/:id` | Qisman yangilash (narxlar, reyting, tavsiya) |
| DELETE | `/api/drivers/:id` | O'chirish (204) |
| POST | `/api/reset` | Boshlang'ich holatga qaytarish (sinov uchun) |

**Fayllar:** `data/drivers.json` (boshlang'ich 7 ta traktorchi), `data/drivers-seed.js` (shuning nusxasi, `file://` uchun zaxira),
`mock-api.js` (mock server + validatsiya), `api.js` (fetch mijozi, `ApiError`).

> Keyingi bosqichda (5-mavzu) `mock-api.js` olib tashlanib, `/api/...` haqiqiy backend (Node.js + baza) ga ulanadi — frontend kodi o'zgarmaydi.

---

## 🚀 Ishga tushirish
Hech qanday server yoki o'rnatish shart emas: `index.html` faylini brauzeringizda oching.
(Ixtiyoriy: `python -m http.server` bilan ochsangiz, boshlang'ich ma'lumotlar `data/drivers.json` dan `fetch` orqali o'qiladi.)
