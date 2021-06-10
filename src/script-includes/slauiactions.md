---
title: "SLAUIActions"
id: "slauiactions"
---

API Name: global.SLAUIActions

```js
var SLAUIActions = Class.create();

SLAUIActions.prototype = {

	initialize: function() {
		this.lu = new GSLog(SLARepair.LOG_PROPERTY, this.type);
		this.lu.includeTimestamp();
	},

	/**
     * Whether the Repair UI Action should be shown or not
     * 
     * @param glideRecord - GlideRecord The record against which the UI Action is being triggered against
     * @param glideSystem - GlideSystem A reference to the GlideSystem instance in scope
     * @param isRelatedList - Boolean Whether the UI Action is being triggered against a related list or not
     * @param validateRowCount - Boolean Whether the UI Action should first check if there are rows before displaying (used for list links) 
     * 
     * @returns A boolean to indicate if the UI Action should be shown or not
     */
	showRepair: function(glideRecord, glideSystem, isRelatedList, validateRowCount) {
		if (!this._check(glideSystem, isRelatedList))
			return false;

		if ((typeof validateRowCount === 'undefined' || validateRowCount === true) && glideRecord.getRowCount() === 0)
			return false;

		if (this._isValidTable(glideRecord) && !this._hasSLADefinition(glideRecord))
			return false;

		return true;
	},

	/**
     * Whether the Repair UI Action should be shown or not for offline update records
     * 
     * @param glideRecord - GlideRecord The record against which the UI Action is being triggered against
     * @param glideSystem - GlideSystem A reference to the GlideSystem instance in scope
     * @param isRelatedList - Boolean Whether the UI Action is being triggered against a related list or not
     * 
     * @returns A boolean to indicate if the UI Action should be shown or not
     */
	showOfflineRepair: function (glideRecord, glideSystem, isRelatedList) {
		if (!this._check(glideSystem, isRelatedList))
			return false;

		if (glideRecord.getTableName() !== SLAOfflineUpdateSNC.SLA_OFFLINE_UPDATE)
			return false;

		var hasOfflineRepair = typeof SLARepair.prototype.repairByOfflineUpdate === 'function';

		if (!hasOfflineRepair)
			this.lu.logNotice("showOfflineRepair: repairByOfflineUpdate function in SLARepair is not defined");

		return hasOfflineRepair;
	},

	_check: function(glideSystem, isRelatedList) {
		 if (glideSystem.getProperty("com.snc.sla.engine.version") == "2010")
            return false;

        if (!glideSystem.hasRole("sla_admin"))
            return false;

		if (isRelatedList)
            return false;

		return true;
	},

	_isValidTable: function(glideRecord) {
		var tableName = glideRecord.getRecordClassName();
		var isValidTable = (tableName != "contract_sla" && tableName != "task_sla");
		return isValidTable;
	},

	_hasSLADefinition: function(glideRecord) {
		return new SLACacheManager().hasDefinitionForRecord(glideRecord);
	},

	type: "SLAUIActions"
};
```