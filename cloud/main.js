var minMiles = 0.1; // set this to a minimum value to avoid worst senario
// we'll adjust this minMiles when we have better solution
// 5km so far is a bit too arbitrary

// After a plan is liked, shoot an email notification to the person who owns the plan
Parse.Cloud.afterSave("PlanLike",function(request){
	var plan = request.object.get("plan");
	plan.fetch({
		success: function(plan) {
			var user = plan.get("parent");
			user.fetch({
				success: function(user) {
					var firstName = user.get("firstName");
					var email = user.get("email");

					var mailgun = require('mailgun');
					mailgun.initialize('swarthmoreconnection.com', 'key-6oxbj6tubhky4o5m8fvqnvs-pjuiail7');

					mailgun.sendEmail({
						to: email,
						from: "no-reply@swarthmoreconnection.com",
						subject: firstName + ", someone liked your summer plan!",
						html: "<html>Someone just liked your summer plan. <a href='http://swarthmoreconnection.com/#myPlans'>Find out who liked it</a>.</html>"
					}, {
						success: function(httpResponse) {
							console.log(httpResponse);
							console.log("Email sent!");
						},
						error: function(httpResponse) {
							console.error(httpResponse);
							console.error("Something went wrong");
						}
					});
				}
			});
		}
	});
});

Parse.Cloud.afterSave("SummerPlan",function(request) {
	var marker = request.object.get("markerParent");
	var user = request.object.get("parent");
	var query = new Parse.Query("SummerPlan").include("parent").include("markerParent");
	query.equalTo("markerParent", marker);
	query.notEqualTo("parent", user);
	query.find({
		success: function(results) {
			var next = function(i) {
				var person = results[i].get("parent");
				var firstName = person.get("firstName");
				var email = person.get("email");
				var id = results[i].get("markerParent").id;

				var mailgun = require('mailgun');
				mailgun.initialize('swarthmoreconnection.com', 'key-6oxbj6tubhky4o5m8fvqnvs-pjuiail7');

				mailgun.sendEmail({
					to: email,
					from: "no-reply@swarthmoreconnection.com",
					subject: firstName + ", you have a new neighbor over the summer!",
					html: "<html>Someone is going to be in the same city with you over the summer break. <a href='http://swarthmoreconnection.com/#location/" + id + "'>Find out whom</a>.</html>"
				}, {
				success: function(httpResponse) {
					console.log(httpResponse);
					console.log("Email sent!");
					if (i+1 < results.length) {
						next(i+1);
					} else {
						return;
					}
				},
				error: function(httpResponse) {
					console.error(httpResponse);
					console.error("Something went wrong");
				}
				});
			};
			if (results.length) {
				next(0);
			}
		}
	});
});

// After saving the User, create an ACL for it
Parse.Cloud.afterSave(Parse.User, function(request) {
	if(!request.object.get("ACL")) {
		var newACL = new Parse.ACL();
		newACL.setPublicReadAccess(true);
		newACL.setWriteAccess(request.object.id,true);
		request.object.setACL(newACL);
		request.object.save();
	}
});

/* Deprecated. Cos we don't input classyear in summer plan anymore
// After saving a summer plan, save the class year to User table
Parse.Cloud.afterSave("SummerPlan",function(request) {
	var obj = request.object;
	var user = obj.get("parent");
	user.fetch({
		success: function(user) {
			if (!user.get("classYear")) {
				user.set("classYear", obj.get("classYear"));
				user.save();
			}
		}
	})
});
*/

// There's a bug with Parse SDK.
// https://www.parse.com/questions/keep-getting-object-not-found-for-update-error
// The workaround is what I'm doing -- saving ACL of SummerPlan and MapMarker in one cloud function
Parse.Cloud.beforeSave("SummerPlan",function(request,response){
	var obj = request.object;
	if(!obj.get("ACL")) {
		var newACL = new Parse.ACL();
		newACL.setPublicReadAccess(true);
		newACL.setWriteAccess(request.user,true);
		newACL.setPublicWriteAccess(false);
		obj.setACL(newACL);
	}
	mp = obj.get("markerParent");
	mp.fetch({
		success: function(m) {
			if(!m.get("ACL")) {
				var newACL = new Parse.ACL();
				newACL.setPublicReadAccess(true);
				newACL.setPublicWriteAccess(false);
				m.setACL(newACL);
				m.save(null, {
					success: function(m) {
						response.success();
					}
				});
			}
			response.success();
		}
	});
});

// Deprecated because of a Parse bug
/*
Parse.Cloud.beforeSave("MapMarker",function(request,response){
	var newACL = new Parse.ACL();
	newACL.setPublicReadAccess(true);
	newACL.setPublicWriteAccess(false);	
	request.object.setACL(newACL);
	response.success();
});
*/

Parse.Cloud.beforeSave("PlanLike",function(request,response){
	var newACL = new Parse.ACL();
	newACL.setPublicReadAccess(true);
	newACL.setPublicWriteAccess(false);
	newACL.setWriteAccess(request.user,true);
	var q = new Parse.Query("PlanLike");
	q.equalTo("user",request.user);
	q.equalTo("plan",request.object.get("plan"));
	q.find({
		success:function(res){
			if(!res.length){
				request.object.setACL(newACL);
				request.object.set("user",request.user);
				response.success();
			}else{
				response.error("Plan already liked by user");
			}
		}
	});
});

