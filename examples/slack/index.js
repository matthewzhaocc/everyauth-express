const express = require('express');
const everyauth = require('@fusebit/everyauth-express');
const { v4: uuidv4 } = require('uuid');
const cookieSession = require('cookie-session');
const { WebClient } = require('@slack/web-api');

const app = express();
const port = 3000;
app.use(express.json());
app.use(express.urlencoded());

// Get userId from the authorization redirect or via session if already authorized.
const handleSession = (req, res, next) => {
  if (req.query.userId) {
    req.session.userId = req.query.userId;
  }
  if (!req.session.userId) {
    return res.redirect('/');
  }
  return next();
};

app.use(
  cookieSession({
    name: 'session',
    secret: 'secret',
  })
);

app.set('view engine', 'pug');

app.get('/', (req, res) => {
  if (!req.session.userId) {
    return res.redirect(`/authorize/${uuidv4()}`);
  }
  res.redirect('/finished');
});

app.use(
  '/authorize/:userId',
  (req, res, next) => {
    if (!req.params.userId) {
      return res.redirect('/');
    }
    return next();
  },
  everyauth.authorize('slack', {
    // The endpoint of your app where control will be returned afterwards
    finishedUrl: '/finished',
    // The user ID of the authenticated user the credentials will be associated with
    mapToUserId: (req) => req.params.userId,
  })
);

app.get('/finished', handleSession, async (req, res) => {
  const userCredentials = await everyauth.getIdentity("slack", req.session.userId);
    // Call Slack API
  const slackClient = new WebClient(userCredentials.accessToken);
  const userResponse = await slackClient.users.info({ user: userCredentials.native.authed_user.id })
  await slackClient.chat.postMessage({
    text: 'Hello world from EveryAuth!',
    channel: "#lizz-test",
  });
  res.render('index', { title: 'user profile', user: userResponse.user })
});

app.post('/message', handleSession, async (req, res) => {
  const userCredentials = await everyauth.getIdentity("slack", req.session.userId);
    // Call Slack API
  const slackClient = new WebClient(userCredentials.accessToken);
  const userResponse = await slackClient.users.info({ user: userCredentials.native.authed_user.id })
  await slackClient.chat.postMessage({
    text: req.body.message || "Please send a message",
    channel: "#lizz-test",
  });
  res.render('index', { title: 'user profile', user: userResponse.user, messageSent: true });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
