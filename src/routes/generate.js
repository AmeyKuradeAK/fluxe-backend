const express = require('express');
const router = express.Router();
const { generateFlutterProject, getProjectSecrets } = require('../controllers/generateController');

router.post('/', generateFlutterProject);
router.get('/required-secrets/:projectName', getProjectSecrets);

module.exports = router;
