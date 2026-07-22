// PM2 Ecosystem Config — Distributed System Setup
// Kelompok 5 | RPL-A Scalable System Design
//
// Menjalankan 2 instance aplikasi:
//   - web-sekolah        : Primary server (port 3000)
//   - web-sekolah-backup : Backup server  (port 3001)
//
// Jika primary crash, Nginx otomatis forward ke backup.
//
// Perintah:
//   pm2 start ecosystem.config.js   → jalankan kedua server
//   pm2 restart ecosystem.config.js → restart keduanya
//   pm2 delete ecosystem.config.js  → hapus keduanya

module.exports = {
    apps: [
        {
            // ─── PRIMARY SERVER ──────────────────────────────
            name: 'web-sekolah',
            script: './src/app.js',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '300M',
            env: {
                NODE_ENV: 'production',
                PORT: 3000
            },
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            error_file: './logs/primary-error.log',
            out_file:   './logs/primary-out.log',
        },
        {
            // ─── BACKUP SERVER ───────────────────────────────
            name: 'web-sekolah-backup',
            script: './src/app.js',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '300M',
            env: {
                NODE_ENV: 'production',
                PORT: 3001
            },
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            error_file: './logs/backup-error.log',
            out_file:   './logs/backup-out.log',
        }
    ]
};
