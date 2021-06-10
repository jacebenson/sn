---
title: "GTPlatformAnalyticsAPI"
id: "gtplatformanalyticsapi"
---

API Name: sn_tourbuilder.GTPlatformAnalyticsAPI

```js
var GTPlatformAnalyticsAPI = Class.create();
GTPlatformAnalyticsAPI.prototype = {
    initialize: function() {
		if (!sn_uapaf.ScopedAnalyticsFramework.isDisabled() &&
			!sn_uapaf.ScopedAnalyticsFramework.isBlocked(this.streamId)) {
			sn_uapaf.ScopedAnalyticsFramework.open(this.streamId);
			this.isOpen = true;
		} else {
			gs.warn('Cannot open stream: ' + this.streamId);
		}
    },
	isOpen: false,
    type: 'GTPlatformAnalyticsAPI',
	streamId: 'snc.gtd'
};

GTPlatformAnalyticsAPI.prototype.cleanup = function() {
	if (this.isOpen === true) sn_uapaf.ScopedAnalyticsFramework.close(this.streamId);
};

/*
Parameters:
@data: {"id":"b788be9187120300b38c0f4c59cb0b81","name":"mytour1020232312",
  "roles":["admin","asset","atf_ws_designer","approval_admin","approver_user"],
  "starting_page":"incident",
}
@options: {
  "operationType": "create"
}

Payload sent to the analytics server:
{ "dbevent":"create",
  "event.type":"guided_tours",
  "id":"b788be9187120300b38c0f4c59cb0b81","name":"mytour1020232312",
  "roles":["admin","asset","atf_ws_designer","approval_admin","approver_user"],
  "starting_page":"incident"
 }
*/

GTPlatformAnalyticsAPI.prototype.send = function(data, options) {
	
	if(!this.isOpen)
		this.initialize();
	
	if(typeof(options.eventType) === "undefined" || gs.nil(options.eventType)){
		gs.warn('Skipping send as stream: ' + this.streamId + ', as event type is not available');
		return;
	}
	
	options = options || {};
	options.operationType = options.operationType || "create";
    
	
	if (!this.isOpen) {
		gs.warn('Skipping send as stream: ' + this.streamId + ' is not open');
		return;
	}
	var dataObj = {};
	dataObj['event.type'] =  options.eventType;
	dataObj['dbevent'] = options.operationType;
	if (typeof(data) === 'string') {
		dataObj.value = data;
	} else {
		for(var key in data) {
			if (data.hasOwnProperty(key)) dataObj[key] = data[key];
		}
	}
	
	sn_uapaf.ScopedAnalyticsFramework.sendJSON(this.streamId,[], JSON.stringify(dataObj));
	
	//this.cleanup(); /* closing of stream is not required always */
};
```