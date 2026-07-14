// Script untuk generate password hash dan seed database
// Jalankan: node database/seed.js

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seed() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true
    });

    console.log('Memulai seeding database...');

    // 1. Jalankan schema.sql
    const fs = require('fs');
    const path = require('path');
    const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await connection.query(schemaSQL);
    console.log('Schema berhasil dibuat.');

    // 2. Seed data manually dengan password hash
    await connection.query('USE db_sekolah_ssd');

    // Roles
    const roles = [
        ['admin', 'Administrator sistem'],
        ['kepala_sekolah', 'Kepala Sekolah'],
        ['guru', 'Guru pengajar'],
        ['guru_bk', 'Guru Bimbingan Konseling'],
        ['wali_kelas', 'Wali Kelas'],
        ['siswa', 'Siswa'],
        ['orang_tua', 'Orang Tua/Wali']
    ];
    for (const r of roles) {
        await connection.query('INSERT IGNORE INTO roles (name, description) VALUES (?, ?)', r);
    }
    console.log('Roles created.');

    // Academic Years
    await connection.query("INSERT IGNORE INTO academic_years (year_name, is_active) VALUES ('2025/2026', 1), ('2026/2027', 0)");

    // Semesters
    await connection.query("INSERT IGNORE INTO semesters (academic_year_id, semester_name, is_active) VALUES (1, 'Ganjil', 1), (1, 'Genap', 0)");

    // Users with hashed passwords (password: password123)
    const password = await bcrypt.hash('password123', 10);
    console.log('Generated hash for password123:', password);

    const users = [
        ['admin', 'admin@sekolah.test', password, 'Admin Sekolah', 1],
        ['kepsek', 'kepsek@sekolah.test', password, 'Dr. H. Ahmad Syah, M.Pd', 2],
        ['guru1', 'guru1@sekolah.test', password, 'Siti Rahmawati, S.Pd', 3],
        ['guru2', 'guru2@sekolah.test', password, 'Bambang Suprapto, S.Pd', 3],
        ['guru3', 'guru3@sekolah.test', password, 'Dewi Sartika, S.Pd', 3],
        ['guru_bk', 'bk@sekolah.test', password, 'Dian Permata Sari, S.Psi', 4],
        ['walas1', 'walas1@sekolah.test', password, 'Rina Marlina, S.Pd', 5],
        ['siswa1', 'siswa1@sekolah.test', password, 'Ahmad Fauzi', 6],
        ['siswa2', 'siswa2@sekolah.test', password, 'Nurul Hidayah', 6],
        ['siswa3', 'siswa3@sekolah.test', password, 'Rizky Pratama', 6],
        ['ortu1', 'ortu1@sekolah.test', password, 'H. Abdullah', 7]
    ];
    for (const u of users) {
        await connection.query(
            'INSERT IGNORE INTO users (username, email, password, full_name, role_id) VALUES (?, ?, ?, ?, ?)',
            u
        );
    }
    console.log('Users created.');

    // Teachers
    const teachers = [
        [3, '198703142010011001', 'Siti Rahmawati, S.Pd', '081234567891', 'Jl. Merdeka No.10'],
        [4, '198505122009011002', 'Bambang Suprapto, S.Pd', '081234567892', 'Jl. Sudirman No.20'],
        [5, '199001152011012003', 'Dewi Sartika, S.Pd', '081234567893', 'Jl. Ahmad Yani No.30'],
        [6, '198812202010021004', 'Dian Permata Sari, S.Psi', '081234567894', 'Jl. Diponegoro No.40'],
        [7, '198606252009031005', 'Rina Marlina, S.Pd', '081234567895', 'Jl. Pahlawan No.50']
    ];
    for (const t of teachers) {
        await connection.query(
            'INSERT IGNORE INTO teachers (user_id, nip, full_name, phone, address) VALUES (?, ?, ?, ?, ?)',
            t
        );
    }
    console.log('Teachers created.');

    // Classes
    await connection.query("INSERT IGNORE INTO classes (class_name, grade_level, homeroom_teacher_id) VALUES ('X-A', '10', 5), ('X-B', '10', NULL), ('XI-A', '11', 1), ('XI-B', '11', NULL), ('XII-A', '12', 2), ('XII-B', '12', NULL)");

    // Subjects
    await connection.query("INSERT IGNORE INTO subjects (subject_name, subject_code) VALUES ('Matematika', 'MTK-01'), ('Bahasa Indonesia', 'BIN-01'), ('Bahasa Inggris', 'BIG-01'), ('Fisika', 'FIS-01'), ('Kimia', 'KIM-01'), ('Biologi', 'BIO-01'), ('Sejarah', 'SJR-01'), ('Pendidikan Agama Islam', 'PAI-01'), ('PKN', 'PKN-01'), ('Olahraga', 'OLR-01')");

    // Students
    const students = [
        ['2025001', 'Ahmad Fauzi', 'L', 'Makassar', '2008-05-12', 'Jl. Veteran No.5', '081234567101', 1, 'aktif'],
        ['2025002', 'Nurul Hidayah', 'P', 'Makassar', '2008-08-20', 'Jl. Veteran No.10', '081234567102', 1, 'aktif'],
        ['2025003', 'Rizky Pratama', 'L', 'Gowa', '2008-03-15', 'Jl. Poros No.8', '081234567103', 2, 'aktif'],
        ['2025004', 'Aisyah Putri', 'P', 'Makassar', '2007-11-30', 'Jl. BTP No.12', '081234567104', 3, 'aktif'],
        ['2025005', 'Muhammad Arif', 'L', 'Maros', '2007-07-22', 'Jl. Maros No.3', '081234567105', 3, 'aktif'],
        ['2025006', 'Siti Nurhaliza', 'P', 'Makassar', '2007-01-10', 'Jl. Antang No.7', '081234567106', 4, 'aktif'],
        ['2025007', 'Fajar Ramadan', 'L', 'Makassar', '2006-09-05', 'Jl. Tamalanrea No.15', '081234567107', 5, 'aktif'],
        ['2025008', 'Indah Permata', 'P', 'Gowa', '2006-04-18', 'Jl. Sungguminasa No.2', '081234567108', 5, 'aktif']
    ];
    for (const s of students) {
        await connection.query(
            'INSERT IGNORE INTO students (nis, full_name, gender, birth_place, birth_date, address, phone, class_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            s
        );
    }
    console.log('Students created.');

    // Schedules
    await connection.query("INSERT IGNORE INTO schedules (class_id, subject_id, teacher_id, day_of_week, start_time, end_time, semester_id) VALUES (1, 1, 1, 'Senin', '07:30:00', '09:00:00', 1), (1, 2, 2, 'Senin', '09:15:00', '10:45:00', 1), (1, 3, 3, 'Selasa', '07:30:00', '09:00:00', 1), (1, 4, 1, 'Rabu', '07:30:00', '09:00:00', 1), (3, 1, 1, 'Senin', '10:45:00', '12:15:00', 1), (3, 5, 4, 'Kamis', '07:30:00', '09:00:00', 1), (5, 1, 1, 'Jumat', '07:30:00', '09:00:00', 1)");

    // Teaching Journals (bulk generate)
    const journalMaterials = {
        1: ['Persamaan Linear', 'Fungsi Kuadrat', 'Limit Fungsi', 'Turunan', 'Integral', 'Matriks', 'Logaritma', 'Trigonometri', 'Statistika', 'Peluang'],
        2: ['Teks Deskripsi', 'Teks Narasi', 'Teks Eksposisi', 'Cerpen', 'Puisi', 'Novel', 'Drama', 'Karya Ilmiah', 'Surat Resmi', 'Laporan'],
        3: ['Greetings', 'Tenses', 'Passive Voice', 'Report Text', 'Narrative Text', 'Descriptive Text', 'Procedure Text', 'Discussion Text', 'Grammar Review', 'Vocabulary'],
        4: ['Gerak Lurus', 'Hukum Newton', 'Usaha dan Energi', 'Listrik Dinamis', 'Gelombang', 'Optik', 'Termodinamika', 'Medan Magnet', 'Fisika Inti', 'Relativitas'],
        5: ['Hukum Dasar Kimia', 'Stoikiometri', 'Larutan Asam Basa', 'Termokimia', 'Laju Reaksi', 'Kesetimbangan Kimia', 'Kimia Organik', 'Koloid', 'Elektrokimia', 'Kimia Lingkungan'],
        6: ['Sel', 'Jaringan Tumbuhan', 'Sistem Peredaran Darah', 'Sistem Pernapasan', 'Ekologi', 'Genetika', 'Evolusi', 'Bioteknologi', 'Sistem Saraf', 'Hormon'],
        7: ['Kerajaan Hindu-Buddha', 'Kerajaan Islam', 'Kolonialisme', 'Pergerakan Nasional', 'Proklamasi', 'Orde Lama', 'Orde Baru', 'Reformasi', 'Perang Dingin', 'Sejarah Dunia'],
        8: ['Tauhid', 'Fiqih Ibadah', 'Al-Quran Hadits', 'Akhlak', 'Sejarah Islam', 'Muamalah', 'Pernikahan', 'Warisan', 'Dakwah', 'Tasawuf'],
        9: ['Pancasila', 'UUD 1945', 'Hak Asasi Manusia', 'Demokrasi', 'Sistem Pemerintahan', 'Bela Negara', 'Otonomi Daerah', 'Hukum', 'Globalisasi', 'Wawasan Nusantara'],
        10: ['Bola Besar', 'Bola Kecil', 'Atletik', 'Senam', 'Renang', 'Bela Diri', 'Kebugaran', 'Pencak Silat', 'Bulu Tangkis', 'Basket']
    };
    const methods = ['Ceramah interaktif', 'Diskusi kelompok', 'Praktik langsung', 'Tanya jawab', 'Studi kasus', 'Demonstrasi', 'Simulasi', 'Proyek', 'Presentasi', 'Eksperimen'];
    const notes = ['Siswa aktif berpartisipasi', 'Materi selesai tepat waktu', 'Dilanjutkan pertemuan berikutnya', 'Siswa antusias mengikuti', 'Ada beberapa siswa remedial', 'Pembelajaran efektif', 'Siswa mampu memahami materi', 'Perlu pengulangan minggu depan', 'Tugas rumah diberikan', 'Kuis diadakan di akhir sesi'];

    // Map teacher_id -> subjects they teach (based on schedules + additional)
    const teacherSubjects = {
        1: [1, 4],       // Siti Rahmawati -> Matematika, Fisika
        2: [2, 5],       // Bambang Suprapto -> B. Indonesia, Kimia
        3: [3, 10],      // Dewi Sartika -> B. Inggris, Olahraga
        4: [6, 8],       // Dian Permata -> Biologi, PAI
        5: [7, 9],       // Rina Marlina -> Sejarah, PKN
    };
    const teacherClasses = {
        1: [1, 3, 5],
        2: [1, 4, 6],
        3: [1, 3, 5],
        4: [2, 4],
        5: [1, 2, 5],
    };

    const journalValues = [];
    const startDate = new Date('2026-07-01');
    const endDate = new Date('2026-07-14');
    let journalId = 1;

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const day = d.getDay();
        if (day === 0 || day === 6) continue; // skip weekend
        const dateStr = d.toISOString().split('T')[0];

        for (let tId = 1; tId <= 5; tId++) {
            const subjects = teacherSubjects[tId] || [1];
            const classes = teacherClasses[tId] || [1];
            const subjId = subjects[(journalId + tId) % subjects.length];
            const clsId = classes[(journalId + 2) % classes.length];
            const matList = journalMaterials[subjId] || ['Materi Umum'];
            const material = matList[(journalId + clsId) % matList.length];
            const method = methods[(journalId + tId + clsId) % methods.length];
            const note = notes[(journalId + clsId + subjId) % notes.length];
            journalValues.push(`(${tId}, ${clsId}, ${subjId}, '${dateStr}', '${material}', '${method}', '${note}', 1)`);
            journalId++;
        }
    }

    if (journalValues.length > 0) {
        await connection.query('INSERT IGNORE INTO teaching_journals (teacher_id, class_id, subject_id, teaching_date, material, method, notes, semester_id) VALUES ' + journalValues.join(', '));
    }
    console.log('Teaching journals created (' + journalValues.length + ' entries).');

    // Attendances (seed some sample data)
    const attendances = [
        [1, 1, '2026-07-14', 'hadir', '', 1],
        [2, 1, '2026-07-14', 'hadir', '', 1],
        [3, 2, '2026-07-14', 'sakit', 'Demam', 1],
        [4, 3, '2026-07-14', 'hadir', '', 1],
        [5, 3, '2026-07-14', 'izin', 'Ada acara keluarga', 1],
        [6, 4, '2026-07-14', 'alpa', '', 1],
        [7, 5, '2026-07-14', 'hadir', '', 1],
        [8, 5, '2026-07-14', 'hadir', '', 1],
        [1, 1, '2026-07-13', 'hadir', '', 1],
        [2, 1, '2026-07-13', 'hadir', '', 1],
        [3, 2, '2026-07-13', 'hadir', '', 1],
        [4, 3, '2026-07-13', 'sakit', 'Flu', 1],
        [5, 3, '2026-07-13', 'hadir', '', 1],
        [6, 4, '2026-07-13', 'hadir', '', 1],
        [7, 5, '2026-07-13', 'izin', 'Keperluan keluarga', 1],
        [8, 5, '2026-07-13', 'hadir', '', 1]
    ];
    for (const a of attendances) {
        await connection.query(
            'INSERT IGNORE INTO attendances (student_id, class_id, attendance_date, status, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)',
            a
        );
    }
    console.log('Attendances created.');

    console.log('Seeding selesai!');
    console.log('Silakan jalankan aplikasi dengan: npm start');
    console.log('Login dengan: admin / password123');

    await connection.end();
}

seed().catch(err => {
    console.error('Error seeding:', err);
    process.exit(1);
});
