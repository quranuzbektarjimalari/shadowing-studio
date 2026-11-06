# Shadowing Studio — video bilan shadowing

Videoni tinglab, **gap-ma-gap takrorlab** va **o'z ovozingizni studiya sifatida yozib, asl bilan solishtirib** til o'rganish dasturi. To'liq **internetsiz** ishlaydi.

Tizim talabi: **Windows 10 / 11 (64-bit)**.

## Imkoniyatlar

- **Video + subtitr (.srt / .vtt):** videoni tanlaganda subtitr faylini ham birga belgilang. Nomi bir xil bo'lsa avtomatik ulanadi (`lesson1.mp4` + `lesson1.srt`)
- **Gaplar bo'yicha navigatsiya:** pleyerdagi `←  3 / 120  →` — subtitr gaplari bo'yicha o'tish; raqam video bilan birga avtomatik yangilanadi
- **Gapni takrorlash (`R`):** hozirgi gap cheksiz takrorlanadi; `→` / `←` bosilsa takror keyingi/oldingi gapga ko'chadi
- **Gapdan keyin to'xta (`S`):** har gapdan keyin video to'xtaydi — siz takrorlaysiz, `Space` bilan davom ettirasiz
- **Yozish (`V`):** video bilan birga gapiring. **Solishtirish (`K`):** avval asl, keyin sizning ovozingiz
- **Studiya sifatidagi yozuv:** siqilmagan 16-bit PCM olinadi, **MP3 (128 / 192 / **256** / 320 kbps, CBR)** ga saqlanadi; mikrofon tanlash; filtrsiz «Studiya rejimi»; yozish paytida daraja ko'rsatkichi va clipping ogohlantirishi
- Pleyer: tezlik (0.5x–2x), ovoz, A-B takror, loop, playlist (bir nechta video), avto-o'tish
- **To'liq ekran:** `F` — faqat video va subtitr qoladi, boshqaruv yashirinadi; hammasi klaviatura bilan boshqariladi, har bir amal ekranda qisqa yozuv bilan ko'rsatiladi
- **Video zoom:** `+` / `-` bilan kattalashtirish va kichiklashtirish (50%–400%), kattalashganda videoni sichqoncha bilan siljitish — masalan, so'zlovchining lablarini yaqindan ko'rish uchun
- Videoni / subtitrni oynaga **sudrab tashlash** mumkin

## Shadowing qanday qilinadi

1. **Video** tugmasi bilan video va subtitrni birga tanlang (yoki sudrab tashlang).
2. **Gapdan keyin to'xta** ni yoqing, `Space` bosing: gap eshitiladi → video to'xtaydi → siz takrorlaysiz → `Space` → keyingi gap.
3. Qiyin gapda `R` bilan takrorlashni yoqing, kerak bo'lsa tezlikni pasaytiring (`*` / `/`).
4. **Yozish** (`V`) ni bosing — video chalinadi va siz u bilan bir vaqtda gapirasiz. Yana `V` — yozuv to'xtaydi.
5. **Solishtirish** (`K`) — avval asl qism, keyin sizning yozuvingiz chalinadi. Yozuvlar `Y` panelida: eshitish, solishtirish, faylga saqlash, o'chirish.

> Yozishda **quloqchin** taqing — aks holda videoning ovozi mikrofonga tushib qoladi.

## To'liq ekran (klaviatura bilan boshqarish)

