// Display Data
function afficherRestaurants(reponse) {  
  restaurants = JSON.parse(reponse);
}

// Initialize and add the map
function initMap() {
  // The location by Default : Restaurant Bronco in Paris
  var defaultLocation = { lat: 48.8737815, lng: 2.3501649 };
  // The map, centered at defaultLocation
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 10,
    center: defaultLocation,
    mapTypeId: "roadmap"
  });
  // The marker, positioned at defaultLocation
  addMarker(defaultLocation); 

  // Try HTML5 geolocation.
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function(position) {
        var pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        // We center the map on the user's position
        map.setCenter(pos);
        // Marker for the user's position (green marker)
        var markerUser = new google.maps.Marker({
          position: pos,
          map: map,
          icon: {
            url: "http://maps.google.com/mapfiles/ms/icons/grn-pushpin.png"
          }
        });
        
      },
      function() {
        handleLocationError(true, infoWindow, map.getCenter());
      }
    );
  } else {
    // Browser doesn't support Geolocation
    handleLocationError(false, infoWindow, map.getCenter());
  }  
 
  // Request : json file recovery
  ajaxGet("json/restaurant.json", afficherRestaurants);

  // Init event listener on googlemap (event:bounds_changed)
  google.maps.event.addListener(map, "bounds_changed", handleBoundsChanged );

  // Init event listener (add Marker when click)
  map.addListener('click', function(e) {    
    placeMarkerAndPanTo(e.latLng, map);
  });
  
}

// Manage Add Marker and Zoom
function placeMarkerAndPanTo(latLng, map) {
  // Form Add Restaurant
    var formElt = document.createElement("form");
    formElt.id = "formAddRestaurant";
    var fieldsetElt = document.createElement("fieldset");
    var legendElt = document.createElement("legend");
    legendElt.textContent = "Coord :"+latLng.lat() + " : " + latLng.lng();
    fieldsetElt.appendChild(legendElt);
    var labelNameElt = document.createElement("label");
    labelNameElt.for = "name";
    labelNameElt.textContent = "Nom du restaurant : ";
    fieldsetElt.appendChild(labelNameElt);     
    var inputNameElt = document.createElement("input");
    inputNameElt.id = "name";
    inputNameElt.placeholder = "..."; 
    fieldsetElt.appendChild(inputNameElt);
    var labelAddressElt = document.createElement("label");
    labelAddressElt.for = "address";
    labelAddressElt.textContent = "Addresse du restaurant : ";
    fieldsetElt.appendChild(labelAddressElt);     
    var inputAddressElt = document.createElement("input");
    inputAddressElt.id = "address";
    inputAddressElt.placeholder = "..."; 
    fieldsetElt.appendChild(inputAddressElt);

  // Add cancel button
    var buttonCancelElt = document.createElement("button");
    buttonCancelElt.id = "cancelRestaurant";
    buttonCancelElt.textContent = "Annuler";   
    buttonCancelElt.addEventListener("click", function(e){
      e.preventDefault();
      document.getElementById("formAddRestaurant").remove();
    });
    fieldsetElt.appendChild(buttonCancelElt);
  
  // Add submit input
    var inputSubmitElt = document.createElement("input");
    inputSubmitElt.id = "addRestaurant";
    inputSubmitElt.type = "submit";
    inputSubmitElt.value = "Ajouter un restaurant";   
    inputSubmitElt.addEventListener("click", function(e){
      // add Marker
      var marker = new google.maps.Marker({
        position: latLng,
        map: map
      });
      // Zoom
      map.panTo(latLng);
      // Add restaurant to the array
      var name = formElt.elements.name.value;
      var address = formElt.elements.address.value;
      var lat = latLng.lat();
      var lng = latLng.lng();
      var ratings = [];
      var restaurant = {};
      restaurant.restaurantName = name;
      restaurant.address = address;
      restaurant.lat = lat;
      restaurant.long = lng;
      restaurant.ratings = ratings;
      restaurants.push(restaurant);
      // preventDefault
      e.preventDefault();
      // Remove Form
      document.getElementById("formAddRestaurant").remove();
    }, true);
    fieldsetElt.appendChild(inputSubmitElt);

    formElt.appendChild(fieldsetElt);
    
    document.getElementById("restaurant").appendChild(formElt); 
}

