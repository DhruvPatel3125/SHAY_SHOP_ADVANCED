const mongoose = require('mongoose');
const bookingSchema = mongoose.Schema({
    room:{
        type:mongoose.Schema.Types.ObjectId,
        ref: "Room", // Reference to the Room model
        required:true
    },
    roomid:{
        type: String, // Keep roomid as string if it's used for direct lookup without populate
        required:true
    },
    userid:{
        type:mongoose.Schema.Types.ObjectId,
        ref: "User", // Reference to the User model
        required:true
    },
    fromdate:{
        type:String,
        required:true
    },
    todate:{
        type:String,
        required:true
    },
    totalammount:{
        type:Number,
        required:true
    },
    totaldays:{
        type:Number,
        required:true
    },
    transactionId:{
        type:String,
        required:true   
    },
    status:{
        type:String,
        required:true,
        default:'booked'
    }
},{
    timestamps:true,
})

const bookingModel = mongoose.model('bookings',bookingSchema);
module.exports = bookingModel;
