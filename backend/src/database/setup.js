require('dotenv').config();

const { DATABASE_PATH, initializeDatabase } = require('./index');

initializeDatabase();
console.log(`Database is ready at ${DATABASE_PATH}`);
