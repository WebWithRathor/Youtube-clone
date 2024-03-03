var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index.ejs');
});
router.get('/profile', function(req, res, next) {
  res.render('profile.ejs');
});
router.get('/playlist', function(req, res, next) {
  res.render('playlist.ejs');
});
router.get('/channel' ,function(req, res, next) {
  res.render('channel.ejs');
});
module.exports = router;
