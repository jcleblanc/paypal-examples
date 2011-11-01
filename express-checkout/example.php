<?php
require_once("express_checkout.php");

$uid = "MERCHANT ACCOUNT ID";
$password = "MERCHANT ACCOUNT PASSWORD";
$signature = "MERCHANT ACCOUNT SIGNATURE";
$checkout = new ExpressCheckout($uid, $password, $signature);

if ($_GET["token"]){
    $userData = $checkout->getCheckoutDetails();
    print_r($userData);
    $payResponse = $checkout->completeCheckout();
    echo "<br /><br /><br />";
    print_r($payResponse);
} else {
    $urlSuccess = "http://localhost/sample.php";
    $urlFailure = "http://localhost/sample.php?status=cancel";
    
    $postData = array("AMT" => "10",
                      "cancelUrl" => $urlFailure,
                      "returnUrl" => $urlSuccess);
    
    $checkout->setCheckout($postData);
}
?>
