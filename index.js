// ============ DEVICE ENDPOINTS (buat DeepMap Parent) ============
const devices = [];

app.post('/api/device', (req, res) => {
    const { deviceId, manufacturer, model, androidVersion, latitude, longitude, timestamp } = req.body;
    if (!deviceId) {
        return res.status(400).json({ status: 'error', message: 'deviceId wajib' });
    }
    const idx = devices.findIndex(d => d.deviceId === deviceId);
    const data = { deviceId, manufacturer, model, androidVersion, latitude, longitude, timestamp };
    if (idx >= 0) devices[idx] = data;
    else devices.push(data);
    res.json({ status: 'success', message: 'Device tersimpan' });
});

app.get('/api/devices', (req, res) => {
    res.json({ total: devices.length, data: devices });
});

app.get('/api/device/:deviceId', (req, res) => {
    const dev = devices.find(d => d.deviceId === req.params.deviceId);
    if (!dev) return res.status(404).json({ status: 'error', message: 'Device tidak ditemukan' });
    res.json({ status: 'success', data: dev });
});
// ============ END DEVICE ENDPOINTS ============
