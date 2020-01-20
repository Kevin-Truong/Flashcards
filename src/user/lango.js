'use strict';


var userName = "";
var randCard = {};
var isFlipped = false;
var FlipCount = 0;
var correctAnswer = "";

function createServerRequest(method, str) {
	let xhr = new XMLHttpRequest();
	xhr.open(method, str, true);
	return xhr;
}

function getRandomCard(){
    let url = "../getCard?";
    let xhr = new XMLHttpRequest();
	xhr.open('GET', url, false);

    xhr.onload = function(){
        if(JSON.parse(xhr.responseText).err == undefined){
            let obj = JSON.parse(xhr.responseText);
            randCard = {"english": obj.english, "korean": obj.korean};
            console.log(randCard.english, randCard.korean);
        } else {
			console.log("No cards for user!");
			AddPage();
        }
    }

    xhr.onerror = function(){
        console.log("Get card error");
    }

    xhr.send();

    if (!xhr){
        alert('SERVER not supported');
        return;
    }
}

function checkAnswer(userAnswer, korean){
	let url = "../check?answer=" + userAnswer + "&word=" + korean;
    let xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);

	xhr.onload = function(){
        
		let obj = JSON.parse(xhr.responseText);
		if(obj.res == "pass"){
			ReactDOM.render(reviewPage(makeCorrectCard), document.getElementById('root'));

			console.log("pass");
		} else{
			ReactDOM.render(reviewPage(showCorrect), document.getElementById('root'));
			console.log("fail");
		}
	}
	xhr.send();
    if (!xhr){
        alert('SERVER not supported');
        return;
    }
}


function getName(){
    let url = "../name?";
    let xhr = new XMLHttpRequest();
	xhr.open('GET', url, false);

    xhr.onload = function(){
       let obj = JSON.parse(xhr.responseText);
       userName =  obj.first;
    }
    xhr.send();
    if (!xhr){
        alert('SERVER not supported');
        return;
    }
}
getName();
console.log(userName)

function makeServerRequest(word){
    let url = "../translate?english=" + word;
    let xhr = createServerRequest('GET', url);

    xhr.onload = function(){
        let res = xhr.responseText;
		let obj = JSON.parse(res);
        let output = React.createElement("div",{className: "textCard"}, React.createElement("p", {id: "outputGoesHere"}, obj.Korean));
		var main = React.createElement(
			"main",
			null,
			React.createElement(
				"div",
				{id: "title"},
				StartReview,
				lango,
			),	
			React.createElement(
				"div",
				{id: "cards"},
				React.createElement(
					"div",
					null,
					React.createElement(FirstInputCard, null)
				),
				React.createElement(
					"div",
					null,
					output
				),
			),
			React.createElement(
				"div",
				{id: "save_box"},
				SaveButton
			),
			React.createElement(
				"footer",
				null, 
				userName
			)
		);
		ReactDOM.render(main, document.getElementById('root'));
        return;
	}
	
    xhr.onerror = function(){
        alert('Woops, there was an error making the request.');
	};
	
	xhr.send();
	
    if (!xhr){
        alert('SERVER not supported');
        return;
    }
}

/*--------------------------------- ADD NEW CARD FUNCTIONS ---------------------- */

// An element to go into the DOM
var lango = React.createElement(
	"h1",
	{ id: "logo" },
	"Lango!"
);

// A component - function that returns some elements 
function FirstCard() {
	return React.createElement(
		"div",
		{ className: "textCard"},
		React.createElement(
			"p",
			{id: "outputGoesHere"},
			"Translation"
		)
	);
}

// Another component
function FirstInputCard() {
	return React.createElement(
		"div",
		{ className: "textCard"},
		React.createElement(
		"textarea", 
		{ onKeyPress: checkReturn, id: "word", defaultValue:"English"},
		)
	);
}

function saveCard(){
	let en = document.getElementById("word");
	let ko = document.getElementById("outputGoesHere");
	let url = "../store?english=" + en.value + "&korean=" + ko.textContent;
	let xhr = createServerRequest('GET', url);

	xhr.onload = function(){
		alert("Card saved.");
		return;
    }
    
    xhr.onerror = function(){
        alert("Card did not save.");
        return;
    }
	xhr.send();
}

var SaveButton = React.createElement(
	"button",
	{id: "save_button", onClick: saveCard},
	"Save"
);

