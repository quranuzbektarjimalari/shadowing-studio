# Shadowing Studio — YouTube bilan shadowing

YouTube videosini **havola** bilan oching, **gap-ma-gap takrorlang** va **o'z ovozingizni studiya sifatida yozib**, asl bilan solishtiring.

Tizim talabi: **Windows 10 / 11 (64-bit)** va video uchun **internet**. (Ovoz yozish va MP3 internetsiz ishlaydi.)

## Imkoniyatlar

- **YouTube havolasi bilan ochish:** `YouTube` tugmasi (yoki `Ctrl+O`), yoki havolani istalgan joyda `Ctrl+V` bilan joylashtiring, yoki brauzerdan sudrab tashlang. Bir nechta havola — playlist
- **Video kompyuterga yuklanmaydi** (pastda batafsil)
- **Subtitr (.srt / .vtt):** gap bo'yicha navigatsiya (`← 3 / 120 →`), **gapni takrorlash** (`R`), **gapdan keyin to'xtash** (`S`)
- **Studiya sifatidagi yozuv:** siqilmagan 16-bit PCM olinadi, **MP3 (128 / 192 / 256 / 320 kbps, CBR)** ga saqlanadi; mikrofon tanlash; filtrsiz «Studiya rejimi»; daraja ko'rsatkichi
- **Solishtirish (`K`):** avval asl (YouTube'dan), keyin sizning ovozingiz
- Pleyer: tezlik (0.5x–2x), ovoz, A-B takror, loop, playlist, avto-o'tish
- **Toza ko'rinish** (`G`): YouTube'ning sarlavha paneli, pastki tugmalari, qora soyalari va markaziy Play belgisi yashiriladi
- **YouTube'ning o'z subtitrini** yoqish / o'chirish / tilini almashtirish (`U`)
- **To'liq ekran** (`F`): boshqaruv yashirinadi, hammasi klaviatura bilan boshqariladi
- **Video zoom** (`+` / `-`) va sichqoncha bilan siljitish

## YouTube haqida: nima va qanday ishlaydi

**Yuklanmaydi.** Video YouTube'ning **rasmiy joylashtirilgan pleyeri** orqali oqim (stream) bo'lib keladi va xotiraga (RAM) buferlanadi. Dasturda videoni yuklab olish/saqlash imkoniyati **yo'q**; diskdagi HTTP / media keshi ham o'chirilgan va dastur ochilganda hamda yopilganda tozalanadi. (Dastur faqat sozlamalaringizni — mikrofon, MP3 sifati — kichik fayl sifatida saqlaydi.)

**Qo'llab-quvvatlanadigan havolalar:** `youtube.com/watch?v=…`, `youtu.be/…`, `/shorts/…`, `/live/…`, `/embed/…`, `music.youtube.com`, oddiy 11 belgili video ID. Havolada `t=1m30s` (yoki `t=90`) bo'lsa, video shu joydan boshlanadi.

**Cheklovlar (YouTube qoidalari tufayli):**

- **Subtitr:** YouTube'ning o'z subtitrini dastur o'qiy olmaydi. Gap bo'yicha takrorlash uchun `.srt` / `.vtt` faylni **Subtitr** tugmasi bilan yuklang (kichik matn fayli). Subtitrsiz ham ishlaydi: A-B takror, ±5 soniya, tezlik.
- **Ba'zi videolar ochilmaydi:** egasi boshqa dasturlarda ko'rsatishni taqiqlagan bo'lishi mumkin (xato 101/150), yopiq (private) yoki o'chirilgan video. Dastur sababini aytadi.
- **Reklama va shartlar** YouTube'ga tegishli: dastur reklamani o'zgartirmaydi va bloklamaydi.
- **Seek va takror:** A-B / gap takrori YouTube'da orqaga o'tkazish orqali bajariladi, ba'zan yarim soniyalik buferlash bo'lishi mumkin.
- Pleyer tezligi YouTube qo'llab-quvvatlaydigan qadamlarga yaqinlashtiriladi (0.25x–2x).

**Ichki server:** dastur o'z fayllarini faqat sizning kompyuteringizda (`127.0.0.1`) ishlaydigan ichki server orqali ochadi (YouTube pleyeri oddiy `http://localhost` manzilini talab qiladi). Tashqaridan unga murojaat qilib bo'lmaydi.

## Shadowing qanday qilinadi

1. **YouTube** tugmasi bilan havolani kiriting (yoki `Ctrl+V`). Gap bo'yicha ishlash uchun **Subtitr** tugmasi bilan `.srt` / `.vtt` faylni yuklang.
2. **Gapdan keyin to'xta** (`S`) ni yoqing, `Space` bosing: gap eshitiladi → video to'xtaydi → siz takrorlaysiz → `Space` → keyingi gap.
3. Qiyin gapda `R` bilan takrorlashni yoqing, kerak bo'lsa tezlikni pasaytiring (`*` / `/`).
4. **Yozish** (`V`) ni bosing — video chalinadi va siz u bilan bir vaqtda gapirasiz. Yana `V` — yozuv to'xtaydi.
5. **Solishtirish** (`K`) — avval asl qism, keyin sizning yozuvingiz chalinadi. Yozuvlar `Y` panelida: eshitish, solishtirish, MP3 ga saqlash, o'chirish.

> Yozishda **quloqchin** taqing — aks holda videoning ovozi mikrofonga tushib qoladi.

## To'liq ekran (klaviatura bilan boshqarish)

- **`F`** (yoki videoga 2 marta bosish, yoki `F11`) — to'liq ekran. Sarlavha, asboblar paneli va pleyer **yashirinadi**, faqat video va subtitr qoladi. Pastda ingichka chiziq ijro joyini ko'rsatadi.
- Hamma tugma to'liq ekranda ham ishlaydi; har bir amal ekranda qisqa yozuv bilan tasdiqlanadi: «Ijro», «Pauza», «Gap 3 / 9», «-2s · 1:05 / 4:20», «Tezlik: 1.25x», «Ovoz: 80%», «Zoom: 150%».
- **`I`** — ma'lumot: vaqt, tezlik, gap raqami, zoom. **`H`** — to'liq ekranda boshqaruv panelini qadab qo'yish / yashirish; oddiy oynada — boshqaruvni yashirish / qaytarish.
- **Sichqoncha:** pastki chetga olib borsangiz pleyer, yuqori chetga — shadowing asboblari paydo bo'ladi; harakatsiz qolsa kursor yashirinadi.
- `Esc` avval panelni yopadi, keyin to'liq ekrandan chiqaradi.

## Toza ko'rinish va YouTube subtitri

**Toza ko'rinish (`G`, standart holatda yoqiq).** YouTube pleyeri sarlavha paneli, kanal nomi, «havolani nusxalash», «Boshqa videolar», YouTube belgisi, yuqori va pastdagi qora soyalar hamda markaziy Play tugmasini **o'zining ichida chizadi** — ularni dasturdan CSS bilan o'chirib bo'lmaydi. Shuning uchun dastur pleyer oynasini yuqori va pastdan kattaroq qilib, ortiqcha qismini **kesib tashlaydi**: qatlamlar kesilgan joyga tushadi, **video kadri esa to'liq va o'sha o'lchamda qoladi**. Pauza paytida YouTube'ning markaziy tugmasi o'rniga dasturning o'z belgisi (▶) ko'rinadi. A-B takror va gap takrori paytida (buferlash, pauza, ijro) qatlamlar chiqmaydi.

**Video shakli (`A`).** Kesish kadrning shakliga bog'liq. Dastur shaklni YouTube'dan **avtomatik** oladi («Avto · 16:9»). Noto'g'ri chiqsa yoki ma'lumot kelmasa, `A` bilan qo'lda tanlang: Avto → 16:9 → 4:3 → 21:9 → 1:1 → 9:16 (Shorts). Shakl noto'g'ri bo'lsa, kadr chetlari ozgina kesilishi yoki qora ramka chiqishi mumkin. Toza ko'rinishni `G` bilan o'chirsangiz, YouTube qatlamlari ko'rinadi.

**YouTube subtitri (`U`).** Bir marta bosish — YouTube'ning o'z subtitri yoqiladi; videoda bir nechta til bo'lsa, qayta bosganda keyingi til, oxirida o'chadi. Standart holatda **o'chiq**: YouTube o'zi subtitrni yoqib yuborsa ham, dastur uni o'chirib turadi. Tanlov eslab qolinadi. Dasturning o'z subtitri (`.srt` / `.vtt`, `T` tugmasi) bundan mustaqil ishlaydi.

> **Eslatma (nima kafolatlanmaydi):**
> - Pleyer ichidagi subtitrni boshqarish YouTube'ning rasmiy hujjatlarida yo'q (keng ishlatiladigan usul qo'llangan).
> - Kesish YouTube qatlamlari pleyerning yuqori va pastki chetlarida turishiga tayanadi (kesish zaxirasi ~30%). YouTube pleyerining ko'rinishini o'zgartirsa, bu qismlar qisman ishlamay qolishi mumkin.
> - **YouTube subtitri toza ko'rinishda ko'rinmasa:** YouTube uni pleyerning eng pastki chetiga yaqin chizayotgan bo'lishi mumkin, u kesilgan zonaga tushadi. Bunda `G` bilan toza ko'rinishni vaqtincha o'chiring yoki o'z subtitringizdan (`.srt`, `T`) foydalaning.
> - Qatlamlar hali ham ko'rinsa, ekran suratini yuboring — kesish zaxirasi o'zgartiriladi.

## Video zoom

- **`+` / `-`** (yoki lupa tugmalari): 25% qadam bilan 50%–400%. Foiz tugmasi yoki **`Z`** — 100% ga qaytaradi. **`Ctrl` + g'ildirak** — kursor tomon zoom.
- **Siljitish:** kattalashtirilgan videoni sichqonchani bosib sudrang. Bir marta bosish — play/pauza.
- Zoom faqat video rasmiga ta'sir qiladi: **subtitr va pleyer joyida qoladi**. Boshqa videoga o'tganda zoom saqlanadi, siljitish markazga qaytadi.

## Ovoz yozish sifati (studiya mikrofoni uchun)

Yozuvlar paneli (`Y`) tepasida yozish sozlamalari bor:

- **Mikrofon:** ro'yxatdan studiya mikrofoningiz (yoki audio interfeys) kirishini tanlang; tanlov eslab qolinadi. Tanlangan qurilma uzilgan bo'lsa, dastur standart mikrofonga o'tadi va xabar beradi. Yozish boshlanganda qaysi mikrofon, nechta kanal va necha kHz ekani ko'rsatiladi.
- **Studiya rejimi (filtrsiz)** — **standart holatda yoqiq:** exo bostirish, shovqin bostirish va avto-gain filtrlari **o'chiq**, mikrofoningiz ovozi buzilmaydi. Karnaydan eshitsangiz (quloqchinsiz), shu tugmani o'chiring.
- **MP3 sifati:** 128 / 192 / **256 (standart)** / 320 kbps, doimiy bitreyt (CBR); 128 kbps dan past tanlab bo'lmaydi. Sifatni yozuvdan keyin o'zgartirsangiz, saqlashda tanlangan sifatda qayta tayyorlanadi.
- **Qanday olinadi:** mikrofondan siqilmagan (WAV, 16-bit) yoziladi — yozish paytida sifat yo'qolmaydi. MP3 ga aylantirish yozuvdan keyin fonda (LAME) bajariladi; **Saqlash** (⬇) MP3 fayl beradi.
- **Interfeys kanallari:** mikrofon faqat bitta kanalga ulangan bo'lsa (masalan, Input 1), dastur o'sha kanalni avtomatik tanlaydi, ovoz 6 dB pasayib ketmaydi.
- **Daraja ko'rsatkichi** yozish paytida video ustida; tugagach cho'qqi (dB) ko'rinadi. Ovoz kesilsa (clipping) yoki juda past bo'lsa — ogohlantirish chiqadi.

## 1. `.exe` o'rnatuvchini olish

### A yo'li — o'z Windows kompyuteringizda

1. [nodejs.org](https://nodejs.org) dan **LTS** versiyasini o'rnating (bir marta).
2. Zip'ni chiqarib, papkani istalgan joyga qo'ying.
3. **`build.bat`** ni ikki marta bosing.
4. 3–10 daqiqadan so'ng **`dist`** papkasida:
   - `Shadowing-Studio-Setup-3.1.0.exe` — **o'rnatuvchi** (tarqatish uchun shuni yuboring)
   - `Shadowing-Studio-Portable-3.1.0.exe` — o'rnatmasdan ishlaydigan nusxa

> Birinchi yig'ishda internet kerak (Electron va MP3 kodlagichi — ffmpeg yuklanadi). O'rnatuvchi MP3 kodlagichi tufayli taxminan 80–100 MB bo'ladi.

### B yo'li — kompyuterga hech narsa o'rnatmasdan (GitHub)

1. [github.com](https://github.com) da repozitoriya oching (**yangi** repozitoriya yoki eski fayllarni o'chirib tashlash tavsiya etiladi).
2. Papkadagi **hamma narsani** (`.github`, `app`, `build` papkalari bilan) yuklang. Fayllar kam (taxminan 30 ta), GitHub veb-sahifasidagi 100 talik limitga tushmaydi.
3. **Actions → Build Windows installer → Run workflow**.
4. Ish tugagach **Artifacts → ShadowingStudio-Windows** dan `.exe` fayllarni yuklab oling.

## 2. Boshqalarga tarqatish

`Shadowing-Studio-Setup-3.1.0.exe` ni yuboring. Qabul qiluvchi ikki marta bosib o'rnatadi; Administrator huquqi shart emas.

**«Windows kompyuteringizni himoya qildi» (SmartScreen):** dastur raqamli imzosiz, shuning uchun birinchi ochishda ogohlantirish chiqishi mumkin: **Qo'shimcha ma'lumot → Baribir ishga tushirish**. Bu oynani yo'qotish uchun pullik kod imzolash sertifikati kerak.

## 3. Tezkor tugmalar

| Tugma | Vazifa |
|---|---|
| `Ctrl` + `O` | YouTube havolasi oynasi |
| `Ctrl` + `V` | Nusxalangan YouTube havolasini ochish (oyna ochilmasdan) |
| `Space` / `5` | Play / Pauza (videoni bosish ham) |
| `←` / `→` | Oldingi / keyingi **gap** (subtitr bo'lmasa: ±5 soniya) |
| `Home` / `End` | Birinchi / oxirgi gap |
| `R` | Hozirgi gapni takrorlash |
| `S` | Har gapdan keyin to'xtash |
| `V` | Mikrofonda yozishni boshlash / to'xtatish |
| `K` | Oxirgi yozuvni asl bilan solishtirish |
| `T` | Dasturning o'z subtitrini (.srt / .vtt) ko'rsatish / yashirish |
| `U` | YouTube'ning o'z subtitrini yoqish / keyingi til / o'chirish |
| `G` | Toza ko'rinish (YouTube qatlamlarini yashirish) |
| `A` | Video shakli: Avto / 16:9 / 4:3 / 21:9 / 1:1 / 9:16 |
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
| `Esc` | Panelni yopish; panel yopiq bo'lsa — to'liq ekrandan chiqish |

## 4. Muammolar

- **«YouTube yuklanmadi — internetni tekshiring»:** internet yoki xavfsizlik devori (firewall) `youtube.com` / `youtube-nocookie.com` ni to'sib qo'ygan. Ulanishni tiklab, havolani qayta kiriting.
- **«Video egasi … taqiqlagan» (101/150):** bu videoni faqat YouTube saytida ko'rish mumkin. Boshqa video tanlang.
- **«YouTube pleyer sozlamasi xatosi (153)»:** dasturni qayta ishga tushiring. Davom etsa, antivirus/proxy `localhost` ni o'zgartirayotgan bo'lishi mumkin.
- **Subtitr o'qilmadi / harflar buzuq:** fayl UTF-8 (yoki UTF-16) kodlashida bo'lsin.
- **«Mikrofonga ruxsat berilmadi»:** Windows **Sozlamalar → Maxfiylik va xavfsizlik → Mikrofon** da «Desktop ilovalarga mikrofondan foydalanishga ruxsat berish» yoqilganini tekshiring.
- **MP3 o'rniga WAV saqlandi:** MP3 kodlagichi (ffmpeg) topilmasa, dastur xabar beradi va siqilmagan WAV saqlaydi. `build.bat` ni internet bilan qayta ishga tushirib, ffmpeg yuklanganini tekshiring.
- **Mikrofon ovozi past / juda baland:** Windows'da kiritish darajasini yoki audio interfeys gain'ini sozlang. Ideal cho'qqi: −12 … −3 dB.
- **`build.bat`: «symbolic link / privilege» xatosi:** `build.bat` ni **Administrator sifatida** ishga tushiring yoki Windows'da **Developer Mode** ni yoqing.
- **Antivirus o'rnatuvchini bloklaydi:** imzosiz dasturlarda uchrab turadi; manbaga ishonsangiz, istisnolarga qo'shing.
- **Sozlamalar (mikrofon, MP3 sifati) tushib ketdi:** ichki server odatda 47285-portdan foydalanadi; u band bo'lsa, boshqa port tanlanadi va sozlamalar qayta kiritiladi.
- Yozuvlar faqat dastur ochiq turgan paytda xotirada saqlanadi (oxirgi 15 tasi). Kerakli yozuvni **Saqlash** (⬇) bilan MP3 faylga yozib oling.

## 5. Loyiha tuzilishi

```
app/                  Dastur (index.html, js/app.js, youtube-media.js, youtube-url.js, subtitles.js, audio-utils.js, pcm-capture.worklet.js, css/)
main.js, preload.js   Electron: oyna, xavfsiz ko'prik, mikrofon ruxsati, MP3 kodlash chaqiruvi
appserver.js          Ichki (faqat 127.0.0.1) server — YouTube pleyeri uchun http://localhost manzili
serve.js, encoder.js  Fayllarni xavfsiz berish; WAV → MP3 (ffmpeg/LAME) aylantirgich
build/                Ikonka (icon.ico, icon.png)
package.json          Yig'ish sozlamalari (versiya, o'rnatuvchi nomi)
build.bat             .exe yaratish (bir bosishda)
run-dev.bat           Yig'masdan sinov rejimida ishga tushirish
.github/workflows/    GitHub'da avtomatik yig'ish
THIRD_PARTY_NOTICES   Uchinchi tomon litsenziyalari va YouTube shartlari
```

Versiyani o'zgartirish uchun `package.json` dagi `"version"` ni tahrirlang.
