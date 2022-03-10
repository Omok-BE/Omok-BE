const express = require("express");
const connect = require("./models");
const cors = require("cors");
const app = express();
require("dotenv").config();
connect();

const usersRouter = require("./routes/users");
const lobbyRouter = require('./routes/lobby');
const gameRouter = require('./routes/games');
const roomRouter = require('./routes/room')

const requestMiddleware = (req, res, next) => {
  console.log("Request URL:", req.originalUrl, " - ", new Date(+new Date() + 3240 * 10000)
  .toISOString()
      .replace("T", " ")
      .replace(/\..*/, "")
  );
  next();
};

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(requestMiddleware);
app.use(cors({
  origin: true,
  credentials: true
}));

app.use("/", [usersRouter, lobbyRouter, gameRouter, roomRouter]);

module.exports = app;
