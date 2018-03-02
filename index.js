// ALL WORK inside index.js, Don't Modify Files/Folder Structure
const sqlite = require('sqlite'),
      Sequelize = require('sequelize'),
      axios = require('axios');
      express = require('express'),
      app = express();


const { PORT=3000, NODE_ENV='development', DB_PATH='./db/database.db' } = process.env;
const DB = new Sequelize('sqlite:./db/database.db');

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

// catchall handler
app.get('*', (req, res) => {
  res.status(404).send({message: '"message" key missing'});
})

// ROUTE HANDLER
function getFilmRecommendations(req, res, next) {
  // check req object => error handler
  FILMS.findAll({where: {id: req.params.id, status: 'Released'}, raw: true})
    .then((filmBeingLookedUp) => {
      const FILMS_RESULT = FILMS.findAll({
        where: {genre_id: filmBeingLookedUp[0].genre_id}, raw: true,
      });
      const MOVIE_GENRE = GENRES.findAll({
        where: {id: filmBeingLookedUp[0].genre_id}, raw: true,
      });

      return Promise.all([FILMS_RESULT, filmBeingLookedUp[0], MOVIE_GENRE]);
    })
    .then((filmResults) => {
      // remember to attach genre
      const [FILMS, QUERIED_FILM, MOVIE_GENRE] = filmResults;
      const FILMS_WITHIN_15YRS = FILMS.filter((film) => {
        return checkDate(QUERIED_FILM.release_date, film.release_date);
      });
      const REVIEW_COLLECTION_STRING = FILMS_WITHIN_15YRS.map(film => film.id).join(',');
      const VERIFIED_FILMS_W_REVIEWS = getReviews(REVIEW_COLLECTION_STRING, MOVIE_GENRE[0].name);

      return Promise.all([FILMS_WITHIN_15YRS, VERIFIED_FILMS_W_REVIEWS]);
    })
    .then(verifiedFilms => {
      const [FILMS_WITHIN_15YRS, VERIFIED_FILMS_W_REVIEWS] = verifiedFilms;
      const RECOMMENDED_FILMS = VERIFIED_FILMS_W_REVIEWS.reduce((filmCollection, film) => {
        for (let i = 0; i < FILMS_WITHIN_15YRS.length; i++) {
          if (FILMS_WITHIN_15YRS[i].id === film.film_id) {
            return [...filmCollection, Object.assign(FILMS_WITHIN_15YRS[i], film)];
          };
        };
      }, []);

      res.send(transformResponse(RECOMMENDED_FILMS, req.query));
    })
    .catch(err => {
      console.log(err);
      next();
    });
}


// Utility/ Helper Functions
function getReviews(filmId, genre) {
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
          averageRating: AVG_RATINGS,
          reviews: TOTAL_REVIEWS,
          genre,
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

function transformResponse(reviews, query) {
  const BASE_SUCCESS_RES = {
    recommendations: [],
    meta: {
      limit: query.limit || 10,
      offset: query.offset || 0,
    },
  };

  reviews.forEach((review) => {
    const BASE_RECOMMENDATION = {
      id: review.id,
      title: review.title,
      releaseDate: review.release_date,
      genre: review.genre,
      averageRating: review.averageRating.toFixed(2),
      reviews: review.reviews,
    };

    BASE_SUCCESS_RES.recommendations.push(BASE_RECOMMENDATION);
  });

  if (query.limit) {
    BASE_SUCCESS_RES.recommendations.splice(query.limit);
  };

  if(query.offset) {
    BASE_SUCCESS_RES.recommendations.splice(0, query.offset);
  };

  console.log(BASE_SUCCESS_RES);
  return BASE_SUCCESS_RES;
};

module.exports = app;
