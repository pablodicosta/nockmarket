$(document).ready(function() {
	
	$('#update-account').click(function() {
		socket.emit('updateAccount', { email : $('#email').val() });
	});

	socket.on('updateSuccess', function(data) {
		$('#emailUpdateSuccess').hide().removeClass('hide').fadeIn('fast').delay(2000).fadeOut('fast');
	});

});