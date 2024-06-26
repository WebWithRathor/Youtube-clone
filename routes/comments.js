const mongoose = require('mongoose');

const commentSchema = mongoose.Schema({
    comment: String,  // 1st level
    video: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'video'
    },
    user: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
    },
    replies: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'comment'
    }],
    level:{
        type:String,
        default:0
    }



})

module.exports = mongoose.model('comment', commentSchema)