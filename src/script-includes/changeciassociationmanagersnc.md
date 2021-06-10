---
title: "ChangeCIAssociationManagerSNC"
id: "changeciassociationmanagersnc"
---

API Name: global.ChangeCIAssociationManagerSNC

```js
var ChangeCIAssociationManagerSNC = Class.create();
ChangeCIAssociationManagerSNC.prototype = {

	initialize: function(changeRequest, chgMgtWorker) {
		this._log = new GSLog(ChangeCommon.LOG_PROPERTY, this.type);

		if (typeof changeRequest === "string")
			this.setChangeSysId(changeRequest);
		else if (changeRequest && typeof changeRequest.instanceOf === "function" && changeRequest.instanceOf(global.ChangeRequest.CHANGE))
			this._gr = changeRequest;

		if (chgMgtWorker)
			this.setChgMgtWorker(chgMgtWorker);

		// Verify that the change request passed in matches the chgMgtWorker change request
		if (this._gr && this._chgMgtWorker) {
			var request = this.getChgMgtWorker().getValue("request");
			var changeSysId = this._gr.getUniqueValue();
			var chgMgtWorkChangeSysId = request.task + "";
			if (changeSysId !== chgMgtWorkChangeSysId)
				this._log.error("[create] changeSysId: " + changeSysId + " does not match chgMgtWorkChangeSysId: " + chgMgtWorkChangeSysId);
		}
	},

	create: function(cmdbCiSysIds, associationType, fieldValues) {
		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[create] associationType: " + associationType + " cmdbCiSysIds: " + cmdbCiSysIds);

		// default association type is AFFECTED CIs
		associationType = (associationType + "").toLowerCase();
		if (!associationType || (associationType !== ChangeCIAssociation.AFFECTED && associationType !== ChangeCIAssociation.IMPACTED  && associationType !== ChangeCIAssociation.OFFERING))
			associationType = ChangeCIAssociation.AFFECTED;

		//Validate that if the type is Service Offering that the plugin is installed.
		if (associationType === ChangeCIAssociation.OFFERING && !GlidePluginManager.isActive(new global.ChangeUtils().PLUGIN_SPM)) {
			this.getChgMgtWorker().addErrorMsg(gs.getMessage("Association of type: {0} is invalid as the plugin Service PortFolio Management - Core is not installed.", [associationType]));
			return this;
		}

		var _fieldValues = {};

		if (fieldValues) {
			_fieldValues = global.ChangeCommon.assign({}, fieldValues);

			// remove all required|option parameters
			delete _fieldValues.association_type;
			delete _fieldValues.cmdb_ci_sys_ids;
			delete _fieldValues.refresh_impacted_services;
		}

		if (!cmdbCiSysIds) {
			if (this.getChgMgtWorker())
				this.getChgMgtWorker().addErrorMsg(gs.getMessage("List of Configuration Item ids not provided"));

			return this;
		}

		if (typeof cmdbCiSysIds === "string")
			cmdbCiSysIds = cmdbCiSysIds.split(",");

		var cleanCmdbCiSysIds = [];
		if (Array.isArray(cmdbCiSysIds)) {
			// remove duplicates
			var uniqueCmdbCiSysIds = cmdbCiSysIds.filter(global.ChangeCommon.filters.unique);

			// Collect the garbage
			this.addIgnoredCmdbCiSysIds(uniqueCmdbCiSysIds.filter(function(sysId) { return !global.ChangeCommon.filters.sysId(sysId); }));

			// retain only well formatted sys ids
			cleanCmdbCiSysIds = uniqueCmdbCiSysIds.filter(global.ChangeCommon.filters.sysId);
		}

		if (cleanCmdbCiSysIds.length === 0) {
			if (this.getChgMgtWorker())
				this.getChgMgtWorker().addErrorMsg(gs.getMessage("No well formatted Configuration Item ids not provided"));

			return this;
		}

		var changeSysId = "";
		if (this._gr)
			changeSysId = this._gr.getUniqueValue();

		if (!changeSysId && this.getChgMgtWorker()) {
			var request = this.getChgMgtWorker().getValue("request");
			var chgRequestGr = new GlideRecordSecure(global.ChangeRequest.CHANGE_REQUEST);
			if (request && request.task && chgRequestGr.get(request.task)) {
				this._gr = chgRequestGr;
				changeSysId = this._gr.getUniqueValue();
			}
		}

		if (!changeSysId) {
			if (this.getChgMgtWorker())
				this.getChgMgtWorker().addErrorMsg(gs.getMessage("No valid Change Request provided"));

			return this;
		}

		// Create an association per cmdbCiSysId
		cleanCmdbCiSysIds.forEach(function(cmdbCiSysId) {

			var changeAssocGr = null;
			if (associationType === ChangeCIAssociation.AFFECTED)
				changeAssocGr = new GlideRecord(ChangeCIAssociation.TASK_CI);
			else if (associationType === ChangeCIAssociation.IMPACTED)
				changeAssocGr = new GlideRecord(ChangeCIAssociation.TASK_CMDB_CI_SERVICE);
			else if (associationType === ChangeCIAssociation.OFFERING)
				changeAssocGr = new GlideRecord(ChangeCIAssociation.TASK_SERVICE_OFFERING);

			if (!changeAssocGr && this.getChgMgtWorker())
				this.getChgMgtWorker().addErrorMsg(gs.getMessage("No valid Change Request association type"));

			var changeCIAssociation = new ChangeCIAssociation(changeAssocGr).setChange(changeSysId).setCI(cmdbCiSysId);
			var fields = null;
			if (_fieldValues)
				fields = changeCIAssociation.setValues(_fieldValues);

			if (!changeCIAssociation.hasValidCI())
				this.addIgnoredCmdbCiSysIds(changeCIAssociation.getCI() + "");
			else
				changeCIAssociation.insert();

			if (changeCIAssociation && this.getChgMgtWorker()) {
				if (changeCIAssociation.hasErrors())
					this.getChgMgtWorker().addErrorMsg(changeCIAssociation.getErrorMsgs());

				if (fields.ignored && fields.ignored.length > 0)
					changeCIAssociation.addInfoMsg(gs.getMessage("Fields ignored: {0}", [fields.ignored.join(",")]));

				if (changeCIAssociation.hasInfo())
					this.getChgMgtWorker().addInfoMsg(changeCIAssociation.getInfoMsgs());
			}
		}, this);

		return this;
	},

	refreshImpactedServices: function() {
		var runRefresh = false;
		if (this._gr && this.getChgMgtWorker() &&
			(this.getChgMgtWorker().getRequestParam("association_type") === ChangeCIAssociation.AFFECTED || this.getChgMgtWorker().getGlideRecord().getValue("operation") === ChangeManagementWorker.REFRESH))
			runRefresh = true;

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[refreshImpactedServices] runRefresh: " + runRefresh);

		if (runRefresh)
			new global.ChangeUtils().refreshImpactedServices(this._gr, false);

		return this;
	},

	setChgMgtWorker: ChangeManagementWorkerSNC.methods.setChgMgtWorker,

	getChgMgtWorker: ChangeManagementWorkerSNC.methods.getChgMgtWorker,

	setChangeSysId: function(changeSysId) {
		if (!changeSysId)
			return this;

		var changeRequestGr = new GlideRecordSecure(global.ChangeRequest.CHANGE_REQUEST);
		changeRequestGr.addQuery("sys_id", changeSysId);
		changeRequestGr.query();
		if (changeRequestGr.next())
			this._gr = changeRequestGr;

		return this;
	},

	addIgnoredCmdbCiSysIds: function(cmdbCiSysIds) {
		this._ignoredCmdbCiSysIds = this._ignoredCmdbCiSysIds ? this._ignoredCmdbCiSysIds : [];
		if (cmdbCiSysIds) {
			if (typeof cmdbCiSysIds === "string")
				cmdbCiSysIds = cmdbCiSysIds.split(",");
			this._ignoredCmdbCiSysIds = this._ignoredCmdbCiSysIds.concat(cmdbCiSysIds);
		}

		if (this.getChgMgtWorker()) {
			var ignoredCmdbCis = this.getChgMgtWorker().getResponseParam(global.ChangeCIAssociation.IGNORED_CMDB_CI_SYS_IDS) || [];

			if (this._log.atLevel(GSLog.DEBUG))
				this._log.debug("[addIgnoredCmdbCiSysIds] ignoredCmdbCis: " + ignoredCmdbCis);

			this._ignoredCmdbCiSysIds = ignoredCmdbCis.concat(this._ignoredCmdbCiSysIds).filter(global.ChangeCommon.filters.unique);
			this.getChgMgtWorker().setResponseParam(global.ChangeCIAssociation.IGNORED_CMDB_CI_SYS_IDS, this._ignoredCmdbCiSysIds).update();
		}

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[addIgnoredCmdbCiSysIds] ignoredCmdbCiSysIds: " + this._ignoredCmdbCiSysIds);

		return this;
	},

	type: "ChangeCIAssociationManagerSNC"
};
```