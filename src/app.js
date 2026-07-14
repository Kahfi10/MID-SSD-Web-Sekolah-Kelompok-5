const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'rahasia_kelompok2',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Flash messages
app.use(flash());

// Set global variables for views
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.success_msg = req.flash('success');
    res.locals.error_msg = req.flash('error');
    next();
});

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Routes
const authRoutes = require('./modules/auth/routes');
const dashboardRoutes = require('./modules/dashboard/routes');
const usersRoutes = require('./modules/users/routes');
const kesiswaanRoutes = require('./modules/kesiswaan/routes');
const jurnalRoutes = require('./modules/jurnal/routes');
const bkRoutes = require('./modules/bk/routes');
const absensiRoutes = require('./modules/absensi/routes');

app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/users', usersRoutes);
app.use('/kesiswaan', kesiswaanRoutes);
app.use('/jurnal', jurnalRoutes);
app.use('/bk', bkRoutes);
app.use('/absensi', absensiRoutes);

// Home redirect
app.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/auth/login');
    }
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
