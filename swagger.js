const swaggerAutogen = require("swagger-autogen")();

const doc = {
    info: {
        title: "omogjomog",
        description: "omogjomog API",
    },
    // host: "localhost:3000",
    host: "13.125.138.144",
    schemes: ["http"],
};

const outputFile = "./swagger-output.json";
const endpointsFiles = ["./app.js"];

swaggerAutogen(outputFile, endpointsFiles, doc);