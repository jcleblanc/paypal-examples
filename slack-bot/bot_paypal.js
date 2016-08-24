var Botkit = require('botkit');
var paypal = require('paypal-rest-sdk');

//PayPal application credentials and payment redirect
var pp_client_id = 'YOUR PAYPAL CLIENT ID';
var pp_client_secret = 'YOUR PAYPAL CLIENT SECRET';
var redirect = 'YOUR APPLICATION URI';

//check for valid bot setup information
if (!process.env.clientId || !process.env.clientSecret || !process.env.port){
    console.log('Error: Specify clientId clientSecret and port in environment');
    process.exit(1);
}

//configure PayPal environment
paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': pp_client_id,
    'client_secret': pp_client_secret
});

//initialize Slack bot
var controller = Botkit.slackbot({
    //interactive_replies: true, // tells botkit to send button clicks into conversations
    json_file_store: './db_slackbutton_bot/',
}).configureSlackApp({
    clientId: process.env.clientId,
    clientSecret: process.env.clientSecret,
    scopes: ['bot'],
});

//initialize web server
controller.setupWebserver(process.env.port,function(err,webserver){
    controller.createWebhookEndpoints(controller.webserver);

    controller.createOauthEndpoints(controller.webserver,function(err,req,res){
      if (err){ res.status(500).send('ERROR: ' + err); } 
      else{ res.send('Success!'); }
    });
});

//make sure we don't connect to the RTM twice for the same team
var _bots = {};
function trackBot(bot){
    _bots[bot.config.token] = bot;
}

/****************************************************************
* Handle adding the bot to a team
****************************************************************/
controller.on('create_bot',function(bot,config){
    if (_bots[bot.config.token]){
        //bot already online, no action needed
    } else {
        bot.startRTM(function(err){
            if (!err){ trackBot(bot); }

            bot.startPrivateConversation({user: config.createdBy},function(err,convo){
                if (err){ 
                    console.log(err);  
                } else { 
                    convo.say('I am a bot that has just joined your team');
                    convo.say('You must now /invite me to a channel so that I can be of use!');
                }
            });
        });
    }
});

