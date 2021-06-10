---
title: "CloudResourceDiscoveryCountHandler"
id: "cloudresourcediscoverycounthandler"
---

API Name: global.CloudResourceDiscoveryCountHandler

```js
var CloudResourceDiscoveryCountHandler = Class.create();
CloudResourceDiscoveryCountHandler.prototype = {

	DISCOVERY_CLOUD_RESULTS: 'discovery_cloud_results',
	DISCO_STATUS: 'status',
	DISCO_SCHEDULE: 'schedule',
	CLOUD_RESOURCE_NAME: 'cloud_resource_name',
	CLOUD_RESOURCE_COUNT: 'cloud_resource_count',

	DISCOVERY_CLOUD_TEMP_RESULTS: 'discovery_cloud_temp_results',
	CI_NAME: 'ci_name',
	CI_SYS_ID: 'ci_sys_id',

	DISCOVERY_STATUS: 'discovery_status',
	DISCOVERY_SCHEDULER: 'dscheduler',

    initialize: function() {
    },

	/*
	* Returns a list of all objects which extend the current object will also get their extensions and infinitum
	* Example, given cmdb_ci this will return: cmdb_server -> cmdb_windows_server, etc going from one child to the next child
	*
	* Input Parameter(s)
	* @param parentCI - CI name (table name) for which extended child tables are to be fetched
	*/
	fetchAllChildCIsForParentCI: function(parentCI) {
		var j;
		var finalCIsList = [];
		var allCIs = this._getTableExtensionsForParent(parentCI);
		var ignoredCIsList = ['cmdb_ci_cloud_service_account', 'cmdb_ci_logical_datacenter'];

		//Ignoring the tables extending "cmdb_ci_logical_datacenter" as well
		ignoredCIsList = ignoredCIsList.concat(this._getTableExtensionsForParent('cmdb_ci_logical_datacenter'));

		//Finalising the list to initialise the counts of resources to 0
		for (j in allCIs) {
			if ((ignoredCIsList.indexOf(allCIs[j]) < 0) && (allCIs[j].indexOf('endpoint') < 0))
				finalCIsList.push(allCIs[j]);
		}

		return finalCIsList;
	},

	/*
	* Inserts the Resources's sys_ids into 'Discovery Cloud Temp Results' table when a discovery is triggered via
	* CAPI or Pattern, for a given discovery status.
	*
	* Input Parameters
	* @param outputPayload - Payload provided by the Identification engine after persisting
	* discovered data into CMDB.
	* @param discoStatusID - The sys_id of the Discovery Status
	*/
	cacheCloudResourcesDiscovered : function(outputPayload, discoStatusID) {
		var selectGR,insertGR;
		var rawPayload = global.JSON.parse(outputPayload);
		var finalCIsList = this.fetchAllChildCIsForParentCI('cmdb_ci');

		if (JSUtil.notNil(rawPayload) && rawPayload.hasOwnProperty('items')) {
			rawPayload.items.forEach(function(element) {
				if(finalCIsList.indexOf(element.className) != -1 && element.sysId && element.sysId != 'Unknown') {

					//Check if the record already exists.
					selectGR = new GlideRecord('discovery_cloud_temp_results');
					selectGR.addQuery('ci_sys_id', element.sysId);
					selectGR.addQuery('ci_name', element.className);
					selectGR.addQuery('status', discoStatusID);
					selectGR.query();
					if (!selectGR.next()) {
						insertGR = new GlideRecord('discovery_cloud_temp_results');
						insertGR.initialize();
						insertGR.setValue('ci_name', element.className);
						insertGR.setValue('status', discoStatusID);
						insertGR.setValue('ci_sys_id', element.sysId);
						insertGR.insert();
					}
				}
			});
		}
	},

	/*
	* Checks with the 'Discovery Cloud Temp Results' table to see if any discovered resources data is available
	* for the provided discovery run i.e., discovery status.
	*
	* Based on the available data, update the count for the respective discovery status in the "Discovery Cloud Results"
	* table
	*
	* Input Parameters
	* @param discoStatusID - The sys_id of the Discovery Status
	*/
	persistCachedDiscoveryResultsToCountTable: function(discoStatusID) {
		var i;
		var arr;
		var temp;
		var CIName;
		var obj = {};
		var scheduleID = this.getScheduleIDFromStatus(discoStatusID);
		var gr = new GlideRecord(this.DISCOVERY_CLOUD_TEMP_RESULTS);

		gr.addQuery(this.DISCO_STATUS, discoStatusID);
		gr.query();
		while (gr.next()) {
			arr = [ gr.getValue(this.CI_SYS_ID) + '' ];
			CIName = gr.getValue(this.CI_NAME) + '';
			obj[CIName] = obj.hasOwnProperty(CIName) ? (obj[CIName]).concat(arr) : arr;
		}

		for (i in obj) {
			temp = {};
			obj[i].forEach(function(e) { temp[e] = 1; });
			this.setCloudResourceCount(scheduleID, discoStatusID, i, Object.keys(temp).length);
		}
	},

	/*
	* Once resource count is updated successful then wipe out the data of a given dicovery status, in the
	* "Discovery Cloud Temp Results" table that serves as a cache table until discovery is completed.
	*
	* Input Parameters
	* @param discoStatusID - The sys_id of the Discovery Status
	*/
	cleanUpCachedDiscoveryResults: function(discoStatusID) {
		var gr = new GlideMultipleDelete(this.DISCOVERY_CLOUD_TEMP_RESULTS);
		gr.addQuery(this.DISCO_STATUS, discoStatusID);
		gr.execute();
	},
	
	/*
	* Updates the Resources Count into 'Discovery Cloud Results' table.
	*
	* Input Parameters
	* @param scheduleID - Discovery Schedule Sys ID
	* @param discoStatusID - Current Discovery Status Sys ID
	* @param cmdbTableName - Resource Name. e.g., cmdb_ci_vm_instance
	* @param count - Resource Count i.e., the count of resources discovered
	*/
	setCloudResourceCount : function(scheduleID, discoStatusID, cmdbTableName, count) {
		var setCountGR = new GlideRecord(this.DISCOVERY_CLOUD_RESULTS);
		setCountGR.initialize();
		setCountGR.setValue(this.DISCO_STATUS, discoStatusID);
		setCountGR.setValue(this.CLOUD_RESOURCE_NAME, cmdbTableName);
		setCountGR.setValue(this.CLOUD_RESOURCE_COUNT, count);

		if (scheduleID)
			setCountGR.setValue(this.DISCO_SCHEDULE, scheduleID);

		setCountGR.insert();
	},
	
	saveCloudResourceCount : function(discoStatusID, resource, count) {
		var scheduleID = this.getScheduleIDFromStatus(discoStatusID);
		
		this.persistvCenterDiscoveryCloudResults(scheduleID, discoStatusID, resource, count);
	},

	/*
	* Currently, used for vCenter Only.
	*
	* This script updates the Resources Count into 'Discovery Cloud Results' table when a vCenter discovery is running. 
	* The hooks added for the vCenter Sensors takes care of invoking this methog and thereby updating the resource counts.
	*
	* "GlideMultipleUpdate" is used to avoid the DB lock situation as we're updating the count while discovery run
	* is still in progress
	*
	* Input Parameters
	* @param scheduleID - Discovery Schedule Sys ID
	* @param discoStatusID - Current Discovery Status Sys ID
	* @param resource - Resource Name. e.g., cmdb_ci_vm_instance
	* @param resourceCount - Resource Count i.e., the count of resources discovered
	*/
	persistvCenterDiscoveryCloudResults : function(scheduleID, discoStatusID, resource, resourceCount) {
		var updateCountGR = GlideMultipleUpdate(this.DISCOVERY_CLOUD_RESULTS);
		updateCountGR.setIncrement(this.CLOUD_RESOURCE_COUNT, resourceCount);
		updateCountGR.addQuery(this.DISCO_STATUS, discoStatusID);
		updateCountGR.addQuery(this.DISCO_SCHEDULE, scheduleID);
		updateCountGR.addQuery(this.CLOUD_RESOURCE_NAME, resource);
		updateCountGR.execute();
	},

	getScheduleIDFromStatus : function(discoStatusID) {
		var scheduleID = '';
		var statusGR = new GlideRecord(this.DISCOVERY_STATUS);
		if (statusGR.get(discoStatusID))
			scheduleID = statusGR.getValue(this.DISCOVERY_SCHEDULER);
		
		return scheduleID;
	},
	
	_getTableExtensionsForParent: function(parentCI) {
		var tables = GlideDBObjectManager.get().getTableExtensions(parentCI);
		tables = new JSON().decode(tables);
		return tables;
	},

    type: 'CloudResourceDiscoveryCountHandler'
};
```