---
title: "UAPlatformAnalyticsAjaxAPI"
id: "uaplatformanalyticsajaxapi"
---

API Name: global.UAPlatformAnalyticsAjaxAPI

```js
var UAPlatformAnalyticsAjaxAPI = Class.create();

UAPlatformAnalyticsAjaxAPI.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	
	sendAnalytic: function() {
		
		var streamId = this.getParameter("sysparm_streamId");
		var data = this.getParameter("sysparm_sample");
		var obfuscationList = this.getParameter("sysparm_obfuscationList");
		
		this._send(streamId, obfuscationList, data);
	},
	
	sendJSON: function(streamId, obfuscationList, data) {
		this._send(streamId, obfuscationList, JSON.stringify(data));
	},
	
	_send: function(streamId, obfuscationList, data) {
		
		if (!this._validate(streamId, data))
			return;
		
		obfuscationList = obfuscationList || [];
		
		var SUCCESS = 0;
		var ALREADY_REGISTERED = 4;
	
		if (AnalyticsFramework.isDisabled()) {
			gs.info("UAPlatformAnalyticsAjaxAPI: Analytics Framework is disabled!!");
			return;
		}
		
		var openStatus = AnalyticsFramework.open(streamId);
		
		if (openStatus == SUCCESS || openStatus ==  ALREADY_REGISTERED) {

			var status = AnalyticsFramework.sendJSON(streamId, obfuscationList, data);

			if(status != 0)
				gs.warn('UAPlatformAnalyticsAjaxAPI: Unable to send analytics for stream:' + streamId + '; status = ' + status);

		} else 
			gs.warn('UAPlatformAnalyticsAjaxAPI: AnalyticsFramework open failure for StreamId: ' + streamId + '; openStatus = ' + openStatus);
		
	},
	
	_validate: function(streamId, data){
		
		if (JSUtil.nil(streamId)) {
			gs.warn('UAPlatformAnalyticsAjaxAPI: Unable to send analytics. Invalid streamId:' + streamId);
			return false;
		}
			
		if (JSUtil.nil(data)) {
			gs.warn('UAPlatformAnalyticsAjaxAPI: Unable to send analytics for stream:' + streamId + " no valid sample to send");
			return false;
		}
		
		return true;
	},

    type: 'UAPlatformAnalyticsAjaxAPI'
});
```