var StartReview = React.createElement (
	"button",
	{id: "start_review", onClick: Review},
	"Start Review"
);

/*-------------------- MAIN PAGE RENDERING -------------------------------- */

// An element with some contents, including a variable
// that has to be evaluated to get an element, and some
// functions that have to be run to get elements. 
var main = React.createElement(
	"main",
	null,
	React.createElement(
		"div",
		{id: "title"},
		StartReview,
		lango,
	),	
	React.createElement(
		"div",
		{id: "cards"},
		React.createElement(
			"div",
			null,
			React.createElement(FirstInputCard, null)
		),
		React.createElement(
			"div",
			null,
			React.createElement(FirstCard, null)
		),
	),
	React.createElement(
		"div",
		{id: "save_box"},
		SaveButton
	),
	React.createElement(
		"footer",
		null,
		userName
	)
);


ReactDOM.render(main, document.getElementById('root'));

// onKeyPress function for the textarea element
// When the charCode is 13, the user has hit the return key
function checkReturn(event) {
	console.log(event.charCode);
	if (event.charCode === 13) {
		var string = event.target.value;
		event.preventDefault();
		makeServerRequest(string);
	}
}

/* ----------------------------- REVIEW PAGE FUNCTIONS -------------------- */
function makeCorrectCard(){
	return React.createElement("div", {id: "correct"}, "correct");
}

function showCorrect(){
	return React.createElement("div", {id:"correcty"}, correctAnswer);
}

function checkKey(event) {
	console.log(event.charCode);
	if (event.charCode === 13) {
		var string = event.target.value;
		event.preventDefault();
		var tag =  document.getElementsByClassName("front");
		checkAnswer(string, tag[0].textContent);
		flip();
	}
}
function flip() {
	console.log("flipped");
	$('.FirstCardRV').toggleClass('flipped');

	if (FlipCount >= 3){
		isFlipped = false;
		FlipCount = 0;
	} else{
		isFlipped = true;
		FlipCount += 1;
	}
}
function AddPage() {
	ReactDOM.render(main, document.getElementById('root'));
}

var AddButton = React.createElement(
	"button",
	{id: "add_button", onClick: AddPage}, //CHANGE FUNCTION TO ADD CARD
	"Add"
);
var NextButton = React.createElement(
	"button",
	{id: "next_button", onClick: nextReview},
	"Next"
);
//First Card
function FirstCardRV(func) {
	correctAnswer= randCard.english;
	return React.createElement(
		"section",
		{ id: "container"},
		React.createElement(
			"div",
			{className: "FirstCardRV"},
			React.createElement(
				"button",
				{id: "flipbutton", onClick: flip},
				React.createElement(
					"img",
					{id: "refresh", src: "refresh.svg"},
					null
				)
			),
			React.createElement(
				"div",
				{className: "front"},
				randCard.korean
			),
			React.createElement(
				"div",
				{className: "back"},
				func()
			)
		)
	);
}
 //Second Card, input card
function FirstInputCardRV() {
	return React.createElement(
		"div",
		{ className: "textCardRV"},
		React.createElement(
			"textarea", 
			{ onKeyPress: checkKey, id: "reviewinput", defaultValue:"Your Answer"}
		)
	);
}


/* -------------------------------- REVIEW PAGE RENDERING -------------------------- */
function Review () {
	getRandomCard();
	ReactDOM.render(reviewPage(showCorrect), document.getElementById('root'));
	getRandomCard();
}

function nextReview () {
	getRandomCard();
	ReactDOM.render(reviewPage(showCorrect), document.getElementById('root'));
	if (isFlipped == true && (FlipCount%2) == 1) {
		$('.FirstCardRV').toggleClass('flipped');
		FlipCount = 0;
		isFlipped = false;
	}
	
}
/* Review Page Layout */
function reviewPage(func) {
	return React.createElement (
		"main",
		null,
		React.createElement(
			"div",
			{id: "titleRV"},
			AddButton,
			lango,
		),	
		React.createElement(
			"div",
			{id: "cardsRV"},
			FirstCardRV(func),
			React.createElement(
				"div",
				{className: "secondCardRV"},
				React.createElement(FirstInputCardRV, null)
			)
		),
		React.createElement(
			"div",
			{id: "next_card"},
			NextButton
		),
		React.createElement(
			"footer",
			null,
			userName
		)
	);
}