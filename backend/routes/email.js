const express    = require('express');
const multer     = require('multer');
const rateLimit  = require('express-rate-limit');
const { handleSendEmail } = require('../controllers/emailController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo max par fichier
});

const emailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Trop de requêtes. Réessayez dans 15 minutes.' },
});

router.get('/ping', (req, res) => res.json({ ok: true }));
router.post('/send-email', emailLimiter, requireAuth, upload.single('file'), handleSendEmail);

module.exports = router;
