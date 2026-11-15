# Yardline — revisi besar (15 Nov 2026, ~20:31–20:45 WIB)

Rombak total dari Monsoon Market (pasar malam neon) jadi **Yardline**:
container yard siang hari, matahari hangat, palet pasir/krem/terakota.
Semua kode ditulis sendiri di sesi ini (brief desain saja, bukan kode).
**BELUM DI-SUBMIT** — menunggu Yiro bilang "gas entry".

## Apa yang diubah

### Tahap 1 — Senjata (prioritas tertinggi)
- Viewmodel rifle baru dari banyak bentuk: laras panjang, handguard kayu,
  magazine melengkung (3 segmen), popor kayu, grip, front/rear sight,
  dan **dua tangan bersarung** yang memegangnya. SMG, pistol, DMR,
  shotgun, dan pisau juga dibangun ulang dengan siluet masing-masing.
- Animasi: sway saat gerak/mouse, bob jalan, recoil naik lalu kembali
  pelan, reload (senjata menunduk + miring, mag ganti di tengah),
  lower/raise saat ganti senjata.
- Muzzle flash: sprite radial + point light sesaat. Selongsong kuningan
  terlempar ke kanan-atas, jatuh, dan berhenti di lantai.
  Bekas peluru (decal gelap) menempel di tembok yang kena tembak.
- Suara WebAudio baru: tembakan = crack tajam + thump rendah (beda tiap
  senjata), reload = klik mekanis (lepas mag, masuk mag, rack),
  langkah kaki = thud pelan, hit marker = tick tajam.
- Tiga rasa senjata: pistol akurat + lambat, rifle recoil kuat + damage
  tinggi, SMG cepat tapi akurasi jatuh kalau ditahan (bloom per tembakan
  paling besar).

### Tahap 2 — Look
- Satu matahari hangat (directional, bayangan lembut 2048px) + hemisphere
  langit/tanah. Langit gradasi biru → horizon hangat, kabut jarak jauh.
  **Tidak ada lagi lampu warna-warni.**
- Palet: pasir, krem, terakota, kontainer biru/hijau/merah/kuning pudar.
- Tekstur prosedural dari canvas: semen retak + noda oli + marking kuning,
  bata berlapis noise, kayu berserat + knot untuk peti, baja kontainer
  bergelombang + karat + stencil pudar. Tiap permukaan beda.
- Debu melayang di udara (ganti hujan), contact shadow lembut di bawah
  kontainer/peti, langit gradasi, tanda area (CRANE BAY, STACK YARD,
  MID YARD).

### Tahap 3 — Peta (container yard, 48×36 m)
- Tiga jalur: **Long Haul** (barat, sightline panjang), **Mid Yard**
  (tengah, gerbang kontainer + balok gantry), **Tunnel** (timur,
  koridor beratap). Dua site: **Crane Bay (A)** dengan crane kuning,
  **Stack Yard (B)** dengan kontainer bertumpuk.
- Connector untuk rotasi antar site. Cover: kontainer, peti bertumpuk,
  tembok setinggi dada, pintu sempit (choke point).
- Nama area orisinal + callout kecil di HUD saat pemain masuk area
  (LONG HAUL / MID YARD / TUNNEL / CRANE BAY / STACK YARD / CONNECTOR).
- Minimap baru: latar krem, blok cokelat, site terakota/biru.

### Tahap 4 — Gameplay
- Buy menu (sudah ada, nama + harga diperbarui). Armor/helm/granat sama.
- Bot: tingkat kesulitan per bot (skill 0.6–1.0, Marksman paling tajam),
  jeda reaksi lebih cepat untuk bot terampil, akurasi turun saat bot
  sendiri masih bergerak dan saat target lari, naik saat bot berhenti.
  Rute baru mengikuti tiga jalur; spawn menghadap ke dalam yard
  (sebelumnya bot spawn menghadap tembok — bug yang sama seperti player).
- Crosshair melebar saat bergerak/menembak (sudah ada, sekarang
  didorong bloom SMG). Killfeed, hit marker, dan:
  **indikator arah tembakan** (panah merah menunjuk arah penyerang)
  dan **layar akhir ronde** (sudah ada, nama tim diperbarui).
- Objective: "charge" (bukan Stormcell). Tim: RUSTJACKS vs YARD CREW.

## Iterasi 2 — dorong ke arah AAA (15 Nov ~20:45–20:50 WIB, dari 4 gambar referensi Yiro)
Yiro: "maunya yang begini, kayak Counter Strike / Delta Force / Call of Duty,
bukan kotak-kotak doang." Jujur: persis AAA tidak bisa (itu game ratusan
orang, model hasil scan). Yang didorong ke arah itu:

