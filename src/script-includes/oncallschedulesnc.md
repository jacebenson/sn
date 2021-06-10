---
title: "OnCallScheduleSNC"
id: "oncallschedulesnc"
---

API Name: global.OnCallScheduleSNC

```js
var OnCallScheduleSNC = Class.create();
OnCallScheduleSNC.prototype = {
	initialize: function(_gr) {
		this._log = new GSLog("com.snc.on_call_rotation.log.level", this.type);
		if (!_gr)
			this._initEmpty();
		else if (typeof _gr === "string")
			this._initFromSysId(_gr);
		else
			this._initFromGr(_gr);
	},

	getId: function () {
		return this._sys_id;
	},

	setId: function (sys_id) {
		this._sys_id = sys_id;
	},

	getGr: function() {
		return this._gr;
	},

	getTableName: function() {
		return "cmn_schedule";
	},

	getName: function() {
		return this._name;
	},

	setName: function(name) {
		this._name = name;
	},

	getTimezone: function() {
		return this._timezone;
	},

	setTimezone: function(timezone) {
		this._timezone = timezone;
	},

	getType: function() {
		return this._type;
	},

	setType: function(type) {
		this._type = type;
	},

	getDocument: function() {
		return this._document;
	},

	setDocument: function(document) {
		this._document = document;
	},

	getDocumentKey: function() {
		return this._documentKey;
	},

	setDocumentKey: function(documentKey) {
		this._documentKey = documentKey;
	},

	getParent: function() {
		return this._parent;
	},

	setParent: function(parent) {
		this._parent = parent;
	},

	getReadOnly: function() {
		return this._readOnly;
	},

	setReadOnly: function(readOnly) {
		this._readOnly = readOnly;
	},

	create: function(isWorkflow) {
		isWorkflow = isWorkflow + "" === "false" ? false : true;
		this._populateGr();
		this._gr.setWorflow(isWorkflow);
		this._sys_id = this._gr.insert() + "";
		return this._sys_id;
	},

	update: function(isWorkflow) {
		isWorkflow = isWorkflow + "" === "false" ? false : true;
		this._gr.setWorflow(isWorkflow);
		this._populateGr();
		return this._gr.update();
	},

	_populateGr: function() {
		this._gr.setValue("name", this._name);
		this._gr.setValue("time_zone", this._timezone);
		this._gr.setValue("type", this._type);
		this._gr.setValue("document", this._document);
		this._gr.setValue("document_key", this._documentKey);
		this._gr.setValue("parent", this._parent);
		this._gr.setValue("read_only", this._readOnly);
	},

	_initFromSysId: function(sysId) {
		sysId = sysId || "";

		if (this._log.atLevel(GSLog.DEBUG))
				this._log.debug("[_initFromSysId] sysId: " + sysId);

		var gr = new GlideRecord(this.getTableName());
		if (!sysId || !gr.get(sysId))
			this._initEmpty();
		else {
			this._gr = gr;
			this._sys_id = this._gr.sys_id + "";
			this._name = this._gr.name + "";
			this._timezone = this._gr.time_zone + "";
			this._type = this._gr.type + "";
			this._document = this._gr.document + "";
			this._documentKey = this._gr.document_key + "";
			this._parent = this._gr.parent + "";
			this._readOnly = this._gr.read_only + "" === "true" ? true : false;
			this._sys_id = this._gr.sys_id + "";
		}
	},

	_initFromGr: function(gr) {
		if (!gr)
			this._log.error("[_initFromGr] called invalid gliderecord");
		else
			this._initFromSysId(gr.sys_id + "");
	},

	_initEmpty: function() {
		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_initEmpty] create empty: " + this.type);

		this._name = "";
		this._timezone = "";
		this._type = "";
		this._document = "";
		this._documentKey = "";
		this._parent = "";
		this._readOnly = true;
		this._gr = new GlideRecord(this.getTableName());
	},

	toString: function() {
		return this.type;
	},

	type: 'OnCallScheduleSNC'
};

```