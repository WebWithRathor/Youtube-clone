const express = require('express');
const router = express.Router();
const GoogleStrategy = require('passport-google-oidc');
const env = require('dotenv').config();
const passport = require('passport');
const videoUpload = require('./videomulter.js')
const imageUpload = require('./imagemulter.js')
const userModel = require('./users.js');
const playlistModel = require('./playlist.js');
const videoModel = require('./video.js');
const commentModel = require('./comments.js');
const fs = require('fs');
const axios = require('axios');
const video = require('./video.js');
const { populate } = require('dotenv');
const { categorizeVideos } = require('../utils/historycategory.js');
const { Console } = require('console');

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


const HOSTNAME = process.env.HOSTNAME;
const STORAGE_ZONE_NAME = process.env.STORAGE_ZONE_NAME;
const ACCESS_KEY = process.env.ACCESS_KEY;
const STREAM_KEY = process.env.STREAM_KEY;

const uploadFileToBunnyCDN = (filePath, fileName) => {
  return new Promise(async (resolve, reject) => {
    const readStream = fs.createReadStream(filePath);

    try {
      const response = await axios.put(`https://${HOSTNAME}/${STORAGE_ZONE_NAME}/${fileName}`, fs.createReadStream(filePath), {
        headers: {
          AccessKey: ACCESS_KEY,
          'Content-Type': 'application/octet-stream',
        },
      });

      resolve(response.data);
    } catch (error) {
      reject(error);
    }
  });
};

// -------------------Rendered Pages ----------------------
router.get('/removeVideo/:id', async function (req, res) {
  const user = await userModel.findOneAndUpdate({ username: req.user.username },{
    $pull: { watchedVideo: { video: req.params.id } }
  }, { new: true });
})

// -------home page ---------------------
router.get('/', async function (req, res, next) {
  let loggedUser;
  if (req.user) {
    loggedUser = await userModel.findOne({ username: req.user.username })
  } else {
    loggedUser = req.user;
  }

  const video = await videoModel.find().populate('user').limit(5)
  const playlist = await playlistModel.find().populate('user videos').limit(5)
  const videos = [...video, ...playlist];
  videos.sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate));
  res.render('index.ejs', { loggedUser, videos, left: true });
});




// -------------------------all videos --------------------
router.get('/allvideos', async (req, res) => {
  const videos = await videoModel.find({ user: req.user.id })
  res.status(200).json(videos);
})

// -----------------------creating playlist ---------------------
router.post('/playlist/create', isloggedIn, async (req, res) => {
  const playlist = new playlistModel(req.body);
  playlist.user = req.user.id;
  await playlist.save();
  const loggedUser = await userModel.findOne({ username: req.user.username });
  loggedUser.playlist.push(playlist._id);
  await loggedUser.save();
  res.status(200).redirect('/studio');
})

// ---------------------------update Playlist ------------------------

router.get('/findPlaylist/:id', async (req, res) => {
  const playlist = await playlistModel.findOne({ _id: req.params.id });
  res.status(200).json(playlist);
})

// -------------subscribe channel ---------------------
router.get('/channel/:username', isloggedIn, async function (req, res, next) {
  const loggedUser = await userModel.findOne({ username: req.user.username });
  const channelUser = await userModel.findOne({ username: req.params.username }).populate({ path: 'uploadedVideos', populate: { path: 'user' } }).populate({ path: 'playlist', populate: { path: 'user videos' } });

  const mergedArray = channelUser.uploadedVideos.concat(channelUser.playlist);
  mergedArray.sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate));
  res.render('profile.ejs', { loggedUser, channelUser, left: true, mergedArray });
});


// ------------------------previewingVideos in channel page --------------------

router.get('/previewVideos/:username/:type', async (req, res) => {
  const type = req.params.type === 'Home' ? 2 : req.params.type === 'Videos' ? 'uploadedVideos' : 'playlist';
  if (type === 2) {
    const user = await userModel.findOne({ username: req.params.username }).populate({ path: 'uploadedVideos playlist', populate: { path: 'user' } });
    const mergedArray = user.uploadedVideos.concat(user.playlist);
    mergedArray.sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate));
    res.status(200).json(mergedArray);
  } else {
    const user = await userModel.findOne({ username: req.params.username }).populate({ path: type, populate: { path: 'user' } });
    res.status(200).json(user[type]);
  }
});

