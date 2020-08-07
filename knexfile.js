// Update with your config settings.

const databaseName = "postgres";
const pg = require('pg');

require('dotenv').config()


exports.main_db = {
  client: 'pg',
  connection: `${process.env.DATABASE_URL}?ssl=true`,
  migrations: {
    directory: __dirname + '/db/migrations'
  },
};

exports.api_db = {
  client: 'pg',
  connection: `${process.env.HEROKU_POSTGRESQL_ROSE_URL}?ssl=true`,
}
