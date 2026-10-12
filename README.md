# Shadowing Studio — video bilan shadowing

Videoni tinglab, **gap-ma-gap takrorlab** va **o'z ovozingizni yozib asl bilan solishtirib** til o'rganish dasturi. To'liq **internetsiz** ishlaydi.

Tizim talabi: **Windows 10 / 11 (64-bit)**.

## Imkoniyatlar

- **Video + subtitr (.srt / .vtt):** videoni tanlaganda subtitr faylini ham birga belgilang. Nomi bir xil bo'lsa avtomatik ulanadi (`lesson1.mp4` + `lesson1.srt`)
- **Gaplar bo'yicha navigatsiya:** pleyerdagi `←  3 / 120  →` — subtitr gaplari bo'yicha o'tish; raqam video bilan birga avtomatik yangilanadi
- **Gapni takrorlash (`R`):** hozirgi gap cheksiz takrorlanadi; `→` / `←` bosilsa takror keyingi/oldingi gapga ko'chadi
- **Gapdan keyin to'xta (`S`):** har gapdan keyin video to'xtaydi — siz takrorlaysiz, `Space` bilan davom ettirasiz
- **Yozish (`V`):** video bilan birga gapiring, mikrofon yozib oladi. **Solishtirish (`K`):** avval asl, keyin sizning ovozingiz
- Pleyer: tezlik (0.5x–2x), ovoz, A-B takror, loop, playlist (bir nechta video), avto-o'tish
- Videoni / subtitrni oynaga **sudrab tashlash** mumkin

## Shadowing qanday qilinadi

1. **Video** tugmasi bilan video va subtitrni birga tanlang (yoki sudrab tashlang).
2. **Gapdan keyin to'xta** ni yoqing, `Space` bosing: gap eshitiladi → video to'xtaydi → siz takrorlaysiz → `Space` → keyingi gap.
3. Qiyin gapda `R` bilan takrorlashni yoqing, kerak bo'lsa tezlikni pasaytiring (`*` / `/`).
4. **Yozish** (`V`) ni bosing — video chalinadi va siz u bilan bir vaqtda gapirasiz. Yana `V` — yozuv to'xtaydi.
5. **Solishtirish** (`K`) — avval asl qism, keyin sizning yozuvingiz chalinadi. Yozuvlar `Y` panelida: eshitish, solishtirish, faylga saqlash, o'chirish.

> Yozishda **quloqchin** taqing — aks holda videoning ovozi mikrofonga tushib qoladi.

## 1. `.exe` o'rnatuvchini olish

### A yo'li — o'z Windows kompyuteringizda

