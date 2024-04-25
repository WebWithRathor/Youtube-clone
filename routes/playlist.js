const mongoose = require('mongoose');

const playlistSchema = mongoose.Schema({
    videos:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'video'
    }],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
    },
    title:String,
    description: String,
    views:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user'
    }],
    likes:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user'
    }],
    dislikes:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user'
    }],
    uploadDate:{
        type: Date,
        default: Date.now
    },
    type:{
        type:String,
        default:'playlist'
    },
    visibility:{
        type:Boolean,
        default:false
    }

})

module.exports = mongoose.model('playlist', playlistSchema)