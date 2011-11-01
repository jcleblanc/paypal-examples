<?php
class ExpressCheckout{
    private $urlBase = "https://api-3t.sandbox.paypal.com/nvp";
    private $urlRedirect = "https://www.sandbox.paypal.com/webscr";
    private $version = "78";
    private $stringBase = null;
    private $uid = null;
    private $password = null;
    private $signature = null;
    
    public function __construct($uid, $password, $signature){
        $this->uid = $uid;
        $this->password = $password;
        $this->signature = $signature;
        $this->stringBase = sprintf("USER=%s&PWD=%s&SIGNATURE=%s", $uid, $password, $signature);
    }
    
    public function setCheckout($postParams = null){
        $postData = sprintf("%s&METHOD=SetExpressCheckout&VERSION=%s", $this->stringBase, $this->version);
        
        if ($postParams != null){
            foreach ($postParams as $key => $value){
                $postData .= "&$key=$value";
            }
            
            $response = $this->parseString($this->runCurl($this->urlBase, $postData));
            
            //forward the user to login and accept transaction
            $redirect = sprintf("%s?cmd=_express-checkout&token=%s", $this->urlRedirect, $response["TOKEN"]);
    
            header("Location: $redirect");
        } else {
            return "Request Cancelled: No POST parameters present in request";
        }
    }
    
    public function getCheckoutDetails(){
        $token = $_GET['token'];
        
        if ($token){
            //fetch payee information
            $postData = sprintf("%s&METHOD=GetExpressCheckoutDetails&VERSION=78&TOKEN=%s", $this->stringBase, $token);
            $response = $this->parseString($this->runCurl($this->urlBase, $postData));
            return $response;
        } else {
            return "Token not present in query string: please ensure that this request has been called after user has been returned from setCheckout(...) call";
        }
    }
    
    public function completeCheckout(){
        $payeeDetails = $this->getCheckoutDetails();
        $postData = sprintf("%s&METHOD=DoExpressCheckoutPayment&VERSION=%s&TOKEN=%s&PAYERID=%s&PAYMENTREQUEST_0_AMT=%s&PAYMENTREQUEST_0_CURRENCYCODE=%s&PAYMENTREQUEST_0_PAYMENTACTION=Sale",
                            $this->stringBase,
                            $this->version,
                            $payeeDetails["TOKEN"],
                            $payeeDetails["PAYERID"],
                            $payeeDetails["AMT"],
                            $payeeDetails["CURRENCYCODE"]);
        
        
        $response = $this->parseString($this->runCurl($this->urlBase, $postData));
        return $response;
    }
    
    private function parseString($string = null){
        $recordString = explode("&", $string);
        foreach ($recordString as $value){
            $singleRecord = explode("=", $value);
            $allRecords[$singleRecord[0]] = $singleRecord[1];
        }
        
        return $allRecords;
    }
    
    private function runCurl($url, $postVals = null){
        $ch = curl_init($url);
        
        $options = array(
            CURLOPT_VERBOSE => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POSTFIELDS => $postVals,
            CURLOPT_CUSTOMREQUEST => "POST",
            CURLOPT_TIMEOUT => 3
        );
        curl_setopt_array($ch, $options);
        
        $response = curl_exec($ch);
        curl_close($ch);
        
        return $response;
    }
}
?>