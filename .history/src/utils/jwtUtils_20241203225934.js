const jwt = require("jasonwebtoken");
const { secretKey } = require("../configuration/jwtConfig");

function generateToken(user)