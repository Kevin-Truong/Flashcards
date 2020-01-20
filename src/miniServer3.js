const express = require('express');
const port = 58923; // you need to put your port number 
const APIrequest = require('request');
const passport = require('passport');
const cookieSession = require('cookie-session');
const GoogleStrategy = require('passport-google-oauth20');
const http = require('http');
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");

const googleLoginData = {
    clientID: '442784071557-80mjeu4qtl63nphjutd3jht0s0c12hio.apps.googleusercontent.com',
    clientSecret: 'HPgN9n5hq7_2aNNX9niKKINn',
    callbackURL: '/auth/redirect'
};

passport.use( new GoogleStrategy(googleLoginData, gotProfile) );

const APIkey = "AIzaSyBBd5pgoSH-yhC1J6a5StxqN5b5JJ4fok8";  // ADD API KEY HERE
const url2 = "https://translation.googleapis.com/language/translate/v2?key="+APIkey;
const dbFileName = "Flashcards.db";
const db = new sqlite3.Database(dbFileName);

function sendName(req, res, next){
    console.log(req.user.userid);
    let cmd = 'SELECT * FROM Users WHERE user = ' + req.user.userid;
    
    function arrayCB(err, row){
        if(err){
            console.log("error:", err);
        } else {
            console.log("success!", row.first, row.last);
            res.json({"first": row.first, "last": row.last});
        }
    }
    db.get(cmd, arrayCB);
}

function checkUserAnswer(req,res,next){
    let reqObj = req.query;
    if(reqObj.answer != undefined && reqObj.word != undefined){
        for (i = 0; i < req.user.userData.length; i++){
            if (req.user.userData[i].korean == reqObj.word) {
                if (req.user.userData[i].english == reqObj.answer){
                    let timesCorrect = req.user.userData[i].correct + 1;
                    let cmd = 'UPDATE Flashcards set correct = ' + timesCorrect + ' WHERE user = ? AND english = ?';
                    db.run(cmd,[req.user.userid, req.user.userData[i].english] ,updateCB);
                    function updateCB(err){
                        if(err){
                            console.log("update error!",err);
                        } else {
                            res.json({"res": "pass"});
                        }
                    }
                   
                } else {
                    res.json({"res": "fail", "correct": req.user.userData[i].english});
                }
            }
        }
    }
}

function sendRandomCard(req, res, next){
    if(req.user.userData[0] != undefined){
        var arrayLength = (req.user.userData).length;
        var randIndex = Math.floor((Math.random() * (arrayLength-1)));
        
        if(randIndex < 0){
            randIndex = 0;
        }
        console.log(randIndex);
        var randCard = req.user.userData[randIndex];
        while(randCard.score > Math.floor((Math.random() * 15))){
            randIndex = Math.floor((Math.random() * (arrayLength-1)));
            randCard = req.user.userData[randIndex];
        }
        timesSeen = randCard.seen + 1;
        let cmd = 'UPDATE Flashcards set seen = ' + timesSeen + ' WHERE user = ? AND english = ?';
        db.run(cmd,[req.user.userid, randCard.english] ,updateCB);

        function updateCB(err){
            if(err){
                console.log("update error!",err);
            } else {
                updateScore();
            }
        }

        function updateScore(){
            let card = req.user.userData[randIndex];
            let score = Math.max(1,5 - card.correct) + Math.max(1, 5 - card.seen) + 5*( (card.seen - card.correct)/card.seen );
            let cmd = 'UPDATE Flashcards set score = ' + score + ' WHERE user = ? AND english = ?';
            db.run(cmd,[card.user, card.english], doneUpdateCB);
            // console.log(card.user);
            // console.log(card.english);

            function doneUpdateCB(err){
                if(err){
                    console.log("Update score error!", err);
                    next();
                } else {
                    res.json({"english": card.english, "korean": card.korean});
                }
            }
        }
        
    } else {
	    res.json({"err": "error"});
    }
}

