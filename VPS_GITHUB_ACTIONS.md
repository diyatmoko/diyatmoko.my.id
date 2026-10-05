# Deploy ke VPS melalui GitHub Actions

Setelah setup awal, Anda cukup memperbarui kode di GitHub atau menekan **Run workflow**. Tidak perlu menyalin `dist/`, menjalankan `git pull`, atau membangun aplikasi di VPS untuk setiap rilis.

Alurnya: **GitHub → tes & build → tes container → upload image melalui SSH → Docker Compose di VPS → health check**. VPS tidak membutuhkan akses ke repository GitHub, Node.js, atau token registry. Image dikirim langsung melalui SSH; build tidak memakan RAM VPS.

## 1. Masukkan source ke GitHub

Pastikan seluruh source dan `.github/workflows/ci.yml` sudah masuk ke branch **`main`** repository `diyatmoko/diyatmoko.my.id`. Tombol Run workflow baru tersedia setelah file workflow ada di default branch. Gunakan akun GitHub yang memiliki akses tulis pada repository ini.

Branch fitur dan pull request menjalankan verifikasi. Secret VPS hanya digunakan oleh job deploy dari `main`, melalui environment **`production`**.

## 2. Setup satu kali dari komputer Anda

Prasyarat:

- Linux, macOS, atau WSL dengan Bash dan OpenSSH.
- GitHub CLI (`gh`) yang login sebagai pemilik/admin repository. Jalankan `gh auth login` jika belum login.
- VPS Linux **x86_64/amd64** dengan Docker Engine, Docker Compose yang mendukung `--wait-timeout`, `curl`, dan `flock`. Skrip tidak memasang ulang Docker yang sudah digunakan layanan lain.
- Akses SSH administrator yang sudah berfungsi; gunakan `root` atau akun dengan `sudo` tanpa password untuk bootstrap. GitHub-hosted runner juga harus bisa menjangkau port SSH VPS.

Dari direktori source di komputer Anda, jalankan:

```bash
bash scripts/setup-vps.sh
```

Jika Node/npm sudah tersedia, perintah yang sama tersedia sebagai `npm run deploy:setup`. Isi prompt untuk IP/hostname VPS, username admin, port SSH, domain HTTPS, port loopback portfolio, dan network Docker public Nginx. Default port aplikasi adalah **18080**, terikat ke `127.0.0.1`.

Jika Nginx publik berjalan di Docker, gunakan nama network yang **sudah terhubung** ke container Nginx. Anda dapat melihatnya tanpa mengubah konfigurasi:

```bash
docker inspect NAMA_CONTAINER_NGINX --format '{{json .NetworkSettings.Networks}}'
```

Jika Nginx berjalan langsung di host, kosongkan prompt network. Verifikasi fingerprint host SSH menggunakan console VPS sebelum menerima koneksi pertama; fingerprint yang dipercaya disimpan untuk workflow berikutnya.

Skrip akan:

1. Membuat atau menggunakan environment `production` yang hanya mengizinkan branch `main`, tanpa menambahkan proses approval baru.
2. Membuat SSH key Ed25519 khusus deploy di komputer Anda, di luar repository.
3. Memasang public key pada akun **`portfolio-deploy`**, dengan opsi `restrict` untuk mematikan forwarding dan PTY.
4. Menyiapkan **`/opt/diyatmoko-portfolio`**, terpisah dari stack aplikasi lain.
5. Mengisi GitHub Secrets dan Variables secara otomatis melalui GitHub CLI.

Private key dikirim langsung ke GitHub sebagai secret. Anda tidak perlu menyalin key ke chat atau mengedit YAML. Akun deploy masuk grup Docker; akses ini memiliki kemampuan setara root melalui Docker, sehingga key dibuat khusus untuk repository ini. Akun admin tidak digunakan untuk deployment rutin.

### Kompatibilitas dengan deployment ai.mesthi.com

