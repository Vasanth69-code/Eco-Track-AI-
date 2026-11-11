const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport = require('passport');
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL, FRONTEND_URL } = require('./envConfig');
const { findOrCreateUser } = require('../services/authService');

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        // Force the callback URL to be the backend URL
        callbackURL: process.env.GOOGLE_REDIRECT_URI || GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const { id, displayName, emails, photos } = profile;
          const email = emails[0].value;
          const picture = photos[0]?.value;
          
          const user = await findOrCreateUser({
            googleId: id,
            email,
            name: displayName,
            picture,
            authProvider: 'google'
          });
          
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
} else {
  console.log('ℹ️  Google OAuth credentials not configured; Google auth is disabled.');
}

passport.serializeUser((user, done) => {
  done(null, user.userId);
});

passport.deserializeUser(async (userId, done) => {
  try {
    const { getUserById } = require('../services/authService');
    const user = await getUserById(userId);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