/*
Parse.Cloud.beforeSave("SummerPlan",function(request,response){
	var obj = request.object;
	var gl = obj.get("geoLocation");
	obj.unset("geoLocation", { silent: true });

	if(!obj.get("ACL")) {
		var newACL = new Parse.ACL();
		newACL.setPublicReadAccess(true);
		newACL.setWriteAccess(request.user,true);
		newACL.setPublicWriteAccess(false);
		obj.setACL(newACL);
	}

	var query = new Parse.Query("MapMarker");
	query.equalTo("location", obj.get("location"));
	query.limit(1);
	query.find({
		success: function(results) {
			if(results.length){
				var mapMarker = results[0];
				obj.set("markerParent",mapMarker);
				obj.set("location",mapMarker.get('location')); // set plan location to mapMarker location
				response.success();
			} else {
				var query2 = new Parse.Query("MapMarker");
				query2.withinMiles("geoLocation", gl, minMiles);
				query2.limit(1);
				query2.find({
					success:function(results){
						if(results.length){
							var mapMarker = results[0];
							obj.set("markerParent",mapMarker);
							obj.set("location",mapMarker.get('location')); // set plan location to mapMarker location
							response.success();
						}else{
							var MM = Parse.Object.extend("MapMarker");
							var mapMarker = new MM();
							mapMarker.set("geoLocation",gl);
							mapMarker.set("location",obj.get("location"));
							mapMarker.save(null, {
								success:function(savedMarker){
									obj.set("markerParent",savedMarker);
									response.success();
								},
								error:function(msg){
									response.error(msg);
								}
							});
						}
					},
					error:function(msg){
						response.error(msg);
					}
				});
			}
		},
		error:function(msg) {
			response.error(msg);
		}
	});
});
*/



/*
// A Scheduled Background Job to Migrate Class Year to the User table
Parse.Cloud.job("classYear", function(request, response){
	Parse.Cloud.useMasterKey();
	var query = new Parse.Query("SummerPlan");
	query.limit(1000);
	query.include("parent");
	query.find({
		success: function(results) {
			var next = function(i) {
				var user = results[i].get("parent");
				if (!user.get("classYear")) {
					user.set("classYear", results[i].get("classYear"));
					user.save(null, {
						success: function() {
							if (i+1 < results.length) {
								next(i+1);
							} else {
								response.success();
							}
						}
					});
				}
			};
			next(0);
		}
	})
})
*/
/*
Parse.Cloud.define("fixCallen", function(request, response) {
	Parse.Cloud.useMasterKey();
	var query = new Parse.Query("SummerPlan");
	query.equalTo("objectId", "HqwIe6vPai");
	query.find({
		success: function(results) {
			var p = results[0];
			var newQuery = new Parse.Query("MapMarker");
			newQuery.equalTo("objectId", "5CWuYDovfN");
			newQuery.find({
				success: function(markers) {
					var marker = markers[0];
					p.set("markerParent", marker);
					p.save(null, {
						success: function(p) {
							response.success();
						}
					})
				}
			});
		}
	});
});
*/
//Parse.Cloud.run("fixCallen");
/*
Parse.Cloud.define("fixCallen", function(request, response) {
	Parse.Cloud.useMasterKey();
	var query = new Parse.Query("_User");
	query.equalTo("objectId", "RvIjR9OJAm");
	query.find({
		success: function(results) {
			var p = results[0];
			p.set("facebookID", "100003206404931");
			//p.set("email", response.email);
			p.set("firstName", "Stephen");
			p.set("lastName", "O'Hanlon");
			p.set("imgURL", "https://fbcdn-profile-a.akamaihd.net/hprofile-ak-prn1/t1.0-1/s320x320/944599_443390389111171_1459714224_n.jpg");
			p.save(null, {
				success: function(user) {
					response.success();
				}
			});
		}
	});
});
*/

/*
Parse.Cloud.define("fixCallen", function(request, response) {
	Parse.Cloud.useMasterKey();
	var query = new Parse.Query("SummerPlan");
	query.equalTo("objectId", "DMpUw5jifm");
	query.find({
		success: function(results) {
			var p = results[0];
			p.set("facebookID", "597524992");
			//p.set("email", response.email);
			p.set("name", "Callen Rain");
			p.set("imgURL", "https://fbcdn-profile-a.akamaihd.net/hprofile-ak-ash3/t1.0-1/s320x320/1003868_10152196431999993_1232101139_n.jpg");
			p.save(null, {
				success: function(p) {
					response.success();
				}
			});
		}
	});
});
*/
/*
Parse.Cloud.afterSave("SummerPlan",function(request){
	var marker = request.object.get("markerParent");
	var user = request.object.get("parent");
	var query = new Parse.Query("SummerPlan").include("parent").include("markerParent");
	query.equalTo("markerParent", marker);
	query.notEqualTo("parent", user);
	query.find({
		success: function(results) {
			var next = function(i) {
				var person = results[i].get("parent");
				var firstName = person.get("firstName");
				var email = person.get("email");
				var id = results[i].get("markerParent").id;

				var mailgun = require('mailgun');
				mailgun.initialize('swarthmoreconnection.com', 'key-6oxbj6tubhky4o5m8fvqnvs-pjuiail7');

				mailgun.sendEmail({
				  to: email,
				  from: "no-reply@swarthmoreconnection.com",
				  subject: firstName + ", you have a new neighbor over the summer!",
				  html: "<html>Someone is going to be in the same city with you over the summer break. <a href='http://swatnetdev.parseapp.com/#location/" + id + "'>Find out whom</a>.</html>"
				}, {
				  success: function(httpResponse) {
				    console.log(httpResponse);
				    console.log("Email sent!");
				    if (i+1 < results.length) {
							next(i+1);
						} else {
							return;
						}
				  },
				  error: function(httpResponse) {
				    console.error(httpResponse);
				    console.error("Something went wrong");
				  }
				});
			};
			if (results.length) {
				next(0);
			}
		}
	});
});
*/