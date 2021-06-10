---
title: "ChangeManagementEventHandlerSNC"
id: "changemanagementeventhandlersnc"
---

API Name: global.ChangeManagementEventHandlerSNC

```js
var ChangeManagementEventHandlerSNC = Class.create();

ChangeManagementEventHandlerSNC.AFFECTED_CREATE = "sn_chg_mgt.affected.CREATE";
ChangeManagementEventHandlerSNC.IMPACTED_CREATE = "sn_chg_mgt.impacted.CREATE";
ChangeManagementEventHandlerSNC.OFFERING_CREATE = "sn_chg_mgt.offering.CREATE";
ChangeManagementEventHandlerSNC.IMPACTED_SERVICES_REFRESH = "sn_chg_mgt.impacted.REFRESH";

ChangeManagementEventHandlerSNC.prototype = {

	initialize: function(chgMgtWorkerGr) {
		this._log = new GSLog(ChangeCommon.LOG_PROPERTY, this.type);
		if (chgMgtWorkerGr)
			this._chgMgtWorker = new global.ChangeManagementWorker(chgMgtWorkerGr);
	},

	/**
	* Handle chgMgt events e.g. sn_chg_mgt.affected.CREATE
	*
	* event.name sn_chg_mgt.<association_type>.<operation>
	* event.parm1 - chg_mgt_worker.sys_id
	* event.parm2 - chg_mgt_worker.request
	*/
	process: function(event) {
		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[process] event: " + JSON.stringify(event));


		var chgMgtWorkerSysId = event.parm1;
		if (!this._chgMgtWorker && chgMgtWorkerSysId)
			this.setChgMgtWorker(chgMgtWorkerSysId);

		if (!this._chgMgtWorker)
			return;

		if (!this._chgMgtWorker.isWaiting())
			return;

		this._chgMgtWorker.inProgress();

		var nameValuePairs = JSON.parse(event.parm2);
		var eventName = event.name + "";
		var hasDataEnforcement = gs.getProperty(ChangeRequestSNC.ENFORCE_DATA_REQ_PROP) === "true";

		// To collect interactive messages isInteractive based on property
		GlideSession.get().setInteractive(hasDataEnforcement);

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[process] hasDataEnforcement: " + hasDataEnforcement + " isInteractiveSession: " + gs.isInteractiveSession());

		// All functions here should hand off to their own Script Include
		switch(eventName) {
			// Always run complete UNLESS you wish to run secondary async process (and handle your own complete)
			case ChangeManagementEventHandler.AFFECTED_CREATE:
				var affectedCIAssociationManager = new global.ChangeCIAssociationManager(nameValuePairs.task + "", this._chgMgtWorker);
				affectedCIAssociationManager.create(nameValuePairs.cmdb_ci_sys_ids, global.ChangeCIAssociation.AFFECTED, nameValuePairs);
				if ((nameValuePairs.refresh_impacted_services + "").toLowerCase() === "true")
					affectedCIAssociationManager.refreshImpactedServices();
				this._collectMsgType("error");
				this._collectMsgType("info");
				this._chgMgtWorker.complete();
				break;
			case ChangeManagementEventHandler.IMPACTED_CREATE:
				var impactedCIAssociationManager = new global.ChangeCIAssociationManager(nameValuePairs.task + "", this._chgMgtWorker);
				impactedCIAssociationManager.create(nameValuePairs.cmdb_ci_sys_ids, ChangeCIAssociation.IMPACTED, nameValuePairs);
				this._collectMsgType("error");
				this._collectMsgType("info");
				this._chgMgtWorker.complete();
				break;
			case ChangeManagementEventHandler.OFFERING_CREATE:
				var offeringAssociationManager = new global.ChangeCIAssociationManager(nameValuePairs.task + "", this._chgMgtWorker);
				offeringAssociationManager.create(nameValuePairs.cmdb_ci_sys_ids, ChangeCIAssociation.OFFERING, nameValuePairs);
				this._collectMsgType("error");
				this._collectMsgType("info");
				this._chgMgtWorker.complete();
				break;
			case ChangeManagementEventHandler.IMPACTED_SERVICES_REFRESH:
				new global.ChangeCIAssociationManager(nameValuePairs.task + "", this._chgMgtWorker).refreshImpactedServices();
				this._collectMsgType("error");
				this._collectMsgType("info");
				this._chgMgtWorker.complete();
				break;
			case ChangeManagementWorker.DELETE:
				// code block
				this._chgMgtWorker.complete();
				break;
			default:
				this._chgMgtWorker.addErrorMsg(gs.getMessage("No event handler logic found for event: {0}", [eventName]));
				this._chgMgtWorker.complete();
		}
	},

	setChgMgtWorker: ChangeManagementWorkerSNC.methods.setChgMgtWorker,

	getChgMgtWorker: ChangeManagementWorkerSNC.methods.getChgMgtWorker,

	_collectMsgType: function(type) {
		type = type + "";
		var msg = "";
		var msgs;

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_collectMsgType] type: " + type + " isInteractiveSession: " + gs.isInteractiveSession());

		if (type === "error")
			msgs = gs.getErrorMessages();
		else if (type === "info")
			msgs = gs.getInfoMessages();
		else
			return;

		var hasMgs = msgs && typeof msgs.size === "function" ? msgs.size() > 0 : msgs.length > 0;
		if (hasMgs && type === "error") {
			msg += " " + msgs;

			if (this.getChgMgtWorker())
				this.getChgMgtWorker().addErrorMsg(msg);
		} else if (hasMgs && type === "info") {
			this._log.info("[_collectMsgType] infMessage: " + msg);

			if (this.getChgMgtWorker())
				this.getChgMgtWorker().addInfoMsg(msg);
		} else
			return;
	},

	type: "ChangeManagementEventHandlerSNC"
};

```