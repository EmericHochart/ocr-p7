// Initialisation des variables globales
var restaurants = new Array();
var restaurantsDisplayed = new Array();
var currentRestaurant = null;
var map;
var minRating = 0;
var maxRating = 5;
var markers = [];


$(function() {
    // Init jQuery UI slider range
    $("#slider-range").slider({
      range: true,
      min: 0,
      max: 5,
      values: [0, 5],
      slide: function(event, ui) {
        $("#rating").val(ui.values[0] + " - " + ui.values[1]);
        minRating = ui.values[0];      
        maxRating = ui.values[1];
        handleBoundsChanged();        
      }
    });
    // Display range rating
    $("#rating").val(
      $("#slider-range").slider("values", 0) +
        " - " +
        $("#slider-range").slider("values", 1)
    );
    
  });