const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const app = express();

app.use(cors());
app.use(express.json());

// ============================================
// FIREBASE ADMIN INIT
// ============================================
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
        })
    });
}
const db = admin.firestore();

// ============================================
// DATA STORAGE (in-memory, untuk legacy auth)
// ============================================
const users = [];
const locations = [];

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
app.post('/api/device', async (req, res) => {
    try {
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
            timestamp,
            updatedAt: Date.now()
        };

        await db.collection('devices').doc(deviceId).set(data, { merge: true });

        res.json({ status: 'success', message: 'Device tersimpan' });
    } catch (e) {
        console.error('POST /api/device error:', e);
        res.status(500).json({ status: 'error', message: e.message });
    }
});

// Parent lihat semua device
app.get('/api/devices', async (req, res) => {
    try {
        const snapshot = await db.collection('devices').get();
        const data = snapshot.docs.map(doc => doc.data());
        res.json({ total: data.length, data });
    } catch (e) {
        console.error('GET /api/devices error:', e);
        res.status(500).json({ status: 'error', message: e.message });
    }
});

// Parent lihat 1 device
app.get('/api/device/:deviceId', async (req, res) => {
    try {
        const doc = await db.collection('devices').doc(req.params.deviceId).get();
        if (!doc.exists) {
            return res.status(404).json({ status: 'error', message: 'Device tidak ditemukan' });
        }
        res.json({ status: 'success', data: doc.data() });
    } catch (e) {
        console.error('GET /api/device error:', e);
        res.status(500).json({ status: 'error', message: e.message });
    }
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => console.log(`Server jalan di port ${PORT}`));
}

module.exports = app;
