# Shadowing Studio — Windows dasturi

PDF kitob + audio bilan **shadowing** mashqi qilish uchun dastur. To'liq **internetsiz** ishlaydi.

- PDF barcha sahifalari bilan uzluksiz vertikal scroll'da ko'rinadi, pleyerdagi sahifa raqami scroll'ga qarab avtomatik o'zgaradi
- Bir nechta audio — playlist, avto-o'tish, A-B takror, tezlik (0.5x – 2x)
- PDF yoki audio faylni dastur oynasiga **sudrab tashlash** mumkin

Tizim talabi: **Windows 10 / 11 (64-bit)**.

---

## 1. `.exe` o'rnatuvchini olish

Ikki yo'l bor. Birini tanlang.

### A yo'li — o'z Windows kompyuteringizda (eng oson)

1. [nodejs.org](https://nodejs.org) dan **LTS** versiyasini o'rnating (bir marta, keyin kerak bo'lmaydi).
2. Shu papkani (zip'dan chiqarib) istalgan joyga qo'ying.
3. **`build.bat`** faylini ikki marta bosing.
4. 3–10 daqiqadan so'ng **`dist`** papkasi ochiladi:
   - `Shadowing-Studio-Setup-1.0.0.exe` — **o'rnatuvchi** (tarqatish uchun shuni yuboring)
   - `Shadowing-Studio-Portable-1.0.0.exe` — o'rnatmasdan, to'g'ridan-to'g'ri ishlaydigan nusxa

> Birinchi yig'ishda internet kerak (Electron va yig'ish vositalari yuklanadi). Tayyor dastur esa internetsiz ishlaydi.

### B yo'li — kompyuterga hech narsa o'rnatmasdan (GitHub orqali)

1. [github.com](https://github.com) da bepul akkaunt oching va yangi (private bo'lishi mumkin) repozitoriya yarating.
2. Shu papkadagi **hamma fayllarni** (`.github` papkasi bilan) repozitoriyga yuklang.
3. **Actions** bo'limiga kiring → **Build Windows installer** → **Run workflow**.
4. 5–10 daqiqadan so'ng tugagan ish ichidagi **Artifacts → ShadowingStudio-Windows** dan `.exe` fayllarni yuklab oling.

---

## 2. Boshqalarga tarqatish

`Shadowing-Studio-Setup-1.0.0.exe` faylini yuboring. Qabul qiluvchi uni ikki marta bosib o'rnatadi (o'rnatish papkasini tanlash mumkin; Ish stoli va Start menyusida yorliq yaratiladi). Administrator huquqi shart emas.

### «Windows kompyuteringizni himoya qildi» (SmartScreen) oynasi

Dastur **raqamli imzosiz**, shuning uchun Windows birinchi ochishda ogohlantirish chiqarishi mumkin. Bu virus degani emas. Davom etish uchun:

**Qo'shimcha ma'lumot** → **Baribir ishga tushirish**

Bu oynani butunlay yo'qotish uchun pullik «code signing» sertifikati kerak (yiliga taxminan 100–400 USD). Sertifikat olsangiz, `package.json` ichiga imzolash sozlamalarini qo'shish mumkin.

---

## 3. Dasturdan foydalanish

Yuqori o'ngdagi **PDF** va **Audio** tugmalari bilan fayl tanlang yoki faylni oynaga **sudrab tashlang**. Audio tugmasida bir nechta fayl belgilash mumkin.

### Tezkor tugmalar

| Tugma | Vazifa |
|---|---|
| `Space` yoki `5` | Play / Pauza |
| `1` / `3` | A nuqta / B nuqta (A-B takror) |
| `7` | A-B takrorni tozalash |
| `4` / `6` | 2 soniya orqaga / oldinga |
| `0` | Audio boshiga |
| `9` | Audioni takrorlash (loop) |
| `2` / `8` | Ovozni pasaytirish / ko'tarish |
| `M` | Ovozni o'chirish / yoqish |
| `*` | Keyingi tezlik (0.5x … 2x) |
| `/` | Tezlikni 1x ga qaytarish |
| `N` / `P` | Keyingi / oldingi audio |
| `L` | Playlist ro'yxatini ochish / yopish |
| `←` / `→` | Oldingi / keyingi PDF sahifa |
| `↑` / `↓` | PDF'ni sekin scroll qilish |
| `Home` / `End` | Birinchi / oxirgi sahifa |
| `+` / `-` yoki `Ctrl` + g'ildirak | PDF masshtabi |
| `Ctrl` + `O` | PDF ochish |
| `F11` | To'liq ekran |
| `Esc` | Playlist'ni yopish |

---

## 4. Muammolar

| Muammo | Yechim |
|---|---|
| `build.bat` «Node.js topilmadi» deydi | [nodejs.org](https://nodejs.org) dan LTS o'rnating, so'ng **yangi** oynada qayta urinib ko'ring |
| Yig'ishda `symbolic link` / `privilege` xatosi | `build.bat` ni **Administrator sifatida** ishga tushiring yoki Windows'da **Developer Mode** ni yoqing |
| Yig'ish internetsiz to'xtaydi | Birinchi yig'ishda internet kerak; ulanib qayta urining |
| Antivirus o'rnatuvchini bloklaydi | Imzosiz dasturlarda uchrab turadi. Fayl manbasiga ishonsangiz, istisnolarga qo'shing |
| Ikkinchi marta ochilmayapti | Dastur allaqachon ochiq (bitta nusxa ruxsat etiladi) — vazifalar panelini tekshiring |

Dasturchilar uchun: `run-dev.bat` — yig'masdan sinov rejimida ishga tushiradi; konsolni `Ctrl+Shift+I` bilan ochish mumkin.

---

## 5. Loyiha tuzilishi

```
app/                  Dasturning o'zi (HTML / CSS / JS + PDF.js mahalliy nusxasi)
main.js, serve.js     Electron: oyna va fayllarni xavfsiz berish
build/                Ikonka (icon.ico, icon.png)
package.json          Yig'ish sozlamalari (versiya, o'rnatuvchi nomi va h.k.)
build.bat             .exe yaratish (bir bosishda)
run-dev.bat           Sinov rejimida ishga tushirish
.github/workflows/    GitHub'da avtomatik yig'ish
THIRD_PARTY_NOTICES   Uchinchi tomon litsenziyalari (PDF.js, Font Awesome, Electron)
```

Versiyani o'zgartirish uchun `package.json` dagi `"version"` ni tahrirlang (o'rnatuvchi nomi avtomatik yangilanadi).
