const express = require('express');
const router = express.Router();
const pool = require('../../config/database');
const { isAuthenticated } = require('../../middleware/auth');
const { allowRoles } = require('../../middleware/rbac');

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

module.exports = router;