- **Prajurit (bot) bukan lagi kotak:** helm + kepala, rompi dengan kantong
  + chest light, ransel, lengan yang megang senapan ke depan, kaki +
  boots, senapan di tangan. Kaki mengayun saat jalan (walk cycle).
- **Senjata:** red-dot sight (housing + ring + dot merah menyala), rail
  atas dengan slot, foregrip vertikal, charging handle. Tangan depan
  sekarang megang foregrip.
- **Lingkungan sunset:** matahari rendah (bayangan panjang), langit
  gradasi biru-ungu → oranye, kabut hangat. Gedung latar (blok gudang
  gelap + jendela menyala), scaffolding (tiang + papan), pipa di pagar
  barat, grafiti "YARD" di pagar timur.
- **HUD:** angka damage melayang di dekat crosshair (kuning kalau
  headshot), bar health/armor di bawah angka, ikon siluet senapan di
  kotak senjata, nama tim di top bar (RUST / YARD).
- **Fill light di kamera** supaya viewmodel tidak hitam di sunset.
- Hasil tes: 4 screenshot staged nol error; dossier 141.128 byte
  (< 163.840 cap); 4 gambar; cover = 1-cover.jpg.

## Iterasi 3 — LONGHAUL AR dari gambar referensi Yiro (15 Nov ~21:00–21:05 WIB)
Yiro kirim gambar referensi AR-15 (multi-view: samping kiri/kanan, depan,
belakang). Viewmodel rifle dibangun ulang dari gambar itu:
- **Two-tone hitam + tan/FDE** (persis referensi): receiver, handguard,
  dan laras hitam; stock, pistol grip, magazine, dan foregrip tan.
- Handguard M-LOK hitam (slot di kedua sisi) + rail atas penuh.
- Red-dot holographic: housing kotak + lensa bundar merah + knob atas.
- Foregrip tan ber-rib (3 rib), magazine tan melengkung (3 segmen +
  baseplate), stock tan collapsible (cheek riser + butt plate + sling
  loop + buffer tube), pistol grip tan (beavertail), flash hider
  birdcage, charging handle, ejection port, fire selector.
- Bot juga pegang rifle two-tone yang sama (mag + stock tan, sight).
- Referensi disimpan di `ref-rifle-ar15.webp` (bukan aset game).
- Hasil tes: 4 screenshot staged nol error; dossier 143.637 byte
  (< 163.840 cap).

## Iterasi 4 — Map jadi LIBRARY (15 Nov ~21:06–21:20 WIB)
Yiro: "Ganti map nya bisa ga? Gw mau map nya tuh begini nih perpustakaan
gitu kaya point blank." Layout dari gambar referensinya (denah 2D +
render 3D isometrik):
- **Main Reading Hall** (utara, CT spawn): rak buku tinggi di dinding
  utara + meja baca + karpet + papan nama.
- **Entrance Lobby** (selatan, T spawn): lantai catur, bangku, tanaman,
  pintu ganda besar, papan nama.
- **Site A — Study Room** (barat): barisan meja belajar kayu + karpet
  bundar + rak buku.
- **Site B — Archive Room** (timur): barisan rak buku tinggi (arsip) +
  karpet bundar + meja.
- **Mid**: air mancur (kolam + kolom + mangkuk) + tanaman + blok rak
  buku di utara/selatan mid.
- **Long A Corridor** (tepi barat, sempit): rak buku menempel dinding.
- **B Tunnels** (tepi timur): koridor beratap rendah (terasa seperti
  terowongan).
- **Connecting Hallway**: koridor horizontal A ↔ Mid ↔ B.
- Interior: plafon kayu + balok, jendela menyala hangat (utara/selatan),
  lampu gantung (5 point light hangat), rak buku dengan tekstur buku
  prosedural (punggung buku warna-warni), meja baca + kursi + tumpukan
  buku, tanaman pot, bangku lobby, karpet bundar merah/emas.
- Waypoint/rute bot, spawn, site, areaAt, minimap, dan staging
  screenshot diperbarui ke layout library. Nama area di HUD: MAIN
  READING HALL / ENTRANCE LOBBY / STUDY ROOM / ARCHIVE ROOM / MID /
  LONG A CORRIDOR / B TUNNELS / CONNECTING HALLWAY.
- Bug yang diperbaiki saat build: THREE tidak ter-import di map.js,
  mulberry32 → seeded, format sites/minimap dikembalikan ke format
  lama (objek keyed + blocks rect) yang dipakai rounds/hud/main.