- **`F`** (yoki videoga 2 marta bosish, yoki `F11`) — to'liq ekran. Sarlavha, asboblar paneli va pleyer **yashirinadi**, ekranda faqat video va subtitr qoladi. Pastda ingichka chiziq ijro joyini ko'rsatadi.
- Dastur to'liq klaviatura bilan boshqariladi — hamma tugma to'liq ekranda ham ishlaydi. Har bir amal videoning ustida qisqa yozuv bilan tasdiqlanadi: «Ijro», «Pauza», «Gap 3 / 9», «-2s · 1:05 / 4:20», «Tezlik: 1.25x», «Ovoz: 80%», «Zoom: 150%» va h.k.
- **`I`** — ma'lumot: vaqt, tezlik, gap raqami, zoom.
- **`H`** — to'liq ekranda boshqaruv panelini vaqtincha ko'rsatish (qadab qo'yish) va yana yashirish. Oddiy oynada `H` boshqaruvni yashiradi/qaytaradi («tomosha rejimi»).
- **Sichqoncha:** oynaning pastki chetiga olib borsangiz pleyer, yuqori chetiga — shadowing asboblari paydo bo'ladi; pastga/yuqoriga tegmasangiz yashirin qoladi. Sichqoncha harakatsiz qolsa, kursor ham yashirinadi.
- **`L` / `C` / `Y`** paneli (videolar, gaplar, yozuvlar) to'liq ekranda ham ochiladi; `Esc` avval panelni yopadi, keyin to'liq ekrandan chiqaradi.

## Video zoom

- **`+` / `-`** (yoki panel tepasidagi lupa tugmalari): 25% qadam bilan 50%–400%. O'rtadagi foiz tugmasi yoki **`Z`** — 100% ga qaytaradi.
- **`Ctrl` + g'ildirak:** kursor turgan joy tomon zoom qiladi (kursor ostidagi nuqta joyida qoladi).
- **Siljitish:** kattalashtirilgan videoni sichqonchani bosib sudrang. Bir marta bosish esa avvalgidek play/pauza qiladi.
- Zoom faqat video rasmiga ta'sir qiladi: **subtitr va pleyer joyida qoladi**. Boshqa videoga o'tganda zoom saqlanadi, siljitish markazga qaytadi.

## Ovoz yozish sifati (studiya mikrofoni uchun)

Yozuvlar paneli (`Y`) tepasida yozish sozlamalari bor:

- **Mikrofon:** ro'yxatdan studiya mikrofoningiz (yoki audio interfeys) kirishini tanlang. Tanlov eslab qolinadi. Tanlangan qurilma uzilgan bo'lsa, dastur standart mikrofonga o'tadi va sizga xabar beradi. Yozish boshlanganda qaysi mikrofon, nechta kanal va necha kHz ekani video ustida ko'rsatiladi.
- **Studiya rejimi (filtrsiz)** — **standart holatda yoqiq:** brauzerning exo bostirish, shovqin bostirish va avtomatik kuchaytirish filtrlari **o'chiq**, mikrofoningiz ovozi buzilmaydi. Karnaydan eshitsangiz (quloqchinsiz), shu tugmani o'chiring — exo/shovqin filtri yoqiladi.
- **MP3 sifati:** 128 / 192 / **256 (standart)** / 320 kbps, doimiy bitreyt (CBR). 128 kbps dan past sifat umuman tanlab bo'lmaydi. Sifatni yozuvdan keyin o'zgartirsangiz, saqlashda yozuv tanlangan sifatda qayta tayyorlanadi.
- **Qanday olinadi:** mikrofondan siqilmagan (WAV, 16-bit) yoziladi, shuning uchun yozish paytida sifat yo'qolmaydi. MP3 ga aylantirish yozuvdan keyin fonda (LAME kodlagichi) bajariladi; **Saqlash** (⬇) MP3 faylni beradi.
- **Interfeys kanallari:** audio interfeysda mikrofon faqat bitta kanalga ulangan bo'lsa (masalan, Input 1), dastur o'sha kanalni avtomatik tanlaydi, ovoz 6 dB pasayib ketmaydi.
- **Daraja ko'rsatkichi:** yozish paytida video ustida. Yozuv tugagach cho'qqi darajasi (dB) yozuv yonida ko'rinadi. Ovoz kesilsa (clipping), ogohlantirish chiqadi — mikrofon gain'ini pasaytiring. Ovoz juda past bo'lsa, buning ham haqida xabar beriladi.

## 1. `.exe` o'rnatuvchini olish

### A yo'li — o'z Windows kompyuteringizda

1. [nodejs.org](https://nodejs.org) dan **LTS** versiyasini o'rnating (bir marta).
2. Zip'ni chiqarib, papkani istalgan joyga qo'ying.
3. **`build.bat`** ni ikki marta bosing.
4. 3–10 daqiqadan so'ng **`dist`** papkasida:
   - `Shadowing-Studio-Setup-2.3.0.exe` — **o'rnatuvchi** (tarqatish uchun shuni yuboring)
   - `Shadowing-Studio-Portable-2.3.0.exe` — o'rnatmasdan ishlaydigan nusxa

> Birinchi yig'ishda internet kerak (Electron va MP3 kodlagichi — ffmpeg yuklanadi). Tayyor dastur esa internetsiz ishlaydi. MP3 kodlagichi tufayli o'rnatuvchi taxminan 80–100 MB bo'ladi.

### B yo'li — kompyuterga hech narsa o'rnatmasdan (GitHub)

1. [github.com](https://github.com) da repozitoriya oching (**yangi** repozitoriya yoki eski fayllarni o'chirib tashlash tavsiya etiladi).
2. Papkadagi **hamma narsani** (`.github`, `app`, `build` papkalari bilan) yuklang. Fayllar kam (taxminan 20 ta), GitHub veb-sahifasidagi 100 talik limitga tushmaydi.
3. **Actions → Build Windows installer → Run workflow**.
4. Ish tugagach **Artifacts → ShadowingStudio-Windows** dan `.exe` fayllarni yuklab oling.

## 2. Boshqalarga tarqatish

`Shadowing-Studio-Setup-2.3.0.exe` ni yuboring. Qabul qiluvchi ikki marta bosib o'rnatadi; Administrator huquqi shart emas.

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
| `[` / `]` | Subtitr kattaligini kamaytirish / oshirish |
| `+` / `-` | Videoni kattalashtirish / kichiklashtirish (zoom) |
| `Z` | Zoom'ni 100% ga qaytarish |
| `Ctrl` + g'ildirak | Kursor tomon zoom (touchpadda chimchilash ham) |
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
| `F` yoki video ustiga 2 marta bosish | To'liq ekran (boshqaruv yashirinadi) |
| `H` | Boshqaruvni ko'rsatish / yashirish |
| `I` | Ma'lumot: vaqt, tezlik, gap, zoom |
| `Ctrl` + `O` | Video ochish |
| `Esc` | Panelni yopish; panel yopiq bo'lsa — to'liq ekrandan chiqish |

## 4. Formatlar va muammolar

- **Video:** MP4 (H.264/AAC) va WebM eng ishonchli. MOV, MKV, AVI ba'zan ochilmaydi — dastur «Videoni o'qib bo'lmadi» deb xabar beradi. Bunday faylni bepul HandBrake yoki VLC bilan MP4 ga o'tkazing.
- **Subtitr:** `.srt` va `.vtt`; UTF-8 / UTF-16 kodlash qo'llab-quvvatlanadi.
- **«Mikrofonga ruxsat berilmadi»:** Windows **Sozlamalar → Maxfiylik va xavfsizlik → Mikrofon** da «Desktop ilovalarga mikrofondan foydalanishga ruxsat berish» yoqilganini tekshiring.
- **`build.bat`: «symbolic link / privilege» xatosi:** `build.bat` ni **Administrator sifatida** ishga tushiring yoki Windows'da **Developer Mode** ni yoqing.
- **Antivirus o'rnatuvchini bloklaydi:** imzosiz dasturlarda uchrab turadi; manbaga ishonsangiz, istisnolarga qo'shing.
- Yozuvlar faqat dastur ochiq turgan paytda xotirada saqlanadi (oxirgi 15 tasi). Kerakli yozuvni **saqlash** (⬇) tugmasi bilan MP3 faylga yozib oling.
- **MP3 o'rniga WAV saqlandi:** MP3 kodlagichi (ffmpeg) topilmasa, dastur xabar beradi va siqilmagan WAV saqlaydi — ovoz yo'qolmaydi. `build.bat` ni internet bilan qayta ishga tushirib, ffmpeg yuklanganini tekshiring.
- **Mikrofon ovozi past / juda baland:** Windows'da mikrofon darajasini (Sozlamalar → Tizim → Ovoz → Kiritish) yoki audio interfeys gain'ini sozlang. Ideal cho'qqi: −12 … −3 dB.

## 5. Loyiha tuzilishi

```
app/                  Dasturning o'zi (index.html, js/app.js, subtitles.js, audio-utils.js, pcm-capture.worklet.js, css/)
main.js, preload.js   Electron: oyna, xavfsiz ko'prik, mikrofon ruxsati, MP3 kodlash chaqiruvi
serve.js, encoder.js  Fayllarni xavfsiz berish; WAV → MP3 (ffmpeg/LAME) aylantirgich
build/                Ikonka (icon.ico, icon.png)
package.json          Yig'ish sozlamalari (versiya, o'rnatuvchi nomi)
build.bat             .exe yaratish (bir bosishda)
run-dev.bat           Yig'masdan sinov rejimida ishga tushirish
.github/workflows/    GitHub'da avtomatik yig'ish
THIRD_PARTY_NOTICES   Uchinchi tomon litsenziyalari
```

Versiyani o'zgartirish uchun `package.json` dagi `"version"` ni tahrirlang.
