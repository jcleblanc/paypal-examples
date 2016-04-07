<?php
class AdaptivePayments{
    private $urlBase = "https://svcs.sandbox.paypal.com/AdaptivePayments/Pay";
    private $urlRedirect = "https://www.sandbox.paypal.com/webscr";
    private $version = "78";
    private $stringBase = null;
    private $uid = null;
    private $password = null;
    private $signature = null;
    private $appid = null;
    
    public function __construct($uid, $password, $signature, $appid){
        $this->uid = $uid;
        $this->password = $password;
        $this->signature = $signature;
        $this->appid = $appid;
    }
    
    public function makePayment($postParams = null){
        $headers = array("X-PAYPAL-SECURITY-USERID: {$this->uid}",
                         "X-PAYPAL-SECURITY-PASSWORD: {$this->password}",
                         "X-PAYPAL-SECURITY-SIGNATURE: {$this->signature}",
                         "X-PAYPAL-APPLICATION-ID: {$this->appid}",
                         "X-PAYPAL-REQUEST-DATA-FORMAT: NV",
                         "X-PAYPAL-RESPONSE-DATA-FORMAT: NV");
        
        $postData = sprintf("METHOD=PAY&VERSION=%s&requestEnvelope.errorLanguage=en_US&actionType=PAY", $this->version);
        if ($postParams != null){
            foreach ($postParams as $key => $value){
                $postData .= "&$key=$value";
            }
            
            $response = $this->parseString($this->runCurl($this->urlBase, $postData, $headers));
            
            //forward the user to login and accept transaction
            $redirect = sprintf("%s?cmd=_ap-payment&paykey=%s", $this->urlRedirect, $response["payKey"]);
            
            header("Location: $redirect");
        } else {
            return "Request Cancelled: No POST parameters present in request";
        }
    }
    
    private function parseString($string = null){
        $recordString = explode("&", $string);
        foreach ($recordString as $value){
            $singleRecord = explode("=", $value);
            $allRecords[$singleRecord[0]] = $singleRecord[1];
        }
        
        return $allRecords;
    }
    
    private function runCurl($url, $postVals = "", $headers = ""){
        $ch = curl_init($url);
        
        $options = array(
            CURLOPT_VERBOSE => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
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