// Add Restaurant to the array
function addRestaurant(results, status) {
  if (status == google.maps.places.PlacesServiceStatus.OK) {
    // Limitation of the list of restaurants to recover: 10 first restaurants
    var lengthList = results.length>10?10:results.length; 
    // We go through the list    
    for (var i = 0; i < lengthList; i++) {
      // Create Object Restaurant
      var restaurant = {};
      restaurant.restaurantName = results[i].name;
      restaurant.address = results[i].vicinity;
      restaurant.lat = results[i].geometry.location.lat();
      restaurant.long = results[i].geometry.location.lng();  
      restaurant.ratings = [];      
      // Request : Recovery of rewiews and ratings
      var request = {
        placeId: results[i].place_id,
        fields: ['reviews']
      };         

      var service = new google.maps.places.PlacesService(map);
      
      service.getDetails(request, function(place, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          // add condition on reviews ///////////////////////////////////////////////////////////////// TODO
          var reviews = place.reviews;          
          reviews.forEach(function(review){
            var view = {};
            view.stars = review.rating;
            view.comment = review.text;
            restaurant.ratings.push(view);
          });
          // We make sure that the restaurant is not already in the list
          var presentRestaurant = false;
          restaurants.forEach(function(item) {
            if(item.lat==restaurant.lat && item.long==restaurant.long){
              presentRestaurant = true;
            }
          }); 
          if(presentRestaurant == false) {
            restaurants.push(restaurant);
          };
        };
      });
    }
  }
}

// Create Marker on location
function createMarker(place) {
  var marker = new google.maps.Marker({
    map: map,
    position: place.geometry.location
  });
  // Add infowindow on marker 
  var infowindow = new google.maps.InfoWindow();
  google.maps.event.addListener(marker, 'click', function() {
    infowindow.setContent(place.name);
    infowindow.open(map, this);
  });
}

// Manage Location Error
function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  infoWindow.setPosition(pos);
  infoWindow.setContent(
    browserHasGeolocation
      ? "Erreur: Le service de géolocalisation a échoué."
      : "Erreur: Votre navigateur ne supporte pas la géolocalisation."
  );
  infoWindow.open(map);
}

// Callback bound_changed
function handleBoundsChanged() {
  var limite = map.getBounds();
  var center = map.getCenter();
  var lat = center.lat();
  var lng = center.lng();
  var location = { lat: lat, lng: lng };
  // Request : find restaurant around location
  var service;
  var request = {
    location: location,
    radius: '500',
    type: ['restaurant']
  };
  service = new google.maps.places.PlacesService(map);  
  service.nearbySearch(request, addRestaurant);
      
  // Remove HTML 
  document.getElementById("listeRestaurants").innerHTML = "";  

  // If the displayed restaurant is no longer part of the restaurants to display, we delete the description
  if (!restaurantsDisplayed.includes(currentRestaurant)){
    document.getElementById("description").innerHTML = "";
  };  

  // Remove all Markers
  clearMarkers();
  
  // check list  
  restaurants.forEach(function(restaurant) {    

    let coordRestaurant = { lat: restaurant.lat, lng: restaurant.long };
    
    // Calculation of the average of the comments ////// TODO : ratings={} !!!!!
      var averageRating = 0;
      var numberRatings = restaurant.ratings.length;
      restaurant.ratings.forEach(function(rating) {
        averageRating += rating.stars;
      });
      numberRatings !== 0 ? averageRating = averageRating / numberRatings : averageRating = 0;        

      // Display the restaurant in the list if it is on the map
      if (limite.contains(coordRestaurant) && averageRating <= maxRating && averageRating >= minRating && restaurantsDisplayed.length < 10) { 
        
        // Check restaurant in restaurantsDisplayed
        if (!restaurantsDisplayed.includes(restaurant)){
          restaurantsDisplayed.push(restaurant);
        };        
       
        // Modification of the HTML content of the list: addition of a restaurant, its average and its address
        var liElt = document.createElement("li"); // Création d'un élément li
        var aElt = document.createElement("a");
        aElt.id = restaurant.restaurantName;
        aElt.href = "#";
        aElt.textContent = restaurant.restaurantName + " | Moyenne : " + averageRating ;        
        aElt.addEventListener('click', function(e){
          information(restaurant);
          e.preventDefault();
        });
        liElt.appendChild(aElt);
        document.getElementById("listeRestaurants").appendChild(liElt); // Insertion du nouvel élément
        
        // Showing restaurants by their coordinates on the map via a marker
        let latLng = new google.maps.LatLng(restaurant.lat, restaurant.long);        
        addMarker(latLng);
      }
      else {
        if (restaurantsDisplayed.includes(restaurant)){
          var position = restaurantsDisplayed.indexOf(restaurant);          
          restaurantsDisplayed.splice(position, 1);  
        };
      };

  });  
}

