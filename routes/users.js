const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/youtubeClone');

const userSchema = mongoose.Schema({
  username: String,
  email: String,
  channelName: String,
  profileImg:{
    type: String,
    default:'def.jpg'
  },
  backgroundImg:{
    type: String,
    default:'def.jpg'
  },
  likedVideos:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:'video'
  }],
  watchedVideos:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:'video'
  }],
  watchedlaterVideos:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:'video'
  }],
  watchedlaterplaylist:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:'playlist'
  }],
  uploadedVideos:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:'video'
  }],
  subscribed:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:'user'
  }],
  subscribers:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:'user'
  }],
  playlist:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:'playlist'
  }]
})

module.exports = mongoose.model('user',userSchema);