1. [nodejs.org](https://nodejs.org) dan **LTS** versiyasini o'rnating (bir marta).
2. Zip'ni chiqarib, papkani istalgan joyga qo'ying.
3. **`build.bat`** ni ikki marta bosing.
4. 3–10 daqiqadan so'ng **`dist`** papkasida:
   - `Shadowing-Studio-Setup-2.0.0.exe` — **o'rnatuvchi** (tarqatish uchun shuni yuboring)
   - `Shadowing-Studio-Portable-2.0.0.exe` — o'rnatmasdan ishlaydigan nusxa

> Birinchi yig'ishda internet kerak. Tayyor dastur esa internetsiz ishlaydi.

### B yo'li — kompyuterga hech narsa o'rnatmasdan (GitHub)

1. [github.com](https://github.com) da repozitoriya oching (**yangi** repozitoriya yoki eski fayllarni o'chirib tashlash tavsiya etiladi).
2. Papkadagi **hamma narsani** (`.github`, `app`, `build` papkalari bilan) yuklang. Fayllar kam (taxminan 20 ta), GitHub veb-sahifasidagi 100 talik limitga tushmaydi.
3. **Actions → Build Windows installer → Run workflow**.
4. Ish tugagach **Artifacts → ShadowingStudio-Windows** dan `.exe` fayllarni yuklab oling.

## 2. Boshqalarga tarqatish

`Shadowing-Studio-Setup-2.0.0.exe` ni yuboring. Qabul qiluvchi ikki marta bosib o'rnatadi; Administrator huquqi shart emas.

**«Windows kompyuteringizni himoya qildi» (SmartScreen):** dastur raqamli imzosiz, shuning uchun birinchi ochishda ogohlantirish chiqishi mumkin. **Qo'shimcha ma'lumot → Baribir ishga tushirish**. Bu oynani yo'qotish uchun pullik kod imzolash sertifikati kerak.

## 3. Tezkor tugmalar

| Tugma | Vazifa |
|---|---|
| `Space` / `5` | Play / Pauza (videoni bosish ham) |
| `←` / `→` | Oldingi / keyingi **gap** (subtitr bo'lmasa: ±5 soniya) |
| `Home` / `End` | Birinchi / oxirgi gap |
| `R` | Hozirgi gapni takrorlash |
| `S` | Har gapdan keyin to'xtash |
| `V` | Mikrofonda yozishni boshlash / to'xtatish |
| `K` | Oxirgi yozuvni asl bilan solishtirish |
| `T` | Subtitrni ko'rsatish / yashirish |
| `+` / `-` | Subtitr kattaligi |
| `1` / `3` | A nuqta / B nuqta (A-B takror) |
| `7` | A-B takrorni tozalash |
| `4` / `6` | 2 soniya orqaga / oldinga |
| `0` | Boshiga |
| `9` | Videoni takrorlash (loop) |
| `2` / `8` yoki `↓` / `↑` | Ovozni pasaytirish / ko'tarish |
| `M` | Ovozni o'chirish / yoqish |
| `*` / `/` | Keyingi tezlik / 1x ga qaytarish |
| `N` / `P` | Keyingi / oldingi video |
| `L` / `C` / `Y` | Panel: Videolar / Gaplar / Yozuvlar |
| `F` yoki video ustiga 2 marta bosish | To'liq ekran |
| `Ctrl` + `O` | Video ochish |
| `Esc` | Panelni yopish |

## 4. Formatlar va muammolar

- **Video:** MP4 (H.264/AAC) va WebM eng ishonchli. MOV, MKV, AVI ba'zan ochilmaydi — dastur «Videoni o'qib bo'lmadi» deb xabar beradi. Bunday faylni bepul HandBrake yoki VLC bilan MP4 ga o'tkazing.
- **Subtitr:** `.srt` va `.vtt`; UTF-8 / UTF-16 kodlash qo'llab-quvvatlanadi.
- **«Mikrofonga ruxsat berilmadi»:** Windows **Sozlamalar → Maxfiylik va xavfsizlik → Mikrofon** da «Desktop ilovalarga mikrofondan foydalanishga ruxsat berish» yoqilganini tekshiring.
- **`build.bat`: «symbolic link / privilege» xatosi:** `build.bat` ni **Administrator sifatida** ishga tushiring yoki Windows'da **Developer Mode** ni yoqing.
- **Antivirus o'rnatuvchini bloklaydi:** imzosiz dasturlarda uchrab turadi; manbaga ishonsangiz, istisnolarga qo'shing.
- Yozuvlar faqat dastur ochiq turgan paytda xotirada saqlanadi (oxirgi 15 tasi). Kerakli yozuvni **saqlash** (⬇) tugmasi bilan faylga yozib oling.

## 5. Loyiha tuzilishi

```
app/                  Dasturning o'zi (index.html, js/app.js, js/subtitles.js, css/)
main.js, serve.js     Electron: oyna, fayllarni xavfsiz berish, mikrofon ruxsati
build/                Ikonka (icon.ico, icon.png)
package.json          Yig'ish sozlamalari (versiya, o'rnatuvchi nomi)
build.bat             .exe yaratish (bir bosishda)
run-dev.bat           Yig'masdan sinov rejimida ishga tushirish
.github/workflows/    GitHub'da avtomatik yig'ish
THIRD_PARTY_NOTICES   Uchinchi tomon litsenziyalari
```

Versiyani o'zgartirish uchun `package.json` dagi `"version"` ni tahrirlang.
