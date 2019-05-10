// Display Data JSON
function afficherRestaurants(reponse) {  
  restaurants = JSON.parse(reponse);
}

// Initialize : add the map and events
function initMap() {
  // The location by Default : Restaurant Bronco in Paris
  var defaultLocation = { lat: 48.8737815, lng: 2.3501649 };
  // The map, centered at defaultLocation
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 10,
    center: defaultLocation,
    mapTypeId: "roadmap"
  });  

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
  // Call Modal
  $('#modalAddRestaurant').modal();

  // Location
  var lat = latLng.lat();
  var lng = latLng.lng();
  // On reset les valeurs du formulaire
  document.getElementById('formAddRestaurant').reset();
  
  // Récupération du formulaire
  var formElt = document.getElementById('formAddRestaurant');  
  // Reverse geocoding
  var geocoder = new google.maps.Geocoder;
  // Autoremplissage de l'adresse par reverse geocoding
  geocodeLatLng(geocoder, latLng);
  // Ajout d'un évènement sur le bouton
  formElt.addEventListener("submit", function _listener(e){ 
      // Zoom
      map.panTo(latLng);
      // Add restaurant to the array
      var name = formElt.elements.addNameRestaurant.value;
      var address = formElt.elements.addAddressRestaurant.value;
      console.log('testsubmit',latLng.lat());
      var ratings = [];
      var restaurant = {};
      restaurant.restaurantName = name;
      restaurant.address = address;
      restaurant.lat = lat;
      restaurant.long = lng;
      restaurant.ratings = ratings;      
      restaurants.push(restaurant);
      // add Marker
      addMarker(latLng,restaurant);
      // preventDefault
      e.preventDefault();
      e.stopPropagation();
      // Remove Listener
      formElt.removeEventListener("submit", _listener, true);      
      // Close Modal
      $('#modalAddRestaurant').modal('toggle');

    },true);
}

// Reverse Geocoding
function geocodeLatLng(geocoder, latLng) {  
  geocoder.geocode({'location': latLng}, function(results, status) {
    if (status === 'OK') {
      if (results[0]) {                
        document.getElementById('addAddressRestaurant').value = results[0].formatted_address;
        document.getElementById('addAddressRestaurant').focus();
        lat = results[0].geometry.location.lat(); 
        lng = results[0].geometry.location.lng();
      } else {
        window.alert('Pas de résultat connu');        
      }
    } else {
      window.alert('Echec du geocoder : ' + status);      
    }
  }); 
   
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
          // add condition on reviews
          var reviews = (place.reviews!==null||!place.reviews)?place.reviews:[];         
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
    radius: '800',
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
      numberRatings !== 0 ? averageRating = Math.round(averageRating / numberRatings*100) / 100 : averageRating = 0;        

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
        if (restaurant.ratings.length==0){
          aElt.textContent = restaurant.restaurantName + " | Aucun commentaire";
        }
        else {
          aElt.textContent = restaurant.restaurantName + " | Moyenne : " + averageRating ;
        }        
        aElt.addEventListener('click', function(e){
          information(restaurant);          
          e.preventDefault();
        });
        liElt.appendChild(aElt);
        document.getElementById("listeRestaurants").appendChild(liElt); // Insertion du nouvel élément
        
        // Showing restaurants by their coordinates on the map via a marker
        let latLng = new google.maps.LatLng(restaurant.lat, restaurant.long);        
        addMarker(latLng,restaurant);        

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
function addMarker(location,restaurant) {   
  var marker = new google.maps.Marker({
    position: location,
    map: map,
    animation: google.maps.Animation.DROP,
  });
  // Display Modal with information on Click
  marker.addListener('click', function(){
    information(restaurant)});
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
  // Add Modal
  $('#sideModalTR').modal();

  // Clear
  document.getElementById("myModalLabel").innerHTML = ""; 
  document.getElementById("myModalBody").innerHTML = ""; 

  currentRestaurant = restaurant;
  var pos = {
    lat: restaurant.lat,
    lng: restaurant.long
  };

  var location = pos.lat+","+ pos.lng;        
  var url = "https://maps.googleapis.com/maps/api/streetview?size=600x600&location="+location+"&key=APIKEY";
  ajaxGet(url,function() {
    // Image
    document.getElementById("myModalImg").src = url;    
  })
  
  // Titre
  document.getElementById("myModalLabel").textContent = restaurant.restaurantName; 
  
  // Description
  var description = '<strong>Adresse : </strong>' + restaurant.address;  
  var divElt = document.createElement("div");
  divElt.id = 'description-'+ restaurant.restaurantName;
  var pElt = document.createElement("p");
  pElt.innerHTML = description;
  divElt.appendChild(pElt);
  
  
  
  // Ratings
  if (restaurant.ratings.length !==0 ){
    var ulElt = document.createElement("ul");
    // Limitation to 5 comments  
    var limitationComments = restaurant.ratings.length<6?-1:restaurant.ratings.length-6;  
    for (i=restaurant.ratings.length-1;i>limitationComments;i--){      
      var liElt = document.createElement("li");
      // Check if exist comment      
      var comment = restaurant.ratings[i].comment=="" ? " | Pas de commentaire" : (" | Commentaire : " +restaurant.ratings[i].comment);
      liElt.innerHTML = "<strong>Note : " + restaurant.ratings[i].stars + "</strong>" + comment ;
      ulElt.appendChild(liElt);
    };
    divElt.appendChild(ulElt);
  };
  document.getElementById('myModalBody').appendChild(divElt);
  
  // Form
  var formElt = document.createElement("form");
  formElt.className ="md-form border border-light p-2";
  var selectElt = document.createElement("select");
  selectElt.id = "rating";
  selectElt.className = "browser-default custom-select";
  // Required Option value
  selectElt.required = true; 
  var optionDefaultElt = document.createElement("option");
  optionDefaultElt.value = "";
  optionDefaultElt.textContent = "Notez le restaurant";
  selectElt.appendChild(optionDefaultElt);
  // Options
  for (i=0; i<6; i++) {
    var optionElt = document.createElement("option");
    optionElt.value = i;
    optionElt.textContent = i;
    selectElt.appendChild(optionElt);
  };
  formElt.appendChild(selectElt);
  textAreaElt = document.createElement("textarea");
  textAreaElt.className = "md-textarea form-control";
  textAreaElt.id = "comment"
  textAreaElt.rows = 3;
  textAreaElt.cols = 30;
  textAreaElt.placeholder = "Votre commentaire ...";
  formElt.appendChild(textAreaElt);
  var inputElt = document.createElement("input");
  inputElt.type = "submit";
  inputElt.value = "Valider";
  inputElt.className = "btn btn-secondary";
  formElt.appendChild(inputElt);
  // Display Form
  formElt.addEventListener("submit", function (e) {
  var rating = Number(formElt.elements.rating.value);
  var comment = formElt.elements.comment.value;
  var rate= {
    "stars": rating,
    "comment": comment
  };
  restaurant.ratings.push(rate);
  // Annulation de l'envoi des données    
  e.preventDefault(); 
  information(restaurant);
  });

  document.getElementById('myModalBody').appendChild(formElt);
  // We center the map on the location
  map.setCenter(pos);   
}