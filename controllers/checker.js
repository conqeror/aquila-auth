const passport = require('../config/passport');
const Knex = require('knex');
const {api_db} = require('../knexfile');

const knex = Knex(api_db);

exports.trySolve = async (req, res, next) => {
  const {solution} = req.body;
  const teamId = req.headers['x-hasura-user-id'];
  if (!teamId) {
    res.status(403).json({
      error: 'No user id supplied in headers'
    });
  }
  Promise.all([
    knex
      .from('teams')
      .join('routes', {'teams.route_id': 'routes.id'})
      .join('teams_status', {'teams.id': 'teams_status.team_id'})
      .where({
        team_id: teamId,
      })
      .first()
      .select("*"),
    knex.from('ciphers').select("*")
  ]).then(
    ([team, ciphers]) => {
      if (!team) {
        res.status(403).json({
          error: 'Wrong user id'
        });
      }
      const currentCipherNumber = team['current_cipher_number'];
      const currentCipher = ciphers.find((cipher) => cipher['cipher_number'] === currentCipherNumber)
      if (currentCipher['solution'] === solution) {
        knex
          .from('teams_status')
          .where({
            team_id: teamId,
          })
          .update({
            next_cipher_coordinates: team['places'][String(currentCipherNumber + 1)],
            next_hint_time: null,
            next_solution_time: null,
            hint_text: null,
            solution_text: null,
          })
          .then((result) => {
            res.status(200).json({
              status: "OK",
            });
          })
          .catch((e) => {
            console.log(e);
            res.status(500).json({error: 'Try again'});
          })
        
      } else {
        res.status(200).json({
          error: "Wrong solution!",
        })
      }
    }
  ).catch((e) => {
    console.log(e);
    res.status(500).json({});
  })
}

exports.takeHint = async (req, res, next) => {
  const teamId = req.headers['x-hasura-user-id'];
  if (!teamId) {
    res.status(403).json({
      error: 'No user id supplied in headers'
    });
  }
  Promise.all([
    knex
      .from('teams')
      .join('teams_status', {'teams.id': 'teams_status.team_id'})
      .where({
        team_id: teamId,
      })
      .first()
      .select("*"),
    knex.from('ciphers').select("*")
  ]).then(
    ([team, ciphers]) => {
      if (!team) {
        res.status(403).json({
          error: 'Wrong user id'
        });
      }
      const currentCipherNumber = team['current_cipher_number'];
      const currentCipher = ciphers.find((cipher) => cipher['cipher_number'] === currentCipherNumber)
      if (new Date().valueOf() < Number(team['next_hint_time'])) {
        res.status(200).json({
          message: 'Too early!'
        });
      } else {
        knex
          .from('teams_status')
          .where({
            team_id: teamId,
          })
          .update({
            next_hint_time: null,
            hint_text: currentCipher['hint_text'],
          })
          .then((result) => {
            res.status(200).json({
              status: "OK",
            });
          })
          .catch((e) => {
            console.log(e);
            res.status(500).json({error: 'Try again'});
          })
      }})
    .catch((e) => {
      console.log(e);
      res.status(500).json({});
    })
}

exports.takeSolution = async(req, res, next) => {
  const teamId = req.headers['x-hasura-user-id'];
  if (!teamId) {
    res.status(403).json({
      error: 'No user id supplied in headers'
    });
  }
  Promise.all([
    knex
      .from('teams')
      .join('teams_status', {'teams.id': 'teams_status.team_id'})
      .where({
        team_id: teamId,
      })
      .first()
      .select("*"),
    knex.from('ciphers').select("*")
  ]).then(
    ([team, ciphers]) => {
      if (!team) {
        res.status(403).json({
          error: 'Wrong user id'
        });
      }
      const currentCipherNumber = team['current_cipher_number'];
      const currentCipher = ciphers.find((cipher) => cipher['cipher_number'] === currentCipherNumber)
      if (new Date().valueOf() < Number(team['next_solution_time'])) {
        res.status(200).json({
          error: 'Too early!'
        });
      } else {
        knex
          .from('teams_status')
          .where({
            team_id: teamId,
          })
          .update({
            next_solution_time: null,
            solution_text: currentCipher['solution_text'],
          })
          .then((result) => {
            res.status(200).json({
              status: "OK",
            });
          })
          .catch((e) => {
            console.log(e);
            res.status(500).json({error: 'Try again'});
          })
      }})
    .catch((e) => {
      console.log(e);
      res.status(500).json({});
    })
}

exports.arrive = async (req, res, next) => {
  console.log(req);
  passport.authenticate('bearer', (err, user, info) => {
    if (err) { 
      console.log(err)
      return res.status(403).json({
        error: 'No user id supplied in headers'
      });
    }
    if (user) {
      console.log(user)
      const teamId = user.id
      Promise.all([
        knex
          .from('teams')
          .join('teams_status', {'teams.id': 'teams_status.team_id'})
          .where({
            team_id: teamId,
          })
          .first()
          .select("*"),
        knex.from('ciphers').select("*")
      ]).then(
        ([team, ciphers]) => {
          if (!team) {
            return res.status(403).json({
              error: 'Wrong user id'
            });
          }
          if (!team['next_cipher_coordinates']) {
            return res.status(200).json({
              error: 'You need to solve cipher first! :)'
            });
          }
          const currentCipherNumber = team['current_cipher_number'];
          const nextCipher = ciphers.find((cipher) => cipher['cipher_number'] === currentCipherNumber + 1)
          knex
            .from('teams_status')
            .where({
              team_id: teamId,
            })
            .update({
              current_cipher_number: nextCipher['cipher_number'],
              current_cipher_code: nextCipher['cipher_code'],
              next_cipher_coordinates: null,
              next_hint_time: new Date().valueOf() + nextCipher['hint_time']*60000,
              next_solution_time: new Date().valueOf() + nextCipher['solution_time']*60000,
              hint_text: null,
              solution_text: null,
            })
            .then((result) => {
              return res.status(200).json({
                status: "OK",
              });
            })
            .catch((e) => {
              console.log(e);
              return res.status(500).json({error: 'Try again'});
            })
          })
        .catch((e) => {
          console.log(e);
          return res.status(500).json({});
        })
    } else {
      return res.status(403).json({
        error: 'No user id supplied in headers'
      });
    }
  })(req, res, next);
}

