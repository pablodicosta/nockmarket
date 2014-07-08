$(document).ready(function() {

	$('#add-stock').click(function(e) {
		$.ajax({
			type : 'POST',
			url : '/add-stock',
			data : { stock : $('#stock').val() }
		}).done(function(price) {
			$('.stock-list').append('<tr><td>' + $('#stock').val() + '</td><td>' + price + '</td></tr>');
		});
	});

	var PortfolioView = Backbone.View.extend({
		initialize : function() {
			this.render();
		},
		render : function() {
			$('.stock-list').html('<tr><td>1</td><td>2</td></tr>');
		}
	});

	new PortfolioView();

});