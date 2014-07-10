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

	var PortfolioModel = Backbone.Model.extend({

	});

	var PortfolioCollection = Backbone.Collection.extend({
		model : PortfolioModel,
		url : '/portfolio'
	});

	var PortfolioView = Backbone.View.extend({
		initialize : function() {
			var self = this;
			window.portfolioCollection = new PortfolioCollection();
			window.portfolioCollection.fetch({
				success : function() {
					self.render();
				},
				error : function() {
					console.log('Error fetching data for portfolio');
				}
			});
		},
		render : function() {
			for (var i = 0; i < window.portfolioCollection.models.length; i++) {
				var data = window.portfolioCollection.models[i];
				var rowView = new RowView({ model : data });
				$('.stock-list').append(rowView.render().el);
			};
		}
	});

	var RowView = Backbone.View.extend({
		tagName : 'tr',
		render : function() {
			var template = _.template('<td><%= stock %></td><td><%= price %></td>');
			$(this.el).html(template(this.model.toJSON()));
			return this;
		}
	});

	new PortfolioView();

});