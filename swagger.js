const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'omogjomog',
    description: 'omogjomog API',
  },
  host: '13.125.229.125',
  schemes: ['https'],
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./app.js'];

swaggerAutogen(outputFile, endpointsFiles, doc);
