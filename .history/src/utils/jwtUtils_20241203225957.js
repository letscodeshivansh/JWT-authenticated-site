const jwt = require("jasonwebtoken");
const { secretKey } = require("../configuration/jwtConfig");

function generateToken(user){
    const payload  = {
        id: user._id, 
        email
    }
}