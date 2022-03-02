const express = require('express');
const connect = require('./models');
const cors = require('cors');
const app = express();
require('dotenv').config();
connect();

const usersRouter = require('./routes/users')

const requestMiddleware = (req, res, next) => {
    console.log('Request URL:', req.originalUrl, ' - ', new Date());
    next();
  };

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(requestMiddleware);
app.use(cors());

app.use('/', [usersRouter]);

module.exports = app;