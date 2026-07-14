# MID-SSD-Web-Sekolah-Kelompok2

**Web Sekolah Terintegrasi Berbasis Scalable System Design**

Mata Kuliah: RPL-A Scalable System Design

---

## Nama Anggota Kelompok

| No | Nama | NIM | Peran |
|----|------|-----|-------|
| 1 | Ashabul Kahfi | - | System Analyst / Project Lead |
| 2 | Marhepi Rahmadani | - | System Architect |
| 3 | Muh. Eka Andri Setiawan | - | Database Designer |
| 4 | Afra Muawiyah | - | UI/UX & Documentation Designer |
| 5 | Alyah Saputri Bakri | - | Security & Access Control Designer |

---

## Pembagian Tugas

| Peran | Tugas | PIC |
|-------|-------|-----|
| System Analyst | Latar belakang, tujuan, analisis kebutuhan, alur sistem, use case | Ashabul Kahfi |
| System Architect | Arsitektur sistem, pembagian vCPU, load balancing, API integration, scaling strategy, monitoring, logging | Marhepi Rahmadani |
| Database Designer | Rancangan database, ERD, tabel, relasi, indeks, konsistensi data | Muh. Eka Andri Setiawan |
| UI/UX & Documentation | Rancangan tampilan, diagram pendukung, dokumentasi, laporan | Afra Muawiyah |
| Security & Access Control | Role pengguna, pembatasan akses, audit log, autentikasi, mitigasi risiko | Alyah Saputri Bakri |

---

## Daftar Modul

1. **Modul Manajemen Pengguna** - Login, logout, manajemen akun & role, audit log
2. **Modul Data Kesiswaan** - CRUD siswa, kelola kelas, wali kelas, status siswa, import/export
3. **Modul Jurnal Mengajar** - Input jurnal, pilih kelas/mapel, riwayat, rekap
4. **Modul Bimbingan Konseling (BK)** - Catatan konseling, kasus, pelanggaran, prestasi

---

## Teknologi yang Digunakan

| Komponen | Teknologi |
|----------|-----------|
| Frontend | HTML, CSS, JavaScript, Bootstrap 5, Bootstrap Icons |
| Backend | Node.js, Express.js |
| Database | MySQL |
| Template Engine | EJS |
| Session | express-session |
| Password | bcryptjs |
| Tools | Git, GitHub, Draw.io, Visual Studio Code |

---

## Struktur Folder

```
MID-SSD-Web-Sekolah-Kelompok2/
├── database/
│   ├── schema.sql          # Struktur database
│   ├── seed.sql            # Data dummy (SQL)
│   └── seed.js             # Seeder dengan password hash
├── docs/
│   ├── arsitektur.png      # Diagram arsitektur sistem
│   ├── ERD.png             # Entity Relationship Diagram
│   └── use-case.png        # Use case diagram
├── src/
│   ├── app.js              # Entry point
│   ├── config/
│   │   └── database.js     # Koneksi MySQL
│   ├── middleware/
│   │   ├── auth.js         # Middleware autentikasi
│   │   └── rbac.js         # Middleware role-based access
│   ├── modules/
│   │   ├── auth/           # Login & logout
│   │   ├── dashboard/      # Dashboard utama
│   │   ├── users/          # Manajemen pengguna
│   │   ├── kesiswaan/      # Data kesiswaan
│   │   ├── jurnal/         # Jurnal mengajar
│   │   └── bk/             # Bimbingan konseling
│   ├── public/
│   │   ├── css/style.css
│   │   └── js/script.js
│   └── views/
│       ├── layouts/
│       ├── auth/
│       ├── dashboard/
│       ├── users/
│       ├── kesiswaan/
│       ├── jurnal/
│       └── bk/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## Rancangan Arsitektur Sistem

![Arsitektur Sistem](docs/arsitektur.png)

### Deskripsi Arsitektur:
- **Modular Monolith Architecture**: Sistem dibagi menjadi modul-modul terpisah (auth, users, kesiswaan, jurnal, bk) tetapi berjalan dalam satu aplikasi.
- **Centralized Database**: Semua modul menggunakan satu database MySQL.
- **Middleware-based Routing**: Setiap modul memiliki router sendiri dengan middleware autentikasi dan RBAC.
- **Session-based Authentication**: Menggunakan express-session untuk manajemen login.

### Pembagian vCPU (Server Virtual):

| vCPU | Layanan | Alasan |
|------|---------|--------|
| vCPU 1 | Web Server (Aplikasi Utama) | Menangani semua request HTTP |
| vCPU 2 | Database Server (MySQL) | Penyimpanan data terpusat |
| vCPU 3 | Modul Jurnal Mengajar | Dipisahkan karena akses harian tinggi |
| vCPU 4 | Modul BK & Kesiswaan | Data sensitif dipisahkan |
| vCPU 5 | Load Balancer & Monitoring | Distribusi beban dan pemantauan |
| vCPU 6 | Backup & Caching (Redis) | Performa dan keamanan data |

---

## Rancangan Database

Database: `db_sekolah_ssd`

### Minimal 15 Tabel:

1. **roles** - Role pengguna (admin, guru, bk, siswa, dll)
2. **users** - Data akun pengguna
3. **academic_years** - Tahun ajaran
4. **semesters** - Semester
5. **teachers** - Data guru
6. **classes** - Data kelas
7. **subjects** - Mata pelajaran
8. **students** - Data siswa
9. **schedules** - Jadwal pelajaran
10. **teaching_journals** - Jurnal mengajar
11. **bk_cases** - Kasus BK
12. **bk_counseling_notes** - Catatan konseling
13. **student_violations** - Pelanggaran siswa
14. **student_achievements** - Prestasi siswa
15. **activity_logs** - Log aktivitas

### Relasi Utama:
- `users.role_id` → `roles.id`
- `students.class_id` → `classes.id`
- `teachers.user_id` → `users.id`
- `teaching_journals.teacher_id` → `teachers.id`
- `bk_cases.student_id` → `students.id`
- Semua modul berbagi data siswa, guru, kelas, dan mata pelajaran dari tabel yang sama.

### ERD:
![ERD](docs/ERD.png)

---

## Cara Instalasi

### Prasyarat
- Node.js v16+
- MySQL 5.7+ / MariaDB 10+
- npm

### Langkah-langkah

1. **Clone repository**
   ```bash
   git clone https://github.com/username/MID-SSD-Web-Sekolah-Kelompok2.git
   cd MID-SSD-Web-Sekolah-Kelompok2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Konfigurasi database**
   - Copy `.env.example` menjadi `.env`
   - Sesuaikan konfigurasi database di file `.env`

