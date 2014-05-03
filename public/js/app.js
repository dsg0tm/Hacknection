/***********************************************************************
 *
 *   Global variables
 *
 ***********************************************************************/

Parse.$ = jQuery;
var autocomplete, map, mc, geocoder,router;
var nearbyMiles = 100; // proximity threshold to consider you nearby someone
var minMiles = 0.1; // proximity threshold to merge markers

/************************************************************
 *
 *  Share Your Summer Plans!
 *
 ************************************************************/

//EnterPlanView

var EditPlanView = Parse.View.extend({
	events: {
		"submit form.share-plan-form": "submit",
		"change #inputType":"changeType"
	},
	el: "#modal",
	template: _.template($('#share-plan-template').html()),
	render: function(plan) {
		var that = this;
		console.log(plan);
		if(typeof plan === "string"){
			this.loadPlan(plan);
			return;
		}
		this.plan = plan || {};
		console.log('Rendering a EditPlanView...');
		this.$el.html(this.template({user:Parse.User.current(),plan:this.plan,format_date_for_picker:this.format_date_for_picker}));
		this.changeType();
		autocompleteInitialize();
		var start = that.$('#inputStart').datepicker({autoclose:true,orientation: "top auto",}).on('changeDate',function(){start.datepicker('hide');});
		var end = that.$('#inputEnd').datepicker({autoclose:true,orientation: "top auto",}).on('changeDate',function(){end.datepicker('hide');});
		this.$el.on('hidden.bs.modal', function () {
			router.navigate('',{trigger:true});
		});

		this.$el.modal('show');
	},
	format_date_for_picker:function(date){
		//MM/DD/YYYY
		if(!date){return date;}
		var day = date.getUTCDate(); if(day<10){day="0"+day;}
		var month = date.getUTCMonth()+1; if(month<10){month="0"+month;}
		var year = date.getUTCFullYear();
		return month+"/"+day+"/"+year;
	},
	loadPlan:function(id){
		var that = this;
		var q = new Parse.Query("SummerPlan");
		q.include("markerParent");
		q.get(id,{
			success:function(plan){
				console.log(plan.get("markerParent").id);
				console.log(plan.get("markerParent").get("location"));
				that.render(plan);
			}
		});
	},
	changeType:function(){
		var type = this.$('#inputType').val();
		if(type == "work"){
			this.$(".type-work").show();
		}else{
			this.$(".type-work").hide();
		}
	},
	submit: function() {
		var that = this;
		var position,org;
		var type = this.$("#inputType").val();
		if(type == "work"){
			position = this.$("#inputTitle").val();
			org = this.$("#inputOrg").val();
		}
		var location = this.$("#inputLocation").val();
		var startDate,endDate;
		if(this.$("#inputStart").val()){
			startDate = new Date(this.$("#inputStart").val());
			startDate = new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000);
		}
		if(this.$("#inputEnd").val()){
			endDate = new Date(this.$("#inputEnd").val());
			endDate = new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000);
		}
		var id;
		if(this.$('#inputID')){
			id = this.$('#inputID').val();
		}
		/*
		if (!location) {
			$('#plan-submit-btn').button('reset');
			this.$("#plan-error").html("Please complete every field").show();
			console.log("Please complete every field");
			return false;
		} else {
			this.$('#plan-submit-btn').html('<div class="spinner-sm"><div class="rect1"></div><div class="rect2"></div><div class="rect3"></div><div class="rect4"></div><div class="rect5"></div></div>').attr('disabled','disabled');
			getMapMarker(location, function(mapMarker) {
				var SP = Parse.Object.extend("SummerPlan");
				var sp = new SP();
				if(id){sp.id = id;}
				sp.set("parent", Parse.User.current());
				if(org){ sp.set("org", org); }
				if(position){ sp.set("position", position); }
				if(startDate){ sp.set("startDate",startDate); }
				if(endDate){ sp.set("endDate",endDate); }
				if(type != "work"){
					sp.set("position",null);
					sp.set("org",null);
				}
				sp.set("type",type);
				sp.set("markerParent", mapMarker);
				sp.save(null, {
					success: function(sp) {
						console.log("The new summer plan is succeessfully saved!");
						$('#plan-submit-btn').button('reset');
						$("#modal").modal('hide');
						initializeMarkers();
						map.setZoom(10);
						map.setCenter(new google.maps.LatLng(mapMarker.get("geoLocation")._latitude, mapMarker.get("geoLocation")._longitude));
					},
					error: function(sp, error) {
						console.log("Error: " + error.code + " " + error.message);
						$('#plan-submit-btn').button('reset');
					}
				});
		*/
		if (type == "work") {
			if (!location || !org || !position) {
				$('#plan-submit-btn').button('reset');
				this.$("#plan-error").html("Please complete every required field").show();
				console.log("Please complete every field");
				return false;
			}
		} else {
			if (!location) {
				$('#plan-submit-btn').button('reset');
				this.$("#plan-error").html("Please complete every required field").show();
				console.log("Please complete every field");
				return false;
			}
		}
		this.$('#plan-submit-btn').html('<div class="spinner-sm"><div class="rect1"></div><div class="rect2"></div><div class="rect3"></div><div class="rect4"></div><div class="rect5"></div></div>').attr('disabled','disabled');
		getMapMarker(location, function(mapMarker) {
			var SP = Parse.Object.extend("SummerPlan");
			var sp = new SP();
			if(id){sp.id = id;}
			sp.set("parent", Parse.User.current());
			if (type == "work") {
				sp.set("org", org);
				sp.set("position", position);
			} else if (type == "travel") {
				sp.set("position", null);
				sp.set("org", "Traveling");
			} else if (type == "home") {
				sp.set("position", null);
				sp.set("org", "Home");
			}
			if (startDate) {
				sp.set("startDate",startDate);
			} else {
				sp.set("startDate",null);
			}
			if (endDate) {
				sp.set("endDate",endDate);
			} else {
				sp.set("endDate", null);
			}
			sp.set("type",type);
			sp.set("markerParent", mapMarker);
			sp.save(null, {
				success: function(sp) {
					console.log("The new summer plan is succeessfully saved!");
					$('#plan-submit-btn').button('reset');
					$("#modal").modal('hide');
					initializeMarkers();
					map.setZoom(10);
					map.setCenter(new google.maps.LatLng(mapMarker.get("geoLocation")._latitude, mapMarker.get("geoLocation")._longitude));
				},
				error: function(sp, error) {
					console.log("Error: " + error.code + " " + error.message);
					$('#plan-submit-btn').button('reset');
				}
			});
		});
		return false;
	}
});

