const express = require('express');
const connect = require('./models');
const cors = require('cors');
// const Sentry = require("@sentry/node");
const app = express();
require('dotenv').config();
connect();

const usersRouter = require('./routes/users');
const lobbyRouter = require('./routes/lobby');
const gameRouter = require('./routes/games');
const adminRouter = require('./routes/admin');


// Sentry.init({
//   dsn: process.env.DSN,
  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
//   tracesSampleRate: 1.0,
// });
// const transaction = Sentry.startTransaction({
//   op: "test",
//   name: "My First Test Transaction",
// });

// setTimeout(() => {
//   try {
//     foo();
//   } catch (e) {
//     Sentry.captureException(e);
//   } finally {
//     transaction.finish();
//   }
// }, 99);

// const requestMiddleware = (req, res, next) => {
//   console.log(
//     'Request URL:',
//     req.originalUrl,
//     ' - ',
//     new Date(+new Date() + 3240 * 10000)
//       .toISOString()
//       .replace('T', ' ')
//       .replace(/\..*/, '')
//   );
//   next();
// };
// app.use(requestMiddleware);


//스웨거 자동생성을 위한 코드
// const swaggerUi = require("swagger-ui-express");
// //스웨거 아웃풋파일 저장 위치
// const swaggerFile = require("./swagger-output.json");

// app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerFile));
// app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerFile, { explorer:true }));

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
