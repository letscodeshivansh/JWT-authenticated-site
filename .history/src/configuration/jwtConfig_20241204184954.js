const crypto = require("crypto");

const secretKey = process.env.JWT_SECRET || "yourStaticSecretKey";

module.exports = {
  secretKey: secretKey
};