// LoginView

var LoginView = Parse.View.extend({
	events: {
		"click #login": "login"
	},
	el: "#modal",
	template: _.template($('#login-template').html()),
	initialize: function() {
	},
	render: function(afterLogin) {
		this.afterLogin = afterLogin || "plan/new";
		this.$el.html(this.template());
		this.$el.modal('show');
		this.$el.on('hidden.bs.modal', function () {
			router.navigate('',{trigger:true});
		});
	},
	login: function() {
		$('#login').button('loading');
		var that = this;
		Parse.FacebookUtils.logIn("email, user_education_history, user_hometown, user_work_history", {
			success: function(user) {
				if (!user.existed()) {
					getFacebookId(function(id) {
						FB.api(id, {fields: 'email, first_name, last_name, picture.height(160), work, education, hometown'}, function(response) {
							user.set("facebookID", response.id);
							user.set("email", response.email);
							user.set("firstName", response.first_name);
							user.set("lastName", response.last_name);
							user.set("imgURL", response.picture.data.url);
							user.set("hometown", response.hometown);
							user.set("work", response.work);
							user.set("education", response.education);
							if(!user.get("classYear")) {
								for (var i = 0; i < response.education.length; i++) {
									if (response.education[i].type == "College" && response.education[i].school.name == "Swarthmore College") {
										if (response.education[i].year.name) {
											user.set("classYear", response.education[i].year.name);
										}
									}
								}
							}
							user.save(null, {
								success: function(user) {
									console.log("User signed up and logged in through Facebook!");
									$('#login').button('reset');
									menuView.render();
									router.navigate(that.afterLogin,{trigger:true});
								},
								error: function(user, error) {
									$('#login').button('reset');
									console.log("error: " + error.code + error.meesage);
								}
							});
						});
					});
				} else {
					if(!user.get("education")) {
						getFacebookId(function(id) {
							FB.api(id, {fields: 'work, education, hometown'}, function(response) {
								user.set("hometown", response.hometown);
								user.set("work", response.work);
								user.set("education", response.education);
								if(!user.get("classYear")) {
									for (var i = 0; i < response.education.length; i++) {
										if (response.education[i].type == "College" && response.education[i].school.name == "Swarthmore College") {
											if (response.education[i].year.name) {
												user.set("classYear", response.education[i].year.name);
											}
										}
									}
								}
								user.save(null, {
									success: function(user) {
										console.log("User logged in through Facebook!");
										$('#login').button('reset');
										menuView.render();
										router.navigate(that.afterLogin,{trigger:true});
									},
									error: function(user, error) {
										$('#login').button('reset');
										console.log("error: " + error.code + error.meesage);
									}
								});
							});
						});
					} else {
						console.log("User logged in through Facebook!");
						$('#login').button('reset');
						menuView.render();
						router.navigate(that.afterLogin,{trigger:true});
					}
				}
			},
			error: function(user, error) {
				$('#login').button('reset');
				console.log("error: " + error.code + error.meesage);
				alert("User cancelled the Facebook login or did not fully authorize. error code:" + error.code + " error message: " + error.message);
			}
		});
	}
});

