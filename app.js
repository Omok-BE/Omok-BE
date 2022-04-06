const express = require('express');
const connect = require('./models');
const cors = require('cors');
const Sentry = require("@sentry/node");
const swaggerUi = require("swagger-ui-express");
const swaggerFile = require("./swagger-output.json");
const app = express();
require('dotenv').config();
connect();

const usersRouter = require('./routes/users');
const lobbyRouter = require('./routes/lobby');
const gameRouter = require('./routes/games');
const adminRouter = require('./routes/admin');

Sentry.init({
  dsn: process.env.DSN,
  tracesSampleRate: 1.0,
});

app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerFile));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.static('./views'));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use('/', [usersRouter, lobbyRouter, gameRouter]);
app.use('/admin', adminRouter)

module.exports = app;