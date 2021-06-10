---
title: "SNMapHelper"
id: "snmaphelper"
---

API Name: global.SNMapHelper

```js
var SNMapHelper = Class.create();
SNMapHelper.getMapData = function(mapId, filterItemVals, mapInputData) {
	mapInputData = (typeof mapInputData !== 'undefined') ?  mapInputData : {}; // defaulting mapInputData
	
	var data_item = {};
	var mapPageRecord = GlideRecord("cmn_map_page");
	mapPageRecord.get(mapId);
	if (!mapPageRecord) {
		gs.error("SN_MAP: map page record is undefined.");
		return {};
	}
	

	if (!SNMapHelper.validateRoles(mapPageRecord)) {
		return {
			"successs": "false",
			"message": "User not authorized"
		};
	}
	
	var filterItems = SNMapFilterItem.getFilterItem(mapPageRecord);
	var dataItemAndMarkerRes = SNMapDataItem.getDataItemWithMarker(mapPageRecord, filterItemVals, filterItems, mapInputData);
	return {
		"data_item" : dataItemAndMarkerRes.data_item ? dataItemAndMarkerRes.data_item : "",
		"marker" : dataItemAndMarkerRes.marker ? dataItemAndMarkerRes.marker : "",
		"filter_items" :filterItems ? filterItems : "",
	};
};
SNMapHelper.verifyIfConfigIsAdvanced = function(mapSysId) {
	var mapPageRec = GlideRecord("cmn_map_page");
	mapPageRec.get(mapSysId);
	return mapPageRec.getValue("use_advanced_configuration") == 1;
};
SNMapHelper.getMapSysId = function(mapSysId, mapName) {
	if (JSUtil.notNil(mapSysId))
		return mapSysId;
	var mapPageRec = GlideRecord("cmn_map_page");
	mapPageRec.addQuery("name", mapName);
	mapPageRec.query();
	if (mapPageRec.next())
		return mapPageRec.sys_id;
	return null;
};
SNMapHelper.getConfigConsts = function() {
	var result = {};
	result["transl"] = {
		DETAILS: gs.getMessage("Details"),
		REFRESH_MAP: gs.getMessage("Refresh map"),
		TOGGLE_FILTER_POPUP: gs.getMessage("Toggle filter popup"),
		FILTER :gs.getMessage("Filter")
	};
	return result;
};

SNMapHelper.getMapPageInfo = function(sysId){
	var gr = new GlideRecord("cmn_map_page");
	gr.get(sysId);
	return {
		"center_address":gr.getValue("center_address"),
		"centrer_latitude":gr.getValue("center_latitude"),
		"centrer_longitude":gr.getValue("centrer_longitude"),
		"initial_zoom":gr.getValue("initial_zoom"),
		"name": gr.getDisplayValue("name"),
		"map_type": gr.getValue("type"),
		"disable_map_controls": gr.getValue("disable_map_controls") ? gr.getValue("disable_map_controls").split(","): [],
		"disable_nav_bar": gr.getValue("disable_nav_bar"),
	};
};

SNMapHelper.getMapConfigStr = function(sysId) {
	
	var mapPageRecord = new GlideRecord("cmn_map_page");
	mapPageRecord.get(sysId);
	
	var hasValidRoles = SNMapHelper.validateRoles(mapPageRecord);
	
	if (!hasValidRoles) {
		return JSON.stringify({
			"hasValidRoles": "false"
		});
	}
	
	var language = gs.getSession().getLanguage();
	var usrLocRegion = global.SNMapHelper.getUserProfileLocation();
	var tollSetting = gs.getProperty('work.management.allow.toll.roads');
	if (tollSetting == null || tollSetting.length == 0)
		tollSetting = gs.getProperty('glide.geolocation.allow.toll.roads', 'false');
	var mapAPIConfig = {
		google_map: {
			auto_close: gs.getProperty('google.maps.auto_close', 'true'),
			hide_landmarks: gs.getProperty('google.maps.hide_landmarks', ''),
			show_landmarks: gs.getProperty('google.maps.show_landmarks', ''),
			allow_toll: tollSetting,
			ver: gs.getProperty('google.maps.version', '3.37'),
			lang: language,
			region: usrLocRegion.region,
		},
		production_instance: gs.getProperty('glide.installation.production'),		
	};
	// set google map client id or api key
	switch (gs.getProperty('google.maps.method')) {
		case "client-id":
			mapAPIConfig.google_map["client_id"] = SNMapHelper.getMapClientId();
			break;
		case "key":
			mapAPIConfig.google_map["api_key"] = SNMapHelper.getMapApiKey();
			break;
		default:
			mapAPIConfig.google_map["api_key"] = SNMapHelper.getMapApiKey();
			break;
			
	}
	var configConsts = new global.SNMapHelper.getConfigConsts();
	var mapPageInfo = new global.SNMapHelper.getMapPageInfo(sysId);
	var smapObj = {
		hasValidRoles: "true",
		mapAPIConfig: mapAPIConfig,
		configConsts: configConsts,
		mapPageInfo: mapPageInfo
	};
	var smapObjStr = JSON.stringify(smapObj);
	return smapObjStr;
};
// NEXT: honor map settings
SNMapHelper.getUserProfileLocation = function() {
	// set default location
	var location = {lat: 0, lng: 0};
	var usrGR = new GlideRecord("sys_user");
	usrGR.get(gs.getUserID());
	var usrProfLoc = usrGR.location;
	if (usrProfLoc) {
		location.lat = +usrProfLoc.latitude;
		location.lng = +usrProfLoc.longitude;
	}
	return {location: location, region: usrGR.u_region};
};
SNMapHelper.getMapClientId = function() {
	return gs.getProperty("google.maps.client");
};
SNMapHelper.getMapPrivateKey = function() {
	return gs.getProperty("google.maps.client.key");
};
SNMapHelper.getMapApiKey = function() {
	return GoogleMaps.getMapsKey();
};
SNMapHelper.validateRoles = function(mapPageRecord) {
	var roles = mapPageRecord.getValue("roles") ? 
		mapPageRecord.getValue("roles") : 
		"snc_internal";
	
	return gs.hasRole(roles);
};
```