function translateHandler(req, res, next) {
    // Get english word from request
    
    let qObj = req.query;
    if(qObj.english != undefined){
		let string = qObj.english;
		
		// Create the request object to send to the Google translate API
		let requestObject = {
			"source": "en",
			"target": "ko",
			"q":[]
		}
		requestObject.q.push(string);
		
		// Make and send the request to the API
		APIrequest(
		{ // HTTP header stuff
			url: url2,
			method: "POST",
			headers: {"content-type": "application/json"},
			// will turn the given object into JSON
			json: requestObject	},
		// callback function for API request
		APIcallback
		);

		// callback function, called when data is received from API
		function APIcallback(err, APIresHead, APIresBody) {
		// gets three objects as input
			if ((err) || (APIresHead.statusCode != 200)) {
					// API is not working
					console.log("Got API error");
					console.log(APIresBody);
			} else {
					if (APIresHead.error) {
						// API worked but is not giving you data
						console.log(APIresHead.error);
					} else {
						console.log(JSON.stringify({"english": string, "Korean": APIresBody.data.translations[0].translatedText}, undefined, 2));
						// print it out as a string, nicely formatted
						res.json({"english": string, "Korean": APIresBody.data.translations[0].translatedText}); 
					}
				}
			}	 
		} 
	// If the english propery of the req object is undefined...Go to next item in pipeline
	else {
        next();
    }
}

function insertHandler(req, res, next){
	// Check if req object has valid properties
	let obj = req.query;
	if(obj.english != undefined && obj.korean != undefined){
		let cmdStr = 'INSERT into Flashcards (user, english, korean, seen, correct, score) VALUES (@0,@1,@2,0,0,0)';	
		db.run(cmdStr,req.user.userid, obj.english, obj.korean, insertCB);
		function insertCB(err){
			if(err){
				console.log(err);
				res.type('text/plain');
				res.send('Cannot save card');
			}
			else {
				db.all('SELECT * FROM Flashcards', dataCB);
				function dataCB(err, data){console.log(data)};
				res.send(null);
			}
		}
	}
	// Go to next item in pipeline if req properties are not valid
	else{
		next();
	}
}


// put together the server pipeline
const app = express();

// Check validity of cookies at the beginning of pipeline
// Will get cookies out of request, decrypt and check if 
// session is still going on. 
app.use(cookieSession({
    maxAge: 6 * 60 * 60 * 1000, // Six hours in milliseconds
    // meaningless random string used by encryption
    keys: ['hanger waldo mercy dance']  
}));
// Initializes request object for further handling by passport
app.use(passport.initialize()); 

// If there is a valid cookie, will call deserializeUser()
app.use(passport.session()); 
app.use(express.static('public'));  // can I find a static file?

//----------------------------------- LOGIN INFORMATION ---------------------------//
// next, handler for url that starts login with Google.
// The app (in public/login.html) redirects to here (not an AJAX request!)
// Kicks off login process by telling Browser to redirect to
// Google. The object { scope: ['profile'] } says to ask Google
// for their user profile information.
app.get('/auth/google',
	passport.authenticate('google',{ scope: ['profile'] }) );
// passport.authenticate sends off the 302 response
// with fancy redirect URL containing request for profile, and
// client ID string to identify this app. 

// Google redirects here after user successfully logs in
// This route has three handler functions, one run after the other. 
app.get('/auth/redirect',
	// for educational purposes
	function (req, res, next) {
	    console.log("at auth/redirect");
	    next();
	},
	// This will issue Server's own HTTPS request to Google
	// to access the user's profile information with the 
	// temporary key we got in the request. 
	passport.authenticate('google'),
	// then it will run the "gotProfile" callback function,
	// set up the cookie, call serialize, whose "done" 
	// will come back here to send back the response
	// ...with a cookie in it for the Browser! 
	function (req, res) {
	    console.log('Logged in and using cookies!')
	    res.redirect('/user/lango.html');
	});

