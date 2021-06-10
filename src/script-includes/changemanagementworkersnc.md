---
title: "ChangeManagementWorkerSNC"
id: "changemanagementworkersnc"
---

API Name: global.ChangeManagementWorkerSNC

```js
var ChangeManagementWorkerSNC = Class.create();

// Table names
ChangeManagementWorkerSNC.CHG_MGT_WORKER = "chg_mgt_worker";

// Status
ChangeManagementWorkerSNC.WAITING = 1;
ChangeManagementWorkerSNC.IN_PROGRESS = 2;
ChangeManagementWorkerSNC.COMPLETE = 3;
ChangeManagementWorkerSNC.ERROR = 4;

// Operation
ChangeManagementWorkerSNC.CREATE = "CREATE";
ChangeManagementWorkerSNC.DELETE = "DELETE";
ChangeManagementWorkerSNC.REFRESH = "REFRESH";

// Event
ChangeManagementWorkerSNC.SN_CHG_MGT = "sn_chg_mgt";

// REST enpoint
ChangeManagementWorkerSNC.SN_CHG_REST = "sn_chg_rest";

ChangeManagementWorkerSNC.prototype = {

	initialize: function(chgMgtWorkerGr) {
		this._log = new GSLog(ChangeCommon.LOG_PROPERTY, this.type);
		if (chgMgtWorkerGr)
			this._gr = chgMgtWorkerGr;
	},

	create: function(nameValuePairs) {
		this._initGr(ChangeManagementWorker.CREATE);

		if (!this._gr.canWrite())
			this.setError(gs.getMessage("Insufficient access to create the change management worker"));
		else if (nameValuePairs) {
			this._gr.request = JSON.stringify(nameValuePairs);
			this._gr.type = nameValuePairs.association_type ? nameValuePairs.association_type + "" : "";
			if (!this._gr.type)
				this.setError(gs.getMessage("No association type to create association between Change Request and CI/Business Service provided"));
		} else
			this.setError(gs.getMessage("No parameters passed to create association between Change Request and CI/Business Service"));

		this._initResponse();

		return this;
	},

	run: function(nameValuePairs) {
		this._initGr(ChangeManagementWorker.REFRESH);

		if (!this._gr.canWrite())
			this.setError(gs.getMessage("Insufficient access to create the change management worker"));
		else if (nameValuePairs) {
			this._gr.request = JSON.stringify(nameValuePairs);
			this._gr.type = "impacted";
			if (!this._gr.type)
				this.setError(gs.getMessage("No Change Request process provided"));
		} else
			this.setError(gs.getMessage("No parameters passed to run refresh impacted services"));

		this._initResponse();

		return this;
	},

	getRequestParam: function(key) {
		return this._getParam("request", key);
	},

	getResponseParam: function(key) {
		return this._getParam("response", key);
	},

	setResponseParam: function(key, value) {
		if (!key || !value)
			return this;

		var response = this.getValue("response");
		if (!response)
			return this;

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[setResponseParam] key: " + key + " value: " + value);

		response[key] = value;
		return this._setResponse(response);
	},

	addErrorMsg: function(msg) {
		this._addMsg(msg, "errorMessages").update();
		return this;
	},

	addWarningMsg: function(msg) {
		this._addMsg(msg, "warningMessages").update();
		return this;
	},

	addInfoMsg: function(msg) {
		this._addMsg(msg, "infoMessages").update();
		return this;
	},

	getErrorMsgs: function() {
		return this._getMsgs("errorMessages");
	},

	getWarningMsg: function() {
		return this._getMsgs("warningMessages");
	},

	getInfoMsg: function() {
		return this._getMsgs("infoMessages");
	},

	isWaiting: function() {
		return this._gr && parseInt(this._gr.state) === ChangeManagementWorker.WAITING ? true : false;
	},

	setInProgress: function() {
		var state = this.getState();
		if (state === ChangeManagementWorker.WAITING)
			this._setState(ChangeManagementWorker.IN_PROGRESS);
		return this;
	},

	inProgress: function() {
		this.setInProgress().update();
		return this;
	},

	setComplete: function() {
		var state = this.getState();
		if (state === ChangeManagementWorker.IN_PROGRESS)
			this._setState(ChangeManagementWorker.COMPLETE);
		return this;
	},

	complete: function() {
		this.setComplete().update();
		return this;
	},

	setError: function(msg) {
		this._setState(ChangeManagementWorker.ERROR);
		if (msg)
			this.addErrorMsg(msg);
		return this;
	},

	getState: function() {
		if (!this._gr || !this._gr.state)
			return ChangeManagementWorker.ERROR;

		var state = parseInt(this._gr.state);

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[getState] state: " + state);

		return state;
	},

	toString: function() {
		return JSON.stringify(this.toJS());
	},

	toJS: function() {
		return this.getValue("response");
	},

	getValue: function(name) {
		name = (name + "").toLowerCase();
		if (!name || !this._gr)
			return null;

		if (this._gr && (name === "request" || name === "response"))
			return JSON.parse(this._gr.getValue(name));

		return this._gr.getValue(name)
	},

	insert: ChangeCommon.methods.insert,

	update: ChangeCommon.methods.update,

	deleteRecord: ChangeCommon.methods.deleteRecord,

	refreshGlideRecord: ChangeCommon.methods.refreshGlideRecord,

	getGlideRecord: ChangeCommon.methods.getGlideRecord,

	setValue: ChangeCommon.methods.setValue,

	setValues: ChangeCommon.methods.setValues,

	canWriteTo: ChangeCommon.methods.canWriteTo,

	_initGr: function(operation) {
		this._gr = new GlideRecord(ChangeManagementWorker.CHG_MGT_WORKER);
		this._gr.operation = operation + "";
		this._setResponse({
			worker: {
				sysId: "",
				link: ""
			},
			request: "",
			state: {
				value: ChangeManagementWorker.WAITING,
				display_value: this._getStateLabel(ChangeManagementWorker.WAITING)
			},
			type: "",
			messages: {
				errorMessages: [],
				warningMessages: [],
				infoMessages: []
			},
		});
	},

	_getStateLabel: function(value) {
		value = isNaN(value) ? 0 : value - 1;
		var choiceList = GlideChoiceList.getChoiceList(ChangeManagementWorker.CHG_MGT_WORKER, "state");
		if (choiceList)
			return choiceList.getChoice(value).getLabel();

		return "";
	},

	_initResponse: function() {
		var response = this.getValue("response");
		response.worker.sysId = this.insert();
		if (response.worker.sysId)
			response.worker.link = gs.getProperty("glide.servlet.uri", "<INSTANCE URI>") + "api/" + ChangeManagementWorker.SN_CHG_REST + "/change/worker/" + response.worker.sysId;
		response.type = this._gr.type + "";
		response.request = this._gr.request + "";
		this._setResponse(response).update();
	},

	_getParam: function(name, key) {
		if (!name || !key || !this._gr)
			return null;

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_getParam] name: " + name + " key: " + key);

		var obj = this.getValue(name);
		if (!obj)
			return null;

		return obj[key];
	},

	_setResponse: function(response) {
		if (this._gr)
			this._gr.response = JSON.stringify(response);
		return this;
	},

	_addMsg: function(msg, msgType) {
		if (!msg || !msgType || !this._gr || !this._gr.response)
			return this;

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_addMsg] msgType: " + msgType + " msg: " + msg);

		var response = this.getValue("response");
		if (!response || !response.messages)
			return this;

		if (Array.isArray(msg))
			msg.forEach(function(m) { response.messages[msgType].push(m); }, this);
		else
			response.messages[msgType].push(msg);

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_addMsg] messages: " + response.messages[msgType]);

		return this._setResponse(response);
	},

	_setResponseState: function(state) {
		if (!this._gr || !state || (state !== ChangeManagementWorker.WAITING && state !== ChangeManagementWorker.IN_PROGRESS && state !== ChangeManagementWorker.COMPLETE && state !== ChangeManagementWorker.ERROR))
			return;

		var response = this.getValue("response");
		if (!response)
			return;

		response.state = {
			value: state,
			display_value: this._getStateLabel(state)
		};

		return this._setResponse(response);
	},

	_setState: function(state) {
		if (!this._gr || !state || (state !== ChangeManagementWorker.WAITING && state !== ChangeManagementWorker.IN_PROGRESS && state !== ChangeManagementWorker.COMPLETE && state !== ChangeManagementWorker.ERROR))
			return;

		this._gr.state = state;

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_setState] state: " + this._gr.state);

		this._setResponseState(state);
	},

	_getMsgs: function(msgType) {
		var response = this.getValue("response");
		if (!response || !msgType || !response.messages[msgType])
			return [];

		return response.messages[msgType];
	},

	type: "ChangeManagementWorkerSNC"
};

ChangeManagementWorkerSNC.methods = {

	setChgMgtWorker: function(chgMgtWorker) {
		if (!chgMgtWorker)
			return this;

		if (typeof chgMgtWorker === "string") {
			var chgMgtWorkerGr = new GlideRecord(global.ChangeManagementWorker.CHG_MGT_WORKER);
			if (chgMgtWorkerGr.get(chgMgtWorkerSysId))
				this._chgMgtWorker = new global.ChangeManagementWorker(chgMgtWorkerGr);
		} else if (typeof chgMgtWorker === "object" && typeof chgMgtWorker.instanceOf === "function" && chgMgtWorker.instanceOf(global.ChangeManagementWorker.CHG_MGT_WORKER))
			this._chgMgtWorker = new global.ChangeManagementWorker(chgMgtWorker);
		else
			this._chgMgtWorker = chgMgtWorker;

		return this;
	},

	getChgMgtWorker: function(chgMgtWorkerSysId) {
		if (!chgMgtWorkerSysId && !this._chgMgtWorker)
			return null;

		if (chgMgtWorkerSysId && !this._chgMgtWorker)
			this.setChgMgtWorker(chgMgtWorkerSysId);

		if (this._chgMgtWorker)
			return this._chgMgtWorker;
		else
			return null;
	}

};


```