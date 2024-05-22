// The package for the web server
const express = require('express');

// Additional package for logging of HTTP requests/responses
const morgan = require('morgan');

//added to support access to file system paths
const path = require('path');
const { title } = require('process');

const app = express();
const port = 3000;

const sqlite3 = require('sqlite3');

let db = new sqlite3.Database('wonderlustDB');

//setting authentication using passport.js
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

//additional package for managin user session
const session = require('express-session');

//for displaying message to the user
const flash = require('connect-flash');

//importing functions from utils.js
const { hashPassword, comparePassword } = require('./utils');

//passport configuration
passport.use(new LocalStrategy(
    async (username, password, done) => {
        db.get('SELECT * FROM Users WHERE username = ?', [username], async (err, user) => {
            if (err) return done(err);
            if (!user) return done(null, false, { message: 'Incorrect username.' });

            const isMatch = await comparePassword(password, user.password);
            if (!isMatch) return done(null, false, { message: 'Incorrect password.' });

            return done(null, user);
        });
    }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    db.get('SELECT * FROM Users WHERE id = ?', [id], (err, user) => {
        done(err, user);
    });
});

// Express session middleware
app.use(session({
    secret: 'secret_key',
    resave: false,
    saveUninitialized: false,
}));

//initialize passport for athentication
app.use(passport.initialize());

//enables passport to serialize and deserialize
app.use(passport.session());

//provide flash messages
app.use(flash());

// Middleware to pass flash messages to views
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
});

//Here we are configuring express to use body-parser as middle-ware.
app.use(express.urlencoded({ extended: false }));

//view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//include the logging for all requests
app.use(morgan('common'));

app.use(express.static('public_html'));

//sigunp route
app.get('/signup', (req, res) => {
    res.render('signup', { title: 'SIGN UP' });
})
app.post('/signup', async (req, res, next) => {
    const { username, password } = req.body;
    let errorMessage = "";
    let errorType = "";
    if (username.trim() === '') {
        errorType = "username";
        errorMessage = "Please input your username into the signup form !!";
        res.render('validation', {
            errortype: errorType,
            title: 'INCORRECT INPUT',
            errors: errorMessage,
            username: username,
        });
    } else if (password.trim() === '') {
        errorType = "password";
        errorMessage = "Please input your password into the signup form !!";
        res.render('validation', {
            errortype: errorType,
            title: 'INCORRECT INPUT',
            errors: errorMessage,
            username: username,
        });
    } else {
        db.get('SELECT * FROM Users WHERE username = ?', [username], async (err, user) => {
            if (err) {
                console.error(err.message);
                req.flash('error_msg', 'Registration failed');
                res.redirect('/signup');
            } else if (user) {
                // If username already exists, display error message and redirect back to signup form
                req.flash('error_msg', 'Registration failed, username already exists.');
                res.redirect('/signup');
            } else {
                const hashedPassword = await hashPassword(password);
                db.run('INSERT INTO Users (username, password) VALUES (?, ?)', [username, hashedPassword], function (err) {
                    if (err) {
                        console.error(err.message);
                        req.flash('error_msg', 'Registration failed');
                        res.redirect('/signup');
                    } else {
                        req.flash('success_msg', 'You are now registered and can log in');
                        res.redirect('/login');
                    }
                });
            }
        });
    }
})

//login route using passport.js
app.post('/login', passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true
}));

app.get('/login', (req, res, next) => {
    res.render('login', { title: 'LOG IN CREDENTIALS' });
})

//middleware function to ensure routes are protected
const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'Please log in to view that resource');
    res.redirect('/login');
};

//protecting the /dashboard route
app.get('/dashboard', ensureAuthenticated, (req, res) => {
    res.render('dashboard', { title: "LOG IN SUCCESS" });
});

app.get('/userlist', (req, res) => {
    db.all('SELECT * FROM Users', function (err, rows) {
        if (err) {
            console.log(err.message);
            throw err;
        }

        if (rows.length === 0) {
            console.log("TABLE IS EMPTY");
            res.send('TABLE IS EMPTY');
        } else {
            res.render('userlist', { title: 'USER LIST', users: rows });
        }
    })
})

app.get('/rating', (req, res, next) => {
    res.render('rating', { title: 'CUSTOMER FEEDBACK' });
})

app.post('/comments', (req, res, next) => {
    let name = req.body.name;
    let rating = parseInt(req.body.rating);
    let feedback = req.body.feedback;

    let errorMessage = "";
    let errorType = "";

    if (name.trim() === '') {
        errorType = "name";
        errorMessage = "MISSING NAME";
        res.render('thankyou', {
            errortype: errorType,
            title: 'INCORRECT INPUT',
            errors: errorMessage,
            name: name,
            rating: rating,
            feedback: feedback,
        });
    } else
        if (rating < 1 || rating > 5 || isNaN(rating)) {
            errorType = "rating";
            errorMessage = "MISSING RATING";
            res.render('thankyou', {
                errortype: errorType,
                title: 'INCORRECT INPUT',
                errors: errorMessage,
                name: name,
                rating: rating,
                feedback: feedback,
            });
        } else
            if (feedback.trim() === '') {
                errorType = "feedback";
                errorMessage = "MISSING FEEDBACK";
                res.render('thankyou', {
                    errortype: errorType,
                    title: 'INCORRECT INPUT',
                    errors: errorMessage,
                    name: name,
                    rating: rating,
                    feedback: feedback,
                });
            } else {
                db.run(`INSERT INTO Comments (name, rating, feedback) VALUES("${name}", "${rating}", "${feedback}") `);
            }

    let message;
    let messageClass;

    if (rating >= 3) {
        message = '😀 Fantastic! That is wonderful !! ';
        messageClass = 'text-success';
    } else {
        message = `😕 We are very sorry to hear that.. `;
        messageClass = 'text-danger';
    }

    if (rating > 2) {
        res.render('thankyou', {
            title: 'CUSTOMER FEEDBACK',
            errors: "",
            name: name,
            rating: rating,
            feedback: feedback,
            message: '😀 Fantastic! That is wonderful !!',
            messageClass: messageClass
        }
        )
    } else {
        res.render('thankyou', {
            title: 'CUSTOMER FEEDBACK',
            errors: "",
            name: name,
            rating: rating,
            feedback: feedback,
            message: `😕 We are very sorry to hear that.. `,
            messageClass: messageClass
        });
    }
});

app.get('/feedback', (req, res) => {
    db.all('SELECT * FROM Comments', function (err, rows) {
        if (err) {
            console.log(err.message);
            throw err;
        }

        if (rows.length === 0) {
            console.log("TABLE IS EMPTY");
            res.send('TABLE IS EMPTY');
        } else {
            res.render('feedback', { title: 'FEEDBACK LIST', comments: rows });
        }
    })
})

app.get('/forceerror', (req, res) => {
    console.log(`Got a request to force an error...`);
    let f;
    console.log(`f = ${f.nomethod()}`);
})

app.use((req, res) => {
    res.render('404', { title: "404", message: "File not found", url: req.url });
})

app.use((error, req, res, next) => {
    let errorStatus = error.status || 500;
    res.render('error', { title: "5xx Error", message: "System error", error: { status: errorStatus, stack: error.stack } });
})

//Tell our application to listen to requests at port 3000 on the localhost
app.listen(port, () => {
    //When the application starts, print to the console that our app is
    //running at http://localhost:3000. Print another message indicating
    //how to shut the server down.
    console.log(`web server runing at: http://localhost:${port}`);
    console.log(`Type Ctrl+C to shut down the web server`);
})