// Adds a marker to the map and push to the array.
function addMarker(location) {
  var marker = new google.maps.Marker({
    position: location,
    map: map
  });
  markers.push(marker);
}

// Sets the map on all markers in the array.
function setMapOnAll(map) {
  for (var i = 0; i < markers.length; i++) {
    markers[i].setMap(map);
  }
}

// Removes the markers from the map, but keeps them in the array.
function clearMarkers() {
  setMapOnAll(null);
}

// Shows any markers currently in the array.
function showMarkers() {
  setMapOnAll(map);
}

// Deletes all markers in the array by removing references to them.
function deleteMarkers() {
  clearMarkers();
  markers = [];
}

// Information 
function information(restaurant){
  // On vide la div de description
  document.getElementById("description").innerHTML = "";  
  currentRestaurant = restaurant;
  var pos = {
    lat: restaurant.lat,
    lng: restaurant.long
  };

  var location = pos.lat+","+ pos.lng;        
  //var url = "https://maps.googleapis.com/maps/api/streetview?size=400x400&location="+location+"&key=APIKEY";
  var url =""
  // Description
  var description = restaurant.restaurantName + ' : ' + restaurant.address + ' ( ' + restaurant.lat + ', ' + restaurant.long + ' )';
  
  var divElt = document.createElement("div");
  divElt.id = 'description-'+ restaurant.restaurantName;
  var pElt = document.createElement("p");
  pElt.textContent = description;
  divElt.appendChild(pElt);
  // Image
  var imgElt = document.createElement("img");
  imgElt.src = url;
  divElt.appendChild(imgElt);
  
  // Ratings
  if (restaurant.ratings.length !==0 ){
    var ulElt = document.createElement("ul");
    for (i=0;i<restaurant.ratings.length;i++){      
      var liElt = document.createElement("li");
      liElt.textContent = "Stars : " + restaurant.ratings[i].stars + " | Comment : " + restaurant.ratings[i].comment;
      ulElt.appendChild(liElt);
    };
    divElt.appendChild(ulElt);
  };
  document.getElementById('description').appendChild(divElt);
  //
  var formElt = document.createElement("form");
  var labelElt = document.createElement("label");
  labelElt.for = "rating";
  labelElt.textContent = "Notez le restaurant : ";
  formElt.appendChild(labelElt);  
  //formElt.onsubmit = addrating();
  var selectElt = document.createElement("select");
  selectElt.id = "rating";
  for (i=0; i<6; i++) {
    var optionElt = document.createElement("option");
    optionElt.value = i;
    optionElt.textContent = i;
    selectElt.appendChild(optionElt);
  };
  formElt.appendChild(selectElt);
  textAreaElt = document.createElement("textarea");
  textAreaElt.id = "comment"
  textAreaElt.rows = 5;
  textAreaElt.cols = 30;
  textAreaElt.placeholder = "Votre commentaire ...";
  formElt.appendChild(textAreaElt);
    var inputElt = document.createElement("input");
  inputElt.type = "submit";
  inputElt.value = "Valider";
  formElt.appendChild(inputElt);
  // Affiche de toutes les données saisies ou choisies
  formElt.addEventListener("submit", function (e) {
  var rating = Number(formElt.elements.rating.value);
  var comment = formElt.elements.comment.value;
  //
  /* ICI ON VA AJOUTER LES DONNEES AU TABLEAU DE RESTAURANTS */
  var rate= {
    "stars": rating,
    "comment": comment
  };
  restaurant.ratings.push(rate);
  document.getElementById("description").innerHTML = "";  
  e.preventDefault(); // Annulation de l'envoi des données
  });
  document.getElementById('description').appendChild(formElt);
  // We center the map on the location
  map.setCenter(pos);
  
  // Eventuellement changer la couleur du marqueur ?

  
}