/************************************************************
 *
 *  The Nav Bar Account Menu -- a profile pic after signed in
 *
 ************************************************************/

var NavBarMenuView = Parse.View.extend({
	el:"#my-account-btn-div",
	template: _.template($("#nav-bar-menu-template").html()),
	initialize: function() {
	},
	render: function() {
		this.$el.html(this.template({user:Parse.User.current()}));
	}
});

/************************************************************
 *
 *  Find Your Neighbors -- Controlling behaviro after you
 *  click on any markers on map
 *
 ************************************************************/

// A single summer plan object

var Plan = Parse.Object.extend("SummerPlan");

// A Summer Plan Collection

var PlanCollection = Parse.Collection.extend({
	model: Plan,
});

// A Single Plan View
var PlanView = Parse.View.extend({
	tagName:'div',
	events:{
		"click .like-plan":"like",
		"click .likes":"likemodal"
	},
	template: _.template($('#plan-template').html()),
	render:function(){
		this.likes = this.likes||[];
		var liked = 0;
		var showedit = 0;
		if(this.model.get("parent").id == Parse.User.current().id){
			showedit = 1;
		}
		_.each(this.likes,function(like){
			if(like.get("user").id == Parse.User.current().id){
				liked = 1;
			}
		});
		this.$el.html(this.template({plan:this.model,likes:this.likes.length,liked:liked,edit:showedit,format_date:this.format_date}));
		return this;
	},
	like:function(){
		// original loading gif too big for like button
		/*
		this.$('.like-plan').html('<div class="spinner-sm"><div class="rect1"></div><div class="rect2"></div><div class="rect3"></div><div class="rect4"></div><div class="rect5"></div></div>');
		*/
		this.$('.like-plan').button('loading');
		var that = this;
		var L = Parse.Object.extend("PlanLike");
		var like = new L();
		like.set("plan",this.model);
		like.save({
			success:function(savedLike){
				console.log("plan liked!");
				this.$('.like-plan').button('reset');
				savedLike.get("user").set("imgURL",Parse.User.current().get("imgURL"));
				savedLike.get("user").set("firstName",Parse.User.current().get("firstName"));
				savedLike.get("user").set("lastName",Parse.User.current().get("lastName"));
				that.likes.push(savedLike);
				that.render();
			}
		});
	},
	likemodal:function(){
		likeView.render(this.likes);
	},
	format_date:function(date){
		//MM/DD/YYYY
		if(!date){return date;}
		var day = date.getUTCDate();//if(day<10){day="0"+day;}
		var month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][date.getUTCMonth()];
		var year = date.getUTCFullYear();
		return month+" "+day+" - "+year;
	},
});