// --------------playlist-----------
router.get('/playlist', async function (req, res, next) {

  const loggedUser = await userModel.findOne({ username: req.user.username })
  res.render('playlist.ejs', { loggedUser, left: true });
});

// ----------------profile---------------
router.get('/studio', isloggedIn, async function (req, res, next) {
  const loggedUser = await userModel.findOne({ username: req.user.username }).populate({ path: 'uploadedVideos', populate: { path: 'user' } }).populate({ path: 'playlist', populate: { path: 'user videos' } });
  const mergedArray = loggedUser.uploadedVideos.concat(loggedUser.playlist);
  mergedArray.sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate));
  res.render('studio.ejs', { loggedUser, mergedArray });
});

// -----------------------history page-----------
router.get('/history', async function (req, res, next) {
  if (req.user) {
    const loggedUser = await userModel.findOne({ username: req.session.passport.user.username })
      .populate('watchedVideo')
      .populate({ path: 'watchedVideo', populate: { path: 'video', populate: 'user' } })

    const allHistory = await categorizeVideos(loggedUser.watchedVideo);
    res.render('history.ejs', { left: true, loggedUser, allHistory });
  } else {
    res.render('history.ejs', { left: true, loggedUser: undefined, allHistory: [] });
  }


});

// -----------------------search results--------------
router.get('/results', isloggedIn, async function (req, res, next) {

  const loggedUser = await userModel.findOne({ username: req.user.username })
  res.render('results.ejs', { loggedUser, left: true });
});

// --------------------shorts----------------------
router.get('/shorts', async function (req, res, next) {
  let loggedUser, shorts = false;
  const short = await videoModel.find({ type: 'short' })
  let alreadyWatchedIndex;
  if (req.user) {
    loggedUser = await userModel.findOne({ username: req.user.username });
    shorts = true;
    alreadyWatchedIndex = loggedUser.watchedVideo.findIndex(item => item.video.equals(short[0]._id));
    if (alreadyWatchedIndex !== -1) {
      loggedUser.watchedVideo.splice(alreadyWatchedIndex, 1);
    }
    loggedUser.watchedVideo.push({ video: short[0]._id });
    await loggedUser.save();
  }

  const shortUrl = `https://${HOSTNAME}/${STORAGE_ZONE_NAME}/${short[0].filename}?accesskey=${STREAM_KEY}`;
  let index = short.length === 1 ? 0 : 1;
  res.render('shorts.ejs', { loggedUser, shorts, left: true, short: short[0], shortUrl, index });
});

// ---------------------------------------------------------------
router.get('/shorts/:index', async function (req, res, next) {
  let loggedUser, shorts = false;
  let alreadyWatchedIndex;
  const short = await videoModel.find({ type: 'short' })
  if (req.user) {
    loggedUser = await userModel.findOne({ username: req.user.username });
    shorts = true;
    alreadyWatchedIndex = loggedUser.watchedVideo.findIndex(item => item.video.equals(short[req.params.index]._id));
    if (alreadyWatchedIndex !== -1) {
      loggedUser.watchedVideo.splice(alreadyWatchedIndex, 1);
    }
    loggedUser.watchedVideo.push({ video: short[req.params.index]._id });
    await loggedUser.save();
  }
  let index;
  if (req.params.index == short.length - 1) index = Number(req.params.index);
  else { index = Number(req.params.index) + 1; }

  const shortUrl = `https://${HOSTNAME}/${STORAGE_ZONE_NAME}/${short[req.params.index].filename}?accesskey=${STREAM_KEY}`;

  res.render('shorts.ejs', { loggedUser, shorts, left: true, shortUrl, short: short[index], index });
});

// ---------------------------clear  History ------------------------

router.get('/clearHistory', isloggedIn, async function (req, res, next) {
  const loggedUser = await userModel.findOne({ username: req.user.username });
  loggedUser.watchedVideo = [];
  await loggedUser.save();
  res.redirect('/history');
});

// -----------------------about you----------------
router.get('/you', async function (req, res, next) {
  let loggedUser = req.user
  if (loggedUser) {
    loggedUser = await userModel.findOne({ username: req.session.passport.user.username })
      .populate('watchedVideo', 'likedVideos', 'watchedlaterVideos')
      .populate({ path: 'likedVideos', populate: 'user' })
      .populate({ path: 'watchedlaterVideos' })
      .populate({ path: 'watchedVideo', populate: { path: 'video', populate: 'user' } })
  }
  res.render('you.ejs', { left: true, loggedUser });
});

// ------------------------subscriptions------------------------