4. **Buat database dan seed data**
   ```bash
   node database/seed.js
   ```
   Atau manual:
   ```sql
   mysql -u root -p < database/schema.sql
   mysql -u root -p < database/seed.sql
   ```

5. **Jalankan aplikasi**
   ```bash
   npm start
   ```

6. **Akses di browser**
   ```
   http://localhost:3000
   ```

---

## Cara Menjalankan Aplikasi

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

Server akan berjalan di `http://localhost:3000`.

---

## Akun Login Demo

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | password123 |
| Kepala Sekolah | kepsek | password123 |
| Guru | guru1 | password123 |
| Guru BK | guru_bk | password123 |
| Wali Kelas | walas1 | password123 |
| Siswa | siswa1 | password123 |
| Orang Tua | ortu1 | password123 |

---

## Link Video Presentasi YouTube

(Link YouTube akan diisi setelah video diupload)

---

## Penjelasan Unsur Scalable System Design

### 1. Modular Architecture
Sistem dibagi menjadi modul-modul terpisah (auth, users, kesiswaan, jurnal, bk). Setiap modul memiliki router dan view sendiri, sehingga mudah dikembangkan tanpa mengganggu modul lain.

### 2. Centralized Database
Semua modul menggunakan satu database MySQL (`db_sekolah_ssd`). Data siswa cukup disimpan sekali dan dapat digunakan oleh semua modul.

### 3. Load Balancing
Rancangan vCPU memisahkan layanan ke server virtual berbeda. Load balancer (vCPU 5) mendistribusikan request pengguna ke server yang tepat.

### 4. Horizontal Scaling
Jika modul Jurnal Mengajar mengalami lonjakan akses, dapat ditambah instance server baru tanpa mengganggu modul lain.

### 5. Vertical Scaling
Server database dapat ditingkatkan kapasitas RAM/CPU jika data semakin besar.

### 6. API-Based Integration
Meskipun saat ini modular monolith, setiap modul dirancang dengan interface yang jelas sehingga dapat dipisah menjadi service terpisah di masa depan.

### 7. Role-Based Access Control (RBAC)
Middleware `rbac.js` membatasi akses berdasarkan role pengguna. Hanya pengguna dengan role tertentu yang dapat mengakses modul tertentu.

### 8. Database Optimization
- Index pada kolom yang sering di-query (student_id, teacher_id, class_id, subject_id)
- Relasi foreign key yang jelas
- Query yang efisien

### 9. Caching
Rencana implementasi Redis untuk cache data yang sering diakses (daftar kelas, guru, mapel, jadwal).

### 10. Monitoring & Logging
Tabel `activity_logs` mencatat semua aktivitas pengguna. Dashboard menampilkan aktivitas terbaru untuk monitoring.

---

## Lisensi

Proyek ini dibuat untuk keperluan Ujian MID Semester mata kuliah Scalable System Design.
