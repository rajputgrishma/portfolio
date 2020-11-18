<?php
/**
 * Processing the contact form
 * require php mail() function to be activate and working
 *
 * @since Brayn HTML 1.0.0
 * @author WIP Themes
 */

// Checking the method
$method = $_SERVER['REQUEST_METHOD'];
if ( 'POST' !== $method ) {
	// silence is golden.
	die();
	exit;
}

if ( ! isset( $_POST['action'] ) || ( isset( $_POST['action'] ) && 'send_message' !== $_POST['action'] ) ) {
	die();
	exit;
}

/**
 * Options,
 * Please define the settings below
 */
$options = array(
	'to_email'        => 'tester@mailinator.com', // Enter your valid email address here.
	'error_message'   => "Sorry. Cannot sent your message now. Please try again later!", // Error message, incase your server has some technical problems
	'success_message' => "Thank you! Your message has been sent successfully!", // Success message
	'subject_prefix'  => 'Brayn demo new email:', // Prefix text before email subject
);


$subject       = $options['subject_prefix'] . ' ' . stripslashes( strip_tags( $_POST['subject'] ) );
$email_content = stripslashes( $_POST['message'] );

$headers       = 'MIME-Version: 1.0' . "\r\n";
$headers      .= 'Content-type: text/html; charset=UTF-8' . "\r\n";
$headers      .= "From: " . $_POST["firstname"] . "<". $_POST["email"] .">\r\n";

$result        = array();

if ( @mail( $options['to_email'], $subject, $email_content, $headers ) ) {
	header('Content-Type: application/json; charset=UTF-8');
	$result['messages'] = $options['success_message'];
	die( json_encode( $result ) );
} else {
	// failed.
	header( 'HTTP/1.1 430 Other or undefined mail system status' );
	header( 'Content-Type: application/json; charset=UTF-8' );

	$before_error = '';
	if ( ! function_exists( 'mail' ) ) {
		$before_error = 'PHP mail() function doesn\'t exists.<br/> ';
	}
	$result['messages'] = $before_error . $options['error_message'];
	die( json_encode( $result ) );
}
