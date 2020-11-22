const express = require("express");
const router = express.Router();
const passport = require("passport");
const bcrypt = require("bcryptjs");
const async = require("async");
const nodemailer = require("nodemailer");
const crypto = require("crypto"); //Installation not required. Part of node js.
const path = require("path");
require("dotenv").config({ path: path.resolve("routes/.env") });

// User model
const User = require("../models/User");

// Login Page
router.get("/login", function (req, res) {
  res.render("login");
});

// Register Page
router.get("/register", function (req, res) {
  res.render("register");
});

// Register Handle
router.post("/register", function (req, res) {
  const { name, email, password, password2 } = req.body;
  let errors = [];

  // Check required fields
  if (!name || !email || !password || !password2) {
    errors.push({ msg: "Please fill in all fields" });
  }
  // Check passwords match
  if (password !== password2) {
    errors.push({ msg: "Passwords do not match" });
  }

  // Check password length
  if (password.length < 6) {
    errors.push({ msg: "Password should be at least 6 characters" });
  }

  // If there are errors
  if (errors.length > 0) {
    res.render("register", {
      errors,
      name,
      email,
      password,
      password2,
    });
  } else {
    //Validation passed
    User.findOne({ email: email }) //This is going to return a promise
      .then(function (user) {
        //If User exists
        if (user) {
          errors.push({ msg: "Email already registered" });
          res.render("register", {
            errors,
            name,
            email,
            password,
            password2,
          });
        } else {
          //If email not registered create a new User
          const newUser = new User({
            name, // es6 instead of 'name: name' and same for below
            email,
            password,
          });

          // Hash Password
          bcrypt.genSalt(10, function (err, salt) {
            bcrypt.hash(newUser.password, salt, function (err, hash) {
              if (err) throw err;
              //Set password to hashed
              newUser.password = hash;
              // Save user
              newUser
                .save()
                .then(function (user) {
                  req.flash(
                    "success_msg",
                    "You have been successfully registered and can now log in"
                  );
                  res.redirect("/users/login");
                })
                .catch(err, function () {
                  console.log(err);
                });
            });
          });
        }
      });
  }
});

// Login Handle
router.post("/login", function (req, res, next) {
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/users/login",
    failureFlash: true,
  })(req, res, next);
});

// Logout Handle
router.get("/logout", async function (req, res, next) {
  req.logout();
  // req.flash("success_logout", "You have been logged out");
  res.redirect("/");
  req.session.destroy();
});

// Forgot Password Page
router.get("/forgot", function (req, res) {
  res.render("forgot");
});

// Forgot Password Handle
router.post("/forgot", function (req, res, next) {
  async.waterfall(
    [
      function (done) {
        crypto.randomBytes(20, function (err, buf) {
          var token = buf.toString("hex");
          done(err, token); //This is where the token gets created
        });
      },
      function (token, done) {
        User.findOne({ email: req.body.email }, function (err, user) {
          //Finding a user by their email
          if (!user) {
            req.flash("error", "No account with that email address exists.");
            return res.redirect("/users/forgot");
          }

          user.resetPasswordToken = token; //If user was found, set resetPasswordTokn to token
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiration

          user.save(function (err) {
            done(err, token, user);
          });
        });
      },
      function (token, user, done) {
        var smtpTransport = nodemailer.createTransport({
          //createTransport is part of nodemailer
          service: "Gmail",
          auth: {
            user: "nirshihor@gmail.com",
            pass: process.env.GMAILPW, //Setting password through terminal: $ export GMAILPW=<password>
          },
          tls: {
            rejectUnautherized: false,
          },
        });
        var mailOptions = {
          //mailOption - what the users sees when email sent to them
          to: user.email,
          from: "nirshihor@gmail.com", //This can be any email you want them to reply to - doesn't need to be sending email
          subject: "WSS Password Reset",
          text:
            "You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n" +
            "Please click on the following link, or paste this into your browser to complete the process:\n\n" +
            "http://" +
            req.headers.host +
            "/users/reset/" +
            token +
            "\n\n" +
            "If you did not request this, please ignore this email and your password will remain unchanged.\n",
        };
        smtpTransport.sendMail(mailOptions, function (err) {
          console.log("mail sent");
          req.flash(
            "success_mail_sent",
            "If " +
              user.email +
              " is registered in our database, an e-mail has been sent to " +
              user.email +
              " with further instructions."
          );
          done(err, "done");
        });
      },
    ],
    function (err) {
      if (err) return next(err);
      res.redirect("/users/forgot");
    }
  );
});

router.get("/reset/:token", function (req, res) {
  User.findOne(
    {
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    },
    function (err, user) {
      if (!user) {
        req.flash(
          "error_token",
          "Password reset token is invalid or has expired."
        );
        return res.redirect("/users/forgot");
      } else {
        res.render("reset", { token: req.params.token });
      }
    }
  );
});

router.post("/reset/:token", function (req, res) {
  async.waterfall(
    [
      function (done) {
        User.findOne(
          {
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() },
          },
          function (err, user) {
            if (!user) {
              req.flash(
                "error_token",
                "Password reset token is invalid or has expired."
              );
              return res.redirect("back");
            } else {
              if (req.body.password === req.body.confirm) {
                // Hash New Password
                bcrypt.genSalt(10, function (err, salt) {
                  bcrypt.hash(req.body.password, salt, function (err, hash) {
                    if (err) throw err;
                    //Set password to hashed
                    user.password = hash;
                  });
                });

                user.setPassword(user.password, function (err) {
                  user.resetPasswordToken = undefined;
                  user.resetPasswordExpires = undefined;

                  //Update user in database
                  user.save(function (err) {
                    req.logIn(user, function (err) {
                      done(err, user);
                      req.flash(
                        "success_password_change",
                        "Your password has been successfully changed."
                      );
                      res.redirect("/users/login");
                    });
                  });
                });
              } else {
                req.flash("error_passwords_match", "Passwords do not match.");
                res.render("reset", { token: req.params.token });
              }
            }
          }
        );
      },
      function (user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: "Gmail",
          auth: {
            user: "nirshihor@gmail.com",
            pass: process.env.GMAILPW,
          },
        });
        var mailOptions = {
          to: user.email,
          from: "nirshihor@mail.com",
          subject: "Your password has been changed",
          text:
            "Hello,\n\n" +
            "This is a confirmation that the password for your account " +
            user.email +
            " has just been changed.\n",
        };
        smtpTransport.sendMail(mailOptions, function (err) {
          req.flash(
            "success_password_change",
            "Success! Your password has been changed."
          );
          done(err);
        });
      },
    ],
    function (err) {
      res.redirect("/home");
    }
  );
});

module.exports = router;