var LikeView = Parse.View.extend({
	tagName:'div',
	template: _.template($('#like-list-template').html()),
	el:'#likelist',
	events:{
		'click .userpage':'close'
	},
	render:function(likes){
		this.$el.html(this.template({likes:likes}));
		this.$el.modal('show');
	},
	close:function(){
		this.$el.modal('hide');
	}
});

// A Collection of Plans View
var PlanCollectionView = Parse.View.extend({
	tagName: 'div',
	template: _.template($("#plan-list-template").html()),
	el:"#modal",
	collection:new PlanCollection(),
	render: function(title,id) {
		id = id || null;
		modalLoadingView.render();
		var that = this; //scope is lost inside the collection.fetch
		this.collection.query.include("markerParent").include("parent");
		this.collection.fetch().done(function(plans){ //fetch the collection (PlanCollection)
			//fetch all the likes for the plans that were loaded
			(new Parse.Query("PlanLike")).include('user').containedIn("plan",plans.models).find().done(function(results){
				var likes = {};
				for(var i = 0;i<results.length;i++){
					if(!likes[results[i].get("plan").id]){
						likes[results[i].get("plan").id] = [];
					}
					likes[results[i].get("plan").id].push(results[i]);
				}
				var profilePage = 0;
				if(plans.models.length){
					title = title || plans.models[0].get("markerParent").get("location");
					that.mapMarker = plans.models[0].get("markerParent");
					if(id == "loc"){
						id = plans.models[0].get("markerParent").id;
					}
					if(title == "$PersonsPlans"){
						title = plans.models[0].get("parent").get("firstName") + " " + plans.models[0].get("parent").get("lastName") + "'s Summer Plans";
						profilePage = plans.models[0].get("parent").get("facebookID");
					}
				}else{
					if(title == "$PersonsPlans"){
						title = "No plans found for this person.";
					}
				}
				that.$el.html(that.template({title:title,id:id,profilePage:profilePage}));
				_.each(plans.models,function(model){
					var plan = new PlanView({model:model});
					plan.likes = likes[model.id];
					that.$('.plan-list').append(plan.render().el);
				});

				//that.$el.modal('show'); The modal has already been shown, so we don't need to do it again
				that.$el.on('hidden.bs.modal', function () {
					router.navigate('',{trigger:true});
				});
				return that;
			});
		});
	}
});
var LocationPlanView = Parse.View.extend({
	render: function(location_id) {
		var MM = Parse.Object.extend("MapMarker");
		var mm = new MM();
		mm.id = location_id;
		planCollectionView.collection.query = (new Parse.Query(Plan)).equalTo("markerParent",mm);
		planCollectionView.render(null,'loc');
	}
});

var ModalLoadingView = Parse.View.extend({
	tagName: 'div',
	template: _.template($("#modal-loading-template").html()),
	el:"#modal",
	render:function(){
		this.$el.html(this.template());
		this.$el.modal('show');
		this.$el.on('hidden.bs.modal', function () {
			router.navigate('',{trigger:true});
		});
	}
});

/***********************************************************************
 *
 *   Google Map Initialization
 *
 ***********************************************************************/

function initializeMarkers() {
	var MapMarker = Parse.Object.extend("MapMarker");
	var query = new Parse.Query(MapMarker);
	query.limit(1000);
	query.find({
		success: function(results) {
			console.log("Initializing map markers");
			//console.log("Num of markers: " + results.length);
			for (var i = 0; i < results.length; i++) {
				var object = results[i];
				var gl = object.get("geoLocation");
				var geo = new google.maps.LatLng(gl._latitude, gl._longitude);
				var marker = new google.maps.Marker({
					position: geo,
					map: map,
					title: object.get("location"),
					id: object.id
				});
				mc.addMarker(marker);
				var listener = makeListenerFunction(marker);
				listener();
			}
		},
		error: function(error) {
			console.log("Error: " + error.code + error.message);
		}
	});
}

