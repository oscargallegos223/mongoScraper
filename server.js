var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");

var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
// var db = require("./models");
var Note = require("./models/Note");
var Article = require("./models/Article");

var PORT = 3000;

// Initialize Express
var app = express();

//handlebars
var exphbs = require("express-handlebars");

app.set('views', __dirname + '/views');
app.engine("handlebars", exphbs({ defaultLayout: "main", layoutsDir: __dirname + "/views/layouts" }));
app.set("view engine", "handlebars");

// Configure middleware

app.use(logger("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

// Connect to the Mongo DB
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/dallasnews";
mongoose.Promise = Promise;
mongoose.connect(MONGODB_URI, {useNewUrlParser: true});

var db = mongoose.connection;

app.get("/", function (req, res) {
    Article.find({})
      .exec(function (error, data) {
        if (error) {
          res.send(error);
        }
        else {
          var newsObj = {
            Article: data
          };
          res.render("index", newsObj);
        }
      });
  });

  // Routes
app.get("/scrape", function(req, res) {
  axios.get("https://www.dallasnews.com/").then(function(response) {
    var $ = cheerio.load(response.data);

    $("h3").each(function(i, element) {
      var result = {};

      result.title = $(this)
        .children("a")
        .text();
      result.link = $(this)
        .children("a")
        .attr("href");

      db.Article.update(result)
        .then(function(dbArticle) {
          console.log(dbArticle);
        })
        .catch(function(err) {
          console.log(err);
        });
    });

    res.send("Scrape Complete");
  });
});
  
//   // A GET request to scrape the nhl/stars website
//   app.get("/scrape", function(req, res) {
//     // First, we grab the body of the html with request
//     request("https://www.dallasnews.com/", function(error, response, html) {
//       // Then, we load that into cheerio and save it to $ for a shorthand selector
//       var $ = cheerio.load(html);
//       // Now, we grab every h2 within an article tag, and do the following:
//       $("h4.headline-link").each(function(i, element) {
  
//         // Save an empty result object
//         var result = {};
  
//         // Add the text and href of every link, and save them as properties of the result object
//         result.title = $(this).text();
//         result.link = $(this).parent("a").attr("href");
  
//         // Using our Article model, create a new entry
//         // This effectively passes the result object to the entry (and the title and link)
//         var entry = new Article(result);
  
//         // Now, save that entry to the db
//         entry.save(function(err, doc) {
//           // Log any errors
//           if (err) {
//             console.log(err);
//           }
//           // Or log the doc
//           else {
//             console.log(doc);
//           }
//         });
  
//       });
//       res.redirect("/");
//       console.log("Successfully Scraped");
//     });
//   });
  
  app.post("/notes/:id", function (req, res) {
    var newNote = new Note(req.body);
    newNote.save(function (error, doc) {
      if (error) {
        console.log(error);
      }
      else {
        console.log("this is the DOC " + doc);
        Article.findOneAndUpdate({
          "_id": req.params.id
        },
          { $push: { "note": doc._id } }, {new: true},  function (err, doc) {
            if (err) {
              console.log(err);
            } else {
              console.log("note saved: " + doc);
              res.redirect("/notes/" + req.params.id);
            }
          });
      }
    });
  });
  
  app.get("/notes/:id", function (req, res) {
    console.log("This is the req.params: " + req.params.id);
    Article.find({
      "_id": req.params.id
    }).populate("note")
      .exec(function (error, doc) {
        if (error) {
          console.log(error);
        }
        else {
          var notesObj = {
            Article: doc
          };
          console.log(notesObj);
          res.render("notes", notesObj);
        }
      });
  });
  
  app.get("/delete/:id", function (req, res) {
    Note.remove({
      "_id":req.params.id
    }).exec(function (error, doc) {
      if (error) {
        console.log(error);
      }
      else {
        console.log("note deleted");
        res.redirect("/" );
      }
    });
  });
  
  // Listen on port 3000
  app.listen(PORT, function() {
    console.log("App running on PORT" + PORT + "!");
  });