/****************************************************************
* Handle all payment requests in callback, once the user has 
* selected that they want to process a payment / subscription
****************************************************************/
controller.on('interactive_message_callback', function(bot, message){
    //if user clicks no for payment, cancel, otherwise process payment
    if (message.actions[0].value === 'no'){
        bot.replyInteractive(message, 'Payment process cancelled');
    } else {
        bot.replyInteractive(message, 'Generating your payment link. Hold on a moment...');
        
        //prepare base payment message for bot to respond with
        var reply = {
            'attachments': [{
                'fallback': 'Payment initiation information failed to load',
                'color': '#36a64f',
                'pretext': 'Click the link below to initiate payment',
                'title': 'Make payment to COMPANY',
                'footer': 'PayPal Payment Bot',
                'footer_icon': 'https://s3-us-west-2.amazonaws.com/slack-files2/avatars/2016-08-17/70252203425_a7e48673014756aad9a5_96.jpg',
                'ts': message.ts
            }]
        };
    
        switch (message.callback_id){
            //process basic user to app payment
            case '111': 
                //build PayPal payment request
                var payReq = JSON.stringify({
                    'intent':'sale',
                    'redirect_urls':{
                        'return_url': redirect + '/process',
                        'cancel_url': redirect + '/cancel'
                    },
                    'payer':{
                        'payment_method':'paypal'
                    },
                    'transactions':[{
                        'description':'This is the payment transaction description.',
                        'amount':{
                            'total':'10',
                            'currency':'USD'
                        }
                    }]
                });
                
                //create payment request before PayPal redirect to approve
                paypal.payment.create(payReq, function(error, payment){
                    if(error){
                        console.error(error);
                    } else {
                        //capture HATEOAS links
                        var links = {};
                        payment.links.forEach(function(linkObj){
                            links[linkObj.rel] = {
                                'href': linkObj.href,
                                'method': linkObj.method
                            };
                        })
        
                        //if redirect url present, insert link into bot message and display
                        if (links.hasOwnProperty('approval_url')){
                            reply.attachments[0].title_link = links['approval_url'].href;
                            bot.replyInteractive(message, reply);
                        } else {
                            console.error('no redirect URI present');
                        }
                    }
                });
           
                break;
            //process basic user to user payment
            case '222':
                var dataArr = message.actions[0].value.split('|');
                
                controller.storage.users.get(dataArr[0], function(err, user){
                    if (!user.email){
                        bot.replyInteractive(message, 'User has no PayPal email associated with their account. Please ask them to add one with the command "add paypal EMAIL"');
                    }
                    
                    //build PayPal payment request
                    var payReq = JSON.stringify({
                        'intent':'sale',
                        'redirect_urls':{
                            'return_url': redirect + '/process',
                            'cancel_url': redirect + '/cancel'
                        },
                        'payer':{
                            'payment_method':'paypal'
                        },
                        'transactions':[{
                            'description': 'This is the payment transaction description.',
                            'amount': {
                                'total': dataArr[1],
                                'currency': dataArr[2]
                            },
                            'payee': {
                                'email': user.email
                            }
                        }]
                    });
                
                    //create payment request before PayPal redirect to approve
                    paypal.payment.create(payReq, function(error, payment){
                        if(error){
                            console.error(JSON.stringify(error));
                        } else {
                            //capture HATEOAS links
                            var links = {};
                            payment.links.forEach(function(linkObj){
                                links[linkObj.rel] = {
                                    'href': linkObj.href,
                                    'method': linkObj.method
                                };
                            })
        
                            //if redirect url present, insert link into bot message and display
                            if (links.hasOwnProperty('approval_url')){
                                reply.attachments[0].title_link = links['approval_url'].href;
                                bot.replyInteractive(message, reply);
                            } else {
                                console.error('no redirect URI present');
                            }
                        }
                    });
                });
                break;
            //process subscription
            case '333': 
                var billingPlan = 'YOUR ACTIVATED BILLING PLAN ID';
                
                //build isodate for billing agreement
                var isoDate = new Date();
                isoDate.setSeconds(isoDate.getSeconds() + 4);
                isoDate.toISOString().slice(0, 19) + 'Z';
                
                //create billing agreement configuration
                var billingAgreementAttributes = {
                    "name": "Standard Membership",
                    "description": "Membership Description",
                    "start_date": isoDate,
                    "plan": {
                        "id": billingPlan
                    },
                    "payer": {
                        "payment_method": "paypal"
                    }
                };

                //Use activated billing plan to create agreement
                paypal.billingAgreement.create(billingAgreementAttributes, function (error, billingAgreement){
                    if (error) {
                        console.error(JSON.stringify(error));
                        throw error;
                    } else {
                        //capture HATEOAS links
                        var links = {};
                        billingAgreement.links.forEach(function(linkObj){
                            links[linkObj.rel] = {
                                'href': linkObj.href,
                                'method': linkObj.method
                            };
                        })

                        //if redirect url present, insert link into bot message and display
                        if (links.hasOwnProperty('approval_url')){
                            reply.attachments[0].title_link = links['approval_url'].href;
                            bot.replyInteractive(message, reply);
                        } else {
                            console.error('no redirect URI present');
                        }
                    }
                });
                break;
            default: break;
        }
    }
});

/****************************************************************
* Attach a PayPal payment email to a Slack user ID, for payment
****************************************************************/
controller.hears(['add paypal (.*)'], 'direct_message,direct_mention,mention', function(bot, message){
    var email = message.match[1];
    controller.storage.users.get(message.user, function(err, user){
        //create new user if one does not exist
        if (!user) {
            user = {
                id: message.user,
            };
        }
        //extract single email from mailto string and store
        //source: http://www.regular-expressions.info/email.html
        user.email = email.match(/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/)[0];
        
        //save user record
        controller.storage.users.save(user, function(err, id) {
            bot.reply(message, 'Your PayPal payment email will be ' + user.email + ' from now on.');
        });
    });
});

/****************************************************************
* If user has requested a direct user payment, provide a
* confirmation before pushing to callback for processing
****************************************************************/
//controller.hears(['^pay\s\@?\w+\s\w+\s\w{3}\s?$'], 'direct_message', function(bot, message){
controller.hears(['pay (.*) (.*) (.*)'], 'direct_message', function(bot, message){
    var msg = message.match[0];
    var uid = message.match[1].replace(/\W+/g, '');
    var amount = message.match[2];
    var currency = message.match[3];
    
    bot.reply(message, {
        attachments:[{
            title: 'Would you like to ' + msg + '?',
            callback_id: '222',
            attachment_type: 'default',
            actions: [{
                "name":"yes",
                "text": "Yes",
                "value": uid + '|' + amount + '|' + currency,
                "type": "button",
            },{
                "name":"no",
                "text": "No",
                "value": "no",
                "type": "button",
            }]
        }]
    });
});