function geolocate() {
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function(position) {
			var geolocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
			autocomplete.setBounds(new google.maps.LatLngBounds(geolocation,geolocation));
		});
	}
}

function autocompleteInitialize() {
	autocomplete = new google.maps.places.Autocomplete((document.getElementById('inputLocation')), { types: ['geocode'] });
	console.log("autocomplete successfully initialized");
}

function initialize() {
	//Parse.User.current().get("home") && Parse.User.current().get("home").fetch();

	var mapOptions = {
		zoom: 2,
		center: new google.maps.LatLng(31.4550202, -5.5830318),
		minZoom: 2,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	};
	map = new google.maps.Map(document.getElementById('map-canvas'),
		mapOptions);
		// The allowed region which the whole map must be within
	mc = new MarkerClusterer(map);
    // Add listeners to trigger checkBounds(). bounds_changed deals with zoom changes.
    google.maps.event.addListener(map, "center_changed", function() {checkBoundsPan(); });
    google.maps.event.addListener(map, "bounds_changed", function() {checkBoundsZoom(); });

    var lastValidCenterP = map.getCenter();
    var lastValidCenterZ = map.getCenter();
  
    // If the map bounds are out of range, move it back
    function checkBoundsPan() {
		// Perform the check and return if OK
		var bounds = map.getBounds();
		if (bounds.getSouthWest().lat() > -85 && bounds.getNorthEast().lat() < 85) {
			lastValidCenterP = map.getCenter();
			//lastValidZoom = map.getZoom();
			return;
		}
		// not valid anymore => return to last valid position
		map.panTo(lastValidCenterP);
		//map.setZoom(lastValidZoom);
    }
      
    function checkBoundsZoom() {
		// Perform the check and return if OK
		var bounds = map.getBounds();
		var northEast = bounds.getNorthEast();
		var southWest = bounds.getSouthWest();
		var newBounds;
		if (southWest.lat() < -85) {
			var newSouthWest = new google.maps.LatLng(-70, southWest.lng());
			newBounds = new google.maps.LatLngBounds(newSouthWest, northEast);
		}
		else if(northEast.lat() > 85) {
			var newNorthEast =  new google.maps.LatLng(70, northEast.lng());
			newBounds = new google.maps.LatLngBounds(southWest, newNorthEast);
		}
		else {
			return;
		}

		map.fitBounds(newBounds);

    }
	geocoder = new google.maps.Geocoder();
	initializeMarkers();
	router = new AppRouter();
	Parse.history.start();
}

var originalWindowWidth = window.innerWidth;
var criticalWidth = 980;

function init() {
	var script = document.createElement('script');
	script.type = 'text/javascript';
	script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyBB56byTSi_4iHy_hqH8zN3FQPgb2pm7UQ&sensor=false&libraries=places&' +
		'callback=initialize';
	document.body.appendChild(script);
	if(!Parse.User.current()) {
		$('#welcome-modal').modal('toggle');
	}
	menuView.render();

	if (window.innerWidth < criticalWidth){
		$('#find-fb-friends-btn-content').html("&nbsp;Find Friends");
		$('#find-nearby-btn-content').html("&nbsp;Find Nearby");
		$('#share-plan-btn-content').html("&nbsp;Share Plan");
	}

	window.onresize = function() {
		if (originalWindowWidth >= criticalWidth && window.innerWidth < criticalWidth){
			$('#find-fb-friends-btn-content').html("&nbsp;Find Friends");
			$('#find-nearby-btn-content').html("&nbsp;Find Nearby");
			$('#share-plan-btn-content').html("&nbsp;Share Plan");
		}
		if (originalWindowWidth <= criticalWidth && window.innerWidth > criticalWidth){
			$('#find-fb-friends-btn-content').html("&nbsp;Find my Facebook friends");
			$('#find-nearby-btn-content').html("&nbsp;Find who will be nearby");
			$('#share-plan-btn-content').html("&nbsp;Share your summer plans!");
		}
		originalWindowWidth = window.innerWidth;
	};
	window.onresize();
}


