/*-----------------------------------------------------------------------------
This template demonstrates how to use an IntentDialog with a LuisRecognizer to add
natural language support to a bot.
For a complete walkthrough of creating this type of bot see the article at
http://docs.botframework.com/builder/node/guides/understanding-natural-language/
-----------------------------------------------------------------------------*/
"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';
const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v1/application?id=' + luisAppId + '&subscription-key=' + luisAPIKey;

// Main dialog with LUIS
var recognizer = new builder.LuisRecognizer(LuisModelUrl);

var bot = new builder.UniversalBot(connector, [
    // sets the default or root dialog
    (session, args, next) => {
        if (!session.userData.name) {
            session.beginDialog('/askName');
        }
        next();
    },
    (session, results, next) => {
        // this will be executed when the new dialog on the stack completes
        //session.send('Hello %s!', session.userData.name);
        //session.send('How can I help you today?');
        // Understand intent of Chat Customers and act accordingly
        //session.beginDialog('/problemIdentify');
        session.beginDialog('/yesNoIdentify');
    }
]);

// Level 1 Dialog
bot.dialog('/askName', [
    function (session) {
        builder.Prompts.text(session, 'Hi! What is your name?');
    },
    function (session, results) {
        session.userData.name = results.response;
        session.endDialog();
    }
]);

// Level 1 Dialog
var yesNoIdentify = new builder.IntentDialog({ recognizers: [recognizer] })
.matches('YesConf', (session,args) => {
    session.send('Thanks for confirming Yes!');
    //bot.endDialog('Yes');
})

.matches('NoConf', (session,args) => {
    session.send('Thanks for your response!');
    //bot.endDialog('No');
})

.onDefault((session) => {
    session.send('Sorry, I did not understand \'%s\'.', session.message.text);
});


// Level 1 Dialog
var problemIdentify = new builder.IntentDialog({ recognizers: [recognizer] })
/*
.matches('<yourIntent>')... See details at http://docs.botframework.com/builder/node/guides/understanding-natural-language/
*/
.matches('Greeting', (session,args) => {
    session.send('Greetings %s!', session.userData.name);
    session.send('How can I help you today?');
})

.matches('Internet Issues', (session,args) => {
    session.beginDialog('/promptInternet');
})

.onDefault((session) => {
    session.send('Sorry, I did not understand \'%s\'.', session.message.text);
});

// Level 2 Dialog
bot.dialog('/promptInternet', [
    function (session) {
        var choices = ["Internet Down", "Internet Slow", "Some Other Issue"]
        builder.Prompts.choice(session, "Can you confirm the issue you are facing?", choices);
    },
    function (session, results) {
        if (results.response) {
            var selection = results.response.entity;
            // route to corresponding dialogs
            switch (selection) {
                case "Internet Down":
                    session.send('So sorry to hear that.');
                    session.replaceDialog('/routerCheck');
                    session.replaceDialog('/number');
                    break;
                case "Internet Slow":
                    session.send('So sorry to hear that.');
                    session.replaceDialog('/routerCheck');
                    session.replaceDialog('/number');
                    break;
                case "Some Other Issue":
                    session.send('My Bad! What is the problem you are facing today?');
                    session.replaceDialog('/problemIdentify');
                    break;
                default:
                    session.reset('/');
                    break;
            }
        }
    }
]);

// Level 2 Dialog
bot.dialog('/routerCheck', [
    function (session) {
        var choices = ["Yes", "No"];
        builder.Prompts.choice(session, 'Have you tried restarting your router?', choices);
    },
    function (session, results) {
        //session.userData.routerRestartConf = results.response;
        var selection = results.response.entity;
        // route to corresponding dialogs
        switch (selection) {
            case "Yes":
                session.send('Hello %s! Thanks for confirming that.', session.userData.name);
                session.replaceDialog('/number');
                break;
            case "No":
                session.replaceDialog('/restartRouter');
            case "Some Other Issue":
                session.send('My Bad! What is the problem you are facing today?');
                session.replaceDialog('/routerCheck');
                break;
            default:
                session.reset('/');
                break;
        }
    }
]);

// Level 2 Dialog
bot.dialog('/restartRouter', [
    function (session) {
        session.send('Please restart your router and then check if your \
                            internet is working.!');
        builder.Prompts.text(session, 'Is it working?');
    },
    function (session, results) {
        //session.userData.routerRestartConf = results.response;

                var selection = results.response.entity;
        // route to corresponding dialogs
        switch (selection) {
            case "Yes":
                session.send('Great! Happy Browsing!', session.userData.name);
                session.endDialog();
                break;
            case "No":
                session.replaceDialog('/number');
            case "Some Other Issue":
                session.send('My Bad! What is the problem you are facing today?');
                session.replaceDialog('/restartRouter');
                break;
            default:
                session.reset('/');
                break;
        }
    }
]);

// Level 2 Dialog
bot.dialog('/number', [
    function(session, args) {
        if (args && args.reprompt){
            builder.Prompts.text(session,'Invalid Number or Mobile Number does not exist in our database.\
                                 Please try again!');
        } else {
            builder.Prompts.text(session, 'Please share your registered mobile number with me.');
        }
    },
    function (session, results) {
        session.userData.phoneNoMatched = results.response.match(/\d*/g);
        var number = session.userData.phoneNoMatched[0];
        session.send('Thanks for sharing your mobile number %s. Let me validate it.', number);

        // Placeholder
        var mobileNumbers = ['9945254742','9591914742','9967535152','9844001335'];

        if ( (number.length == 10 || number.length == 11) &&
        (number == mobileNumbers[0] || number == mobileNumbers[1] ||
        number == mobileNumbers[2] || number == mobileNumbers[3] ) ) {
            session.send('Checking the box connected to your router!');
            if (number == mobileNumbers[0]) {
                session.send('Box is working! Not sure what the problem is. Let me have the field team take a look');
            } else if (number == mobileNumbers[1]) {
                session.send('Box is down! Let me have the field team take a look');
            } else if (number == mobileNumbers[2]) {
                session.send('Box seems to be up! Let me have the field team take a look');
            } else if (number == mobileNumbers[3]) {
                session.send('NoC is down! Let me have the engineering team take a look');
            }
            session.send('I will log a ticket on the account with registered #: %s.', number);
            session.send('This issue will be resolved within 24 hours.');
            session.send('Have a nice day!');
            session.endDialog();
        }
        else {
            session.replaceDialog('/number', { reprompt: true })
        }
    }
]);

bot.dialog('/problemIdentify', problemIdentify);

//bot.dialog('/yesNoIdentify', yesNoIdentify);

if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());
} else {
    module.exports = { default: connector.listen() }
}