- Hasil tes: 4 screenshot staged nol error; dossier 148.162 byte
  (< 163.840 cap).

### Yang masih kurang (iterasi 4)
- Interior masih terang merata — belum ada kontras gelap/terang antar
  ruangan seperti render referensi (ruangan B lebih gelap, lorong
  lebih redup).
- Air mancur statis (tidak ada animasi air).
- 60 FPS + pointer lock tetap belum terverifikasi di Chrome desktop
  beneran (map indoor + 5 point light lebih berat dari container yard).
- Detail halus referensi (ukiran, baut, wear, tekstur) tidak bisa
  direproduksi dari geometri — siluet + warna + bagian khasnya yang
  ditiru.
- Red-dot sight masih kecil dari sudut pandang pemain.
- 60 FPS + pointer lock tetap belum terverifikasi di Chrome desktop
  beneran.
- Prajurit masih dari primitif (kotak/silinder/bola) — siluetnya sudah
  manusia, tapi detail kain, wajah, dan gear masih kasar.
- Red-dot sight kecil dan susah dilihat dari sudut pandang pemain.
- Gedung latar agak datar (kotak gelap + jendela menyala).
- Lantai depan masih polos; langit atas kosong.
- 60 FPS + pointer lock tetap belum terverifikasi di Chrome desktop
  beneran (lingkungan tes tanpa GPU).
- 4 screenshot staged: **nol error** di semua. Viewmodel rifle + muzzle
  flash + tracer + HUD lengkap terlihat.
- Gerakan (W) jalan — callout area berubah ATTACK SPAWN → MID YARD.
- Buy jalan — armor $800 → $150, armour 0 → 100. Item yang tidak
  terjangkau ditolak dengan benar (rifle $2700 tidak bisa dibeli
  dengan $800).
- Dossier build: 131.546 byte teks (< 163.840 cap), 4 gambar, cover
  = 1-cover.jpg. Repo siap submit kapan saja (tapi JANGAN submit
  sampai Yiro bilang "gas entry").

## Yang masih jelek
- **Bot masih kotak-kotak** (torso/head/kaki dari box). Lebih rapi
  dari sebelumnya (warna tim + rompi), tapi tetap primitif. Top-10
  juga pakai bot kotak, jadi ini setara — bukan ketinggalan jauh.
- **Tangan viewmodel masih balok** (sarung tangan = box). Dari sudut
  pandang pemain masih terbaca sebagai tangan, tapi kasar kalau
  dilihat dekat.
- **Lantai depan agak polos** — hamparan semen besar di foreground
  dengan tekstur yang halus. Marking kuning membantu, tapi area
  terbuka terasa kosong.
- **Langit atas agak kosong** — gradasi halus tapi tidak ada awan
  atau matahari yang terlihat.

## Yang aku ragukan
- **Performa 60 FPS belum terverifikasi di Chrome desktop beneran.**
  Di Xvfb (software rendering, tanpa GPU) rAF cuma ~4 FPS dan game
  jalan ~1/3 kecepatan — itu artefak lingkungan, bukan ukuran game.
  Arsitektur sudah hemat (efek pooled, tanpa alokasi di hot loop,
  shadow map 2048, ~60 mesh), tapi angka 60 FPS harus dicek di
  laptop/desktop sungguhan.
- **Pointer lock tidak bisa dites di Xvfb** — klik "Click to play"
  tidak mengunci mouse di lingkungan tes. Di Chrome desktop asli
  seharusnya jalan (API standar), tapi belum terbukti.
- **Bot belum dites bertarung sampai ada kill** — ronde live butuh
  waktu lama di Xvfb (game 1/3 kecepatan). Logika tembak bot tidak
  berubah dari versi yang sudah terbukti kill di 15 Nov, tapi akurasi
  baru (skill + gerak) belum terlihat hasilnya.
- **Apakah palet pasir cukup "mahal" di mata juri** — terang dan
  terbaca, tapi kurang dramatis dibanding entri malam/neon.
  Trade-off yang disengaja demi "real" yang Yiro minta.

## File
- Game: `~/workspace/monsoon-market/game/` (repo `Wisesaaa/monsoon-market`)
- Screenshot final: `screenshots/1-cover.jpg`, `2-buy.jpg`, `3-mid.jpg`, `4-site.jpg`
- Brief konsultan Claude: `~/workspace/makefun/threejs-fps-02/CONSULTANT.md`
- Aturan submit: **JANGAN submit sampai Yiro bilang "gas entry"**
  (2/10 submit terpakai; terakhir = 7833eaf).