// static files in /user are only available after login
app.get('/user/*',
	isAuthenticated, // only pass on to following function if
	// user is logged in 
	// serving files that start with /user from here gets them from ./
	express.static('.') 
	   ); 
//------------------------------------------------------------------------//
app.get('/name', sendName);
app.get('/check', checkUserAnswer);
app.get('/getCard', sendRandomCard);
app.get('/translate',translateHandler );   // if not, is it a valid query?
app.get('/store', insertHandler);
app.use( fileNotFound );            // otherwise not found

app.listen(port, function (){console.log('Listening...');} );


//---------------------- middleware functions-----------------------//

// print the url of incoming HTTP request
function printURL (req, res, next) {
    console.log(req.url);
    next();
}

// function to check whether user is logged when trying to access
// personal data
function isAuthenticated(req, res, next) {
    if (req.user) {
	// console.log("Req.session:",req.session);
	// console.log("Req.user:",req.user);
	next();
    } else {
	res.redirect('/login.html');  // send response telling
	// Browser to go to login page
    }
}


// function for end of server pipeline
function fileNotFound(req, res) {
    let url = req.url;
    res.type('text/plain');
    res.status(404);
    res.send('Cannot find '+url);
    }

// Some functions Passport calls, that we can use to specialize.
// This is where we get to write our own code, not just boilerplate. 
// The callback "done" at the end of each one resumes Passport's
// internal process. 

// function called during login, the second time passport.authenticate
// is called (in /auth/redirect/),
// once we actually have the profile data from Google. 
function gotProfile(accessToken, refreshToken, profile, done) {
    console.log("Google profile",profile);
    // here is a good place to check if user is in DB,
    // and to store him in DB if not already there. 
    // Second arg to "done" will be passed into serializeUser,
    // should be key to get user out of database.

    let dbRowID = profile.id;  // temporary! Should be the real unique
    let cmd = 'SELECT * FROM Users WHERE user = ' + dbRowID;
    var userProfile = undefined;
    function rowCB(err, arrayData){
        if(err){
            console.log("Error getting profile from table:", err);
        } else {
            userProfile = arrayData;
            if(userProfile == undefined){
                let cmdStr = 'INSERT into Users (first, last, user) VALUES (@0,@1,@2)';	
                db.run(cmdStr, profile.name.givenName, profile.name.familyName, profile.id, insertCB);
                function insertCB(err){
                    if(err){
                        console.log("Error inserting profile!",err);
                    } 
                }
            }
        }
    }
    db.get(cmd, rowCB);
    
    
    // key for db Row for this user in DB table.
    // Note: cannot be zero, has to be something that evaluates to
    // True.  

    done(null, dbRowID); 
}

// Part of Server's sesssion set-up.  
// The second operand of "done" becomes the input to deserializeUser
// on every subsequent HTTP request with this session's cookie. 
passport.serializeUser((dbRowID, done) => {
    // console.log("SerializeUser. Input is",dbRowID);
    done(null, dbRowID);
});

// Called by passport.session pipeline stage on every HTTP request with
// a current session cookie. 
// Where we should lookup user database info. 
// Whatever we pass in the "done" callback becomes req.user
// and can be used by subsequent middleware.
var dataArray;
passport.deserializeUser((dbRowID, done) => {
    console.log("deserializeUser. Input is:", dbRowID);
    let cmd = 'SELECT * FROM Flashcards WHERE user = ' + dbRowID;
    var userData;
    function arrayCB(err, arrayData){
        if(err){
            console.log("error:", err);
        } else {
            console.log("success!");
            dataArray = arrayData;
            userData = {userData: dataArray, userid: dbRowID};
            done(null, userData);
        }
    }
    db.all(cmd, arrayCB);
    
    // here is a good place to look up user data in database using
    // dbRowID. Put whatever you want into an object. It ends up
    // as the property "user" of the "req" object. 
});
