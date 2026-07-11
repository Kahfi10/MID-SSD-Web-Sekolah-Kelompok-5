const express = require('express');
const router = express.Router();
const pool = require('../../config/database');
const { isAuthenticated } = require('../../middleware/auth');
const { allowRoles } = require('../../middleware/rbac');

router.get('/', isAuthenticated, allowRoles('guru', 'admin', 'kepala_sekolah', 'wali_kelas'), async (req, res) => {
    try {
        let query;
        let params = [];

        if (req.session.user.role_name === 'guru') {
            // Get teacher ID for this user
            const [teacher] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.session.user.id]);
            if (teacher.length === 0) {
                req.flash('error', 'Data guru tidak ditemukan');
                return res.redirect('/dashboard');
            }
            query = `SELECT tj.*, c.class_name, s.subject_name, t.full_name as teacher_name
                     FROM teaching_journals tj
                     JOIN classes c ON tj.class_id = c.id
                     JOIN subjects s ON tj.subject_id = s.id
                     JOIN teachers t ON tj.teacher_id = t.id
                     WHERE tj.teacher_id = ?
                     ORDER BY tj.teaching_date DESC`;
            params = [teacher[0].id];
        } else {
            query = `SELECT tj.*, c.class_name, s.subject_name, t.full_name as teacher_name
                     FROM teaching_journals tj
                     JOIN classes c ON tj.class_id = c.id
                     JOIN subjects s ON tj.subject_id = s.id
                     JOIN teachers t ON tj.teacher_id = t.id
                     ORDER BY tj.teaching_date DESC`;
        }

        const [journals] = await pool.query(query, params);
        const [classes] = await pool.query('SELECT * FROM classes');
        const [subjects] = await pool.query('SELECT * FROM subjects');
        const [teachers] = await pool.query('SELECT * FROM teachers');
        const [semesters] = await pool.query('SELECT * FROM semesters WHERE is_active = 1');

        res.render('jurnal/index', {
            title: 'Jurnal Mengajar',
            journals,
            classes,
            subjects,
            teachers,
            semesters,
            userRole: req.session.user.role_name
        });

    } catch (error) {
        console.error(error);
        req.flash('error', 'Gagal memuat data');
        res.redirect('/dashboard');
    }
});

router.post('/store', isAuthenticated, allowRoles('guru', 'admin'), async (req, res) => {
    try {
        const { class_id, subject_id, teaching_date, material, method, notes, semester_id } = req.body;
        const [teacher] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.session.user.id]);

        if (teacher.length === 0 && req.session.user.role_name !== 'admin') {
            req.flash('error', 'Data guru tidak ditemukan');
            return res.redirect('/jurnal');
        }

        const teacherId = req.session.user.role_name === 'admin' 
            ? req.body.teacher_id 
            : teacher[0].id;

        await pool.query(
            'INSERT INTO teaching_journals (teacher_id, class_id, subject_id, teaching_date, material, method, notes, semester_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [teacherId, class_id, subject_id, teaching_date, material, method, notes, semester_id]
        );

        await pool.query(
            'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
            [req.session.user.id, 'create_journal', `Membuat jurnal mengajar ${teaching_date}`, req.ip]
        );

        req.flash('success', 'Jurnal mengajar berhasil disimpan');
        res.redirect('/jurnal');

    } catch (error) {
        console.error(error);
        req.flash('error', 'Gagal menyimpan jurnal');
        res.redirect('/jurnal');
    }
});

router.post('/delete/:id', isAuthenticated, allowRoles('admin'), async (req, res) => {
    try {
        await pool.query('DELETE FROM teaching_journals WHERE id = ?', [req.params.id]);
        req.flash('success', 'Jurnal berhasil dihapus');
        res.redirect('/jurnal');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Gagal menghapus jurnal');
        res.redirect('/jurnal');
    }
});

// Rekap Jurnal
router.get('/rekap', isAuthenticated, allowRoles('admin', 'kepala_sekolah', 'wali_kelas'), async (req, res) => {
    try {
        const { teacher_id, class_id, start_date, end_date } = req.query;

        let params = [];
        let conditions = [];

        if (teacher_id) {
            conditions.push('tj.teacher_id = ?');
            params.push(teacher_id);
        }
        if (class_id) {
            conditions.push('tj.class_id = ?');
            params.push(class_id);
        }
        if (start_date) {
            conditions.push('tj.teaching_date >= ?');
            params.push(start_date);
        }
        if (end_date) {
            conditions.push('tj.teaching_date <= ?');
            params.push(end_date);
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        // Rekap per Guru
        const [byTeacher] = await pool.query(
            `SELECT t.full_name as teacher_name, COUNT(tj.id) as total,
                    COUNT(DISTINCT tj.class_id) as total_classes,
                    COUNT(DISTINCT tj.subject_id) as total_subjects
             FROM teaching_journals tj
             JOIN teachers t ON tj.teacher_id = t.id
             ${whereClause}
             GROUP BY tj.teacher_id, t.full_name
             ORDER BY total DESC`,
            params
        );

        // Rekap per Kelas
        const [byClass] = await pool.query(
            `SELECT c.class_name, c.grade_level, COUNT(tj.id) as total
             FROM teaching_journals tj
             JOIN classes c ON tj.class_id = c.id
             ${whereClause}
             GROUP BY tj.class_id, c.class_name, c.grade_level
             ORDER BY c.grade_level, c.class_name`,
            params
        );

        // Total keseluruhan
        const [total] = await pool.query(
            `SELECT COUNT(*) as total_jurnal,
                    COUNT(DISTINCT teacher_id) as total_guru,
                    COUNT(DISTINCT class_id) as total_kelas
             FROM teaching_journals tj
             ${whereClause}`,
            params
        );

        const [teachers] = await pool.query('SELECT * FROM teachers');
        const [classes] = await pool.query('SELECT * FROM classes');

        res.render('jurnal/rekap', {
            title: 'Rekap Jurnal Mengajar',
            byTeacher,
            byClass,
            total: total[0],
            teachers,
            classes,
            filters: { teacher_id, class_id, start_date, end_date },
            userRole: req.session.user.role_name
        });

    } catch (error) {
        console.error(error);
        req.flash('error', 'Gagal memuat rekap');
        res.redirect('/jurnal');
    }
});

module.exports = router;
