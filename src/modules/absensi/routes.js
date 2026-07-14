const express = require('express');
const router = express.Router();
const pool = require('../../config/database');
const { isAuthenticated } = require('../../middleware/auth');
const { allowRoles } = require('../../middleware/rbac');

// Daftar Absensi
router.get('/', isAuthenticated, allowRoles('admin', 'kepala_sekolah', 'guru', 'wali_kelas'), async (req, res) => {
    try {
        const { class_id, start_date, end_date } = req.query;
        let params = [];
        let conditions = [];

        if (class_id) { conditions.push('a.class_id = ?'); params.push(class_id); }
        if (start_date) { conditions.push('a.attendance_date >= ?'); params.push(start_date); }
        if (end_date) { conditions.push('a.attendance_date <= ?'); params.push(end_date); }
        const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        const [attendances] = await pool.query(
            `SELECT a.*, s.full_name as student_name, s.nis, c.class_name,
                    u.full_name as input_by
             FROM attendances a
             JOIN students s ON a.student_id = s.id
             JOIN classes c ON a.class_id = c.id
             JOIN users u ON a.created_by = u.id
             ${where}
             ORDER BY a.attendance_date DESC, c.class_name, s.full_name`, params
        );

        const [classes] = await pool.query('SELECT * FROM classes ORDER BY grade_level, class_name');
        const [summary] = await pool.query(
            `SELECT a.attendance_date, a.class_id, c.class_name,
                    COUNT(*) as total,
                    SUM(CASE WHEN a.status='hadir' THEN 1 ELSE 0 END) as hadir,
                    SUM(CASE WHEN a.status='sakit' THEN 1 ELSE 0 END) as sakit,
                    SUM(CASE WHEN a.status='izin' THEN 1 ELSE 0 END) as izin,
                    SUM(CASE WHEN a.status='alpa' THEN 1 ELSE 0 END) as alpa
             FROM attendances a
             JOIN classes c ON a.class_id = c.id
             GROUP BY a.attendance_date, a.class_id, c.class_name
             ORDER BY a.attendance_date DESC
             LIMIT 20`
        );

        res.render('absensi/index', {
            title: 'Absensi Siswa',
            attendances,
            classes,
            summary,
            filters: { class_id, start_date, end_date }
        });
    } catch (error) {
        console.error(error);
        req.flash('error', 'Gagal memuat data absensi');
        res.redirect('/dashboard');
    }
});

// Form input absensi per kelas
router.get('/create', isAuthenticated, allowRoles('admin', 'guru', 'wali_kelas'), async (req, res) => {
    try {
        const { class_id, attendance_date } = req.query;
        const [classes] = await pool.query('SELECT * FROM classes ORDER BY grade_level, class_name');

        if (class_id && attendance_date) {
            const [students] = await pool.query(
                'SELECT id, nis, full_name FROM students WHERE class_id = ? AND status = ? ORDER BY full_name',
                [class_id, 'aktif']
            );
            const [existing] = await pool.query(
                'SELECT student_id, status, notes FROM attendances WHERE class_id = ? AND attendance_date = ?',
                [class_id, attendance_date]
            );
            const existingMap = {};
            existing.forEach(e => { existingMap[e.student_id] = e; });

            res.render('absensi/create', {
                title: 'Input Absensi',
                classes,
                students,
                existingMap,
                selectedClass: class_id,
                selectedDate: attendance_date
            });
        } else {
            res.render('absensi/create', {
                title: 'Input Absensi',
                classes,
                students: [],
                existingMap: {},
                selectedClass: '',
                selectedDate: ''
            });
        }
    } catch (error) {
        console.error(error);
        req.flash('error', 'Gagal memuat data');
        res.redirect('/absensi');
    }
});

// Simpan absensi
router.post('/store', isAuthenticated, allowRoles('admin', 'guru', 'wali_kelas'), async (req, res) => {
    try {
        const { class_id, attendance_date, students } = req.body;
        if (!class_id || !attendance_date || !students) {
            req.flash('error', 'Data tidak lengkap');
            return res.redirect('/absensi/create');
        }

        // Hapus data lama untuk kelas & tanggal ini, lalu insert ulang
        await pool.query('DELETE FROM attendances WHERE class_id = ? AND attendance_date = ?', [class_id, attendance_date]);

        const insertSQL = 'INSERT INTO attendances (student_id, class_id, attendance_date, status, notes, created_by) VALUES ?';
        const values = [];
        // students bisa berupa object (single) atau array
        const entries = Array.isArray(students) ? students : [students];
        entries.forEach(s => {
            values.push([s.id, class_id, attendance_date, s.status || 'hadir', s.notes || '', req.session.user.id]);
        });

        if (values.length > 0) {
            await pool.query(insertSQL, [values]);
        }

        await pool.query(
            'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
            [req.session.user.id, 'create_attendance', `Input absensi kelas ID ${class_id} tanggal ${attendance_date}`, req.ip]
        );

        req.flash('success', `Absensi tanggal ${attendance_date} berhasil disimpan`);
        res.redirect('/absensi');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Gagal menyimpan absensi');
        res.redirect('/absensi/create');
    }
});

// Hapus absensi
router.post('/delete/:id', isAuthenticated, allowRoles('admin'), async (req, res) => {
    try {
        await pool.query('DELETE FROM attendances WHERE id = ?', [req.params.id]);
        await pool.query(
            'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
            [req.session.user.id, 'delete_attendance', `Menghapus absensi ID ${req.params.id}`, req.ip]
        );
        req.flash('success', 'Absensi berhasil dihapus');
        res.redirect('/absensi');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Gagal menghapus absensi');
        res.redirect('/absensi');
    }
});

// Rekap Absensi
router.get('/rekap', isAuthenticated, allowRoles('admin', 'kepala_sekolah', 'wali_kelas'), async (req, res) => {
    try {
        const { class_id, start_date, end_date } = req.query;
        let params = [];
        let conditions = [];

        if (class_id) { conditions.push('s.class_id = ?'); params.push(class_id); }
        if (start_date) { conditions.push('a.attendance_date >= ?'); params.push(start_date); }
        if (end_date) { conditions.push('a.attendance_date <= ?'); params.push(end_date); }
        const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        const [rekap] = await pool.query(
            `SELECT s.full_name as student_name, s.nis, c.class_name,
                    COUNT(a.id) as total_hari,
                    SUM(CASE WHEN a.status='hadir' THEN 1 ELSE 0 END) as hadir,
                    SUM(CASE WHEN a.status='sakit' THEN 1 ELSE 0 END) as sakit,
                    SUM(CASE WHEN a.status='izin' THEN 1 ELSE 0 END) as izin,
                    SUM(CASE WHEN a.status='alpa' THEN 1 ELSE 0 END) as alpa,
                    ROUND(SUM(CASE WHEN a.status='hadir' THEN 1 ELSE 0 END) / COUNT(a.id) * 100, 1) as persentase
             FROM attendances a
             JOIN students s ON a.student_id = s.id
             LEFT JOIN classes c ON s.class_id = c.id
             ${where}
             GROUP BY a.student_id, s.full_name, s.nis, c.class_name
             ORDER BY c.class_name, s.full_name`, params
        );

        const [classes] = await pool.query('SELECT * FROM classes ORDER BY grade_level, class_name');

        res.render('absensi/rekap', {
            title: 'Rekap Absensi',
            rekap,
            classes,
            filters: { class_id, start_date, end_date }
        });
    } catch (error) {
        console.error(error);
        req.flash('error', 'Gagal memuat rekap');
        res.redirect('/absensi');
    }
});

module.exports = router;
