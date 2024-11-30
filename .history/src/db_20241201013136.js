const express = requrie("express");
const http = require('http');
const bcrypt = require('bcrypt');
const app = express();
const server = http.createServer(app);