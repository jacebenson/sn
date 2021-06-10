---
title: "OnCallScheduleSpanSNC"
id: "oncallschedulespansnc"
---

API Name: global.OnCallScheduleSpanSNC

```js
var OnCallScheduleSpanSNC = Class.create();
OnCallScheduleSpanSNC.prototype = {
	initialize: function (_gr) {
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

	getAllDay: function () {
		return this._allDay;
	},

	setAllDay: function (allDay) {
		this._allDay = allDay;
	},

	getDaysOfWeek: function () {
		return this._daysOfWeek;
	},

	setDaysOfWeek: function (daysOfWeek) {
		this._daysOfWeek = daysOfWeek;
	},

	getEndDate: function () {
		return this._endDate;
	},

	setEndDate: function (endDate) {
		this._endDate = endDate;
	},

	getRepeatUntil: function () {
		return this._repeatUntil;
	},

	setRepeatUntil: function (repeatUntil) {
		this._repeatUntil = repeatUntil;
	},

	getName: function () {
		return this._name;
	},

	setName: function (name) {
		this._name = name;
	},

	getRepeatCount: function () {
		return this._repeatCount;
	},

	setRepeatCount: function (repeatCount) {
		this._repeatCount = repeatCount;
	},

	getRepeatType: function () {
		return this._repeatType;
	},

	setRepeatType: function (repeatType) {
		this._repeatType = repeatType;
	},

	getSchedule: function () {
		return this._schedule;
	},

	setSchedule: function (schedule) {
		this._schedule = schedule;
	},

	getShowAs: function () {
		return this._showAs;
	},

	setShowAs: function (showAs) {
		this._showAs = showAs;
	},

	getStartDate: function () {
		return this._startDate;
	},

	setStartDate: function (startDate) {
		this._startDate = startDate;
	},

	getType: function () {
		return this._type;
	},

	setType: function (type) {
		this._type = type;
	},

	getGr: function () {
		return this._gr;
	},

	getTableName: function () {
		return "cmn_schedule_span";
	},

	create: function() {
		this._populateGr();
		this._sys_id = this._gr.insert() + "";
		return this._sys_id;
	},

	update: function() {
		this._populateGr();
		return this._gr.update();
	},

	_populateGr: function() {
		this._gr.setValue("all_day", this._allDay);
		this._gr.setValue("name", this._name);
		this._gr.setValue("type", this._type);
		this._gr.setValue("days_of_week", this._daysOfWeek);
		this._gr.setValue("end_date_time", this._endDate);
		this._gr.setValue("monthly_type", this._monthlyType);
		this._gr.setValue("repeat_count", this._repeatCount);
		this._gr.setValue("repeat_type", this._repeatType);
		this._gr.setValue("repeat_until", this._repeatUntil);
		this._gr.setValue("schedule", this._schedule);
		this._gr.setValue("show_as", this._showAs);
		this._gr.setValue("start_date_time", this._startDate);
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
			this._allDay = this._gr.all_day + "" === "true" ? true : false;
			this._daysOfWeek = this._gr.days_of_week + "";
			this._endDate = this._gr.end_date_time + "";
			this._monthlyType = this._gr.monthly_type + "";
			this._name = this._gr.name + "";
			this._repeatCount = parseInt(this._gr.repeat_count + "");
			this._repeatType = this._gr.repeat_type + "";
			this._repeatUntil = this._gr.repeat_until + "";
			this._schedule = this._gr.schedule + "";
			this._showAs = this._gr.show_as + "";
			this._startDate = this._gr.start_date_time + "";
			this._type = this._gr.type + "";
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

		this._allDay = false;
		this._daysOfWeek = "";
		this._endDate = "";
		this._monthlyType = "";
		this._name = "";
		this._repeatCount = 0;
		this._repeatType = "";
		this._repeatUntil = "";
		this._schedule = "";
		this._showAs = "";
		this._startDate = "";
		this._type = "";
		this._gr = new GlideRecord(this.getTableName());
	},

	toString: function() {
		return this.type;
	},

	type: 'OnCallScheduleSpanSNC'
};

```