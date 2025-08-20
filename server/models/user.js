const mongoose = require('mongoose')
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    provider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    },
    googleUid: {
        type: String
    }
},{
    timestamps:true,
})  

userSchema.methods.matchPassword = async function(enteredPassword){
    return await bcrypt.compare(enteredPassword,this.password)
}

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next(); // important: return to avoid falling through
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
})

const userModel = mongoose.models.User || mongoose.model('User',userSchema);

module.exports = userModel