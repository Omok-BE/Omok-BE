const mongoose = require('mongoose');

const connect = () => {
  mongoose
    .connect(process.env.MONGO_URL || 'mongodb://localhost:27017/Omok', {
      ignoreUndefined: true,
    })
    .catch((err) => {
      console.error(err);
    });
};

module.exports = connect;