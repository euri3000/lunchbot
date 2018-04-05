require('dotenv').config();

const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const qs = require('querystring');
const lunch = require('./lunch');
const debug = require('debug')('slash-command-template:index');

const app = express();

let lunchGroupUserList = [];
let lunchName = 'The best lunch ever';
let lunchTime = new Date();
let lunchReminderTime = new Date();
lunchReminderTime.setMinutes(lunchTime.getMinutes() + 1);
let where = "Kuu ramen, John st."
let channelId = '';
let keyword = ['ramen', 'korean', 'japanese', 'pasta', 'bowl', 'american', 'chinese', 'italian'];
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
  data = {
    token: process.env.SLACK_ACCESS_TOKEN,
  };
  axios.get('https://slack.com/api/bots.info', {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          token: process.env.SLACK_ACCESS_TOKEN,
        }
      })
    .then((result) => {
      console.log('bots.info: %o', result.data);
    }).catch((err) => {
      onsole.log('bots.info call failed: %o', err);
    });
  // check that the verification token matches expected value
  if (token === process.env.SLACK_VERIFICATION_TOKEN) {
    // create the dialog payload - includes the dialog structure, Slack API token,
    // and trigger ID
    const command = text.split(" ");
    const user = {
      user_id: req.body.user_id,
      user_name: req.body.user_name,
    }
    channelId = channel_id;
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
              value: lunchName,
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
      setTimeout(function(){postConfirmationMessage(user, lunchName, lunchTime, channel_id);},10000);
    } else if (command[0] === 'join') {
      const isIn = isInGroup(req.body.user_name);
      if (isIn.toString() === 'true') {
        messageText = 'You are already joined in today lunch group! \n Today lunch time is ' + lunchTime.getHours() + ":" + lunchTime.getMinutes() + '. \n with ' + lunchGorupUserListToStringUserName(lunchGorupUserList);
        const message = {
          token: process.env.SLACK_ACCESS_TOKEN,
          channel: channel_id,
          user: user.user_id,
          text: messageText,
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
        lunchGroupUserList.push(user);
        console.log(lunchGroupUserList);
        messageText = '<@' + user.user_id + '> joined the lunch group ' + lunchName + '! :pizza:'
        const message = {
          token: process.env.SLACK_ACCESS_TOKEN,
          response_type: "in_channel",
          channel: channel_id,
          text: messageText,
          attachments: encodeURI([{
            "text": "Today's lunch time is " + lunchTime + ". \n with " + lunchGorupUserListToStringUserName(lunchGroupUserList)
          }])
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
        lunchGroupUserList = lunchGroupUserList.filter(function (el) {
          return el.user_name !== req.body.user_name;
        });
        messageText = '<@' + user.user_id + '> left from today lunch group! :wat2:'
        
        const message = {
          token: process.env.SLACK_ACCESS_TOKEN,
          response_type: "in_channel",
          channel: channel_id,
          text: messageText,
          attachments: [{
            "title": "Title",
            "pretext": "Pretext _supports_ mrkdwn",
            "text": "Testing *right now!*",
            "mrkdwn_in": ["text", "pretext"]
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
      } else {
        messageText = 'You did not join the group!';
        const message = {
          token: process.env.SLACK_ACCESS_TOKEN,
          channel: channel_id,
          user: user.user_id,
          text: messageText,
        };

        axios.post('https://slack.com/api/chat.postEphemeral', qs.stringify(message))
          .then((result) => {
            debug('chat.postEphemeral: %o', result.data);
            res.send('');
          }).catch((err) => {
            debug('chat.postEphemeral call failed: %o', err);
            res.sendStatus(500);
          });
      }
    }
  } else {
    debug('Verification token mismatch');
    res.sendStatus(500);
  }
});

function isInGroup(user_name) {
  return lunchGroupUserList.map(function (el) {
    if(el.user_name === user_name) {
      return true;
    };
  });
  return false;
}
let googleAPI = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=40.71362120,-74.015163&radius=500&type=restaurant&rating=4&key=AIzaSyCe1-MAKKNvMXIa8cSsfJtGYWeTk7kWAE0"
function findRestaurant(callback) {
  const randomNumber = Math.floor(Math.random() * 5);
  googleAPI = googleAPI + '&keyword=' + keyword[randomNumber]
  return axios.get(googleAPI)
    .then(function (response) {
      const results = response.data.results;
      let restaurantList;
      restaurantList = results.slice(0, 3).map(function (restaurant) {
        return {
          name: restaurant.name,
          rating: restaurant.rating,
          address: restaurant.vicinity,
        };
      });
      const restaurantListString = getFormattedText(restaurantList);
      callback(restaurantListString);
      return restaurantListString;
    })
    .catch(function (error) {
      console.log(error);
      return 0;
    });
}

function lunchGorupUserListToStringUserName(lunchGorupUserList) {
  let lunchGorupUserListString = '';
  lunchGorupUserList.map(function (user) {
    if (lunchGorupUserListString !== '') {
      lunchGorupUserListString = lunchGorupUserListString + ', ';
    }
    lunchGorupUserListString = lunchGorupUserListString + "<@" + user.user_id + ">"
  })
  return lunchGorupUserListString;
}

function getFormattedText(restaurantList) {
  let index = 1;
  let restaurantListString = '';
  restaurantList.map(function (restaurant) {
    restaurantListString = restaurantListString + index + ". *" + restaurant.name
      +"*, " + restaurant.address + " (rating: " + restaurant.rating + ") \n";
      index++;
  });
  return restaurantListString;
}
function postConfirmationMessage(user, lunchName, lunchTime, channel_id) {
  messageText = '<@' + user.user_id + '> just created the lunch group ' + lunchName + '! Lunch starts at ' + lunchTime.getHours() + ":" + lunchTime.getMinutes() + '.';
        const message = {
          token: process.env.SLACK_ACCESS_TOKEN,
          response_type: "in_channel",
          channel: channel_id,
          text: messageText,
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

    // update Lunch info
    lunchName = body.submission.name;
    let lunchInputTime = body.submission.start_time;
    var parts = lunchInputTime.split(':');
    var minutes = parts[1];
    var hours = parts[0];
    lunchTime.setHours(hours);
    lunchTime.setMinutes(minutes);
    console.log('Lunch time: ' + lunchTime);

  } else {
    debug('Token mismatch');
    res.sendStatus();
  }
});

app.listen(process.env.PORT, () => {
  console.log(`App listening on port ${process.env.PORT}!`);
});

let i = 0;
setInterval(() => {
  const now = new Date();
  console.log('current getTime:', lunchReminderTime.getTime() - now.getTime());
  console.log('lunch name: ' + lunchName);
  //TODO: check if group is created. 
  if (now.getTime() > lunchReminderTime.getTime() && lunchGroupUserList.length > 0) {
    console.log("TIME TO LEAVE!!!!!!!!! FOR LUNCH!!!");
    findRestaurant(function (restaurantList) {
      console.log(restaurantList);
      messageText = '<@here> :alert:  It\'s time to leave for lunch! :alert: \n'
      const message = {
        token: process.env.SLACK_ACCESS_TOKEN,
        response_type: "in_channel",
        channel: 'G9Z9B9YK0',
        text: messageText + restaurantList,
        attachments: encodeURI([{
          color: "#00ccec",
          author_name: "Lunch Bot",
          author_link: "https://www.kuuramen.com/",
          text: "leaving in 10mins to " + where + " with " + lunchGorupUserListToStringUserName(lunchGroupUserList),
        }]),
      };
      axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
      axios.post('https://slack.com/api/chat.postMessage', qs.stringify(message))
        .then((result) => {
          lunchGroupUserList = [];
          console.log('chat.postMessage: %o', result.data);
        }).catch((err) => {
          console.log(result.err);
          console.log('chat.postMessage call failed: %o', err);
        });
    });
  }
}, 10000)