router.get('/subscriptions', isloggedIn, async function (req, res, next) {
  const loggedUser = await userModel.findOne({ username: req.user.username })
  .populate({ path: 'subscribed', populate: { path: 'uploadedVideos', populate: { path: 'user' } } })
  .populate({
    path: 'subscribed',
    populate: {
      path: 'playlist', // populate the "uploadedVideos" field
      populate:{path : 'user videos'}  // specify the fields you want to populate in the "uploadedVideos" field
    }
  });;
  const videos = require('../utils/historycategory.js').subscribe(loggedUser.subscribed)
  res.render('subscription.ejs', { loggedUser, left: true, videos });
});

// ----------------------------streaming video ------------------------

router.get('/openVideo/:title', isloggedIn, async function (req, res, next) {
  let loggedUser, show = false, alreadyWatchedIndex;
  const video = await videoModel.findOne({ title: req.params.title }).populate('user').populate({ path: 'comments', populate: { path: 'replies user' } });
  if (req.user) {
    show = true;
    loggedUser = await userModel.findOne({ username: req.user.username })
    if (video.views.indexOf(loggedUser._id) === -1) {
      video.views.push(loggedUser._id);
      await video.save();
    }
    alreadyWatchedIndex = loggedUser.watchedVideo.findIndex(item => item.video.equals(video._id));
    if (alreadyWatchedIndex !== -1) {
      loggedUser.watchedVideo.splice(alreadyWatchedIndex, 1);
    }
    loggedUser.watchedVideo.push({ video: video._id });

    await loggedUser.save();
  }
  const uploadDate = require('../utils/timeController.js').timeDiffer(video.uploadDate);
  let showVideo = await videoModel.find({ _id: { $ne: video._id } }).populate('user');
  showVideo = showVideo.map(video => ({ ...video.toObject(), uploadDate: require('../utils/timeController.js').timeDiffer(video.uploadDate) }));
  const videoUrl = `https://${HOSTNAME}/${STORAGE_ZONE_NAME}/${video.filename}?accesskey=${STREAM_KEY}`;
  res.render('openVideo', { video, videoUrl, uploadDate, show, showVideo, loggedUser, left: false })
});

// ------------deleting Video -------------------

router.get('/deleteVideo/:id', isloggedIn, async function (req, res) {
  const video = await videoModel.findOneAndDelete({ _id: req.params.id });
  const user = await userModel.findOne({ username: req.user.username });
  user.uploadedVideos.splice(user.uploadedVideos.indexOf(req.params.id), 1);
  await user.save()
  res.redirect('/studio');
})

// ------------------------updateVideo------------------------

router.post('/updateVideo/:id', imageUpload.single('thumbnail'), async function (req, res) {
  let tags = req.body.tags.split(',');
  const video = await videoModel.findOneAndUpdate({ _id: req.params.id }, {
    title: req.body.title,
    description: req.body.description,
    tags: tags,
    visibility: req.body.visibility,
  },
    { new: true });
  res.redirect('/studio');
})

// ---------------------------playlist ----------------------------
router.get("/playlist/:title", async function (req, res) {
  const loggedUser = await userModel.findOne({ username: req.user.username });
  const playlist = await playlistModel.findOne({ title: req.params.title }).populate('user videos');
  res.render('playlist.ejs', { loggedUser, left: true, playlist });
})


// ---------------------------wathc later ----------------------------
router.get("/watchlater", async function (req, res) {
  const loggedUser = await userModel.findOne({ username: req.user.username }).populate('watchedlaterVideos');
  res.render('watchLater.ejs', { loggedUser, left: true });
})


// ------------------------find video-------------

router.get('/findVideo/:id', async function (req, res) {
  const video = await videoModel.findOne({ _id: req.params.id });
  res.json(video);
})

// -------------uploading routes --------------------

router.post('/videoUpload', videoUpload.single('video'), async function (req, res) {
  const video = await videoModel.create({
    user: req.user.id,
    filename: req.file.filename
  });
  const user = await userModel.findOneAndUpdate({ _id: req.user.id }, { $push: { uploadedVideos: video._id } }, { new: true })

  const response = await uploadFileToBunnyCDN(`./public/uploads/videos/${req.file.filename}`, req.file.filename);
  res.json(video);
})
router.post('/thumbnailupload/:id', imageUpload.single('thumbnail'), async function (req, res) {
  const video = await videoModel.findOneAndUpdate({ _id: req.params.id }, { thumbnail: req.file.filename }, { new: true });
  res.json(req.file);
})


