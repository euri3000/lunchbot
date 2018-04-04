require('dotenv').config();

const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const qs = require('querystring');
const lunch = require('./lunch');
const debug = require('debug')('slash-command-template:index');

const app = express();

let lunchGorupUserList = [];
let lunchtTime = "12:00";
/*
 * Parse application/x-www-form-urlencoded && application/json
 */
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('<h2>The Slash Command and Dialog app is running</h2> <p>Follow the' +
  ' instructions in the README to configure the Slack App and your environment variables.</p>');
});

/*
 * Endpoint to receive /lunchbot slash command from Slack.
 * Checks verification token and opens a dialog to capture more info.
 */
app.post('/commands', (req, res) => {
  // extract the verification token, slash command text,
  // and trigger ID from payload
  const { token, text, trigger_id, channel_id } = req.body;

  // check that the verification token matches expected value
  if (token === process.env.SLACK_VERIFICATION_TOKEN) {
    // create the dialog payload - includes the dialog structure, Slack API token,
    // and trigger ID
    const command = text.split(" ");
    const user = {
      user_id: req.body.user_id,
      user_name: req.body.user_name,
    }
    console.log(lunchGorupUserList);
    let messageText;
    let dialog = {};
    if (command[0] == 'create') {
      console.log('command: ' + command[0]);
      dialog = {
        token: process.env.SLACK_ACCESS_TOKEN,
        trigger_id,
        dialog: JSON.stringify({
          title: 'Lunchbot',
          callback_id: 'lunchbot',
          submit_label: 'Create',
          elements: [
            {
              label: 'Time',
              type: 'text',
              name: 'start_time',
              value: command[1],
              hint: 'What time do you want to eat lunch?',
            },
            {
              label: 'Lunch name',
              type: 'text',
              name: 'name',
              value: '',
              hint: 'What should today\'s lunch be called?',
            },
          ],
        }),
      }; 
      axios.post('https://slack.com/api/dialog.open', qs.stringify(dialog))
        .then((result) => {
          debug('dialog.open: %o', result.data);
          res.send('');
        }).catch((err) => {
          debug('dialog.open call failed: %o', err);
          res.sendStatus(500);
        });

    } else if (command[0] === 'join') {
      console.log(lunchGorupUserList);
      const isIn = isInGroup(req.body.user_name);
      if (isIn.toString() === 'true') {
        console.log("hitting in");
        messageText = 'You are already joined in today lunch group!';
        const message = {
          token: process.env.SLACK_ACCESS_TOKEN,
          channel: channel_id,
          user: user.user_id,
          text: messageText,
          attachments: [{
            "text": "Today lunch time is " + lunchtTime + ". \n with " + lunchGorupUserList
          }]
        };
        axios.post('https://slack.com/api/chat.postEphemeral', qs.stringify(message))
          .then((result) => {
            debug('chat.postEphemeral: %o', result.data);
            res.send('');
          }).catch((err) => {
            debug('chat.postEphemeral call failed: %o', err);
            res.sendStatus(500);
          });
      } else {
        lunchGorupUserList.push(user);
        messageText = user.user_name + ' joined in today lunch group!'
        const message = {
          token: process.env.SLACK_ACCESS_TOKEN,
          response_type: "in_channel",
          channel: channel_id,
          text: messageText,
          attachments: [{
            "text": "Today lunch time is " + lunchtTime + ". \n with " + lunchGorupUserList
          }]
        };
        axios.post('https://slack.com/api/chat.postMessage', qs.stringify(message))
          .then((result) => {
            debug('chat.postMessage: %o', result.data);
            res.send('');
          }).catch((err) => {
            debug('chat.postMessage call failed: %o', err);
            res.sendStatus(500);
          });
      }
    } else if (command[0] === 'leave') {
      const isIn = isInGroup(req.body.user_name);
      if (isIn.toString() === 'true') {
        lunchGorupUserList = lunchGorupUserList.filter(function (el) {
          return el.user_name !== req.body.user_name;
        });
        messageText = user.user_name + ' left from today lunch group!'
        const message = {
          token: process.env.SLACK_ACCESS_TOKEN,
          response_type: "in_channel",
          channel: channel_id,
          text: messageText,
          attachments: [{
            "text": "Today lunch time is " + lunchtTime + ". \n with " + lunchGorupUserList
          }]
        };
        axios.post('https://slack.com/api/chat.postMessage', qs.stringify(message))
          .then((result) => {
            debug('chat.postMessage: %o', result.data);
            res.send('');
          }).catch((err) => {
            debug('chat.postMessage call failed: %o', err);
            res.sendStatus(500);
          });
      }
    }
    // open the dialog by calling dialogs.open method and sending the payload
  } else {
    debug('Verification token mismatch');
    res.sendStatus(500);
  }
});

function isInGroup(user_name) {
  return lunchGorupUserList.map(function (el) {
    if(el.user_name === user_name) {
      return true;
    };
  });
  return false;
}
/*
 * Endpoint to receive the dialog submission. Checks the verification token
 * and creates a LunchBot instance
 */
app.post('/interactive-component', (req, res) => {
  const body = JSON.parse(req.body.payload);

  // check that the verification token matches expected value
  if (body.token === process.env.SLACK_VERIFICATION_TOKEN) {
    debug(`Form submission received: ${body.submission.trigger_id}`);

    // immediately respond with a empty 200 response to let
    // Slack know the command was received
    res.send('');

    // create LunchBot instance
    lunch.create(body.user.id, body.submission);
  } else {
    debug('Token mismatch');
    res.sendStatus();
  }
});

app.post('/test', (req, res) => {
  const message = {
    "type": "message",
    "subtype": "bot_message",
    "ts": "1358877455.000010",
    "text": "Pushing is the answer",
    "bot_id": "BB12033",
    "username": "github",
    "icons": {}
  };
    axios.post('https://slack.com/api/bot_message', qs.stringify(message))
      .then((result) => {
        debug('dialog.open: %o', result.data);
        res.send('');
      }).catch((err) => {
        debug('dialog.open call failed: %o', err);
        res.sendStatus(500);
      });
})

app.listen(process.env.PORT, () => {
  console.log(`App listening on port ${process.env.PORT}!`);
});
