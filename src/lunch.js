const axios = require('axios');
const debug = require('debug')('lunchbot:lunch');
const qs = require('querystring');
const users = require('./users');

/*
 *  Send lunch creation confirmation via
 *  chat.postMessage to the user who created it
 */
const sendConfirmation = (lunch) => {
  axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
    token: process.env.SLACK_ACCESS_TOKEN,
    channel: lunchbot.userId,
    text: 'Lunch event has started!',
    attachments: JSON.stringify([
      {
        title: `Lunch event for ${lunch.userEmail}`,
        // Get this from the 3rd party helpdesk system
        title_link: 'http://example.com',
        text: lunch.text,
        fields: [
          {
            title: 'Lunch',
            value: lunch.title,
          },
          {
            title: 'Start Time',
            value: lunch.start_time || 'None provided',
          },
          {
            title: 'Status',
            value: 'Open',
            short: true,
          },
          {
            title: 'Restaurant Choices',
            value: lunch.choices,
            short: true,
          },
        ],
      },
    ]),
  })).then((result) => {
    debug('sendConfirmation: %o', result.data);
  }).catch((err) => {
    debug('sendConfirmation error: %o', err);
    console.error(err);
  });
};

// Create lunch. Call users.find to get the user's email address
// from their user ID
const create = (userId, submission) => {
  const lunch = {};

  const fetchUserEmail = new Promise((resolve, reject) => {
    users.find(userId).then((result) => {
      debug(`Find user: ${userId}`);
      resolve(result.data.user.profile.email);
    }).catch((err) => { reject(err); });
  });

  fetchUserEmail.then((result) => {
    lunch.userId = userId;
    lunch.userEmail = result;
    lunch.name = submission.name;
    lunch.status = '';
    lunch.start_time = submission.start_time;
    lunch.choices = '';
    sendConfirmation(lunch);

    return lunch;
  }).catch((err) => { console.error(err); });
};

module.exports = { create, sendConfirmation };
