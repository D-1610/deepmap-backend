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
// DATA STORAGE — COMMAND (BARU)
// ============================================
const commands = [];

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
app.post('/api/location', (req, res) => {
    const { userId, latitude, longitude, accuracy, timestamp } = req.body;
    locations.push({ userId, latitude, longitude, accuracy, timestamp });
    res.json({ status: 'success', message: 'Lokasi tersimpan' });
});

app.get('/api/location/:userId', (req, res) => {
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

// Child kirim device info + lokasi
app.post('/api/device', (req, res) => {
    const {
        deviceId,
        manufacturer,
        model,
        androidVersion,
        latitude,
        longitude,
        timestamp
    } = req.body;

    if (!deviceId) {
        return res.status(400).json({ status: 'error', message: 'deviceId wajib' });
    }

    const data = {
        deviceId,
        manufacturer,
        model,
        androidVersion,
        latitude,
        longitude,
        timestamp
    };

    const idx = devices.findIndex(d => d.deviceId === deviceId);
    if (idx >= 0) {
        devices[idx] = data;
    } else {
        devices.push(data);
    }

    res.json({ status: 'success', message: 'Device tersimpan' });
});

// Parent lihat semua device
app.get('/api/devices', (req, res) => {
    res.json({ total: devices.length, data: devices });
});

// Parent lihat 1 device
app.get('/api/device/:deviceId', (req, res) => {
    const dev = devices.find(d => d.deviceId === req.params.deviceId);
    if (!dev) {
        return res.status(404).json({ status: 'error', message: 'Device tidak ditemukan' });
    }
    res.json({ status: 'success', data: dev });
});

// ============================================
// COMMAND (BARU) — Lockscreen & Message
// ============================================

// Parent kirim command ke HP anak
app.post('/api/command', (req, res) => {
    const { deviceId, type, message, lock } = req.body;

    if (!deviceId || !type) {
        return res.status(400).json({ status: 'error', message: 'deviceId & type wajib' });
    }

    // type: "message" | "lock" | "lock_message"
    const cmd = {
        id: Date.now().toString(),
        deviceId,
        type,
        message: message || '',
        lock: lock === true,
        timestamp: Date.now(),
        executed: false
    };

    commands.push(cmd);

    console.log(`[COMMAND] ${deviceId} → ${type}: ${message}`);

    res.json({ status: 'success', command: cmd });
});

// HP anak polling command baru
app.get('/api/command/:deviceId', (req, res) => {
    const { deviceId } = req.params;

    // Ambil command yg belum executed untuk device ini
    const pending = commands.filter(
        c => c.deviceId === deviceId && !c.executed
    );

    if (pending.length === 0) {
        return res.json({ status: 'success', data: [] });
    }

    // Tandai sebagai executed (biar gak diulang)
    pending.forEach(c => { c.executed = true; });

    res.json({ status: 'success', data: pending });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => console.log(`Server jalan di port ${PORT}`));
}

module.exports = app;
