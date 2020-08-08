const Knex = require('knex');
const {api_db} = require('../knexfile');

const knex = Knex(api_db);

exports.trySolve = async (req, res, next) => {
  const solution = req.body['input']['solution'];
  const teamId = req.body['session_variables']['x-hasura-user-id'];
  if (!teamId) {
    res.status(403).json({
      message: 'No user id supplied in headers'
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
    async ([team, ciphers]) => {
      if (!team) {
        res.status(403).json({
          message: 'Wrong user id'
        });
      }
      const currentCipherNumber = team['current_cipher_number'];
      const currentCipher = ciphers.find((cipher) => cipher['cipher_number'] === currentCipherNumber)
      if (currentCipher['solution'] === solution) {
        await knex('submits').insert({action: 'SOLVE', payload: solution, team_id: teamId, cipher_number: currentCipherNumber})
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
            last_solved_cipher_number: currentCipherNumber
          })
          .then((result) => {
            res.status(200).json({
              status: "OK",
            });
          })
          .catch((e) => {
            console.log(e);
            res.status(500).json({message: 'Try again'});
          })
        
      } else {
        await knex('submits').insert({action: 'BAD SOLUTION', payload: solution, team_id: teamId, cipher_number: currentCipherNumber})
        res.status(200).json({
          error: "Wrong solution!",
        })
      }
    }
  ).catch((e) => {
    console.log(e);
    res.status(500).json({
      message: 'Server error'
    });
  })
}

exports.takeHint = async (req, res, next) => {
  const teamId = req.body['session_variables']['x-hasura-user-id'];
  if (!teamId) {
    res.status(403).json({
      message: 'No user id supplied in headers'
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
    async ([team, ciphers]) => {
      if (!team) {
        res.status(403).json({
          message: 'Wrong user id'
        });
      }
      const currentCipherNumber = team['current_cipher_number'];
      const currentCipher = ciphers.find((cipher) => cipher['cipher_number'] === currentCipherNumber)
      if (new Date().valueOf() < Number(team['next_hint_time'])) {
        await knex('submits').insert({action: 'HINT EARLY', team_id: teamId, cipher_number: currentCipherNumber})
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
            next_hint_time: null,
            hint_text: currentCipher['hint_text'],
          })
          .then(async (result) => {
            await knex('submits').insert({action: 'HINT', team_id: teamId, cipher_number: currentCipherNumber})
            res.status(200).json({
              status: "OK",
            });
          })
          .catch((e) => {
            console.log(e);
            res.status(500).json({message: 'Try again'});
          })
      }})
    .catch((e) => {
      console.log(e);
      res.status(500).json({
        message: 'Server error'
      });
    })
}

exports.takeSolution = async(req, res, next) => {
  const teamId = req.body['session_variables']['x-hasura-user-id'];
  if (!teamId) {
    res.status(403).json({
      message: 'No user id supplied in headers'
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
    async ([team, ciphers]) => {
      if (!team) {
        res.status(403).json({
          message: 'Wrong user id'
        });
      }
      const currentCipherNumber = team['current_cipher_number'];
      const currentCipher = ciphers.find((cipher) => cipher['cipher_number'] === currentCipherNumber)
      if (new Date().valueOf() < Number(team['next_solution_time'])) {
        await knex('submits').insert({action: 'SKIP EARLY', team_id: teamId, cipher_number: currentCipherNumber})
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
          .then(async (result) => {
            await knex('submits').insert({action: 'SKIP', team_id: teamId, cipher_number: currentCipherNumber})
            res.status(200).json({
              status: "OK",
            });
          })
          .catch((e) => {
            console.log(e);
            res.status(500).json({message: 'Try again'});
          })
      }})
    .catch((e) => {
      console.log(e);
      res.status(500).json({
        message: 'Server error'
      });
    })
}

exports.arrive = async (req, res, next) => {
  const teamId = req.body['session_variables']['x-hasura-user-id'];
  if (!teamId) {
    res.status(403).json({
      message: 'No user id supplied in headers'
    });
  }
  Promise.all([
    knex
      .from('teams')
      .join('teams_status', {'teams.id': 'teams_status.team_id'})
      .join('routes', {'teams.route_id': 'routes.id'})
      .where({
        team_id: teamId,
      })
      .first()
      .select("*"),
    knex.from('ciphers').select("*")
  ]).then(
    async ([team, ciphers]) => {
      if (!team) {
        res.status(403).json({
          message: 'Wrong user id'
        });
      }
      if (!team['next_cipher_coordinates']) {
        res.status(403).json({
          message: 'You need to solve cipher first! :)'
        });
      }
      const lastSolvedCipher = team['last_solved_cipher_number']
      const currentCipherNumber = team['current_cipher_number'];
      const nextCipher = ciphers.find((cipher) => cipher['cipher_number'] === currentCipherNumber + 1)
      if (nextCipher['cipher_number'] > lastSolvedCipher + 1) {
        res.status(403).json({
          message: 'You need to solve cipher first! :)'
        });
      }
      knex
        .from('teams_status')
        .where({
          team_id: teamId,
        })
        .update({
          current_cipher_number: nextCipher['cipher_number'],
          current_cipher_code: nextCipher['cipher_code'],
          current_cipher_coordinates: team['next_cipher_coordinates'],
          next_cipher_coordinates: null,
          next_hint_time: new Date().valueOf() + nextCipher['hint_time']*60000,
          next_solution_time: new Date().valueOf() + nextCipher['solution_time']*60000,
          hint_text: null,
          solution_text: null,
        })
        .then(async (result) => {
          await knex('submits').insert({action: 'ARRIVE', team_id: teamId, cipher_number: currentCipherNumber + 1})
          res.status(200).json({
            status: "OK",
          });
        })
        .catch((e) => {
          console.log(e);
          res.status(500).json({message: 'Try again'});
        })
      })
    .catch((e) => {
      console.log(e);
      res.status(500).json({
        message: 'Server error'
      });
    })
}

