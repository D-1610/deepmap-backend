const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const users = [];
const locations = [];

app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'DeepMap backend jalan' });
});

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

const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => console.log(`Server jalan di port ${PORT}`));
}

module.exports = app;
