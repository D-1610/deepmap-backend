const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// ============================================
// DATA STORAGE (in-memory, hilang saat restart)
// ============================================
const users = [];
const locations = [];
const devices = [];

// ============================================
// HEALTH CHECK
// ============================================
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'DeepMap backend jalan' });
});

// ============================================
// AUTH
// ============================================
app.post('/api/auth/register', (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
        return res.status(400).json({ status: 'error', message: 'Isi semua field' });
    }
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ status: 'error', message: 'Email sudah terdaftar' });
    }
    const newUser = { id: Date.now().toString(), email, password, name };
    users.push(newUser);
    res.json({
        status: 'success',
        token: 'token-' + newUser.id,
        userId: newUser.id,
        name: newUser.name,
        message: 'Register berhasil'
    });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
        return res.status(401).json({ status: 'error', message: 'Email atau password salah' });
    }
    res.json({
        status: 'success',
        token: 'token-' + user.id,
        userId: user.id,
        name: user.name,
        message: 'Login berhasil'
    });
});

// ============================================
// LOCATION (untuk user login — legacy)
// ============================================
app.post('/api/location/legacy', (req, res) => {
    const { userId, latitude, longitude, accuracy, timestamp } = req.body;
    locations.push({ userId, latitude, longitude, accuracy, timestamp });
    res.json({ status: 'success', message: 'Lokasi tersimpan' });
});

app.get('/api/location/legacy/:userId', (req, res) => {
    const { userId } = req.params;
    const last = locations.filter(l => l.userId === userId).pop();
    if (!last) {
        return res.status(404).json({ status: 'error', message: 'Belum ada lokasi' });
    }
    res.json({ status: 'success', ...last });
});

// ============================================
// DEVICE (untuk DeepMap Child & Parent)
// ============================================

// --------------------------------------------
// POST /api/device — DARI HP ANAK
// Simpan device info + lokasi + pairing code
// --------------------------------------------
app.post('/api/device', (req, res) => {
    const {
        deviceId,
        manufacturer,
        model,
        androidVersion,
        latitude,
        longitude,
        timestamp,
        // ============================================
        // TAMBAHAN: pairing info dari HP anak
        // ============================================
        pairingCode,
        secret
    } = req.body;

    if (!deviceId) {
        return res.status(400).json({ status: 'error', message: 'deviceId wajib' });
    }

    // Normalisasi kode (buang strip, uppercase)
    const cleanCode = pairingCode
        ? pairingCode.replace('-', '').toUpperCase()
        : null;

    const data = {
        deviceId,
        manufacturer,
        model,
        androidVersion,
        latitude,
        longitude,
        timestamp,
        pairingCode: cleanCode,
        secret: secret || null,
        updatedAt: timestamp || Date.now()
    };

    const idx = devices.findIndex(d => d.deviceId === deviceId);
    if (idx >= 0) {
        devices[idx] = data;
    } else {
        devices.push(data);
    }

    res.json({ status: 'success', message: 'Device tersimpan' });
});

// --------------------------------------------
// GET /api/location?code=XXXX — DARI HP ORTU
// Cari device berdasarkan pairing code
// --------------------------------------------
app.get('/api/location', (req, res) => {
    // Ambil query param ?code=
    const rawCode = req.query.code || '';
    const code = rawCode.replace('-', '').toUpperCase();

    if (!code) {
        return res.status(400).json({
            status: 'error',
            message: 'Parameter code wajib diisi'
        });
    }

    // Cari device yg pairingCode-nya match
    const dev = devices.find(d => d.pairingCode === code);

    if (!dev) {
        return res.status(404).json({
            status: 'error',
            message: 'Device belum terhubung atau kode salah'
        });
    }

    // Kirim data ke parent
    res.json({
        status: 'success',
        deviceId: dev.deviceId,
        deviceModel: `${dev.manufacturer || ''} ${dev.model || ''}`.trim(),
        androidVersion: dev.androidVersion,
        lat: dev.latitude,
        lng: dev.longitude,
        battery: null,
        updatedAt: dev.updatedAt || dev.timestamp,
        pairingCode: dev.pairingCode
    });
});

// --------------------------------------------
// GET /api/devices — DARI HP ORTU (legacy)
// Lihat semua device (untuk debug)
// --------------------------------------------
app.get('/api/devices', (req, res) => {
    res.json({ total: devices.length, data: devices });
});

// --------------------------------------------
// GET /api/device/:deviceId — DARI HP ORTU
// Lihat 1 device by deviceId
// --------------------------------------------
app.get('/api/device/:deviceId', (req, res) => {
    const dev = devices.find(d => d.deviceId === req.params.deviceId);
    if (!dev) {
        return res.status(404).json({ status: 'error', message: 'Device tidak ditemukan' });
    }
    res.json({ status: 'success', data: dev });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => console.log(`Server jalan di port ${PORT}`));
}

module.exports = app;
