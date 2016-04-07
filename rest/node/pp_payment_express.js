var config = require('./config.js'),
    http = require('http'),
    isurl = require('is-url'),
    paypal = config.paypal,
    bodyParser = require('body-parser'),
    app = require('express')();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/start', function(req, res){
    //build PayPal payment request
    var payReq = JSON.stringify({
        'intent':'sale',
        'redirect_urls':{
            'return_url':'http://localhost:3000/return',
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
    });

    //build http POST options list
    var options = {
        host: 'localhost',
        port: '3000',
        path: '/pay',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': payReq.length
        }
    };

    //set up request
    var postReq = http.request(options, function(result){
        result.setEncoding('utf8');
        result.on('data', function(redirectData){
            //check if returned data is valid, then redirect
            if (isurl(redirectData)){
                res.redirect(redirectData);
            }
        });
    });
    
    //post data
    postReq.write(payReq);
    postReq.end();
});

//handle all POST requests
app.post('/pay', function(req, res){
    var payReq = req.body;
    
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
              res.send(links['approval_url'].href);
          } else {
              console.error('no redirect URI present');
          }
      }
    });
});

app.get('/return', function(req, res){
    var paymentId = req.query.paymentId;
    var token = req.query.token;
    var payerId = req.query.PayerID;

    var payerId = { 'payer_id': payerId };
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
});

//create server
http.createServer(app).listen(3000, function () {
   console.log('Server started: Listening on port 3000');
});