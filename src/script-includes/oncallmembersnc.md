---
title: "OnCallMemberSNC"
id: "oncallmembersnc"
---

API Name: global.OnCallMemberSNC

```js
var OnCallMemberSNC = Class.create();
OnCallMemberSNC.prototype = {
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

	getGr: function() {
		return this._gr;
	},

	getTableName: function() {
		return "cmn_rota_member";
	},

	getEndDate: function() {
		if (!this._gr.isValidField("to"))
			return null;

		var to = this._gr.to + "";
		if (!to)
			return null;

		var endGdt = new GlideDateTime();
		endGdt.setValue(to);

		var roster = new OnCallRoster(this._rosterSysId);
		var days = roster.getNumberOfDaysTillNextRotation(endGdt, true);
		endGdt.addDaysUTC(parseInt(days));

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[getEndDate] endDate: " + endGdt);

		return endGdt;
	},

	getDomain: function() {
		return this._domain;
	},

	setDomain: function(domain) {
		this._domain = domain;
	},

	getRosterId: function() {
		return this._rosterSysId;
	},

	setRosterId: function(rosterSysId) {
		this._rosterSysId = rosterSysId;
	},

	getMemberId: function() {
		return this._memberSysId;
	},

	setMemberId: function(memberSysId) {
		this._memberSysId = memberSysId;
	},

	getRotationScheduleId: function() {
		return this._rotationScheduleSysId;
	},

	setRotationScheduleId: function(rotationScheduleSysId) {
		this._rotationScheduleSysId = rotationScheduleSysId;
	},

	getOrder: function() {
		return this._order;
	},

	setOrder: function(order) {
		this._order = order;
	},

	getFrom: function() {
		return this._from;
	},

	setFrom: function(from) {
		if (from && from.indexOf("-") === -1 && from.length === 8)
			from = from.substring(0, 4) + "-" + from.substring(4, 6) + "-" + from.substring(6, 8);
		this._from = from;

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[setFrom] from: " + this._from);
	},

	getTo: function() {
		return this._to;
	},

	setTo: function(to) {
		this._to = to;
	},

	getGroupDomain: function() {
		var domain = GlideDomainSupport.getCurrentDomainValueOrGlobal();
		if (!this._rosterSysId)
			return domain;

		var rosterGr = new GlideRecord("cmn_rota_roster");
		if (!rosterGr.get(this._rosterSysId))
			return domain;

		var rotaGr = new GlideRecord("cmn_rota");
		if (!rotaGr.get(rosterGr.rota + ""))
			return domain;

		var groupGr = new GlideRecord("sys_user_group");
		if (!groupGr.get(rotaGr.group + ""))
			return domain;

		if (groupGr.isValidField("sys_domain")) {
			var domainFromGroup = groupGr.sys_domain + "";
			if (domainFromGroup && domainFromGroup !== "undefined")
				domain = domainFromGroup;
		}
		return domain;
	},

	create: function(enableWorkFlow) {
		enableWorkFlow = enableWorkFlow + "" === "false" ? false : true;
		this._gr = new GlideRecord(this.getTableName());
		this._gr.setWorkFlow(enableWorkFlow);
		this._populateGr();
		this._sys_id = this._gr.insert() + "";

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[create] enableWorkFlow: " + enableWorkFlow + " called on record: " + this._sys_id);

		return this._sys_id;
	},

	update: function(enableWorkFlow) {
		var updated = false;
		if (!this._gr) {
			this._log.error("[update] called on cmn_rota_member that is NOT in database: " + this.toString());
			return updated;
		}

		enableWorkFlow = enableWorkFlow + "" === "false" ? false : true;
		this._gr.setWorkFlow(enableWorkFlow);
		this._populateGr();
		if (this._sys_id === this._gr.sys_id + "")
			updated = this._gr.update() + "" ? true : false;
		else
			if (this._log.atLevel(GSLog.DEBUG))
				this._log.debug("[update] expected sys_id: " + this._sys_id + " actual sys_id: " + this._gr.sys_id);

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[update] updated: " + updated + " enableWorkFlow: " + enableWorkFlow + " member: " + this.toString());

		return updated;
	},

	toString: function() {
		return "sys_id: " + this._sys_id + " sys_domain: " + this._domain + " rosterSysId: " + this._rosterSysId + " memberSysId: " + this._memberSysId +
			" rotation_schedule: " + this._rotationScheduleSysId + " order: " + this._order + " from: " + this._from +
			" to: " + this._to;
	},

	_populateGr: function() {
		this._domain = this.getGroupDomain();
		this._gr.setValue("sys_domain", this._domain);
		this._gr.setValue("roster", this._rosterSysId);
		this._gr.setValue("member", this._memberSysId);
		this._gr.setValue("rotation_schedule", this._rotationScheduleSysId);
		this._gr.setValue("order", this._order);
		this._gr.setValue("from", this._from);
		this._gr.setValue("to", this._to);
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
			this._rosterSysId = this._gr.roster + "";
			this._memberSysId = this._gr.member + "";
			this._rotationScheduleSysId = this._gr.rotation_schedule + "";
			this._order = parseInt(this._gr.order + "");
			this._from = this._gr.from + "";
			this._to = this._gr.to + "";
			this._domain = this.getGroupDomain();
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

		this._rosterSysId = "";
		this._memberSysId = "";
		this._rotationScheduleSysId = "";
		this._order = 0;
		this._from = "";
		this._to = "";
		this._sys_id = "";
	},

	type: 'OnCallMemberSNC'
};

```