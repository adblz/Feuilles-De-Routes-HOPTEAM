const express   = require('express');
const rateLimit = require('express-rate-limit');
const { handleCreateUser, handleDeleteUser } = require('../controllers/adminController');

const router = express.Router();

const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Trop de requêtes. Réessayez dans 15 minutes.' },
});

router.post('/create-user', adminLimiter, handleCreateUser);
router.delete('/delete-user/:id', adminLimiter, handleDeleteUser);

module.exports = router;
