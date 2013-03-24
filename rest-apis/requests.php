<?php
define("CLIENT_ID", "YOUR CLIENT ID");
define("CLIENT_SECRET", "YOUR SECRET");

define("URI_SANDBOX", "https://api.sandbox.paypal.com/v1/");

class paypal{
    private $access_token;
    private $token_type;
    
    public function __construct($state){
        $postvals = "grant_type=client_credentials";
        $uri = URI_SANDBOX . "oauth2/token";
        
        $auth_response = self::curl($uri, 'POST', $postvals, true);
        var_dump($auth_response);
        $this->access_token = $auth_response['body']->access_token;
        $this->token_type = $auth_response['body']->token_type;
    }
    
    public function process_payment($request){
        $postvals = $request;
        $uri = URI_SANDBOX . "payments/payment";
        $response = self::curl($uri, 'POST', $postvals);
    }
    
    public function refund_cc($sale_id){
        $uri = URI_SANDBOX . "payments/sale/$sale_id/refund";
        $response = self::curl($uri, 'POST', '{}');
    }
    
    public function store_cc($cc_object){
        $uri = URI_SANDBOX . "vault/credit-card";
        $response = self::curl($uri, 'POST', json_encode($cc_object));
    }
    
    private function curl($url, $method = 'GET', $postvals = null, $auth = false){
        $ch = curl_init($url);
           
        if ($method == 'GET'){
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        } else {
            if ($auth){
                $headers = array("Accept: application/json", "Accept-Language: en_US");
                curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
                curl_setopt($ch, CURLOPT_USERPWD, CLIENT_ID . ":" .CLIENT_SECRET);
                curl_setopt($ch, CURLOPT_SSLVERSION, 3);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
            } else {
                $headers = array("Content-Type:application/json", "Authorization:{$this->token_type} {$this->access_token}");
            }
            
            $options = array(
                CURLOPT_HEADER => true,
                CURLINFO_HEADER_OUT => true,
                CURLOPT_VERBOSE => true,
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POSTFIELDS => $postvals,
                CURLOPT_CUSTOMREQUEST => $method,
                CURLOPT_TIMEOUT => 10
            );
            
            curl_setopt_array($ch, $options);
        }
           
        $response = curl_exec($ch);
        $header = substr($response, 0, curl_getinfo($ch,CURLINFO_HEADER_SIZE));
        $body = json_decode(substr($response, curl_getinfo($ch,CURLINFO_HEADER_SIZE)));
        curl_close($ch);
            
        return array('header' => $header, 'body' => $body);
    }
}

$paypal = new paypal();

$request = '{
  "intent": "sale",
  "payer": {
    "payment_method": "credit_card",
    "funding_instruments": [
      {
        "credit_card": {
          "number": "5500005555555559",
          "type": "mastercard",
          "expire_month": 12,
          "expire_year": 2018,
          "cvv2": 111,
          "first_name": "Joe",
          "last_name": "Shopper"
        }
      }
    ]
  },
  "transactions": [
    {
      "amount": {
        "total": "7.47",
        "currency": "USD"
      },
      "description": "This is the payment transaction description."
    }
  ]
}';

//$paypal->process_payment($request);

/*$credit_card = array("type" => "visa",
                     "number" => "4417119669820331",
                     "expire_month" => "11",
                     "expire_year" => "2018",
                     "first_name" => "Joe",
                     "last_name" => "Shopper");

$paypal->store_cc($credit_card);*/

/*$sale_id = "8RV385008S218341G";
$paypal->refund_cc($sale_id);*/

$request = '{
  "intent":"sale",
  "redirect_urls":{
    "return_url":"http://www.return.com",
    "cancel_url":"http://www.cancel.com"
  },
  "payer":{
    "payment_method":"paypal"
  },
  "transactions":[
    {
      "amount":{
        "total":"7.47",
        "currency":"USD"
      },
      "description":"This is the payment transaction description."
    }
  ]
}';

$paypal->process_payment($request);

?>
