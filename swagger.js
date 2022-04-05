const swaggerAutogen = require("swagger-autogen")();

const doc = {
    info: {
        title: "omogjomog",
        description: "omogjomog API",
        version: "1.0.0"
    },
    host: "localhost:3000",
    schemes: ["https"],
};

const outputFile = "./swagger-output.json";
const endpointsFiles = ["./app.js"];

swaggerAutogen(outputFile, endpointsFiles, doc);
//swaggerAutogen으로 outputfile 파일을 app.js 루트로 api 들을 생성한다.
//이때 명령어는 터미널에서 node swagger.js
//package.json에 "prestart": "node ./swagger.js" 설정하면 명령어는 npm start