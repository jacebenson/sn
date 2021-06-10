---
title: "GTAutoLaunchController"
id: "gtautolaunchcontroller"
---

API Name: sn_tourbuilder.GTAutoLaunchController

```js
var GTAutoLaunchController = Class.create();
var tourTypes = {
	SERVICE_PORTAL: 'service_portal',
	PLATFORM: 'platform',
	CUSTOM: 'custom_ui'
};

GTAutoLaunchController.prototype = {
	_tbr : new TourBuilderRecorder(),
    initialize: function() {
    },
	messages: {
		DONE : gs.getMessage('ok'),
		BAD_REQUEST: 'BAD_REQUEST',
		INVALID_DATA: 'INVALID_DATA',
		INTERNAL_ERROR: 'INTERNAL_ERROR',
		INVALID_TOUR_NAME: 'Tour name is not valid',
		INVALID_TOUR_OPTIONS: 'Tour options is not valid',
		INVALID_PARAM_VALUE: 'Invalid value given for parameter ',
		REQUIRED_PARAM_VALUE: 'Required value for parameter ',
		ID_NOT_FOUND: 'Tour not found with id '
	},
    type: 'GTAutoLaunchController'
};
GTAutoLaunchController.prototype.tableNames = {
	tours: 'sys_embedded_tour_guide',
	userOverrides: 'sys_guided_tour_user_overrides'
};

function getCorrectTypeAndValue(type, value) {
	switch(type) {
		case 'boolean':
			return (value === 'true');
		default:
			return value;
	}
}

GTAutoLaunchController.prototype.readQueryParameterRules = [
	{name: 'type', isRequired: false, defaultValue: null,
	  validValues: [tourTypes.PLATFORM, tourTypes.SERVICE_PORTAL, tourTypes.CUSTOM]},
	{name: 'page', isRequired: false},
	{name: 'page_id', isRequired: false},
	{name: 'portal_id', isRequired: false},
	{name: 'ignore_user', isRequired: false, type: 'boolean', validValues: ['true', 'false'], 
	 defaultValue: 'false'},
	{name: 'ignore_sys_property', isRequired: false, type: 'boolean', validValues: ['true', 'false'], 
	 defaultValue: 'false'},
	{name: 'autolaunch_only', isRequired: false, type: 'boolean', validValues: ['true', 'false'], 
	 defaultValue: 'false'},
	{name: 'published_only', isRequired: false, type: 'boolean', validValues: ['true', 'false'],
	 defaultValue: 'true'},
	{name: 'details', isRequired: false, validValues: ['high', 'low'], defaultValue: 'low'},
	{name: 'context', isRequired: false},
];

GTAutoLaunchController.prototype.createQueryParameterRules = [
	{name: 'type', isRequired: false, defaultValue: tourTypes.PLATFORM,
	  validValues: [tourTypes.PLATFORM, tourTypes.SERVICE_PORTAL,  tourTypes.CUSTOM]},
	{name: 'name', isRequired: false, defaultValue: ''},
	{name: 'page_id', isRequired: true},
	{name: 'portal_id', isRequired: false},
	{name: 'roles', isRequired: false, defaultValue: ''}
];

GTAutoLaunchController.prototype.updateQueryParameterRules = [
	{name: 'name', isRequired: false},
	{name: 'roles', isRequired: false},
	{name: 'status', isRequired: false, validValues:['published', 'draft'] },
	{name: 'options', isRequired: false}
];

GTAutoLaunchController.prototype.createInputObject = function(inputParams, rules) {
	var result = {isValid: false, payload: {}, reason: ''};
	var rule = null, ruleName, paramValue;
	
	for(var i = 0; i< rules.length; i++) {
		rule = rules[i];
		ruleName = rule.name;
		paramValue = typeof(inputParams[ruleName]) !== 'undefined' ? inputParams[ruleName].toString() : undefined;
		//if the parameter is present
		if (typeof(paramValue) !== 'undefined') {
			//check if the rule has validValues
			if (rule.validValues) {
				if (rule.validValues.indexOf(paramValue) < 0) {
					result.reason = this.messages.INVALID_PARAM_VALUE + ruleName;
					return result;
				}
			}
			//if all the above checks pass then the value is correct so put it into payload
			result.payload[ruleName] = getCorrectTypeAndValue(rule.type, paramValue);
		} else {
			//check if the param is required
			if (rule.isRequired) {
				result.reason = this.messages.REQUIRED_PARAM_VALUE + ruleName;
				return result;
			}
			// put in default values if present
			if (rule.defaultValue) {
			   result.payload[ruleName] = getCorrectTypeAndValue(rule.type, rule.defaultValue);
			}
		}
	}
	result.isValid = true;
	return result;
};

GTAutoLaunchController.prototype.createReadRequestObject = function(userParams) {
	return this.createInputObject(userParams, this.readQueryParameterRules);
};

GTAutoLaunchController.prototype.createUpdateRequestObject = function(userParams) {
	return this.createInputObject(userParams, this.updateQueryParameterRules);
};

GTAutoLaunchController.prototype.createWriteRequestObject = function(userParams) {
	return this.createInputObject(userParams, this.createQueryParameterRules);
};

GTAutoLaunchController.prototype.validateReadQuery = function(queryObj) {
	var result = {isValid: false, reason: ''};
	//both page_id and page is not possible
	if (queryObj.page_id && queryObj.page) {
		result.reason = this.messages.INVALID_PARAM_VALUE + 'page_id and page';
		return result;
	}
	if (!queryObj.page_id && !queryObj.page) {
		result.reason = this.messages.REQUIRED_PARAM_VALUE + 'page_id or page';
		return result;
	}

	if (queryObj.type === tourTypes.PLATFORM || queryObj.type === tourTypes.CUSTOM_UI || queryObj.type == null) {
		//cannot have portal_id for standard tours
		if (queryObj.portal_id) {
			result.reason = this.messages.INVALID_PARAM_VALUE + 'portal_id';
			return result;
		}
	} else if (queryObj.type === tourTypes.SERVICE_PORTAL) {
		//sp tours must have portal_id
		if (!queryObj.portal_id) {
			result.reason = this.messages.REQUIRED_PARAM_VALUE + 'portal_id';
			return result;
		}
	}
	result.isValid = true;
	return result;
};

GTAutoLaunchController.prototype.validateCreateQuery = function(queryObj) {
	var result = {isValid: false, reason: ''};
	if (!queryObj.page_id) {
		result.reason = this.messages.REQUIRED_PARAM_VALUE + 'page_id';
		return result;
	}
	
	if (queryObj.type === tourTypes.SERVICE_PORTAL && (!queryObj.portal_id || !queryObj.page_id)) {
		result.reason = this.messages.REQUIRED_PARAM_VALUE + 'page_id and portal_id';
		return result;
	}
	if ((queryObj.type === tourTypes.PLATFORM ||queryObj.type === tourTypes.CUSTOM) 
		&& queryObj.portal_id) {
		result.reason = this.messages.INVALID_PARAM_VALUE + 'portal_id';
		return result;
	}
	
	result.isValid = true;
	return result;
};

GTAutoLaunchController.prototype.validateUpdateQuery = function(queryObj) {
	var result = {isValid: false, reason: ''};
	//if name is provided it cannot be empty
	if (typeof(queryObj.name) !== 'undefined' && queryObj.name.length < 1) {
		result.reason = this.messages.INVALID_TOUR_NAME;
		return result;
	}
	///if options are provided it should be a valid json
	if (typeof(queryObj.options) !== 'undefined') {
	   try {
		   var json = JSON.parse(queryObj.options);
		   if (!json) {
			result.reason = this.messages.INVALID_TOUR_OPTIONS;
			return result;
		   }
	   } catch(e) {
		result.reason = this.messages.INVALID_TOUR_OPTIONS;
		return result;
	   }
	}
	result.isValid = true;
	return result;
};

//Get a list of tours based on query parameters like page, portal_id, page_id, autolaunch etc.
GTAutoLaunchController.prototype.getTours = function(userQuery) {
	var result = {success: false, payload: null, reason: ''};
	var requestObject = this.createReadRequestObject(userQuery);
	var queryObj = requestObject.payload;

	if (!requestObject.isValid) {
		result.success = false;
		result.reason = this.messages.BAD_REQUEST;
		result.payload = {msg: requestObject.reason};
		return result;
	}
	var payload = requestObject.payload;
	var queryValidation = this.validateReadQuery(payload);
	if (!queryValidation.isValid) {
		result.reason = this.messages.BAD_REQUEST;
		result.payload = {msg: queryValidation.reason};
		return result;
	}

	var tourService = new sn_tours.TourDataService();
	var records = tourService.getTours(queryObj);
	var recordLength = records.length;
	if (recordLength) {
		var autoLaunchTour = this.getAutoLaunchTour(queryObj.page_id, queryObj.portal_id, queryObj.context);
		for (var i = 0; i < recordLength; i++) {
			records[i].isAutoLaunchable = (autoLaunchTour.tourId && autoLaunchTour.tourId === records[i].id) ? true : false;
		}
	}

	result.payload = records;
	result.success = true;
	return result;
};

//Get a tour record based on id. details= low|high
GTAutoLaunchController.prototype.getTourById = function(id, details) {
	var result = {success: false, payload: null, reason: ''};
	var tourService = new sn_tours.TourDataService();
	var records = tourService.getTourById(id, details);
	result.payload = records;
	result.success = true;
	return result;
};

//create a new tour and return the sys_id of the new record as tourId

GTAutoLaunchController.prototype.createTour = function(userQuery) {
	var result = {success: false, payload: null, reason: ''};
	var input = this.createWriteRequestObject(userQuery);
	var payload = input.payload;
	var res = null;

	if (!input.isValid) {
		result.reason = this.messages.INVALID_DATA;
		result.payload = {msg: input.reason};
		return result;
	}
	var queryValidation = this.validateCreateQuery(payload);
	if (!queryValidation.isValid) {
		result.reason = this.messages.INVALID_DATA;
		result.payload = {msg: queryValidation.reason};
		return result;
	}
	
	if (payload.type === tourTypes.PLATFORM || payload.type === tourTypes.CUSTOM) {
		res = this._tbr.createTour(payload.name, payload.page_id, payload.roles, payload.type);
	} else {
		var tourURL = payload.portal_id + '?id=' + payload.page_id;
		res = this._tbr.createTour(payload.name, tourURL, payload.roles, payload.type, payload.portal_id,
								   payload.page_id);
	}
	if (res.status === "error") {
		result.success = false;
		result.reason = res.message;
	} else {
		result.success = true;
		result.payload = {'tourId': res.tourID};
	}
	return result;
};

GTAutoLaunchController.prototype.updateTourById = function(id, details) {
	var result = {success: false, payload: null, reason: ''};
	var input = this.createUpdateRequestObject(details);
	var payload = input.payload;
	var res = null;
	if (!input.isValid) {
		result.reason = this.messages.INVALID_DATA;
		result.payload = {msg: input.reason};
		return result;
	}
	var queryValidation = this.validateUpdateQuery(payload);
	if (!queryValidation.isValid) {
		result.reason = this.messages.INVALID_DATA;
		result.payload = {msg: queryValidation.reason};
		return result;
	}

	var rec = new GlideRecord(this.tableNames.tours);
	rec.addQuery('sys_id', '=', id);
	rec.query();
	if (rec.next()) {
		Object.keys(payload).forEach(function(key) {
			rec.setValue(key, payload[key]);
		});
		res = rec.update();
		//Glide Update failed
		if (res === null) {
			result.reason = this.messages.INTERNAL_ERROR;
			return result;
		}
		result.success = true;
		result.payload = {id: id, name: rec.name, status: rec.status, roles: rec.roles, 
						  options:rec.options};
		return result;
	} else {
		result.success = false;
		result.reason = this.messages.ID_NOT_FOUND + id;
		result.payload = {msg: result.reason};
		return result;
	}
};

/* ************************************************************************
 * ************************************************************************
 *
 *   FOLLOWING IS OLD CODE THAT WILL GRADUALLY BE REPLACED/REFACTORED 
 *
 * ************************************************************************
 * ************************************************************************
 */

GTAutoLaunchController.prototype.searchPagesByName = function(options) {
	var gr = new GlideAggregate(this.tableNames.tours);
	var data = [];
	var name = options.name.toString();
	var sort = options.sort.toString();

	gr.addAggregate('COUNT', 'context');
	gr.addAggregate('MAX', 'sys_updated_on');
	gr.addQuery('active', '=','true');
	if (name.length >= 2) {
		gr.addQuery('context', 'CONTAINS', unescape(name));
	}
	gr.groupBy('context');
	if (sort === 'by-name') {
 		gr.orderBy('context');
 	} else {
 		gr.orderByAggregate('MAX', 'sys_updated_on');
 	}
	gr.query();

	while(gr.next()) {
		var elem ={ name: gr.context.toString(), 
			value: gr.getAggregate('COUNT', 'context').toString(),
			updated: gr.getAggregate('MAX', 'sys_updated_on').toString()
		}; 
		data.push(elem);
	}
	return data;
};

GTAutoLaunchController.prototype.getToursForPageForLoader = function(name, portal) {
  var sUIEnabled = gs.getProperty('com.snc.guided_tours.standard_ui.enable', false) === 'true';
  var spEnabled = gs.getProperty('com.snc.guided_tours.sp.enable', false) === 'true';
	if (portal && !spEnabled) return [];
  else if (!portal && name && !sUIEnabled) return [];
  return this.getToursForPage(name, portal);
};

GTAutoLaunchController.prototype.getToursForPage = function(name, portal, autolaunchPage) {
  
  var gr = new GlideRecord(this.tableNames.tours);
  var data = [];
  if(!portal) {
	if(typeof name === 'object' && name.length > 0)
		name = name[0];  
	autolaunchPage ? gr.addQuery('context', '=', unescape(name)) : gr.addQuery('context', 'CONTAINS', unescape(name));
  } else {
	gr.addQuery('sp_page', '=', unescape(name));
	gr.addQuery('sp_portal', '=', unescape(portal));
  }
  gr.addQuery('active','=', true );
  gr.query();
  while(gr.next()) {
	  var userHasRole = false;
	  var tourRoles = (gr.getValue("roles")) ? (gr.getValue("roles")).toString() : "";
	  var role;
	  
	  if(gs.getUser().hasRole("maint") || tourRoles === ""){
		  userHasRole = true;
	  }else if(tourRoles!== ""){
		  var roles = tourRoles.split(",");
		  
		  for(role in roles){
			  
			  if(gs.getUser().hasRole(roles[role])){
				  userHasRole = true;
				  break;
			  }				  
		  }
	  }
	  
	  var elem = {id: '' + gr.sys_id, name: ''+gr.name, order: parseInt(gr.autolaunch_order) || 0, roles: ''+gr.roles, status: ''+gr.status, date: ''+gr.sys_updated_on, context: gr.context.toString(), options: gr.options.toString(), type: gr.type.toString(), hasRole: userHasRole.toString()};
	  data.push(elem);
  }
  return data;
};

GTAutoLaunchController.prototype.updateToursForPage = function(data) {
	if (data.autolaunchOff.length) {
		var rec = new GlideRecord(this.tableNames.tours);
		var ids = data.autolaunchOff.join(',');
		rec.addQuery('sys_id', 'IN', ids);
		rec.query();
		var count = 0;
		while(rec.next()) {
			rec.autolaunch_order = 0;
			rec.update();
		}
	} 
	if (data.autolaunchOn.length) {
		var self = this;
		data.autolaunchOn.forEach(function(id, index) {
			var rec = new GlideRecord(self.tableNames.tours);
			rec.addQuery('sys_id', '=', id);
			rec.query();
			if (rec.next()) {
				rec.autolaunch_order = index + 1;
				rec.update();
			}
		});
	}
	if(data.resetUserPreferences && data.page) {
		this._removeOverrides(data.page, null);
	}
	return {msg: this.messages.DONE};
	
};

GTAutoLaunchController.prototype._insertOverride = function(tourId, userId) {
	var rec = new GlideRecord(this.tableNames.userOverrides);
	rec.initialize();
	rec.tour = tourId;
	rec.user = userId;
	rec.disable_autolaunch = true;
	rec.insert();
};

GTAutoLaunchController.prototype._removeOverrides = function(page, userId, portal) {
	var self = this;
	var pages = this.getToursForPage(page, portal);
	var ids = pages
				.map(function(d) { return d.id; })
	;
	if (ids.length) {
		var rec = new GlideRecord(self.tableNames.userOverrides);
		if (userId) {
			rec.addQuery('user', '=', userId);
		}
		rec.addQuery('tour', 'IN', ids.join(','));
		rec.deleteMultiple();
		return {ids: ids};
	} else {
		return null;
	}
};

GTAutoLaunchController.prototype.overrideTourForUser = function(tourId) {
	var currentUser = gs.getUser();
	var rec = new GlideRecord(this.tableNames.userOverrides);
	rec.addQuery('user', '=', currentUser.getID());
	rec.addQuery('tour', '=', tourId);
	rec.query();
	var exists = rec.next();
	var tourRecord = new GlideAggregate(this.tableNames.tours);
	tourRecord.addQuery('sys_id', '=', tourId);
	tourRecord.query();
	if(tourRecord.hasNext() && !exists) {
		this._insertOverride(tourId, currentUser.getID());
		return {msg: this.messages.done};
	} else if(tourRecord.hasNext() && exists && !rec.disable_autolaunch){
		rec.disable_autolaunch = true;
		rec.update();
		return {msg: this.messages.done};
	}else {
		return null;
	}
};

GTAutoLaunchController.prototype.overrideAllToursForUserInPage = function(page, portal) {
	var self = this;
	var currentUser = gs.getUser();
	var userId = currentUser.getID();
	var res = this._removeOverrides(page, userId, portal);
	if (res) {
		res.ids.forEach(function(id) {
		  self._insertOverride(id, userId);
		});
		return {msg: self.messages.done};
	} else {
		return null;
	}
};

GTAutoLaunchController.prototype._getOverriddenToursForUser = function(userId) {
  var gr = new GlideRecord(this.tableNames.userOverrides);
  var data = [];
  gr.addQuery('user', userId);
  gr.addQuery('disable_autolaunch',true);
  gr.query();
  while(gr.next()) {
	  var elem = {tourId: '' + gr.tour};
	  data.push(elem);
  }
  return data;
};

GTAutoLaunchController.prototype.getAutoLaunchTour = function(page, portal, context) {
	
	
	var tours = this.getAllAutoLaunchToursforPage(page, portal, context).filter(function(tour){return tour.status != 'draft';});
	
	var oTours = this._getOverriddenToursForUser(gs.getUserID());
	var i;
	var data = [];
	
	if(oTours.length>0)
		for(i in oTours)
			data.push(oTours[i].tourId);
		
	var overriddenTours = data.join(',');
	
	var autoLaunchTour = '';
	var autoLaunchOrder = 0;
	var autoLaunchTourName = '';
	var tour;
	var tourOptions = '';
	var tourType = '';
	
	if(tours.length>0){
		for(tour in tours){
			var currentTourId = tours[tour].id;
			var currentTourOrder = parseInt(tours[tour].order);	   	
			var currentTourName = tours[tour].name;	   	
			if((overriddenTours == '' || overriddenTours.indexOf(currentTourId)==-1) && currentTourOrder > 0){
				if(gs.getUser().hasRole("maint") || tours[tour].roles.toString() == ''){
					if(autoLaunchOrder == 0 || currentTourOrder < autoLaunchOrder){
						autoLaunchTour = currentTourId;
						autoLaunchOrder = currentTourOrder;
						autoLaunchTourName = currentTourName;
						tourOptions = tours[tour].options;
						tourType = tours[tour].type;
					}
				}else{
					var tourRoles = tours[tour].roles.split(",");
					var role;
					for(role in tourRoles){
						if(gs.getUser().hasRole(tourRoles[role])){
							if(autoLaunchOrder == 0 || currentTourOrder < autoLaunchOrder){
								autoLaunchTour = currentTourId;
								autoLaunchOrder = currentTourOrder;
								autoLaunchTourName = currentTourName;
								tourOptions = tours[tour].options;
								tourType = tours[tour].type;
							}
							break;
						}
					}
				}
			}
		}
		
		if(autoLaunchOrder > 0)
			return {
				tourId: autoLaunchTour,
				name:autoLaunchTourName, 
				options: tourOptions, 
				type: tourType
			};
		else
			return {tourId: null};
	}
	
	return {tourId: null};
};


GTAutoLaunchController.prototype.getAllAutoLaunchToursforPage = function(page, portal, context) {
	
	var getUrlParams = function(str){
		var containsParameter = str.indexOf('?') >= 0 ;
		var sp = null, params = [], kvpair = null;
		if (containsParameter) {
			sp = str.split('?');
			if (sp.length > 1) { //ideally length is 2
				params = sp[1].split('&').map(function(kv) {
					kvpair = kv.split('=');
					return {name: kvpair[0], value: kvpair[1]}
				});
			}
		}
		return params;
	};
	
	var isArgumentsMatched = function(tourContext, reqContext) {
        //PRB1397913: fix guided tour popping up on multiple pages
		var reqUrl = reqContext;

		if(Array.isArray(reqContext))
			reqUrl = reqContext.length > 0 ? reqContext[0]:'';

		var  contextParams = getUrlParams(tourContext);
		var defaultPrams = ['gtd_portal_title', 'gtd_page_title'];
		//Don't compare url params if it does not have any parameters.
		//For ex: /sp
		if(!reqUrl || reqUrl.indexOf('?') === -1)
			return true;
		for(var i=0;i<contextParams.length;i++){
			if(defaultPrams.indexOf(contextParams[i].name) === -1 &&
				 (reqUrl.indexOf(contextParams[i].name) === -1 ||reqUrl.indexOf(contextParams[i].value) === -1))
				return false;
		 
		}
		return true;
	};
	
	var autoLaunchTours = this.getToursForPage(page, portal).filter(function(tour){
		return isArgumentsMatched(tour.context,context);
	});
	
	
	autoLaunchTours = autoLaunchTours.filter(function(tour){return tour.order > 0;});
	return autoLaunchTours;
};
```