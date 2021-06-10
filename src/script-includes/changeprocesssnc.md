---
title: "ChangeProcessSNC"
id: "changeprocesssnc"
---

API Name: global.ChangeProcessSNC

```js
var ChangeProcessSNC = Class.create();

ChangeProcessSNC.LOG_PROP = "com.snc.change_management.core.log";
ChangeProcessSNC.STATE_MODEL_PLUGIN = "com.snc.change_management.state_model";
ChangeProcessSNC.SHORT_DESC = "short_description";
ChangeProcessSNC.NAME = "name";
ChangeProcessSNC.NUMBER = "number";
ChangeProcessSNC.TYPE = "type";
ChangeProcessSNC.STATE = "state";

ChangeProcessSNC.prototype = {

	initialize: function(_gr, _gs) {
		this._log = new GSLog(ChangeProcessSNC.LOG_PROP, this.type);

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[initialize] type: " + this.type);

		this._gr = _gr || current;
		this._gs = _gs || gs;
		this._stateHandlerActive = pm.isActive(ChangeProcessSNC.STATE_MODEL_PLUGIN);
		
		if (!this._gr)
			this._log.error("[initialize] invalid GlideRecord");
		
		if (this._gr && this._stateHandlerActive)
			this._stateHandler = new ChangeRequestStateHandler(this._gr);
	},

	resolveState: function(state) {
		var stateName = null;

		if (!state)
			return stateName;

		var stateValue = this.resolveChoice(this.getGlideRecord().state.getED(), state);

		if (stateValue && this._stateHandlerActive)
			stateName = this._stateHandler.getStateName(stateValue);

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[resolveState] state: " + state + " stateName: " + stateName + " stateValue: " + stateValue);

		return stateName || stateValue;
	},

	moveTo: function(state) {
		state = this.resolveState(state);
		var moveTo = false;
		if (state && this._stateHandlerActive)
			moveTo = this._stateHandler.moveTo(state);
		else if (new ChangeRequest(this._gr).hasValidChoice(ChangeProcessSNC.STATE, state)) {
			this._gr.setValue('state', state);
			moveTo = true;
		}

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[moveTo] state: " + state + " moveTo: " + moveTo);

		return moveTo;
	},

	canMoveTo: function(state) {
		if (!this._stateHandlerActive)
			return true;

		state = this.resolveState(state);
		var canMoveTo = false;
		if (state)
			canMoveTo = this._stateHandler.canMoveTo(state);

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[canMoveTo] state: " + state + " canMoveTo: " + canMoveTo);

		return canMoveTo;
	},

	canWriteTo: function(fieldName) {
		if (!fieldName)
			return false;

		var canWrite = this._gr[fieldName].canWrite();

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[canWriteTo] fieldName: " + fieldName + " canWrite: " + canWrite);

		return canWrite;
	},

	approve: function(comments) {
		return this._processApproval("approved", comments);
	},

	reject: function(comments) {
		return this._processApproval("rejected", comments);
	},

	_processApproval: function(approveReject, comments) {
		if (!approveReject)
			return false;

		// Only approvals related to Change Requests can be approved/rejected
		var tableName = this.getGlideRecord().getTableName();
		var tableNames = new TableUtils(tableName).getTables();

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_processApproval] tableName: " + tableName + " tableNames: " + tableNames);

		if (!tableNames.contains(ChangeRequest.CHANGE_REQUEST))
			return false;

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_processApproval] state: " + this._gr.state + " before: " + approveReject);

		var userSysIds = getMyApprovals();

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_processApproval] userSysIds: " + userSysIds);

		var gr = new GlideRecord("sysapproval_approver");
		gr.addQuery("approver", "IN", userSysIds);
		gr.addQuery("document_id", this._gr.getUniqueValue());
		gr.addQuery("state", "requested");
		gr.query();

		var processed = gr.hasNext();
		while (gr.next()) {
			gr.state = approveReject;
			if (comments)
				gr.comments = comments;

			if (!gr.update())
				processed = false;
		}

		// Approval/rejection may alter state of Change Request
		if (processed)
			this.refreshGlideRecord();

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_processApproval] userSysIds: " + userSysIds + " approveReject: " + approveReject + " processed: " + processed + " state: " + this._gr.state);

		return processed;
	},

	getCIs: function(type) {
		if (!this._gr || !type || (type !== ChangeCIAssociation.AFFECTED && type !== ChangeCIAssociation.IMPACTED && type !== ChangeCIAssociation.OFFERING))
			return null;

		var tableName;
		if (type.toLowerCase() === ChangeCIAssociation.AFFECTED)
			tableName = ChangeCIAssociation.TASK_CI;
		else if (type.toLowerCase() === ChangeCIAssociation.IMPACTED)
			tableName = ChangeCIAssociation.TASK_CMDB_CI_SERVICE;
		else if (type.toLowerCase() === ChangeCIAssociation.OFFERING && GlidePluginManager.isActive(new global.ChangeUtils().PLUGIN_SPM))
			tableName = ChangeCIAssociation.TASK_SERVICE_OFFERING;
		else
			return null;

		var changeRequestSysId = this._gr.getUniqueValue();
		var gr = new GlideRecord(tableName);
		gr.addQuery("task", changeRequestSysId);
		gr.query();

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[getCIs] changeRequestSysId: " + changeRequestSysId + " task count: " + gr.getRowCount());

		return gr;
	},

	getTasks: function() {
		if (!this._gr)
			return null;

		var changeRequestSysId = this._gr.getUniqueValue();
		var changeTaskGr = new GlideRecord(ChangeTask.CHANGE_TASK);
		changeTaskGr.addQuery(ChangeRequest.CHANGE_REQUEST, changeRequestSysId);
		changeTaskGr.query();

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[getTasks] changeRequestSysId: " + changeRequestSysId + " task count: " + changeTaskGr.getRowCount());

		return changeTaskGr;
	},

	getChangeRequest: function() {
		if (!this._gr)
			return null;

		return new ChangeRequest(this._gr);
	},

	toString: function() {
		return JSON.stringify(this.toJS());
	},

	toJS: function() {
		return ChangeCommon.toJS(this._gr);
	},

	deleteRecord: function() {
		return this._gr.canDelete() ? this._gr.deleteRecord() : false;
	},

	insert: ChangeCommon.methods.insert,

	update: ChangeCommon.methods.update,

	refreshGlideRecord: ChangeCommon.methods.refreshGlideRecord,

	getGlideRecord: ChangeCommon.methods.getGlideRecord,

	setValue: ChangeCommon.methods.setValue,

	setValues: ChangeCommon.methods.setValues,

	resolveChoice: ChangeCommon.methods.resolveChoice,

	resolveReference: ChangeCommon.methods.resolveReference,

	isReferenceField: ChangeCommon.methods.isReferenceField,

	type: "ChangeProcessSNC"
};

```