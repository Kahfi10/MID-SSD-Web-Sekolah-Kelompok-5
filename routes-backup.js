const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const fs = require('fs');
const path = require('path');
const pool = require('../../config/database');
const { isAuthenticated } = require('../../middleware/auth');
const { allowRoles } = require('../../middleware/rbac');

const upload = multer({ dest: path.join(__dirname, '../../public/uploads/') });

router.get('/', isAuthenticated, allowRoles('admin', 'kepala_sekolah', 'wali_kelas'), async (req, res) => {
    try {
        const [students] = await pool.query(
            `SELECT s.*, c.class_name, c.grade_level 
             FROM students s 
             LEFT JOIN classes c ON s.class_id = c.id 
             ORDER BY s.created_at DESC`
        );
        const [classes] = await pool.query('SELECT * FROM classes');
        res.render('kesiswaan/index', { title: 'Data Kesiswaan', students, classes });
    } catch (error) {
        console.error(error);
        req.flash('error', 'Gagal memuat data');
        res.redirect('/dashboard');
    }
});

router.post('/store', isAuthenticated, allowRoles('admin'), async (req, res) => {
    try {
        const { nis, full_name, gender, birth_place, birth_date, address, phone, class_id } = req.body;

        // Check if NIS already exists
        const [existing] = await pool.query('SELECT id FROM students WHERE nis = ?', [nis]);
        if (existing.length > 0) {
            req.flash('error', 'NIS sudah terdaftar');
            return res.redirect('/kesiswaan');
        }

        await pool.query(
            'INSERT INTO students (nis, full_name, gender, birth_place, birth_date, address, phone, class_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [nis, full_name, gender, birth_place, birth_date || null, address, phone, class_id || null]
        );

        await pool.query(
            'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
            [req.session.user.id, 'create_student', `Menambah siswa ${nis} - ${full_name}`, req.ip]
        );

        req.flash('success', 'Data siswa berhasil ditambahkan');
        res.redirect('/kesiswaan');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Gagal menambah data siswa');
        res.redirect('/kesiswaan');
    }
});

router.get('/edit/:id', isAuthenticated, allowRoles('admin'), async (req, res) => {
    try {
        const [students] = await pool.query('SELECT * FROM students WHERE id = ?', [req.params.id]);
        const [classes] = await pool.query('SELECT * FROM classes');
        if (students.length === 0) {
            req.flash('error', 'Siswa tidak ditemukan');
            return res.redirect('/kesiswaan');
        }
        res.render('kesiswaan/edit', { title: 'Edit Siswa', student: students[0], classes });
    } catch (error) {
        console.error(error);
        req.flash('error', 'Gagal memuat data');
        res.redirect('/kesiswaan');
    }
});

router.post('/update/:id', isAuthenticated, allowRoles('admin'), async (req, res) => {
    try {
        const { full_name, gender, birth_place, birth_date, address, phone, class_id, status } = req.body;
        await pool.query(
            'UPDATE students SET full_name=?, gender=?, birth_place=?, birth_date=?, address=?, phone=?, class_id=?, status=? WHERE id=?',
            [full_name, gender, birth_place, birth_date || null, address, phone, class_id || null, status, req.params.id]
        );

        await pool.query(
            'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
            [req.session.user.id, 'update_student', `Mengubah data siswa ID ${req.params.id}`, req.ip]
        );

        req.flash('success', 'Data siswa berhasil diupdate');
        res.redirect('/kesiswaan');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Gagal mengupdate data');
        res.redirect('/kesiswaan');
    }
});

router.post('/delete/:id', isAuthenticated, allowRoles('admin'), async (req, res) => {
    try {
        await pool.query('DELETE FROM students WHERE id = ?', [req.params.id]);
        req.flash('success', 'Data siswa berhasil dihapus');
        res.redirect('/kesiswaan');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Gagal menghapus data');
        res.redirect('/kesiswaan');
    }
});

