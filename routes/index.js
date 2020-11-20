const express = require("express");
const router = express.Router();
const path = require("path");
const bodyParser = require("body-parser");
const methodOverride = require("method-override");

router.use(bodyParser.urlencoded({ extended: false }));
router.use(methodOverride("_method"));

const firstStory =
  "A few weeks after school started she was forced to admit that Jake had been right to insist that none of the teachers or the other children would notice anything, provided he kept his hair long and made sure to file down the stumps.";

const Story = require("../models/Story");
const User = require("../models/User");
const { db } = require("../models/Story");

// Home Page
router.get("/", function (req, res, next) {
  if (req.isAuthenticated()) {
    res.render(path.resolve("views/home"), {
      loggedIn: true,
      name: req.user.name,
      greeting: "Welcome",
    });
    return next();
  } else {
    res.render(path.resolve("views/home"), {
      loggedIn: false,
      name: "",
      greeting: "",
    });
  }
});

// About Page
router.get("/about", function (req, res, next) {
  if (req.isAuthenticated()) {
    res.render(path.resolve("views/about"), {
      loggedIn: true,
      name: req.user.name,
      greeting: "Welcome",
    });
    return next();
  } else {
    res.render(path.resolve("views/about"), {
      loggedIn: false,
      name: "",
      greeting: "",
    });
  }
});

// Read Page
// My Stories link
router.get("/read/mystories", async function (req, res, next) {
  var theGenre = "";
  var userId = req.user._id;

  // Selecting story where story.userId equals userId and dropping id element (otherwise automatically included)
  myStories = await Story.find({})
    // Take story.userId from stories collection...
    .where("userId")
    // ...and compare to user._id of user that is logged in and if equal...
    .equals(userId)
    // ...then display the story without the id
    .select()
    // Display stories in reverse order (last first)
    .sort({ createdAt: -1 });
  theStories = myStories;

  var storyGenre = "";
  if (theGenre == 1) {
    storyGenre = "Crime";
  } else if (theGenre == 2) {
    storyGenre = "Horror";
  } else if (theGenre == 3) {
    storyGenre = "Love";
  } else if (theGenre == 4) {
    storyGenre = "Science Fiction";
  } else if (theGenre == 5) {
    storyGenre = "Other";
  }

  if (req.isAuthenticated()) {
    userId = req.user.id;
    res.render(path.resolve("views/read"), {
      loggedIn: true,
      name: req.user.name,
      theStories,
      userId,
      // Create genre here in order to pass to All link in read.ejs
      genre: req.query.genre,
      storyGenre,
    });
  }
});

// All other 'read' links (other than My Stories)
router.get("/read", async function (req, res, next) {
  var theGenre = "";
  userId = "";

  // If URL contains genre variable then find story by theGenre
  if (req.query.genre) {
    theGenre = req.query.genre;
    theStories = await Story.find({ genre: theGenre }).sort({ createdAt: -1 });
  }
  // Otherwise, find all stories
  else {
    theStories = await Story.find().sort({ createdAt: -1 });
  }

  var storyGenre = "";
  if (theGenre == 1) {
    storyGenre = "Crime";
  } else if (theGenre == 2) {
    storyGenre = "Horror";
  } else if (theGenre == 3) {
    storyGenre = "Love";
  } else if (theGenre == 4) {
    storyGenre = "Science Fiction";
  } else if (theGenre == 5) {
    storyGenre = "Other";
  }

  if (req.isAuthenticated()) {
    // Get user id from database
    userId = req.user.id;

    res.render(path.resolve("views/read"), {
      loggedIn: true,
      name: req.user.name,
      theStories,
      userId,
      // Create genre here in order to pass to All link in read.ejs
      genre: req.query.genre,
      storyGenre,
    });
    return next();
  } else {
    res.render(path.resolve("views/read"), {
      loggedIn: false,
      name: "",
      theStories,
      genre: req.query.genre,
      storyGenre,
    });
  }
});

// Delete Story
router.delete("/:id", function (req, res) {
  Story.findByIdAndDelete(req.params.id, function (err) {
    if (err) console.log(err);
  });
  req.flash("success_msg", "Your story has been deleted");
  return res.redirect("read");
});

// Publish page
router.get("/publish", function (req, res, next) {
  if (req.isAuthenticated()) {
    res.render(path.resolve("views/publish"), {
      loggedIn: true,
      name: req.user.name,
    });
    return next();
  } else {
    req.flash("error_msg", "You must be logged in to use this resource");
    return res.redirect("/users/login");
  }
});

// Publish story (post)
let stories = [];

router.post("/publish", function (req, res, next) {
  var story = req.body.newStory;
  var genre = req.body.genre;
  var auther = req.body.auther;

  var storyGenre = "";
  if (genre == 1) {
    storyGenre = "Crime";
  } else if (genre == 2) {
    storyGenre = "Horror";
  } else if (genre == 3) {
    storyGenre = "Love";
  } else if (genre == 4) {
    storyGenre = "Science Fiction";
  } else if (genre == 5) {
    storyGenre = "Other";
  }

  stories.push(story);
  // Creating Story Schema
  const newStory = new Story({
    story,
    genre,
    storyGenre,
    auther,
    userId: req.user.id,
  });

  newStory.save();

  if (req.isAuthenticated() && story.length > 5 && story.length < 251) {
    req.flash(
      "success_story_publish",
      "Your story has been published successfully!"
    );
    return res.redirect("/read");
    // Message user if story is too short or too long
  } else if (req.isAuthenticated() && story.length < 20) {
    req.flash("error_msg", "Your story is too short");
  } else if (req.isAuthenticated() && story.length > 250) {
    req.flash("error_msg", "Your story is too long");
  }
  return res.redirect("/publish");
});

module.exports = router;