var MapView = Parse.View.extend({
	el: "#mapView",
	render: function() {
		console.log('map view rendered');
		$('.fill').hide();
		this.$el.show();
	}
});


var OtherView = Parse.View.extend({
	el: "#otherView",
	render:function(){
		console.log('other view rendered');
		$('.fill').hide();
		this.$el.show();
	}
});

/************************************************************
 *
 *  Find Facebook Friends' Summer Plans
 *
 ************************************************************/

// For plan and plancollection objects... I'm reusing find neighbors objects

var findFBFriendIDArray = function(callback) {
	FB.api("/me",{fields: "friends"}, function(response) {
		var fbFriendIDArray = [];
		var friendsArray = response.friends.data;
		for (var i = 0; i < friendsArray.length; i++) {
			fbFriendIDArray[i] = friendsArray[i].id;
		}
		callback(fbFriendIDArray);
	});
};

var FindFriendsView = Parse.View.extend({
	render: function() {
		modalLoadingView.render();
		var that = this; //scope is lost inside the collection.fetch and findFBFriendIDArray
		findFBFriendIDArray(function(array) {
			var innerQuery = new Parse.Query("User").containedIn("facebookID", array);
			planCollectionView.collection.query = (new Parse.Query(Plan)).matchesQuery("parent",innerQuery);
			planCollectionView.render("Your Facebook friends' summer plans",null);
		});
	}
});

/************************************************************
 *
 *  Find Swatties Nearby
 *
 ************************************************************/

var LocationView = Parse.View.extend({
	tagName: 'div',
	template:_.template($('#choose-location-template').html()),
	render:function(){
		this.$el.html(this.template({marker:this.model}));
		return this;
	}
});

var FindNearbyView = Parse.View.extend({
	render: function(id) {
		var mapMarker = chooseLocationView.locationList[id];
		if(!mapMarker){
			console.log('have to load manually');
			this.loadMarker(id);
			return;
		}
		var MM = Parse.Object.extend("MapMarker");
		var innerQuery = new Parse.Query(MM).withinMiles("geoLocation", mapMarker.get("geoLocation"), nearbyMiles);
		planCollectionView.collection.query = (new Parse.Query(Plan)).matchesQuery("markerParent", innerQuery);
		planCollectionView.render("People nearby in "+mapMarker.get("location"),null);
	},
	loadMarker:function(id){
		var query = new Parse.Query("MapMarker");
		var that = this;
		console.log('initiating query');
		query.get(id,{
			success: function(result) {
				console.log('done');
				chooseLocationView.locationList[id] = result;
				that.render(id);
			}
		});
	}
});

// Returns a collection of location you will be over the summer
var ChooseLocationView = Parse.View.extend({
	tagName: 'div',
	el: "#modal",
	template:_.template($('#plan-list-template').html()),
	collection: new PlanCollection(),
	locationList:{},
	render: function() {
		//$('#find-nearby-btn').button('loading');
		modalLoadingView.render();

		this.collection.query = (new Parse.Query(Plan)).include("parent").equalTo("parent",Parse.User.current()).include("markerParent");
		var that = this; //scope is lost inside the collection.fetch
		this.collection.fetch().done(function(plans){ //fetch the collection (PlanCollection)
			//Make a list of unique locations
			that.locationList = {};
			_.each(plans.models,function(model){
				if(!that.locationList[model.get("markerParent").id]){
					that.locationList[model.get("markerParent").id] = {};
				}
				that.locationList[model.get("markerParent").id] = model.get("markerParent");
			});

			var title = "Choose a location";

			that.$el.html(that.template({title:title,id:undefined,profilePage:undefined}));
			_.each(that.locationList,function(model){
				var plan = new LocationView({model:model});
				that.$('.plan-list').append(plan.render().el);
			});
			//that.$el.modal('show'); The modal has already been shown, so we don't need to do it again
			that.$el.on('hidden.bs.modal', function () {
				$('#find-nearby-btn').button('reset');
				router.navigate('',{trigger:true});
			});
			return that;
		});
	}
});

