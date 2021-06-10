---
title: "MobileDeepLinkGenerator"
id: "mobiledeeplinkgenerator"
---

API Name: global.MobileDeepLinkGenerator

```js
var MobileDeepLinkGenerator = Class.create();

var instanceName = gs.getProperty('instance_name');
var DOMAIN = "service-now.com";
var HTTPS = "https://";
var DEEPLINK_REDIRECT_URL = "/redirect";
var NOTIFICATION = "notification";
var CLIENT_TYPE_MAP = {
	"agent" : "snagent",
	"request" : "snrequest",
	"onboarding" : "snhr",
};

var deeplinkURL = HTTPS + instanceName + "." + DOMAIN + "/deeplink";

MobileDeepLinkGenerator.prototype = {
    initialize: function(clientType) {
		clientType = clientType.toLowerCase();
		if (clientType === NOTIFICATION)
			this.scheme = "snnotification";
		else 
			this.scheme = CLIENT_TYPE_MAP[clientType];
		
		if (!this.scheme)
			throw new Error("Can't not find a scheme for clientType: " + clientType);
    },
	
	_getPrefixURL: function() {
		return deeplinkURL + "/" + this.scheme + DEEPLINK_REDIRECT_URL + "/";
	},
	
	getScreenLink: function(documentId, /* json dictionary */ uiParams) {
		return this._getPrefixURL() + this._generatePayload(documentId, "", "", uiParams);
	},
	
	getFormScreenLink: function(formScreenId, tableName, recordSysId) {
		return this._getPrefixURL() + this._generatePayload(formScreenId, tableName, recordSysId);
	},
	
	_generatePayload: function(screenId, tableName, recordSysId, uiParams) {
		if (!screenId)
			throw new Error("screenId is invalid");
		
		if (recordSysId && !tableName)
			throw new Error("table name is missing for record " + recordSysId);
		
		var payload = {};
		payload['ScreenId'] = screenId;
		if (recordSysId) {
			payload['RecordId'] = recordSysId;
			payload['TableName'] = tableName;
		}
		
		if (uiParams)
			payload['FormFieldValues'] = uiParams;
		
		return GlideStringUtil.base64Encode(JSON.stringify(payload));
	},
	
    type: 'MobileDeepLinkGenerator'
};
```