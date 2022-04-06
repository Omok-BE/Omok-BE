const { httpServer } = require('./socket/socket');
const port = process.env.PORT;

httpServer.listen(port, () => {
  console.log('Start listen Server on ', port);
});