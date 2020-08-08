/**
 * Module dependencies.
 */

const express = require('express');
const bodyParser = require('body-parser');
const chalk = require('chalk');
const dotenv = require('dotenv');
const passport = require('passport');
const expressValidator = require('express-validator');

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.load({ path: '.env' });

/**
 * Controllers (route handlers).
 */
const userController = require('./controllers/user');
const checkerController = require('./controllers/checker');

/**
 * Create Express server.
 */
const app = express();

/**
 * Express configuration.
 */
app.set('host', '0.0.0.0');
app.set('port', process.env.PORT || 8080);
app.set('json spaces', 2); // number of spaces for indentation
app.use(bodyParser.json());
app.use(expressValidator());
app.use(passport.initialize());
app.use(passport.session());

app.post('/login', userController.postLogin);
app.post('/signup', userController.postSignup);
app.post('/changePassword', userController.postChangePassword)
app.get('/webhook', userController.getWebhook);
app.post('/checker/trySolve', authorizationMiddleware, checkerController.trySolve);
app.post('/checker/takeHint', authorizationMiddleware, checkerController.takeHint);
app.post('/checker/takeSolution', authorizationMiddleware, checkerController.takeSolution);
app.post('/checker/arrive', authorizationMiddleware, checkerController.arrive);

// authorize action call
function authorizationMiddleware(req, res, next){
    if (correctSecretProvided(req)) next();
    else res.sendStatus(403);
}

// check if the secret sent in the header equals to the secret stored as an env variable
function correctSecretProvided(req) {
    const requiredSecret = process.env.ACTION_SECRET_ENV;
    const providedSecret = req.headers['action_secret'];
    return requiredSecret == providedSecret;
}


/**
 * Start Express server.
 */
app.listen(app.get('port'), () => {
  console.log('%s App is running at http://localhost:%d in %s mode', chalk.green('✓'), app.get('port'), app.get('env'));
  console.log('  Press CTRL-C to stop\n');
});

module.exports = app;
