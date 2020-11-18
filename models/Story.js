const mongoose = require("mongoose");
const moment = require("moment");
const timestamps = require("mongoose-timestamp-date-unix");

const passportLocalMongoose = require("passport-local-mongoose");

mongoose.set("useNewUrlParser", true);
mongoose.set("useFindAndModify", false);
mongoose.set("useCreateIndex", true);

const StorySchema = new mongoose.Schema(
  {
    story: {
      type: String,
      unique: true,
      required: true,
      minlength: 20,
      maxlength: 250,
    },
    auther: {
      type: String,
      unique: false,
      required: false,
    },
    genre: {
      type: Number,
      required: true,
    },
    userId: {
      type: String,
    },
    storyGenre: {
      type: String,
    },
  },
  { timestamps: true }
);

const Story = mongoose.model("Story", StorySchema);

module.exports = Story;
