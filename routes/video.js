const mongoose = require('mongoose');

const videoSchema = mongoose.Schema({
    filename:String,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
    },
    tags:Array,
    title:String,
    description: String,
    thumbnail:String,
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
    comments:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'comment'
    }],
    uploadDate:{
        type: Date,
        default: Date.now
    },
    type:{
        type:String,
        default:'video'
    },
    visibility:{
        type:Boolean,
        default:false
    }
})

module.exports = mongoose.model('video', videoSchema)