// Kelola Wali Kelas
router.get('/kelas', isAuthenticated, allowRoles('admin'), async (req, res) => {
    try {
        const [classes] = await pool.query(
            `SELECT c.*, t.full_name as homeroom_teacher_name
             FROM classes c
             LEFT JOIN teachers t ON c.homeroom_teacher_id = t.id
             ORDER BY c.grade_level, c.class_name`
        );
        const [teachers] = await pool.query('SELECT * FROM teachers ORDER BY full_name');
        res.render('kesiswaan/kelas', { title: 'Kelola Wali Kelas', classes, teachers });
    } catch (error) {
        console.error(error);
        req.flash('error', 'Gagal memuat data');
        res.redirect('/kesiswaan');
    }
});

router.post('/kelas/update/:id', isAuthenticated, allowRoles('admin'), async (req, res) => {
    try {
        const { homeroom_teacher_id } = req.body;
        await pool.query('UPDATE classes SET homeroom_teacher_id = ? WHERE id = ?', [
            homeroom_teacher_id || null, req.params.id
        ]);

        await pool.query(
            'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
            [req.session.user.id, 'update_walikelas', `Mengupdate wali kelas ID ${req.params.id}`, req.ip]
        );

        req.flash('success', 'Wali kelas berhasil diupdate');
        res.redirect('/kesiswaan/kelas');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Gagal mengupdate wali kelas');
        res.redirect('/kesiswaan/kelas');
    }
});

// Import Siswa CSV
router.post('/import', isAuthenticated, allowRoles('admin'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            req.flash('error', 'Pilih file CSV terlebih dahulu');
            return res.redirect('/kesiswaan');
        }

        const content = fs.readFileSync(req.file.path, 'utf8');
        const records = parse(content, {
            columns: true,
            skip_empty_lines: true,
            delimiter: [',', ';']
        });

        let success = 0;
        let failed = 0;

        for (const row of records) {
            try {
                const [existing] = await pool.query('SELECT id FROM students WHERE nis = ?', [row.nis]);
                if (existing.length > 0) { failed++; continue; }

                await pool.query(
                    `INSERT INTO students (nis, full_name, gender, birth_place, birth_date, address, phone, class_id, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'aktif')`,
                    [
                        row.nis, row.full_name, row.gender || 'L',
                        row.birth_place || null, row.birth_date || null,
                        row.address || null, row.phone || null,
                        row.class_id || null
                    ]
                );
                success++;
            } catch { failed++; }
        }

        fs.unlinkSync(req.file.path);

        await pool.query(
            'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
            [req.session.user.id, 'import_students', `Import ${success} siswa dari CSV (${failed} gagal)`, req.ip]
        );

        req.flash('success', `Import selesai: ${success} berhasil, ${failed} gagal`);
        res.redirect('/kesiswaan');

    } catch (error) {
        console.error(error);
        if (req.file) fs.unlinkSync(req.file.path);
        req.flash('error', 'Gagal import. Pastikan format CSV benar');
        res.redirect('/kesiswaan');
    }
});

// Export Siswa CSV
router.get('/export', isAuthenticated, allowRoles('admin', 'kepala_sekolah'), async (req, res) => {
    try {
        const [students] = await pool.query(
            `SELECT s.nis, s.full_name, s.gender, s.birth_place, s.birth_date,
                    s.address, s.phone, c.id as class_id, s.status
             FROM students s
             LEFT JOIN classes c ON s.class_id = c.id
             ORDER BY s.nis`
        );

        const header = 'nis,full_name,gender,birth_place,birth_date,address,phone,class_id,status';
        const rows = students.map(s =>
            `"${s.nis}","${s.full_name}","${s.gender}","${s.birth_place || ''}","${s.birth_date || ''}","${(s.address || '').replace(/"/g, '""')}","${s.phone || ''}","${s.class_id || ''}","${s.status}"`
        ).join('\n');

        const csv = '\uFEFF' + header + '\n' + rows;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="data-siswa-export.csv"');
        res.send(csv);

        await pool.query(
            'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
            [req.session.user.id, 'export_students', `Export ${students.length} siswa ke CSV`, req.ip]
        );

    } catch (error) {
        console.error(error);
        req.flash('error', 'Gagal export data');
        res.redirect('/kesiswaan');
    }
});

module.exports = router;