/****************************************************************
* If user has requested a direct user payment, provide a
* confirmation before pushing to callback for processing
****************************************************************/
controller.hears('pay', 'direct_message', function(bot, message){
    bot.reply(message, {
        attachments:[{
            title: 'Would you like to pay for this service?',
            callback_id: '111',
            attachment_type: 'default',
            actions: [{
                "name":"yes",
                "text": "Yes",
                "value": "yes",
                "type": "button",
            },{
                "name":"no",
                "text": "No",
                "value": "no",
                "type": "button",
            }]
        }]
    });
});

/****************************************************************
* If user has requested to subscribe to a service, provide a
* confirmation before pushing to callback for processing
****************************************************************/
controller.hears('subscribe', 'direct_message', function(bot, message){
    bot.reply(message, {
        attachments:[{
            title: 'Would you like to subscribe to the service?',
            callback_id: '333',
            attachment_type: 'default',
            actions: [{
                "name":"yes",
                "text": "Yes",
                "value": "yes",
                "type": "button",
            },{
                "name":"no",
                "text": "No",
                "value": "no",
                "type": "button",
            }]
        }]
    });
});

/****************************************************************
* Stop bot
****************************************************************/
controller.hears('^stop','direct_message',function(bot,message){
    bot.reply(message, 'Goodbye');
    bot.rtm.close();
});

/****************************************************************
* Process a billing agreement once user is redirected back
****************************************************************/
controller.webserver.get('/processagreement', function(req, res){
    //extract validation token needed to process agreement
    var token = req.query.token;
    
    //attempt to complete the billing agreement for the user
    paypal.billingAgreement.execute(token, {}, function (error, billingAgreement) {
        if (error) {
            console.error(JSON.stringify(error));
            throw error;
        } else {
            res.send('Billing agreement created successfully');
        }
    });
});

/****************************************************************
* Process a direct PayPal payment once user is redirected back 
****************************************************************/
controller.webserver.get('/process', function(req, res){
    //extract payment confirmation information needed to process payment
    var paymentId = req.query.paymentId;
    var payerId = { 'payer_id': req.query.PayerID };

    //attempt to complete the payment for the user
    paypal.payment.execute(paymentId, payerId, function(error, payment){
        if(error){
            console.error(JSON.stringify(error));
        } else {
            if (payment.state == 'approved'){ 
                res.send('Payment completed successfully');
            } else {
                res.send('Payment not successful');
            }
        }
    });
});

/****************************************************************
* Payment incomplete: User cancelled the transaction on PayPal
****************************************************************/
controller.webserver.get('/cancel', function(req, res){
    res.send('Payment cancelled');
});

/****************************************************************
* Bot team connection
****************************************************************/
controller.storage.teams.all(function(err,teams){
    if (err){ throw new Error(err); }

    //connect all teams with bots up to slack!
    for (var t  in teams){
        if (teams[t].bot){
            controller.spawn(teams[t]).startRTM(function(err, bot){
                if (err){ console.log('Error connecting bot to Slack:',err); } 
                else{ trackBot(bot); }
            });
        }
    }
});

/****************************************************************
* Create a billing plan to assign to users via billing agreement
****************************************************************/
controller.webserver.get('/createplan', function(req, res){
    //billing plan configuration
    var billingPlanAttribs = {
        "name": "Membership: Standard",
        "description": "Monthly plan for my bot service",
        "type": "fixed",
        "payment_definitions": [{
            "name": "Standard Plan",
            "type": "REGULAR",
            "frequency_interval": "1",
            "frequency": "MONTH",
            "cycles": "11",
            "amount": {
                "currency": "USD",
                "value": "19.99"
            }
        }],
        "merchant_preferences": {
            "setup_fee": {
                "currency": "USD",
                "value": "1"
            },
            "cancel_url": redirect + "/cancel",
            "return_url": redirect + "/process",
            "max_fail_attempts": "0",
            "auto_bill_amount": "YES",
            "initial_fail_amount_action": "CONTINUE"
        }
    };
    
    //attributes for PATCH call to activate billing plan
    var billingPlanUpdateAttributes = [{
        "op": "replace",
        "path": "/",
        "value": {
            "state": "ACTIVE"
        }
    }];

    //create new billing plan
    paypal.billingPlan.create(billingPlanAttribs, function (error, billingPlan){
        if (error){
            console.log(JSON.stringify(error));
            throw error;
        } else {
            //activate plan by changing status to active
            paypal.billingPlan.update(billingPlan.id, billingPlanUpdateAttributes, function(error, response){
                if (error) {
                    console.log(JSON.stringify(error));
                    throw error;
                } else {
                    res.send('Billing plan created under ID: ' + billingPlan.id);
                }
            });
        }
    });
});
