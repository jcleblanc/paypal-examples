<?php
define("CLIENT_ID", "YOUR CLIENT ID");
define("CLIENT_SECRET", "YOUR SECRET");

define("URI_SANDBOX", "https://api.sandbox.paypal.com/v1/");
define("URI_LIVE", "https://api.paypal.com/v1/");

class paypal{
    private $access_token;
    private $token_type;
    
    /**
    * Constructor
    *
    * Handles oauth 2 bearer token fetch
    * @link https://developer.paypal.com/webapps/developer/docs/api/#authentication--headers
    */
    public function __construct($state){
        $postvals = "grant_type=client_credentials";
        $uri = URI_SANDBOX . "oauth2/token";
        
        $auth_response = self::curl($uri, 'POST', $postvals, true);
        $this->access_token = $auth_response['body']->access_token;
        $this->token_type = $auth_response['body']->token_type;
    }
    
    /**
    * Process Payment
    *
    * Processes a PayPal or credit card payment
    * @link https://developer.paypal.com/webapps/developer/docs/api/#create-a-payment
    */
    public function process_payment($request){
        $postvals = $request;
        $uri = URI_SANDBOX . "payments/payment";
        $response = self::curl($uri, 'POST', $postvals);
    }
    
    /**
    * Refund Sale
    *
    * Refunds a previous payment
    * @link https://developer.paypal.com/webapps/developer/docs/api/#refunds
    */
    public function refund_sale($sale_id){
        $uri = URI_SANDBOX . "payments/sale/$sale_id/refund";
        $response = self::curl($uri, 'POST', '{}');
    }
    
    /**
    * Store Credit Card
    *
    * Stores a credit card value in the vault
    * @link https://developer.paypal.com/webapps/developer/docs/api/#store-a-credit-card
    */
    public function store_cc($cc_object){
        $uri = URI_SANDBOX . "vault/credit-card";
        $response = self::curl($uri, 'POST', json_encode($cc_object));
    }
    
    /**
    * cURL
    *
    * Handles GET / POST requests for auth requests
    * @link http://php.net/manual/en/book.curl.php
    */
    private function curl($url, $method = 'GET', $postvals = null, $auth = false){
        $ch = curl_init($url);
           
        if ($method == 'GET'){
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        } else {
            //if we are sending request to obtain bearer token
            if ($auth){
                $headers = array("Accept: application/json", "Accept-Language: en_US");
                curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
                curl_setopt($ch, CURLOPT_USERPWD, CLIENT_ID . ":" .CLIENT_SECRET);
                curl_setopt($ch, CURLOPT_SSLVERSION, 3);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
            //if we are sending request with the bearer token for protected resources
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
?>
