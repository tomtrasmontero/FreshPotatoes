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

const GENRES = DB.define('genres', {
  id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    unique: true,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false,
  },
}, {
  tableName: 'genres',
  timestamps: false,
});

DB.sync().then(() => console.log('success')).catch(err => console.log(err));


// ROUTES
app.get('/films/:id/recommendations', getFilmRecommendations);

// ROUTE HANDLER
function getFilmRecommendations(req, res) {
  res.status(500).send('Not Implemented');
}

// Utility/ Helper Functions
function getReviews(filmId) {
  // need to get list of film ID !!!!!
  const REVIEWS_BASE_URL =
  "http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1";
  const URL = `${REVIEWS_BASE_URL}?films=${filmId}`;

  // fetch reviews and return data to be saved in DB
  // check < 5 reviews and avg rev > 4
  return axios
    .get(URL)
    .then(request => {
      const FILMS_WITH_PASSING_CRITERIA = request.data.reduce((filmCollection, film) => {
        // filter the review that meet the criteria > 4 review, > 4 rating
        const TOTAL_REVIEWS = film.reviews.length;
        let AVG_RATINGS = 0;
        let TOTAL_RATINGS = 0;

        if(TOTAL_REVIEWS < 5){
          return [...filmCollection];
        }

        film.reviews.forEach((review) => {
          TOTAL_RATINGS += review.rating;
        });

        AVG_RATINGS = TOTAL_RATINGS / TOTAL_REVIEWS;

        if(AVG_RATINGS < 4) {
          return [...filmCollection];
        }

        return [...filmCollection, Object.assign({}, {
          film_id: film.film_id,
          averageRating: AVG_RATINGS.toFixed(2),
          reviews: TOTAL_REVIEWS,
        })];
      }, []);

      return FILMS_WITH_PASSING_CRITERIA;
    })
    .catch(err => console.log(err, 'error in reviews'));
};


function checkDate(parentDate, checkDate) {
  const FIFTEEN_YEARS_MILLI_SEC = 31556952000 * 15;
  const DELTA_IN_MILLI_SEC = Math.abs(new Date(parentDate) - new Date(checkDate));
  return DELTA_IN_MILLI_SEC <= FIFTEEN_YEARS_MILLI_SEC;
};

function transformResponse(reviews) {
  const BASE_SUCCESS_RES = {
    recommendations: [],
    meta: {
      limit: 10,
      offset: 0,
    },
  };
  BASE_SUCCESS_RES.recommendations = reviews;

  return BASE_SUCCESS_RES;
};

module.exports = app;
