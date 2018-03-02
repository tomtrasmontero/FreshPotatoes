const sqlite = require('sqlite'),
      Sequelize = require('sequelize'),
      axios = require('axios');
      express = require('express'),
      app = express();


const { PORT=3000, NODE_ENV='development', DB_PATH='./db/database.db' } = process.env;
const DB = new Sequelize('sqlite:../db/database.db');

// START SERVER
Promise.resolve()
  .then(() => app.listen(PORT, () => console.log(`App listening on port ${PORT}`)))
  .catch((err) => { if (NODE_ENV === 'development') console.error(err.stack); });

// SETUP Sequelize, sync, and query DB
const FILMS = DB.define('films', {
  id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    unique: true,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  release_date: {
    type: Sequelize.DATE,
    allowNull: false,
  },
  genre_id: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'films',
  timestamps: false,
});

DB.sync().then(() => console.log('success')).catch(err => console.log(err));


// ROUTES
app.get('/films/:id/recommendations', getFilmRecommendations);

// ROUTE HANDLER
function getFilmRecommendations(req, res) {
  res.status(500).send('Not Implemented');
}

module.exports = app;
