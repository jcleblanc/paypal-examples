var paypal = require('paypal-rest-sdk'),
    http = require('http'),
    url = require('url');

var client_id = 'YOUR CLIENT ID';
var secret = 'YOUR CLIENT SECRET';

paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': client_id,
    'client_secret': secret
});

function createPayment(req, res){
    
    //build PayPal payment request
    var payReq = {
        'intent':'sale',
        'redirect_urls':{
            'return_url':'http://localhost:3000/process',
            'cancel_url':'http://localhost:3000/cancel'
        },
        'payer':{
            'payment_method':'paypal'
        },
        'transactions':[{
            'amount':{
                'total':'7.47',
                'currency':'USD'
            },
            'description':'This is the payment transaction description.'
        }]
    };

    //create payment
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
      
            //if redirect url present, redirect user
            if (links.hasOwnProperty('approval_url')){
                res.writeHead(301, {"Location": links['approval_url'].href});
                res.end();
                //res.redirect(links['approval_url'].href);
            } else {
                console.error('no redirect URI present');
            }
        }
    });
}

function processPayment(req, res){
    var params = url.parse(req.url, true).query;
    var paymentId = params.paymentId;
    var token = params.token;
    var payerId = { 'payer_id': params.PayerID };

    paypal.payment.execute(paymentId, payerId, function(error, payment){
        if(error){
            console.error(error);
        } else {
            if (payment.state == 'approved'){ 
                console.log('payment completed successfully');
            } else {
                console.log('payment not successful');
            }
        }
    });
}

//create server
http.createServer(function(req, res){
    console.log(url.parse(req.url).pathname);
    switch(url.parse(req.url).pathname){
        case '/create': createPayment(req, res); break;
        case '/process': processPayment(req, res); break;
        default: console.log('no viable route'); break;
    }
}).listen(3000, function (){
   console.log('Server started: Listening on port 3000');
});
