const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");

// Load User Model
const User = require("../models/User");

module.exports = function (passport) {
  passport.use(
    new LocalStrategy({ usernameField: "email" }, function (
      email,
      password,
      done
    ) {
      // Match User
      User.findOne({ email: email })
        .then(function (user) {
          if (!user) {
            return done(null, false, {
              message: "This email is not registered",
            });
          }

          //Match password
          bcrypt.compare(password, user.password, function (err, isMatch) {
            if (err) throw err;

            if (isMatch) {
              return done(null, user);
            } else {
              return done(null, false, { message: "Password is incorrect" });
            }
          });
        })
        .catch(function () {
          console.log(err);
        });
    })
  );

  passport.serializeUser(function (user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
      done(err, user);
    });
  });
};
