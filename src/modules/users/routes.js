const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../../config/database');
const { isAuthenticated } = require('../../middleware/auth');
const { allowRoles } = require('../../middleware/rbac');

router.get('/', isAuthenticated, allowRoles('admin'), async (req, res) => {
    try {
        const { search } = req.query;
        let userQuery, userParams;
        if (search) {
            userQuery = `SELECT u.*, r.name as role_name 
             FROM users u JOIN roles r ON u.role_id = r.id 
             WHERE u.full_name LIKE ? OR u.username LIKE ? OR u.email LIKE ?
             ORDER BY u.created_at DESC`;
            userParams = [`%${search}%`, `%${search}%`, `%${search}%`];
        } else {
            userQuery = `SELECT u.*, r.name as role_name 
             FROM users u JOIN roles r ON u.role_id = r.id 
             ORDER BY u.created_at DESC`;
            userParams = [];
        }
        const [users] = await pool.query(userQuery, userParams);
        const [roles] = await pool.query('SELECT * FROM roles');
        res.render('users/index', { title: 'Manajemen Pengguna', users, roles, search });
    } catch (error) {
        console.error(error);
        req.flash('error', 'Gagal memuat data');
        res.redirect('/dashboard');
    }
});

router.post('/store', isAuthenticated, allowRoles('admin'), async (req, res) => {
    try {
        const { username, email, password, full_name, role_id } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
            'INSERT INTO users (username, email, password, full_name, role_id) VALUES (?, ?, ?, ?, ?)',
            [username, email, hashedPassword, full_name, role_id]
        );

        const [userRows] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
        await pool.query(
            'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
            [req.session.user.id, 'create_user', `Membuat user ${username}`, req.ip]
        );

        req.flash('success', 'Pengguna berhasil ditambahkan');
        res.redirect('/users');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Gagal menambah pengguna');
        res.redirect('/users');
    }
});

router.get('/edit/:id', isAuthenticated, allowRoles('admin'), async (req, res) => {
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
        const [roles] = await pool.query('SELECT * FROM roles');
        if (users.length === 0) {
            req.flash('error', 'Pengguna tidak ditemukan');
            return res.redirect('/users');
        }
        res.render('users/edit', { title: 'Edit Pengguna', user: users[0], roles });
    } catch (error) {
        console.error(error);
        req.flash('error', 'Gagal memuat data');
        res.redirect('/users');
    }
});

router.post('/update/:id', isAuthenticated, allowRoles('admin'), async (req, res) => {
    try {
        const { full_name, email, role_id, is_active } = req.body;
        await pool.query(
            'UPDATE users SET full_name = ?, email = ?, role_id = ?, is_active = ? WHERE id = ?',
            [full_name, email, role_id, is_active, req.params.id]
        );

        await pool.query(
            'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
            [req.session.user.id, 'update_user', `Mengubah user ID ${req.params.id}`, req.ip]
        );

        req.flash('success', 'Pengguna berhasil diupdate');
        res.redirect('/users');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Gagal mengupdate pengguna');
        res.redirect('/users');
    }
});

router.post('/delete/:id', isAuthenticated, allowRoles('admin'), async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        await pool.query(
            'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
            [req.session.user.id, 'delete_user', `Menghapus user ID ${req.params.id}`, req.ip]
        );
        req.flash('success', 'Pengguna berhasil dihapus');
        res.redirect('/users');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Gagal menghapus pengguna');
        res.redirect('/users');
    }
});

// Reset Password
router.post('/reset-password/:id', isAuthenticated, allowRoles('admin'), async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash('password123', 10);
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.params.id]);

        await pool.query(
            'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
            [req.session.user.id, 'reset_password', `Reset password user ID ${req.params.id} ke default`, req.ip]
        );

        req.flash('success', 'Password berhasil direset ke "password123"');
        res.redirect('/users');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Gagal mereset password');
        res.redirect('/users');
    }
});

module.exports = router;
