const express = require('express');
const router = express.Router();
const pool = require('../../config/database');
const { isAuthenticated } = require('../../middleware/auth');

router.get('/', isAuthenticated, async (req, res) => {
    try {
        const [studentCount] = await pool.query('SELECT COUNT(*) as total FROM students WHERE status = ?', ['aktif']);
        const [teacherCount] = await pool.query('SELECT COUNT(*) as total FROM teachers');
        const [journalCount] = await pool.query('SELECT COUNT(*) as total FROM teaching_journals');
        const [bkCaseCount] = await pool.query("SELECT COUNT(*) as total FROM bk_cases WHERE status != 'selesai'");
        const [classCount] = await pool.query('SELECT COUNT(*) as total FROM classes');
        const [userCount] = await pool.query('SELECT COUNT(*) as total FROM users');

        const [recentLogs] = await pool.query(
            `SELECT al.*, u.full_name 
             FROM activity_logs al 
             JOIN users u ON al.user_id = u.id 
             ORDER BY al.created_at DESC LIMIT 8`
        );

        // Grafik: Jurnal per bulan (6 bulan terakhir)
        const [journalPerMonth] = await pool.query(
            `SELECT DATE_FORMAT(teaching_date, '%Y-%m') as month, COUNT(*) as total
             FROM teaching_journals
             WHERE teaching_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
             GROUP BY month ORDER BY month`
        );

        // Grafik: Status siswa
        const [studentStatus] = await pool.query(
            `SELECT status, COUNT(*) as total FROM students GROUP BY status`
        );

        // Grafik: Siswa per kelas
        const [studentsPerClass] = await pool.query(
            `SELECT CONCAT(c.grade_level, ' ', c.class_name) as class_name, COUNT(s.id) as total
             FROM classes c
             LEFT JOIN students s ON s.class_id = c.id
             GROUP BY c.id, c.grade_level, c.class_name
             ORDER BY c.grade_level, c.class_name`
        );

        // Grafik: Gender
        const [genderCount] = await pool.query(
            `SELECT gender, COUNT(*) as total FROM students WHERE status = 'aktif' GROUP BY gender`
        );

        // Grafik: Kasus per jenis
        const [casesByType] = await pool.query(
            `SELECT case_type, COUNT(*) as total FROM bk_cases GROUP BY case_type ORDER BY total DESC LIMIT 5`
        );

        res.render('dashboard/index', {
            title: 'Dashboard - Web Sekolah',
            studentCount: studentCount[0].total,
            teacherCount: teacherCount[0].total,
            journalCount: journalCount[0].total,
            bkCaseCount: bkCaseCount[0].total,
            classCount: classCount[0].total,
            userCount: userCount[0].total,
            recentLogs,
            journalPerMonth,
            studentStatus,
            studentsPerClass,
            genderCount,
            casesByType
        });

    } catch (error) {
        console.error(error);
        req.flash('error', 'Terjadi kesalahan');
        res.redirect('/auth/login');
    }
});

module.exports = router;
