const express = require('express');
const router = express.Router();
const GoogleStrategy = require('passport-google-oidc');
const env = require('dotenv').config();
const passport = require('passport');
const videoUpload = require('./videomulter.js')
const imageUpload = require('./imagemulter.js')
const userModel = require('./users.js');
const videoModel = require('./video.js');

passport.use(new GoogleStrategy({
  clientID: process.env['GOOGLE_CLIENT_ID'],
  clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
  callbackURL: '/oauth2/redirect/google',
  scope: ['profile', 'email']
}, async function verify(issuer, profile, cb) {
  const user = await userModel.findOne({ email: profile.emails[0].value });
  if (user) {
    return cb(null, user);
  }
  const newUser = await userModel.create({ email: profile.emails[0].value, username: profile.displayName, channelName: '@' + profile.emails[0].value.substring(0, profile.emails[0].value.indexOf('@')) + Math.floor(Math.random() * 1000 + 100) });
  return cb(null, newUser);
}));

// -------------------Rendered Pages ----------------------

router.get('/', async function (req, res, next) {
  let loggedUser;
  if (req.user) {
    loggedUser = await userModel.findOne({ username: req.user.username })
  } else {
    loggedUser = req.user;
  }


  res.render('index.ejs', { loggedUser });
});
router.get('/channel', async function (req, res, next) {
  let loggedUser;
  if (req.user) {
    loggedUser = await userModel.findOne({ username: req.user.username })
  } else {
    loggedUser = req.user;
  }
  res.render('profile.ejs', { loggedUser });
});
router.get('/playlist', async function (req, res, next) {
  let loggedUser;
  if (req.user) {
    loggedUser = await userModel.findOne({ username: req.user.username })
  } else {
    loggedUser = req.user;
  }
  res.render('playlist.ejs', { loggedUser });
});
router.get('/studio', async function (req, res, next) {
  let loggedUser;
  if (req.user) {
    loggedUser = await userModel.findOne({ username: req.user.username }).populate('uploadedVideos')
  } else {
    loggedUser = req.user;
  }
  res.render('studio.ejs', { loggedUser });
});
router.get('/history', async function (req, res, next) {
  let loggedUser;
  if (req.user) {
    loggedUser = await userModel.findOne({ username: req.user.username })
  } else {
    loggedUser = req.user;
  }
  res.render('history.ejs', { loggedUser });
});
router.get('/results', async function (req, res, next) {
  let loggedUser;
  if (req.user) {
    loggedUser = await userModel.findOne({ username: req.user.username })
  } else {
    loggedUser = req.user;
  }
  res.render('results.ejs', { loggedUser });
});
router.get('/shorts', async function (req, res, next) {
  let loggedUser;
  if (req.user) {
    loggedUser = await userModel.findOne({ username: req.user.username })
  } else {
    loggedUser = req.user;
  }
  res.render('shorts.ejs', { loggedUser });
});
router.get('/you', async function (req, res, next) {
  let loggedUser;
  if (req.user) {
    loggedUser = await userModel.findOne({ username: req.user.username })
  } else {
    loggedUser = req.user;
  }
  res.render('you.ejs', { loggedUser });
});

// ------------deleting Video -------------------

router.get('/deleteVideo/:id',async function (req, res) {
  const video = await videoModel.findOneAndDelete({_id: req.params.id});
  const user = await userModel.findOne({username:req.user.username});
  user.uploadedVideos.splice(user.uploadedVideos.indexOf(req.params.id),1);
  await user.save()
  res.redirect('/studio');
})

// ------------------------updateVideo------------------------

router.post('/updateVideo/:id',async function (req, res) {
  let tags = req.body.tags.split(',');
  const video = await videoModel.findOneAndUpdate({_id: req.params.id},{
    title:req.body.title,
    description:req.body.description,
    tags: tags,
    thumbnail:req.body.thumbnail,
    visibility:req.body.visibility,
  },
  {new:true});
  console.log(video);
  console.log(tags);
  res.redirect('/studio');
})

// ------------------------find video-------------

router.get('/findVideo/:id',async function (req, res) {
  const video = await videoModel.findOne({_id: req.params.id});
  res.json(video);
})

// -------------uploading routes --------------------

router.post('/videoUpload',videoUpload.single('video'),async function (req, res) {
  const video = await videoModel.create({
    user:req.user.id,
    filename:req.file.filename
  });
  const user = await userModel.findOneAndUpdate({_id:req.user.id},{ $push: { uploadedVideos: video._id } },{new:true})
  res.json(video);
})
router.post('/thumbnailupload/:id',imageUpload.single('thumbnail'),async function (req, res) {
const video = await videoModel.findOneAndUpdate({_id: req.params.id},{thumbnail:req.file.filename},{new:true});
res.json(req.file);
})


router.post('/postVideo/:type/:id',async function (req, res) {
  const video = await videoModel.findOneAndUpdate({_id: req.params.id},req.body);
  let tags = req.body.tags.split(',');
  video.type = req.params.type;
  video.tags= tags;
  await video.save();
  res.redirect('/studio');
})







// -------------Google Ouath --------------------

router.get('/login/federated/google', passport.authenticate('google'));

router.get('/oauth2/redirect/google', passport.authenticate('google', {
  successRedirect: '/',
  failureRedirect: '/',
}));
router.get('/logout', function (req, res, next) {
  req.logout(function (err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});


module.exports = router;