/************************************************************
 *
 *  My Plans View
 *
 ************************************************************/

var UserPlansView = Parse.View.extend({
	render: function(user) {
		if(typeof user == "string"){
			var u = new Parse.User();
			u.id = user;
			planCollectionView.collection.query = (new Parse.Query(Plan)).equalTo("parent",u);
			planCollectionView.render("$PersonsPlans",null);
		}else if(typeof user == "object"){
			planCollectionView.collection.query = (new Parse.Query(Plan)).equalTo("parent",Parse.User.current());
			planCollectionView.render("My Plans",null);
		}else{
			console.log("Error: No user provided");
		}
	}
});

/************************************************************
 *
 *  My Profile View
 *
 ************************************************************/

var MyProfileView = Parse.View.extend({
	events: {
		"click #update-class-year-btn": "updateClassYear"
	},
	tagName: 'div',
	el: "#modal",
	template:_.template($('#my-profile-template').html()),
	render: function() {
		modalLoadingView.render();
		var title = "My Profile";
		this.$el.html(this.template({user:Parse.User.current(),title:title}));
		this.$el.modal('show');
		this.$el.on('hidden.bs.modal', function () {
			router.navigate('',{trigger:true});
		});
	},
	updateClassYear: function() {
		var classYear = this.$("#inputClassYear").val();
		var user = Parse.User.current();
		if (classYear != user.get("classYear")) {
			$('#update-class-year-btn').button('loading');
			user.set("classYear", classYear);
			user.save(null, {
				success: function() {
					console.log("class year update successfully saved!");
					$('#update-class-year-btn').button('reset');
					router.navigate('myProfile',{trigger:true});
				},
				error: function(user, error) {
					$('#update-class-year-btn').button('reset');
					console.log("error: " + error.code + error.meesage);
				}
			});
		}

	}
});

/************************************************************
 *
 *  Router / Routes
 *
 ************************************************************/

var planCollectionView = new PlanCollectionView();

var loginView = new LoginView();

var editPlanView = new EditPlanView();

var menuView = new NavBarMenuView();

var findFriendsView = new FindFriendsView();

var modalLoadingView = new ModalLoadingView();

var chooseLocationView = new ChooseLocationView();

var findNearbyView = new FindNearbyView();

var userPlansView = new UserPlansView();

var likeView = new LikeView();

var locationPlanView = new LocationPlanView();

var myProfileView = new MyProfileView();

var otherView = new OtherView();

var mapView = new MapView();
mapView.render();
window.onload = init;

