---
title: "UnauthorizedChangeRequestSNC"
id: "unauthorizedchangerequestsnc"
---

API Name: global.UnauthorizedChangeRequestSNC

```js
var UnauthorizedChangeRequestSNC = Class.create();
UnauthorizedChangeRequestSNC.prototype = {
	DEFAULT_6HRS : '21600',
	PROP_UNAUTHORIZED_ENABLED: 'com.snc.change_request.enable_unauthorized',
	PLUGIN_SVC_MAPPING: "com.snc.service-mapping",
	PLUGIN_DISCOVERY: "com.snc.discovery.api",

    initialize: function() {
		this._timeWindow = this.DEFAULT_6HRS;
    },

	setWindowInSeconds: function(timeInSeconds) {
		this._timeWindow = timeInSeconds;
	},
	
	hasValidChange: function(ciSysId) {
		if (!ciSysId)
			return false;

		var gdt = new GlideDateTime();
		gdt.addSeconds(this._timeWindow * -1);

		//Check if Discovery is installed and any horizontal discovery jobs have been run in a set time window
		if (GlidePluginManager.isActive(this.PLUGIN_DISCOVERY)) {
			var taskCiGr1 = new GlideRecord('task_ci');
			taskCiGr1.addQuery('ci_item', ciSysId);
			taskCiGr1.addQuery('discovery_last_updated', '>=', gdt.getValue());
			taskCiGr1.addQuery('task.sys_class_name', 'change_request');
			taskCiGr1.query();

			if (taskCiGr1.hasNext())
				return true;
		}

		//Check if service mapping is installed and any top down discovery jobs have been run in a set time window
		if (GlidePluginManager.isActive(this.PLUGIN_SVC_MAPPING)) {
			var taskServiceGr = new GlideRecord('task_cmdb_ci_service');
			taskServiceGr.addQuery('cmdb_ci_service', ciSysId);
			taskServiceGr.addQuery('discovery_last_updated', '>=', gdt.getValue());
			taskServiceGr.addQuery('task.sys_class_name', 'change_request');
			taskServiceGr.query();

			if (taskServiceGr.hasNext())
				return true;
		}

		//Check if there are any active Change Requests for the configuration item 
		//with no recent Discovery jobs.
		var taskCiGr2 = new GlideRecord('task_ci');
		taskCiGr2.addQuery('ci_item', ciSysId);
		taskCiGr2.addQuery('task.active', true);
		taskCiGr2.addQuery('task.sys_class_name', 'change_request');
		taskCiGr2.query();

		if (taskCiGr2.hasNext())
			return true;

		return false;
	},

	createUnauthorizedChange: function(ciSysId, changedData) {
		if (!ciSysId)
			return;

		var chgGr = ChangeRequest.newEmergency();
		chgGr.setValue('unauthorized', true);
		chgGr.setValue('short_description', gs.getMessage('An unauthorized change has been detected'));
		chgGr.setValue('cmdb_ci', ciSysId);
		chgGr.setValue('description', this._formatChangedData(changedData));
		chgGr.insert();
		
		return chgGr.getGlideRecord();
	},

	isUnauthorizedEnabled: function() {
		return gs.getProperty(this.PROP_UNAUTHORIZED_ENABLED, 'true') + "" === "true";
	},
	
	_formatChangedData: function(data) {
		var formattedData = '';
		if (!data)
			return formattedData;
		var jsonData = JSON.parse(data);
		
		for (var i = 0; i < jsonData.updatedFields.length; i++) {
			var updatedField = jsonData.updatedFields[i];
			var values = [];
			values.push(updatedField.fieldName);
			values.push(updatedField.oldValue ? updatedField.oldValue : '');
			values.push(updatedField.newValue);
			formattedData += gs.getMessage('Field: {0}  Old Value: {1}  New Value: {2}\n', values);
		}

		return formattedData;
	},

    type: 'UnauthorizedChangeRequestSNC'
};
```