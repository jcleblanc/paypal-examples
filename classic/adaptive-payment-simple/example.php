<?php
require_once("ap.php");

$uid = "YOUR USER ID";
$password = "YOUR PASSWORD";
$signature = "YOUR SIGNATURE";
$appid = "YOUR APPLICATION ID";
$sender = "SENDER EMAIL";
$receiver = "RECEIVER EMAIL";
$urlSuccess = "http://localhost/example.php?status=success";
$urlFailure = "http://localhost/example.php?status=cancel";

$pay = new AdaptivePayments($uid, $password, $signature, $appid);

$postData = array("cancelUrl" => $urlFailure,
                  "returnUrl" => $urlSuccess,
                  "senderEmail" => $sender,
                  "receiverList.receiver(0).email" => $receiver,
                  "receiverList.receiver(0).amount" => "1",
                  "currencyCode" => "USD",
                  "feesPayer" => "EACHRECEIVER",
                  "memo" => "Money time!");
    
$pay->makePayment($postData);
}
?>