var AppRouter = Parse.Router.extend({
	routes: {
		"": "home",
		"login":"login",
		"logout":"logout",
		"myProfile":"myProfile",
		"plan/new":"newPlan",
		"plan/:id":"plan", //edit plan
		"new/:loc":"newPlanLoc",
		"location/:id":"location",
		"findFriends":"findFriends",
		"findNearby/:id":"findNearby",
		"chooseLocation":"chooseLocation",
		"myPlans":"myPlans",
		"user/:id":"userPlans",
		"other":"other"
	},
	other:function(){
		otherView.render();
	},
	myProfile: function() {
		myProfileView.render();
	},
	myPlans: function() {
		userPlansView.render(Parse.User.current());
	},
	userPlans:function(id){
		userPlansView.render(id);
	},
	chooseLocation: function() {
		if (Parse.User.current()) {
			console.log("Please choose which location you want to use...");
			chooseLocationView.render(); // This will render a popup window to let you choose for which summer plan you want to find nearby friends
		} else {
			this.afterLogin = "chooseLocation";
			router.navigate('login',true);
		}
	},
	findNearby: function(id) {
		if (Parse.User.current()) {
			findNearbyView.render(id);
		} else {
			this.afterLogin = "findNeary/" + id;
			router.navigate('login',true);
		}
	},
	initialize: function(options) {
		this.afterLogin = "plan/new";
	},
	findFriends: function() {
		if (Parse.User.current()) {
			console.log("rendering findFriendsView");
			findFriendsView.render();
		} else {
			this.afterLogin = "findFriends";
			router.navigate('login',true);
		}
	},
	plan:function(id){
		if (Parse.User.current()) {
			editPlanView.render(id);
		} else {
			router.navigate('login',true);
		}
	},
	newPlanLoc:function(loc){
		if (Parse.User.current()) {
			var Plan = Parse.Object.extend("SummerPlan");
			var plan = new Plan();
			plan.set('markerParent',planCollectionView.mapMarker);
			editPlanView.render(plan);
		} else {
			router.navigate('login',true);
		}
	},
	newPlan:function(){
		if (Parse.User.current()) {
			editPlanView.render();
		} else {
			this.afterLogin = "plan/new";
			router.navigate('login',true);
		}
	},
	location:function(id){
		if (Parse.User.current()) {
			locationPlanView.render(id);
		} else {
			this.afterLogin = "location/"+id;
			router.navigate('login',true);
		}
	},
	home:function(){
		Parse.$('#modal').modal('hide');
		mapView.render(); // Shouldn't redner map view over and over again
	},
	login: function() {
		if(Parse.User.current()){
			router.navigate('',true);
		}else{
			loginView.render(this.afterLogin);
			this.afterLogin = "plan/new";
			menuView.render();
		}
	},
	logout:function(){
		if(Parse.User.current()){
			console.log("Logging out...");
			Parse.User.logOut();
			router.navigate('',true);
		}
		menuView.render();
		router.navigate('',{trigger:true});
	}
});

/************************************************************
 *
 *  Helper Functions
 *
 ************************************************************/

/*
 * getMapMarker
 * @param: location that user enters
 * @callback: a MapMarker object
 */
var getMapMarker = function(location, callback) {
	// Is there a marker with the same location text
	var query = new Parse.Query("MapMarker");
	query.equalTo("location", location);
	query.limit(1);
	query.find({
		success: function(results) {
			// YES, there is a location with the same text
			if (results.length) {
				callback(results[0]);
			}
			// NO, Then we need to see if there's a MapMarker nearby
			else {
				// get the geoLocation of this place
				geocoder.geocode( { 'address': location}, function(results, status) {
					if (status == google.maps.GeocoderStatus.OK) {
						var gl = new Parse.GeoPoint({latitude: results[0].geometry.location.k, longitude: results[0].geometry.location.A});
						var query2 = new Parse.Query("MapMarker");
						query2.withinMiles("geoLocation", gl, minMiles);
						query2.find({
							success: function(results) {
								// YES, there is a MapMarker within minMiles
								if (results.length) {
									callback(results[0]);
								}
								// NO, then create a new mapMarker
								else {
									var MM = Parse.Object.extend("MapMarker");
									var mm = new MM();
									mm.set("geoLocation",gl);
									mm.set("location",location);
									mm.save(null, {
										success: function(m) {
											callback(m);
										},
										error: function(error) {
											console.log("Error: " + error.code + " " + error.message);
										}
									});
								}
							}
						});
					}
				});
			}
		},
		error: function(error) {
			console.log("Error: " + error.code + " " + error.message);
		}
	});
	return false;
};

var getFacebookId = function(callback) {
	callback(Parse.User.current().get("authData").facebook.id);
};

function makeListenerFunction(marker) {
	function result() {
		return google.maps.event.addListener(marker, 'click', function() {
			$("#find-neighbors-modal-label").html(marker.title).show();
			console.log(marker.title);
			router.navigate("location/"+marker.id,{trigger:true});
			
		});
	}
	return result;
}
