---
title: "InstanceCloneValidatorAjax"
id: "instanceclonevalidatorajax"
---

API Name: global.InstanceCloneValidatorAjax

```js
var InstanceCloneValidatorAjax = Class.create();
InstanceCloneValidatorAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	/**
	* @param : sysparm_clone_sys_id -  SysID - String
	* @return : String
	**/
	executeValidationRules : function() {
	
		var cloneHistorySysId = this.getParameter('sysparm_clone_sys_id');
		if (gs.nil(cloneHistorySysId)) 
			return ;

		var response = {};
		var cloneGr = new GlideRecord("clone_instance");
		if (!cloneGr.get(cloneHistorySysId)) 
			return ;

		var validationRules = cloneGr.getValue('clone_request_validation_rules');
		if (gs.nil(validationRules)) 
			return ;

		validationRules = new JSON().decode(validationRules);
		if (!gs.nil(validationRules.preflightCheck)) {
			var preflightChecksResponse = this.executePreflightChecks(validationRules.preflightCheck);
			if (!gs.nil(preflightChecksResponse)) 
				response = preflightChecksResponse;
		}

		var encodedResponseString = new JSON().encode(response);
		return encodedResponseString;
	},

	/**
	* @arg : preflightCheckObj -  JSON Object
	* @return : response - JSON Object
	**/

	executePreflightChecks : function(preflightCheckObj) {
		var response = {};
		if (gs.nil(preflightCheckObj.exclusionTablesBlacklistRules))
			return;

		var exclusionTablesBlacklistRules = preflightCheckObj.exclusionTablesBlacklistRules;
		if (gs.nil(exclusionTablesBlacklistRules.tables))
			return;

		var excludeTablesBlackList = exclusionTablesBlacklistRules.tables;
		var excludeListGr = new GlideRecord("clone_data_exclude");
		excludeListGr.addQuery('name', 'IN', excludeTablesBlackList);
		excludeListGr.query();
		if (excludeListGr.next()) {
			response.type = exclusionTablesBlacklistRules.type;
			response.message = exclusionTablesBlacklistRules.message;
		}
		return response; 

	},

	/**
	* @arg : sysparm_clone_sys_id -  SysID - String
	* @return : response JSON object
	**/

	executeLargePreserverValidation: function() {
		var cloneHistorySysId = this.getParameter('sysparm_clone_sys_id');
		if (gs.nil(cloneHistorySysId))
			return;
		var response = {};
		var cloneGr = new GlideRecord("clone_instance");
		if (!cloneGr.get(cloneHistorySysId))
			return;
		var largeTablesList = "";
		var excessCloneTime = 0;
		var reasonsForLargePreserver = [];
		var largeTablesInPreserver = this.checkForLargeTablesInPreserver(cloneGr);
		reasonsForLargePreserver = this.getReasonsForLargePreserver(cloneGr);
		if (!gs.nil(largeTablesInPreserver)) {
			for (var table in largeTablesInPreserver) {
				largeTablesList += table;
				largeTablesList += ", ";
				excessCloneTime += largeTablesInPreserver[table];
			}
			largeTablesList = largeTablesList.substring(0, largeTablesList.length - 2);
		}
		response.reasonsForLargePreserver = reasonsForLargePreserver;
		response.largeTablesList = largeTablesList;
		if(excessCloneTime == 0){
			response.warningMessage = gs.getMessage("clone.large.preserver.warning.tables",[largeTablesList]);
		}
		else{
			var warningMessage = gs.getMessage("clone.large.preserver.warning.tables",[largeTablesList]);
			response.warningMessage = gs.getMessage("{0} by {1} minutes.",[warningMessage,excessCloneTime]);
		}
		
		var encodedResponseString = new JSON().encode(response);
		return encodedResponseString;
		
	},

	getReasonsForLargePreserver: function(cloneGr) {
		var cloudDetails = cloneGr.getValue("cloud_details");
		cloudDetails = new JSON().decode(cloudDetails);
		var reasonsForLargePreserver = cloudDetails.reasonsForLargePreserver;
		return reasonsForLargePreserver;
	},
	
	checkForLargeTablesInPreserver: function(cloneGr) {
		var tableName,preserverGr,useCloneProfile;
		var largeTablesInPreserver = {};
		var cloudDetails = cloneGr.getValue("cloud_details");
		cloudDetails = new JSON().decode(cloudDetails);
		var largeTablesList = cloudDetails.largeTablesList;
		var cloneProfile = cloneGr.getValue("profile");
		if(gs.nil(cloneProfile))
			useCloneProfile = false;
		else
			useCloneProfile = true;
		if(useCloneProfile){
			preserverGr = new GlideRecord("clone_profile_preservers");
			preserverGr.addQuery('profile', cloneProfile);
			preserverGr.query();
			while (preserverGr.next()){
				tableName = preserverGr.preserver.table;
				if(largeTablesList.hasOwnProperty(tableName) && !(largeTablesInPreserver.hasOwnProperty(tableName)))
					largeTablesInPreserver[tableName] = largeTablesList[tableName];
			}
		}
		else{
			preserverGr = new GlideRecord("clone_data_preserver");
			preserverGr.query();
			while(preserverGr.next()){
				tableName = preserverGr.getValue("table");
				if(largeTablesList.hasOwnProperty(tableName) && !(largeTablesInPreserver.hasOwnProperty(tableName)))
					largeTablesInPreserver[tableName] = largeTablesList[tableName];
			}
		}
		return largeTablesInPreserver;
	},
    type: 'InstanceCloneValidatorAjax'
});
```