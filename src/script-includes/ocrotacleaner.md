---
title: "OCRotaCleaner"
id: "ocrotacleaner"
---

API Name: global.OCRotaCleaner

```js
var OCRotaCleaner = Class.create();
OCRotaCleaner.prototype = {
	initialize : function() {
		this.log = new GSLog("com.snc.on_call_rotation.log.level", this.type);
		this.log.debug("[initialize]");
	},

	/**
	 * Removes rotation records generated for the user cmn_schedule
	 * cmn_schedule_span cmn_rota_member
	 *
	 * userGR GlideRecord - sys_user record
	**/
	removeRotaMemberRecords : function(userGR) {
		var rotaMemberGR = new GlideRecord();
		rotaMemberGR.addQuery("member", userGR.getUniqueValue());
		rotaMemberGR.query();
		while (rotaMemberGR.next()) {
			var rotaMemberName = rotaMemberGR.getDisplayValue("member");
			var rotaMemberSysId = rotaMemberGR.getValue("member");
			var rotaMemberScheduleSysId = rotaMemberGR.getValue("rotation_schedule");
			this.log.debug("[rotaMemberGR] Member: " + rotaMemberName + " | Sys_id: " + rotaMemberSysId);
			var scheduleGR = new GlideRecord("cmn_schedule");
			if (scheduleGR.get(rotaMemberScheduleSysId))
				scheduleGR.deleteRecord();
			var scheduleSpanGR = new GlideRecord("cmn_schedule_span");
			scheduleSpanGR.addQuery("schedule", rotaMemberScheduleSysId);
			scheduleSpanGR.query();
			scheduleSpanGR.deleteMultiple();
			rotaMemberGR.deleteRecord();
		}
	},

	/**
	 * Removes roster_schedule_span records generated for a group member.
	 *
	 * groupMemberGR GlideRecord - sys_user_grmember record
	**/
	removeRosterScheduleSpansByGroupMember : function(groupMemberGR, queryObj) {
		if (!groupMemberGR)
			return;
		var groupSysId = groupMemberGR.getValue("group");
		var userGR = new GlideRecord("sys_user");
		if (!userGR.get(groupMemberGR.getValue("user")))
			return;
		if (!queryObj)
			queryObj = {};
		queryObj["schedule.document"] = userGR.getTableName();
		queryObj["schedule.document_key"] = userGR.getUniqueValue();
		queryObj["group"] = groupSysId;
		var rosterScheduleSpanGR = this._getRosterScheduleSpans(userGR, queryObj);
		rosterScheduleSpanGR.deleteMultiple();
	},

	/**
	 * Removes roster_schedule_span records generated for a group member.
	 *
	 * userGR GlideRecord - sys_user record
	**/
	removeRosterScheduleSpansByUser : function(userGR, queryObj) {
		if (!queryObj)
			queryObj = {};
		queryObj["schedule.document"] = userGR.getTableName();
		queryObj["schedule.document_key"] = userGR.getUniqueValue();
		this._getRosterScheduleSpans(userGR, queryObj).deleteMultiple();
	},

	getOverridesUrl : function(userGR, queryObj) {
		if (!queryObj)
			queryObj = {};
		queryObj["schedule.document"] = userGR.getTableName();
		queryObj["schedule.document_key"] = userGR.getUniqueValue();
		var rosterScheduleSpanGR = this._getRosterScheduleSpans(userGR, queryObj);
		var query = rosterScheduleSpanGR.getEncodedQuery();
		var url = new GlideURL("roster_schedule_span_list.do");
		url.set("sysparm_query", query);
		return url.toString();
	},

	/**
	 * Deactivate a cmn_schedule_span by setting to repeat_until date to date
	 * passed in, or to current date if not.
	 *
	 * dateString - in format yyyyMMdd
	**/
	deactivateScheduleSpan : function(spanSysId, dateString) {
		if (JSUtil.nil(spanSysId))
			return;
		var date = this._dateToIntegerDate(dateString);
		var gr = new GlideRecord("cmn_schedule_span");
		gr.get(spanSysId);
		gr.setValue("repeat_until", date.getValue());
		gr.update();
		this.log.debug("[deactivateScheduleSpan] spanSysId: " + spanSysId + " repeat_until: " + date.getValue());
	},

	/**
	 * Fix broken soft reference between a cmn_schedule and cmn_rota record
	 * ensure that the cmn_schedule.document=cmn_rota and ensure that the
	 * cmn_schedule.document_key=cmn_rota.sys_id
	 *
	 * rotaSysId - the sys id of the cmn_rota record to verify
	**/
	linkScheduleToRota : function(rotaSysId) {
		this.log.debug("[linkScheduleToRota] rotaSysId: " + rotaSysId);
		this._linkScheduleToRecord("schedule", "cmn_rota", rotaSysId);
	},

	/**
	 * Fix broken soft reference between a cmn_schedule and cmn_rota_member
	 * record ensure that the cmn_schedule.document=cmn_rota_member and ensure
	 * that the cmn_schedule.document_key=cmn_rota_member.sys_id
	 *
	 * rotaMemberSysId - the sys id of the cmn_rota_member record to verify
	**/
	linkScheduleToRotaMember : function(rotaMemberSysId) {
		this.log.debug("[linkScheduleToRotaMember] rotaMemberSysId: " + rotaMemberSysId);
		this._linkScheduleToRecord("rotation_schedule", "cmn_rota_member", rotaMemberSysId);
	},

	/**
	 * Gets roster_schedule_span records for a particular user.
	 *
	 * userGR GlideRecord - sys_user record queryObj Object - A mapping of field
	 * to value, used when querying roster_schedule_span table
	**/
	_getRosterScheduleSpans : function(userGR, queryObj) {
		var gr = new GlideRecord("roster_schedule_span");
		for ( var field in queryObj)
			if (queryObj.hasOwnProperty(field))
				gr.addQuery(field, queryObj[field]);
		gr.query();
		return gr;
	},

	/**
	 * Convert date string to GlideDate
	 *
	 * dateString - in format yyyymmdd (IntegerDate format)
	**/
	dateToGlideDate : function(dateString) {
		var gd = new GlideDate();
		if (!dateString)
			return gd;
		this.log.debug("[dateToGlideDate] dateString: " + dateString);
		gd.setValue(dateString.substring(0, 4) + "-" + dateString.substring(4, 6) + "-" + dateString.substring(6, 8));
		this.log.debug("[dateToGlideDate] gd: " + gd.getDisplayValue());
		return gd;
	},

	isOnOrAfterCurrentDate : function(date) {
		var currentDate = new GlideDate();
		var duration = GlideDate.subtract(currentDate, date);
		if (duration.getRoundedDayPart() > -1)
			return true;
		return false;
	},

	/**
	 * This function will delete all roster_schedule_span records end dates
	 * prior to utcDate parameter. roster_schedule_span records: PTO, Cover and
	 * Extra Coverage
	 *
	 * utcDate - in format yyyy-mm-dd hh:mm:ss e.g. "2016-01-02 00:00:00"
	**/
	deleteRosterSpansBefore : function(utcDate) {
		if (JSUtil.nil(utcDate))
			return;
		this.deleteRosterSpansById(this.getRosterSpanIdsBeforeDate(utcDate));
	},

	/**
	 * This function will return all roster_schedule_span records end dates
	 * prior to utcDate parameter. roster_schedule_span records: PTO, Cover and
	 * Extra Coverage
	 *
	 * utcDate - in format yyyy-mm-dd hh:mm:ss e.g. "2016-01-02 00:00:00"
	**/
	getRosterSpanIdsBeforeDate : function(utcDate) {
		var rosterSchedSpansSysIds = [];
		if (JSUtil.nil(utcDate))
			return rosterSchedSpansSysIds;
		var gdt = new GlideDateTime();
		gdt.setValueUTC(utcDate, "yyyy-MM-dd HH:mm:ss");
		var utcMillis = gdt.getNumericValue();
		var gr = new GlideRecord("roster_schedule_span");
		gr.query();
		while (gr.next()) {
			var sdt = new GlideScheduleDateTime();
			sdt.setValue(gr.end_date_time);
			if (sdt.getMS() < utcMillis)
				rosterSchedSpansSysIds.push(gr.getValue("sys_id"));
		}
		return rosterSchedSpansSysIds;
	},

	/**
	 * This function will delete all roster_schedule_span records by sys_id
	 *
	**/
	deleteRosterSpansById : function(rosterSchedSpansSysIds) {
		if (JSUtil.nil(rosterSchedSpansSysIds))
			return;
		this.log.debug("[deleteRosterSpansById] rosterSchedSpansSysIds: " + rosterSchedSpansSysIds);
		this._getRosterSpansGrByIds(rosterSchedSpansSysIds).deleteMultiple();
	},

	_getRosterSpansGrByIds : function(rosterSchedSpansSysIds) {
		var gr = new GlideRecord("roster_schedule_span");
		gr.setWorkflow(false);
		gr.addQuery("sys_id", "IN", rosterSchedSpansSysIds);
		gr.query();
		return gr;
	},

	_getMembersByRota : function(rotaSysId) {
		var rotaMemberSysIds = [];
		if (JSUtil.nil(rotaSysId))
			return rotaMemberSysIds;
		var gr = new GlideRecord("cmn_rota_member");
		gr.addQuery("roster.rota", rotaSysId);
		gr.query();
		while (gr.next())
			rotaMemberSysIds.push(gr.getUniqueValue());
		return rotaMemberSysIds;
	},

	// this function is not even being called
	_getRotasBySchedule : function(scheduleSysId) {
		var rotaSysIds = [];
		if (JSUtil.nil(spanSysId))
			return rotaSysIds;
		var gr = new GlideRecord("cmn_rota");
		gr.addQuery("schedule", scheduleSysId);
		gr.query();
		while (gr.next())
			rotaSysIds.push(gr.getUniqueValue());
		return rotaSysIds;
	},

	_getScheduleBySpan : function(spanSysId) {
		var gr = this._getScheduleGrBySpan(spanSysId);
		if (gr)
			return gr.getValue("schedule");
		return "";
	},

	_getScheduleGrBySpan : function(spanSysId) {
		if (JSUtil.nil(spanSysId))
			return null;
		var gr = new GlideRecord("cmn_schedule_span");
		gr.get(spanSysId);
		return gr;
	},

	_dateToIntegerDate : function(dateString) {
		var integerDate = new GlideIntegerDate();
		if (JSUtil.nil(dateString))
			integerDate.setValue(new GlideDate().getByFormat("yyyyMMdd"));
		else
			integerDate.setValue(dateString);
		return integerDate;
	},

	_linkScheduleToRecord : function(columnName, tableName, recordSysId) {
		if (JSUtil.nil(columnName) || JSUtil.nil(tableName) || JSUtil.nil(recordSysId))
			return;

		this.log.debug("[_linkScheduleToRecord] columnName: " + columnName);
		this.log.debug("[_linkScheduleToRecord] tableName: " + tableName);
		this.log.debug("[_linkScheduleToRecord] recordSysId: " + recordSysId);

		var gr = new GlideRecord(tableName);
		gr.get(recordSysId);
		this._updateSchedule(gr.getValue(columnName), tableName, recordSysId);
	},

	_updateSchedule : function(schedSysId, tableName, recordSysId) {
		if (JSUtil.nil(schedSysId) || JSUtil.nil(tableName) || JSUtil.nil(recordSysId))
			return;

		this.log.debug("[_updateSchedule] schedSysId: " + schedSysId);
		this.log.debug("[_updateSchedule] tableName: " + tableName);
		this.log.debug("[_updateSchedule] recordSysId: " + recordSysId);

		var gr = new GlideRecord("cmn_schedule");
		gr.get(schedSysId);
		if (!JSUtil.nil(gr.getValue("document")) && !JSUtil.nil(gr.getValue("document_key")))
			return;

		var update = false;
		if (JSUtil.nil(gr.getValue("document"))) {
			gr.setValue("document", tableName);
			update = true;
		}
		if (JSUtil.nil(gr.getValue("document_key"))) {
			gr.setValue("document_key", recordSysId);
			update = true;
		}
		if (update)
			gr.update();
	},

	type : 'OCRotaCleaner'
};

```