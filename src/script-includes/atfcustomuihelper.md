---
title: "ATFCustomUIHelper"
id: "atfcustomuihelper"
---

API Name: global.ATFCustomUIHelper

```js
var ATFCustomUIHelper = Class.create();
ATFCustomUIHelper.prototype = {
    initialize: function() {
    },
	
	isCustomUIStepConfig: function(stepConfigId) {
	    var CUSTOM_UI_CATEGORY_SYS_ID = '581a597353d21300ac15ddeeff7b12a6';
		if (!stepConfigId)
			return false;
		
		var gr = new GlideRecord('sys_atf_step_config');
		gr.addQuery('sys_id', stepConfigId);
		gr.addQuery('category', CUSTOM_UI_CATEGORY_SYS_ID);
		gr.query();
		return gr.next();
	},

	getMethodForCustomUIStepConfig: function(stepConfigId) {
		if (stepConfigId == 'e5dd168473330300c79260bdfaf6a794' || stepConfigId == 'b4758c7453370300c792ddeeff7b128d')
			return 'setValue';
		else if (stepConfigId == 'def25c4b73730300c79260bdfaf6a700')
			return 'click';
		else
			return '';
	},

	// To be used with the "Retrieve Components" UI action on existing Custom UI steps
	shouldShowRetrieveButton: function(stepGR) {
		if (!stepGR || !stepGR.isValidRecord())
			return false;

		var ASSERT_TEXT_ON_PAGE_SYS_ID = '475e0de3d732130089fca2285e610361';

		if(!((new GlideImpersonate()).isImpersonating()) && sn_atf.AutomatedTestingFramework.isRunnerEnabled()
			&& GlideMobileExtensions.getDeviceType() == 'doctype' && stepGR.test.active && stepGR.active
			&& this.isCustomUIStepConfig(stepGR.step_config.sys_id) && stepGR.getUniqueValue() !== ASSERT_TEXT_ON_PAGE_SYS_ID) 
			return true;

		return false;
	},

	getComponentDescriptionFromCache: function(componentHash, mugshotCacheJSON) {
		var components = "";
		try {
			components = JSON.parse(mugshotCacheJSON);
		} catch (e) {
			return "";
		}

		var mugshot = this._getMugshot(components[componentHash]);
		return mugshot["sn_atf_mugshot_short_description"];
	},

	getQueryStringMugshotDescription: function(queryString, mugshotsJSON) {
		var mugshotMap = {};
		try {
			mugshotMap = JSON.parse(mugshotsJSON);
		} catch (e) {}

		var queryParts = queryString.split('^');
		var conditions = "";
		var parts;
		var description;
		for (var i = 0; i < queryParts.length; i++) {
			if (queryParts[i] === "EQ")
				continue;

			// parts[0] is the mugshot hash, parts[1] is the value
			parts = queryParts[i].split('=');
			var mugshot = this._getMugshot(mugshotMap[parts[0]]);
			description = mugshot["sn_atf_mugshot_short_description"];
			conditions += gs.getMessage("'{0}' = {1}", [description, this._getComponentDisplayValue(mugshot, parts[1])]) + '\n';
		}
		return conditions;
	},

	_getMugshot: function(mugshotJSON) {
		if (!mugshotJSON || typeof mugshotJSON !== "string")
			return {sn_atf_mugshot_short_description:""};

	  	try {
			return JSON.parse(mugshotJSON);
		} catch (e) {
			return {sn_atf_mugshot_short_description:""};
		}
	},

	_getComponentDisplayValue: function(mugshot, value) {
		var dataTypeParamsJSON = mugshot["sn-atf-data-type-params"];
		if (!dataTypeParamsJSON)
			return value;

		var dataTypeParams;
		try {
			dataTypeParams = JSON.parse(dataTypeParamsJSON);
		} catch (e) {
			return value;
		}

		if (!dataTypeParams || !dataTypeParams["reference"])
			return value;

		var gr = new GlideRecord(dataTypeParams["reference"]);
		if (!gr.get(value))
			return value;

		return gr.getDisplayValue();
	},

    type: 'ATFCustomUIHelper'
};
```