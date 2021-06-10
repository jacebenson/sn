---
title: "SLAOfflineUpdateSNC"
id: "slaofflineupdatesnc"
---

API Name: global.SLAOfflineUpdateSNC

```js
var SLAOfflineUpdateSNC = Class.create();

SLAOfflineUpdateSNC.SLA_OFFLINE_UPDATE = 'sla_offline_update';
SLAOfflineUpdateSNC.SLA_OFFLINE_ATTRIBUTE = 'offline_timestamp_field';

SLAOfflineUpdateSNC.getOfflineFieldName = function (tableName) {
	return GlideTableDescriptor.get("" + tableName).getED().getAttribute(SLAOfflineUpdateSNC.SLA_OFFLINE_ATTRIBUTE);
};

SLAOfflineUpdateSNC.prototype = {

	SLA_OFFLINE_UPDATE_LOG: 'sla.offline.update.log',
	MUTEX_SLA_OFFLINE_UPDATE: 'Process SLA Offline Update Mutex ',

	initialize: function(taskGr) {
		this.lu = new global.GSLog(this.SLA_OFFLINE_UPDATE_LOG, this.type);
		this.lu.includeTimestamp();

		if (!taskGr || !taskGr.isValidRecord()) {
			this.lu.logError('initialize: no record supplied');
			return;
		}

		this._taskGr = taskGr;
		this._offlineField = null;

		if (this._taskGr.operation() === 'insert') {
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug("initialize: no need to proccess 'insert' operation for " + this._taskGr.getRecordClassName() + " " + this._taskGr.getDisplayValue());
			return;
		}

		if (!GlideTableDescriptor.isValid(SLAOfflineUpdateSNC.SLA_OFFLINE_UPDATE)) {
			this.lu.logError("initialize: table '" + SLAOfflineUpdateSNC.SLA_OFFLINE_UPDATE + "' is not valid!");
			return;
		}

		this._offlineField = SLAOfflineUpdateSNC.getOfflineFieldName(this._taskGr.getRecordClassName());

		if (JSUtil.nil(this._offlineField) || !this._taskGr.isValidField(this._offlineField)) {
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug("initialize: no valid field '" + this._offlineField + "' from attribute  '" + SLAOfflineUpdateSNC.SLA_OFFLINE_ATTRIBUTE + "' in '" + this._taskGr.getRecordClassName() + "' dictionary!");
			return;
		}

		this._hasSLA = new SLACacheManager().hasDefinitionForRecord(this._taskGr);
		this._offlineDictionaryEnvironmentSet = true;
	},

	hasQueuedOfflineUpdate: function() {
		if (!this._taskGr) {
			this.lu.logError('hasQueuedOfflineUpdate: no record supplied');
			return false;
		}

		if (!this._offlineDictionaryEnvironmentSet)
			return false;

		var response = this._getReadyOfflineUpdate().hasNext();

		if (response && this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug("hasQueuedOfflineUpdate: found sla_offline_update record for " + this._taskGr.getRecordClassName() + " " + this._taskGr.getDisplayValue());

		return response;
	},

	isOfflineUpdate: function() {
		if (!this._taskGr) {
			this.lu.logError('checkOfflineUpdate: no record supplied');
			return false;
		}

		if (!this._offlineDictionaryEnvironmentSet)
			return false;

		var response =  this._taskGr[this._offlineField].changes();

		if (response && this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug("isOfflineUpdate: update for " + this._taskGr.getRecordClassName() + " " + this._taskGr.getDisplayValue() + " is offline");

		return response;
	},

	queue: function() {
		if (!this._taskGr) {
			this.lu.logError('checkOfflineUpdate: no record supplied');
			return;
		}

		if (!this._offlineDictionaryEnvironmentSet || !this._hasSLA)
			return;

		SelfCleaningMutex.enterCriticalSectionRecordInStats(this.MUTEX_SLA_OFFLINE_UPDATE + this._taskGr.getUniqueValue(), this.MUTEX_SLA_OFFLINE_UPDATE, this, this._queue);
	},

	setProcessing: function() {
		if (!this._taskGr) {
			this.lu.logError('checkOfflineUpdate: no record supplied');
			return;
		}

		this._setState('processing');
	},

	setError: function() {
		if (!this._taskGr) {
			this.lu.logError('checkOfflineUpdate: no record supplied');
			return;
		}

		this._setState('error');
	},

	remove: function() {
		if (!this._taskGr) {
			this.lu.logError('checkOfflineUpdate: no record supplied');
			return;
		}

		this._remove();
	},

	// private functions
	_queue: function() {
		if (this._getReadyOfflineUpdate().hasNext())
			return;

		var slaOfflineUpdateGr = new GlideRecord(SLAOfflineUpdateSNC.SLA_OFFLINE_UPDATE);
		slaOfflineUpdateGr.initialize();
		slaOfflineUpdateGr.setValue('document_table', this._taskGr.getRecordClassName());
		slaOfflineUpdateGr.setValue('document_id', this._taskGr.getUniqueValue());
		slaOfflineUpdateGr.setValue('state', 'ready');
		slaOfflineUpdateGr.setWorkflow(false);
		if (!slaOfflineUpdateGr.insert()) {
			this.lu.logError("_queue: failed to create entry in table " + SLAOfflineUpdateSNC.SLA_OFFLINE_UPDATE + " for " + this._taskGr.getRecordClassName() + " " + this._taskGr.getDisplayValue());
			return;
		}

		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug("_queue: Entry in " + SLAOfflineUpdateSNC.SLA_OFFLINE_UPDATE + " table successfully inserted for " + this._taskGr.getRecordClassName() + " " + this._taskGr.getDisplayValue());
	},

	_remove: function() {
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug("_remove: Deleting entry in table " + SLAOfflineUpdateSNC.SLA_OFFLINE_UPDATE + " for " + this._taskGr.getRecordClassName() + " " + this._taskGr.getDisplayValue());

		var offlineUpdateGr = this._getOfflineUpdate();
		if (!offlineUpdateGr.next())
			return;

		offlineUpdateGr.deleteRecord();
	},

	_setState: function(newState) {
		if (JSUtil.nil(newState))
			return;

		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug("_setState: Set " + SLAOfflineUpdateSNC.SLA_OFFLINE_UPDATE + " state field to " + newState + " for " + this._taskGr.getRecordClassName() + " " + this._taskGr.getDisplayValue());

		var offlineUpdateGr = this._getOfflineUpdate();
		if (!offlineUpdateGr.next())
			return;

		offlineUpdateGr.setValue('state', newState);
		offlineUpdateGr.setWorkflow(false);
		offlineUpdateGr.update();
	},

	_getReadyOfflineUpdate: function() {
		return this._getOfflineUpdate('ready');
	},

	_getOfflineUpdate: function(state) {
		var slaOfflineUpdateGr = new GlideRecord(SLAOfflineUpdateSNC.SLA_OFFLINE_UPDATE);
		slaOfflineUpdateGr.addQuery('document_id', this._taskGr.getUniqueValue());
		if (!JSUtil.nil(state))
			slaOfflineUpdateGr.addQuery('state', state);
		slaOfflineUpdateGr.query();
		return slaOfflineUpdateGr;
	},

	type: 'SLAOfflineUpdateSNC'
};
```