router.post('/postVideo/:type/:id', async function (req, res) {
  const video = await videoModel.findOneAndUpdate({ _id: req.params.id }, req.body);
  let tags = req.body.tags.split(',');
  video.type = req.params.type;
  video.tags = tags;
  await video.save();
  res.redirect('/studio');
})


// ------------like dislike video----------

router.get('/like/:videoid', async function (req, res, next) {
  const loggedUser = await userModel.findOne({ username: req.session.passport.user.username });
  const video = await videoModel.findOne({ _id: req.params.videoid });
  if (video.likes.indexOf(loggedUser._id) === -1) {
    if (video.dislikes.indexOf(loggedUser._id) !== -1) {
      video.dislikes.splice(video.dislikes.indexOf(loggedUser._id), 1);
    }
    video.likes.push(loggedUser._id);
    loggedUser.likedVideos.push(video._id);
  } else {
    video.likes.splice(video.likes.indexOf(loggedUser._id), 1);
    loggedUser.likedVideos.splice(loggedUser.likedVideos.indexOf(video._id), 1);
  }
  await loggedUser.save();
  await video.save();
  res.status(200).json(video)
})

router.get('/dislike/:videoid', async function (req, res, next) {
  const loggedUser = await userModel.findOne({ username: req.session.passport.user.username });
  const video = await videoModel.findOne({ _id: req.params.videoid });
  if (video.dislikes.indexOf(loggedUser._id) === -1) {
    if (video.likes.indexOf(loggedUser._id) !== -1) {
      video.likes.splice(video.likes.indexOf(loggedUser._id), 1);
    }
    video.dislikes.push(loggedUser._id);
  } else {
    video.dislikes.splice(video.dislikes.indexOf(loggedUser._id), 1);
  }
  await video.save();
  res.status(200).json(video)
})

// ------------------watch later -----------------------

router.get('/watchlater/:videoid', async function (req, res, next) {
  const loggedUser = await userModel.findOne({ username: req.session.passport.user.username });
  const video = await videoModel.findOne({ _id: req.params.videoid });
  if (loggedUser.watchedlaterVideos.indexOf(video._id) === -1) {
    loggedUser.watchedlaterVideos.push(video._id);
  } else {
    loggedUser.watchedlaterVideos.splice(loggedUser.watchedlaterVideos.indexOf(video._id), 1);
  }
  await loggedUser.save();
})

// ---------------------------comment------------------------


router.post('/comment', isloggedIn, async function (req, res, next) {
  const video = await videoModel.findOne({ _id: req.body.data.video });
  const comment = await commentModel.create(req.body.data);
  video.comments.push(comment._id);
  await video.save();
  res.json(comment);
})

// -----------------------------reply--------------------------

router.post('/reply', isloggedIn, async function (req, res, next) {
  let comment = await commentModel.findOne({ _id: req.body.data.id });

  const newcomment = await commentModel.create({
    user: req.body.data.user,
    comment: req.body.data.comment,
  });
  if (comment.level == 0) newcomment.level = 1;
  else if (comment.level == 1) newcomment.level = comment._id;
  else {
    comment = await commentModel.findOne({ _id: comment.level });
    newcomment.level = comment._id;
  }
  await newcomment.save()
  comment.replies.push(newcomment._id);
  await comment.save();
  res.json(newcomment);

})

// -----------------------------show replies ----------------------

router.get('/showReplies', isloggedIn, async function (req, res, next) {
  const comment = await commentModel.findOne({ _id: req.query.commentId }).populate('replies');
  res.json(comment.replies);
})


// ------------------------subscribe ----------------------

router.get('/subscribe/:userid', async function (req, res, next) {
  const loggedUser = await userModel.findOne({ username: req.session.passport.user.username });
  const videoUser = await userModel.findOne({ _id: req.params.userid })
  let subs;
  if (loggedUser.subscribed.indexOf(videoUser._id) === -1) {
    loggedUser.subscribed.push(videoUser._id);
    videoUser.subscribers.push(loggedUser._id);
    subs = true;
  } else {
    loggedUser.subscribed.splice(loggedUser.subscribed.indexOf(videoUser._id), 1);
    videoUser.subscribers.splice(videoUser.subscribers.indexOf(loggedUser._id), 1);
    subs = false
  }
  await loggedUser.save();
  await videoUser.save();
  res.status(200).json(subs)
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


function isloggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');

}

module.exports = router;
