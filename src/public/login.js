'use strict';

function loginAJAX() {
    let url = 'auth/google';
    let xhr = new XMLHttpRequest();
    xhr.open('GET',url,true);
    xhr.onload = function () { console.log('logged in!'); };
    xhr.onerror = function () { console.log('browser sees error');}; 
    xhr.send();
}

var lango = React.createElement(
    "div",
    {id: "LoginPage"},
    React.createElement(
        "p",
        {id: "title"},
        "Welcome to Lango!"
    ),
    React.createElement(
        "p",
        {id: "subheader"},
        "Customize your vocabulary"
    )
);

/*LOGIN BUTTON TO redirect to google login*/
var login = React.createElement(
    "form",
    {id: "signin", action:"/auth/google"},
    React.createElement(
        "button",
        {id:"button", type: "submit"},
        React.createElement(
            "img",
            {id: "googleimg", src: "google.jpg"},
            null
        ),
        "Log in with Google"
    )
);

var main = React.createElement(
    "main",
    null,
    lango,
    React.createElement(
        "div",
        {id: "button"},
        login
    )
);

ReactDOM.render(main, document.getElementById('root'));