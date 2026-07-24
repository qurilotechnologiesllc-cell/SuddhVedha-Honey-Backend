const { Server } = require("socket.io");

let io;

const ADMIN_ROOM = "ADMIN_ROOM";

const initializeSocket = (server) => {

    io = new Server(server, {

        cors: {

            origin: [

                "http://localhost:3000",

                "https://frontend-3000.devtunnels.ms"

            ],

            credentials: true

        }

    });

    io.on("connection", (socket) => {

        console.log("✅ Socket Connected:", socket.id);

        socket.on("join-admin-room", () => {

            socket.join(ADMIN_ROOM);

            console.log(`✅ Socket ${socket.id} joined ${ADMIN_ROOM}`);

        });

        socket.on("disconnect", () => {

            console.log("❌ Socket Disconnected :", socket.id);

        });

    });

};

const getIO = () => {

    if (!io) {

        throw new Error("Socket.io not initialized.");

    }

    return io;

};

module.exports = {

    initializeSocket,

    getIO,

    ADMIN_ROOM

};