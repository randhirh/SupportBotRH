/*-----------------------------------------------------------------------------
Read more @ http://docs.botframework.com/builder/node/guides/understanding-natural-language/
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

var bot = new builder.UniversalBot(connector);

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v1/application?id=' + luisAppId + '&subscription-key=' + luisAPIKey;

// Main dialog with LUIS
var recognizer = new builder.LuisRecognizer(LuisModelUrl);

bot.dialog('/', [
    function (session, args, next) {
        if (!session.userData.name) {
            session.beginDialog('/askName');
        } else {
            session.send('Hello %s!', session.userData.name);
            session.send('How can I help you today?');
            next();
        }
    },
    function (session, results) {
        session.beginDialog('/intents');
    }
]);

bot.dialog('/askName', [
    function (session) {
        builder.Prompts.text(session, 'Hi! What is your name?');
    },
    function (session, results) {
        session.userData.name = results.response;
        session.send('Hello %s!', session.userData.name);
        session.send('How can I help you today?');
        session.endDialog();
    }
]);

var intents = new builder.IntentDialog({ recognizers: [recognizer] })
/*
.matches('<yourIntent>')... See details at http://docs.botframework.com/builder/node/guides/understanding-natural-language/
*/
.matches('Greeting', (session,args) => {
    session.send('Greetings %s!', session.userData.name);
    session.send('How can I help you today?');
})

.matches('Internet Issues', (session,args) => {
    session.send('Can you confirm that your internet is down?');
    session.beginDialog('/confirmNetDown');
    //session.replaceDialog('/promptInternet');
    //session.beginDialog('/phonePrompts');
})

.onDefault((session) => {
    session.send('Sorry, I did not understand \'%s\'.', session.message.text);
});

// Level 1 Dialog
var confirmNetDown = new builder.IntentDialog({ recognizers: [recognizer] })
.matches('YesConf', (session,args) => {
    session.send('So sorry to hear that. ');
    //builder.Prompts.text(session, '');
    session.replaceDialog('/routerCheck');
    session.replaceDialog('/number');
    bot.endDialog();
})

.matches('NoConf', (session,args) => {
    session.send('Oh ok! So, what is the problem you are facing?');
    session.replaceDialog('/intents');
    bot.endDialog();
})

.onDefault((session) => {
    session.send('Sorry, I did not understand \'%s\'.', session.message.text);
});

bot.dialog('/routerCheck', [
    function (session) {
        var choices = ["Yes", "No"];
        builder.Prompts.choice(session, "Have you tried restarting your router?", choices);
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
                session.send('Please restart your router and check if your net is working.');
                //builder.Prompts.text(session, "Is your internet working now?");
                session.send('Can you check and confirm if your internet is now working?');
                session.beginDialog('/restartRouter');
                break;
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

// Level 1 Dialog
var restartRouter = new builder.IntentDialog({ recognizers: [recognizer] })
.matches('YesConf', (session,args) => {
    session.send('Great! Happy Browsing, %s!', session.userData.name);
    session.endDialog();
})

.matches('NoConf', (session,args) => {
    session.replaceDialog('/number');
})

.onDefault((session) => {
    session.send('Sorry, I did not understand \'%s\'.', session.message.text);
    session.send('Did restarting your router solve the internet issue?');
});

bot.dialog('/number', [
    function(session, args) {
        if (args && args.reprompt){
            builder.Prompts.text(session,'Incorrect Format or # not present in DB, please try again!');
        } else {
            builder.Prompts.text(session, 'Please share your registered mobile number with me.');
        }
    },
    function (session, results) {
        //session.userData.phoneNo = results.response;
        session.userData.phoneNoMatched = results.response.match(/\d*/g);
        //session.userData.phoneNo = results.response;
        var number = session.userData.phoneNoMatched[0];
        session.send('Thanks for sharing your number %s. Let me validate it.', number);

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
        } else {
            session.replaceDialog('/number', { reprompt: true })
        }
    }
]);

bot.dialog('/intents', intents);

bot.dialog('/confirmNetDown', confirmNetDown);

bot.dialog('/restartRouter', restartRouter);

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


/*
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
                    session.beginDialog('/routerCheck');
                    session.replaceDialog('/number');
                    break;
                case "Internet Slow":
                    session.send('So sorry to hear that.');
                    session.beginDialog('/routerCheck');
                    session.replaceDialog('/number');
                    break;
                case "Some Other Issue":
                    session.replaceDialog('/intents');
                    break;
                default:
                    session.reset('/');
                    break;
            }
        }
    }
]);
*/

/*
bot.dialog('/restartRouter', [
    function (session) {
        session.send('Please restart your router and then check if your \
                            internet is working.!');
        builder.Prompts.text(session, 'Is it working?');
    },
    function (session, results) {
        session.userData.routerRestartConf = results.response;
        if (session.userData.routerRestartConf == 'Yes' ||
                    session.userData.routerRestartConf == 'yes') {
        }
        else {
            session.replaceDialog('/number');
        }
    }
]);
*/