Workflow referensi [`arumora-id/ai.mesthi.com/.github/workflows/deploy-production.yml`](https://github.com/arumora-id/ai.mesthi.com/blob/main/.github/workflows/deploy-production.yml) menggunakan build di GitHub, SSH dengan host key yang dipercaya, upload ke VPS, aktivasi rilis, dan pemeriksaan identitas `release.json`. Run [`37038630173`](https://github.com/arumora-id/ai.mesthi.com/actions/runs/37038630173) tercatat sukses pada 3 Oktober 2026 (WIB).

Portofolio mengikuti alur GitHub → SSH → VPS tersebut. Paket rilis portofolio berupa image runtime yang membawa static HTML dan konfigurasi CSP hasil build bersama-sama. Image baru menyertakan `/release.json` dengan commit SHA, repository, dan release ID; pemeriksaan VPS menolak rilis yang identitasnya berbeda meskipun server merespons HTTP 200.

Selain nama secret yang dibuat setup di bawah, workflow menerima kontrak secret AI: **`VPS_SSH_KEY_B64`** (private key base64), **`VPS_HOST_KEY`** (known-hosts entry), **`VPS_HOST`**, **`VPS_USER`**, dan opsional **`VPS_PORT`**. Jika format lama dan format AI sama-sama tersedia, private key plaintext dan `VPS_KNOWN_HOSTS` mendapat prioritas. Port dari secret mendapat prioritas atas variable.

Secret environment pada repository AI tidak otomatis tersedia di repository portofolio. Konfigurasikan environment `production` pada repository tujuan. Nama yang kompatibel tidak memindahkan kredensial atau mengubah izin VPS: `VPS_USER` tetap harus memiliki akses ke Docker serta direktori `/opt/diyatmoko-portfolio` yang disiapkan pada langkah setup. Jangan kirim private key atau token melalui chat.

| Konfigurasi     | Lokasi                          | Isi                                  |
| --------------- | ------------------------------- | ------------------------------------ |
| VPS_HOST        | Secret environment `production` | IP atau hostname SSH VPS             |
| VPS_USER        | Secret environment `production` | `portfolio-deploy`                   |
| VPS_SSH_KEY     | Secret environment `production` | Private key khusus workflow          |
| VPS_KNOWN_HOSTS | Secret environment `production` | Host key SSH yang sudah diverifikasi |
| VPS_PORT        | Repository Actions variable     | Port SSH, default `22`               |
| SITE_URL        | Repository Actions variable     | Origin HTTPS untuk canonical/SEO     |
| VPS_AUTO_DEPLOY | Repository Actions variable     | Opsional: `true` untuk push ke main  |

Jika environment `production` sudah memiliki kebijakan berbeda, skrip berhenti sebelum memasang key VPS atau menyimpan secret, dan mempertahankan pengaturannya. Batasi deployment branches ke `main`, lalu jalankan ulang. Required reviewers yang sudah dipasang pengguna tetap berlaku.

Setup ulang menggunakan key dan konfigurasi VPS yang sudah ada. Port/network efektif tersimpan dalam `/opt/diyatmoko-portfolio/config`; mengubah prompt pada setup ulang tidak menimpa konfigurasi live tersebut.

## 3. Jalankan deploy pertama

Buka **repository → Actions → Portfolio CI & VPS → Run workflow**:

- Branch: **main**.
- Operation: **deploy**.

Workflow menjalankan format, lint, tes pemulihan deploy, build/prerender, audit dependency, tes browser, dan tes container. Hanya image dari run yang lulus pemeriksaan tersebut yang dikirim ke VPS. Image diberi tag unik berdasarkan commit, run ID, dan attempt; menjalankan ulang commit yang sama tidak menimpa image rollback.

Anda juga dapat menjalankannya dari CLI:

```bash
gh workflow run ci.yml --repo diyatmoko/diyatmoko.my.id --ref main -f operation=deploy
```

Deploy ditolak jika `main` sudah berubah ketika verifikasi selesai. Jalankan workflow untuk commit `main` terbaru. Pilihan **verify** menjalankan pemeriksaan tanpa mengakses VPS.

## 4. Hubungkan domain dan HTTPS sekali

Image pertama dapat dideploy sebelum domain diarahkan. Workflow memverifikasi HTTP lokal pada VPS; DNS, sertifikat, dan reverse proxy publik perlu dikonfigurasi sekali melalui stack Nginx/ACME Anda yang sudah ada.

Untuk stack Nginx publik **di Docker**, jalankan helper berikut di VPS setelah job deploy berhasil:

```bash
git pull --ff-only origin main
sudo python3 scripts/setup-domain.py
```

Helper membaca network, port, dan identitas **rilis aktif** dari deployment VPS. Ia menemukan bind mounts konfigurasi Nginx, webroot ACME, dan sertifikat dari container **`nginx`**. Ia membutuhkan Python 3, Docker, curl, OpenSSL, dan systemd pada VPS; GitHub credentials tidak digunakan dalam langkah domain ini.

Urutannya: validasi upstream portfolio → virtual host HTTP khusus → uji HTTP dan challenge ACME → Certbot webroot → validasi sertifikat → virtual host HTTPS → uji identitas rilis melalui origin dan DNS publik → timer renewal dua kali sehari. Certbot memakai image resmi `certbot/certbot:v5.8.0` yang diverifikasi di CI. Jika akun ACME belum tersedia, isi email dan persetujuan yang diminta Certbot secara interaktif; helper tidak menerima Terms of Service atas nama Anda.

Sebelumnya, arahkan DNS **A `@`** ke VPS dan pastikan record **AAAA**, jika ada, juga mengarah ke server yang benar. HTTP port 80 harus dapat diakses untuk validasi ACME. Jika DNS/proxy/CDN masih mengarahkan domain ke layanan lain, perbaiki routing itu sebelum meminta sertifikat.

File baru bernama **`diyatmoko-portfolio.conf`**, tanpa menjadikannya default server. Helper menolak file yang tidak dikelolanya dan virtual host lain yang sudah mendeklarasikan domain yang sama. Ia menguji seluruh konfigurasi sebelum reload dan mengembalikan konfigurasi file portfolio sebelumnya jika validasi atau uji routing lokal gagal. Jika sertifikat gagal diterbitkan, routing HTTP yang sudah lolos pemeriksaan tetap tersedia untuk diperbaiki/dicoba ulang. Menjalankan setup ulang pada konfigurasi HTTPS yang sudah dikelola tidak menurunkannya kembali ke HTTP.

Renewal dibatasi ke sertifikat **`diyatmoko.my.id`**, dengan timer **`diyatmoko-portfolio-cert-renew.timer`** dan helper milik root di **`/usr/local/lib/diyatmoko-portfolio`**. Periksa status dan log:

```bash
sudo systemctl status diyatmoko-portfolio-cert-renew.timer
sudo journalctl -u diyatmoko-portfolio-cert-renew.service --no-pager -n 30
```

Untuk konfigurasi manual, contoh virtual host **`deploy/nginx-vps.conf.example`** tetap tersedia; siapkan sertifikat valid terlebih dahulu sebelum memasang blok TLS dari contoh tersebut.

Upstream contoh memakai **`diyatmoko-portfolio:8080`** dan resolver Docker **`127.0.0.11`**. Resolver diperlukan agar Nginx mengikuti alamat container baru setelah deployment, tanpa reload Nginx pada setiap rilis.

Untuk Nginx **di host**, gunakan upstream **`http://127.0.0.1:18080`** atau port yang Anda pilih; resolver Docker tidak digunakan.

Uji konfigurasi Nginx sebelum reload, pertahankan virtual host lain, arahkan DNS domain ke VPS, dan pastikan HTTPS berhasil. Setelah itu deployment rutin hanya mengganti container portfolio. Verifikasi publik:

```bash
curl --fail --head https://diyatmoko.my.id/
curl --fail https://diyatmoko.my.id/health.txt
curl --fail https://diyatmoko.my.id/release.json
```

Health check lokal tidak membuktikan DNS/TLS publik sudah benar. Periksa tampilan desktop/mobile, bahasa EN/ID, dan dialog project pada domain live setelah setup awal.

## 5. Aktifkan deploy otomatis jika diinginkan

Setelah deploy pertama dan domain berhasil, aktifkan sekali:

```bash
gh variable set VPS_AUTO_DEPLOY --repo diyatmoko/diyatmoko.my.id --body true
```

Berikutnya **push/merge ke `main` → semua pemeriksaan lulus → deploy otomatis**. Default-nya deploy tetap manual. Untuk kembali ke mode manual:

```bash
gh variable set VPS_AUTO_DEPLOY --repo diyatmoko/diyatmoko.my.id --body false
```

## Rollback dan penanganan kegagalan

Pilih **operation: rollback** pada Run workflow, atau jalankan:

```bash
gh workflow run ci.yml --repo diyatmoko/diyatmoko.my.id --ref main -f operation=rollback
```

Rollback memakai image dan konfigurasi lengkap dari **rilis sukses sebelumnya**, tanpa build ulang. Rilis saat ini menjadi predecessor sehingga pilihan rollback dapat membalikkan operasi tersebut. Rollback pertama baru tersedia setelah setidaknya dua deployment berhasil.

- Upload diverifikasi dengan SHA-256 sebelum image dimuat. Commit pada image harus cocok dengan release ID.
- Compose menunggu status sehat, lalu homepage dan `/health.txt` diuji dari VPS.
- Jika penggantian container atau health check gagal, skrip mengembalikan rilis sebelumnya dan job tetap gagal agar terlihat di Actions. Jika deploy pertama gagal, hanya service portfolio yang dibersihkan.
- Jika pemulihan juga gagal, workflow melaporkannya dan mempertahankan journal untuk pemeriksaan/recovery pada pemanggilan berikutnya.
- State rilis ditulis melalui rename atomik. Deployment yang terputus sebelum commit state dipulihkan pada pemanggilan berikutnya.
- GitHub concurrency dan lock di VPS mencegah dua rollout bersamaan.
- Image current dan previous dipertahankan. Pembersihan hanya menargetkan tag portfolio lama, tanpa `docker system prune` atau perubahan pada service lain.

Penggantian container tunggal dapat menyebabkan jeda singkat; konfigurasi ini tidak menjanjikan zero downtime. Rollback aplikasi juga tidak mengganti pengaturan DNS/TLS atau virtual host publik.

Untuk rollback darurat langsung di VPS sebagai akun deploy:

```bash
bash /opt/diyatmoko-portfolio/bin/rollout.sh rollback
```

## Batas verifikasi saat penyerahan

Skrip rollout sudah dijalankan terhadap simulasi batas Docker/HTTP untuk menguji kondisi sukses, kegagalan, dan rollback. Tes ini tidak menggantikan container sungguhan. Docker dan VPS tidak tersedia pada lingkungan authoring; job container dan koneksi SSH nyata baru diuji saat workflow dijalankan pada repository/VPS Anda.

Referensi resmi: [GitHub workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), [deployment environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments), [GitHub CLI secrets](https://cli.github.com/manual/gh_secret_set), [Docker Compose up](https://docs.docker.com/reference/cli/docker/compose/up/), dan [Nginx proxy/resolver](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass).
