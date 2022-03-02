const app = require("./app");
// const { users } = require('./models')

const httpServer = require("http").createServer(app);
const { Server } = require('socket.io')
const { instrument } = require('@socket.io/admin-ui')

const io = new Server(httpServer, {
    cors: {
    origin: ["https://admin.socket.io"],
    credentials: true
    }
});
instrument(io, {
    auth: false
});

io.on("connection", (socket) => {
    console.log("client와 연결됨 ✅")
    socket.onAny((event) => {
        console.log(`Socket Event: ${event}`)
    })
})

module.exports = { httpServer };