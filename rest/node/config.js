var paypal = require('paypal-rest-sdk');
exports.paypal = paypal;

var client_id = 'YOUR CLIENT ID';
var secret = 'YOUR CLIENT SECRET';

paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': client_id,
  'client_secret': secret
});
