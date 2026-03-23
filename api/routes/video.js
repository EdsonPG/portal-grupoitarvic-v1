const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Middleware para verificar token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No autorizado' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Token inválido o expirado' });
  }
};

// ==========================================
// POST /api/video/create-room
// Create a new video conference room securely
// ==========================================
router.post('/create-room', authenticateToken, async (req, res) => {
    try {
        const { isPrivate, type } = req.body; // type: 'video' | 'voice'
        
        // Generar un nombre de sala único basado en el equipo y tiempo
        const uniqueId = Math.random().toString(36).substring(2, 10);
        const roomName = `PortalArvic-${Date.now()}-${uniqueId}`;

        let roomUrl = '';

        // Si tenemos Daily.co configurado en el .env, podríamos usarlo aquí
        if (process.env.DAILY_API_KEY) {
            const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
            try {
                const response = await fetch('https://api.daily.co/v1/rooms', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.DAILY_API_KEY}`
                    },
                    body: JSON.stringify({
                        name: roomName.toLowerCase(),
                        properties: {
                            exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60), // Expirar en 12 horas
                            start_audio_off: false,
                            start_video_off: type === 'voice', // Start video off if it's a voice-only call initially
                            enable_knocking: isPrivate || false // Require knocking for private rooms
                        }
                    })
                });
                const data = await response.json();
                roomUrl = data.url;
            } catch(e) {
                console.warn('Daily.co error, fallback to Jitsi:', e.message);
            }
        }

        // Fallback: Jitsi Meet (Open Source, sin keys necesarias para uso básico y permite embed)
        if (!roomUrl) {
            // Jitsi rooms can just be URLs
            roomUrl = `https://meet.jit.si/${roomName}`;
        }

        res.json({
            success: true,
            data: {
                roomName,
                url: roomUrl,
                type: type || 'video',
                createdAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error creating video room:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
