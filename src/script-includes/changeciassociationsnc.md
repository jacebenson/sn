---
title: "ChangeCIAssociationSNC"
id: "changeciassociationsnc"
---

API Name: global.ChangeCIAssociationSNC

```js
var ChangeCIAssociationSNC = Class.create();
// Table names
ChangeCIAssociationSNC.TASK_CI = "task_ci";
ChangeCIAssociationSNC.TASK_CMDB_CI_SERVICE = "task_cmdb_ci_service";
ChangeCIAssociationSNC.TASK_SERVICE_OFFERING = "task_service_offering";

// Field names
ChangeCIAssociationSNC.CI_ITEM = "ci_item";
ChangeCIAssociationSNC.CMDB_CI_SERVICE = "cmdb_ci_service";
ChangeCIAssociationSNC.SERVICE_OFFERING = "service_offering";

// type
ChangeCIAssociationSNC.AFFECTED = "affected";
ChangeCIAssociationSNC.IMPACTED = "impacted";
ChangeCIAssociationSNC.OFFERING = "offering";

// response param
ChangeCIAssociationSNC.IGNORED_CMDB_CI_SYS_IDS = "ignored_cmdb_ci_sys_ids";

ChangeCIAssociationSNC.prototype = {

	initialize: function(taskAssociationGr) {
		this._log = new GSLog(ChangeCommon.LOG_PROPERTY, this.type);
		if (taskAssociationGr)
			this._gr = taskAssociationGr;
	},

	insert: function() {
		var associationType = this.getAssociationType();
		if (!associationType) {
			this.addErrorMsg(gs.getMessage("Association of type: {0} is invalid", [associationType]));
			return null;
		}

		var changeSysId = this._gr ? this._gr.task + "" : "";
		if (!changeSysId) {
			this.addErrorMsg(gs.getMessage("changeSysId: {0} is not a valid change_request sys_id", [changeSysId]));
			return null;
		}

		var cmdbCiSysId = this.getCI() + "";
		if (!this.hasValidCI()) {
			this.addErrorMsg(gs.getMessage("cmdbCiSysId: {0} is not a valid cmdb_ci sys_id", [cmdbCiSysId]));
			return null;
		}

		var sysId = null;
		var isNewRecord = !this._gr.isValidRecord();

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[insert] isNewRecord: " + isNewRecord);

		if (isNewRecord) {
			var isAssociated = this.isAssociated();
			if (isAssociated) {
				this.addInfoMsg(gs.getMessage("Association of type: {0} between CI: {1} and Change Request: {2} already exists", [associationType, cmdbCiSysId, changeSysId]));
				var gr = this._getAssociatedGr();
				if (gr && gr.next()) {
					this._gr = gr;
					sysId = this._gr.getUniqueValue();
				}
			} else {
				var canCreate = this._gr.canCreate();

				if (this._log.atLevel(GSLog.DEBUG))
					this._log.debug("[insert] canCreate: " + canCreate);

				if (canCreate)
					sysId = this._gr.insert();
				else
					this.addInfoMsg(gs.getMessage("Association of type: {0} between CI: {1} and Change Request: {2} is not permitted", [associationType, cmdbCiSysId, changeSysId]));

				if (this._log.atLevel(GSLog.DEBUG))
					this._log.debug("[insert] isActionAborted: " + this._gr.isActionAborted());
			}
		} else

		if (!sysId || this._gr.isActionAborted())
			this.addErrorMsg(gs.getMessage("Failed to create association of type: {0} between CI: {1} and Change Request: {2}", [associationType, cmdbCiSysId, changeSysId]));

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[insert] sysId: " + sysId);

		return sysId;
	},

	getAssociationType: function() {
		if (!this._gr)
			return null;

		var tableName = this._gr.getTableName();
		if (!tableName)
			return null;

		if (tableName === ChangeCIAssociation.TASK_CI)
			return ChangeCIAssociation.AFFECTED;

		if (tableName === ChangeCIAssociation.TASK_CMDB_CI_SERVICE)
			return ChangeCIAssociation.IMPACTED;

		if (tableName === ChangeCIAssociation.TASK_SERVICE_OFFERING)
			return ChangeCIAssociation.OFFERING;

		return null;
	},

	hasValidCI: function() {
		var cmdbCiSysId = this.getCI() + "";

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[hasValidCI] cmdbCiSysId: " + cmdbCiSysId);

		if (!cmdbCiSysId)
			return false;

		var hasValidCI;

		// Invalid record means they are not in the DB, i.e. new
		if (!(this._gr.isValidRecord() && this.getCI() !== null && this.getCI().changed && this.getCI().changed())) {
			var ga = new GlideAggregate("cmdb_ci");
			ga.addAggregate("COUNT");
			ga.addQuery("sys_id", cmdbCiSysId);
			ga.query();
			hasValidCI = ga.next() && ga.getAggregate("COUNT") > 0;
		} else
			hasValidCI = true;

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[hasValidCI] hasValidCI: " + hasValidCI);

		return hasValidCI;
	},

	getCI: function() {
		if (!this._gr)
			return null;

		if (this._gr.isValidField(ChangeCIAssociation.CI_ITEM))
			return this._gr.getElement(ChangeCIAssociation.CI_ITEM);
		if (this._gr.isValidField(ChangeCIAssociation.CMDB_CI_SERVICE))
			return this._gr.getElement(ChangeCIAssociation.CMDB_CI_SERVICE);
		if (this._gr.isValidField(ChangeCIAssociation.SERVICE_OFFERING))
			return this._gr.getElement(ChangeCIAssociation.SERVICE_OFFERING);

		return null;
	},

	isAssociated: function() {
		var gr = this._getAssociatedGr();
		var associated = gr && gr.next() ? true : false;

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[isAssociated] associated: " + associated);

		return associated;
	},

	_getAssociatedGr: function() {
		if (!this._gr)
			return null;

		var tableName = this._gr.getTableName();
		var taskSysId = this._gr.task + "";
		var ge = this.getCI();
		var fieldName = ge !== null ? ge.getName() : "";
		var fieldValue = ge !== null ? ge + "" : "";

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_getAssociatedGr] tableName: " + tableName + " fieldName: " + fieldName + " fieldValue: " + fieldValue + " taskSysId: " + taskSysId);

		if (!taskSysId || !tableName || !fieldName || !fieldValue)
			return null;

		var gr = new GlideRecord(tableName);
		gr.addQuery("task", taskSysId);
		gr.addQuery(fieldName, fieldValue);
		gr.query();
		return gr;
	},

	addErrorMsg: function(msg) {
		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[addErrorMsg] msg: " + msg);

		if (!this._errorMsgs)
			this._errorMsgs = [];

		if (msg)
			this._errorMsgs.push(msg);

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[addErrorMsg] this._errorMsgs: " + this._errorMsgs);
	},

	addInfoMsg: function(msg) {
		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[addInfoMsg] msg: " + msg);

		if (!this._infoMsgs)
			this._infoMsgs = [];

		if (msg)
			this._infoMsgs.push(msg);

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[addInfoMsg] this._infoMsgs: " + this._infoMsgs);
	},

	hasErrors: function() {
		var hasErrors = this.getErrorMsgs().length > 0;

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[hasErrors] hasErrors: " + hasErrors);

		return hasErrors;
	},

	hasInfo: function() {
		var hasInfo = this.getInfoMsgs().length > 0;

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[hasInfo] hasInfo: " + hasInfo);

		return hasInfo;
	},

	getInfoMsgs: function() {
		return this._infoMsgs ? this._infoMsgs : [];
	},

	getErrorMsgs: function() {
		return this._errorMsgs ? this._errorMsgs : [];
	},

	setCI: function(cmdbCiSysId) {
		cmdbCiSysId = cmdbCiSysId + "";

		if (!cmdbCiSysId)
			return this;

		var ge = this.getCI();
		if (ge !== null)
			ge.setValue(cmdbCiSysId);

		return this;
	},
	
	setChange: function(changeSysId) {
		changeSysId = changeSysId + "";
		if (changeSysId)
			this._gr.task = changeSysId;
		return this;
	},

	toString: function() {
		return JSON.stringify(this.toJS());
	},

	toJS: function() {
		return ChangeCommon.toJS(this._gr);
	},

	deleteRecord: ChangeCommon.methods.deleteRecord,

	refreshGlideRecord: ChangeCommon.methods.refreshGlideRecord,

	getGlideRecord: ChangeCommon.methods.getGlideRecord,

	setValue: ChangeCommon.methods.setValue,

	setValues: ChangeCommon.methods.setValues,

	canWriteTo: ChangeCommon.methods.canWriteTo,

	type: "ChangeCIAssociationSNC"
};

```