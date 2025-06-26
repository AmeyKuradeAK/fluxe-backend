const express = require('express');
const router = express.Router();
const { generateFlutterProject } = require('../controllers/generateController');

router.post('/', generateFlutterProject);

module.exports = router;
