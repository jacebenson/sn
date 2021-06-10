---
title: "RotaScheduleEntryValidation"
id: "rotascheduleentryvalidation"
---

API Name: global.RotaScheduleEntryValidation

```js
var RotaScheduleEntryValidation = Class.create();

/**
 * Test validity of a Rota Schedule Entry
 * - sets error messages, field error messages, accordingly
 * - returns false if entry is not valid
 */
RotaScheduleEntryValidation.isValid = function(cmn_schedule_span) {
	return new RotaScheduleEntryValidation(cmn_schedule_span).isValid();
};

RotaScheduleEntryValidation.prototype = {
	initialize: function(cmn_schedule_span) {
		this._log = new GSLog("com.snc.on_call_rotation.log.level", this.type);
		this.cmn_schedule_span = cmn_schedule_span;
		this._valid = true;
		this._message = "";
		this._showMessage = true;
	},

	setShowMessage: function(show) {
		this._showMessage = show;
		return this;
	},

	getMessage: function() {
		return this._message;
	},

	isValid: function() {
		this._ensureRosterNoGroup();
		var onCallCommon = new OnCallCommon();
		var groupId = this._getRotaGroupForSchedule(this.cmn_schedule_span.schedule + "");

		if(!onCallCommon.isOverlapAllowed(groupId))
			this._validateNoOverlapRota();
		else if (this.cmn_schedule_span.type == 'on_call' && JSUtil.nil(this.cmn_schedule_span.roster)) {
			var rotaGr = new GlideRecord('cmn_rota');
			rotaGr.addQuery('schedule', this.cmn_schedule_span.schedule);
			rotaGr.query();
			if (rotaGr.next()) {
				this._validateNoOverlapRota(rotaGr.getUniqueValue());
			}
		}

		this._validateNoOverlapTimeOff();
		if ( this.cmn_schedule_span.type == 'time_off' || this.cmn_schedule_span.type == 'time_off_in_approval' || (this.cmn_schedule_span.type == 'on_call' && !JSUtil.nil(this.cmn_schedule_span.roster))) {
			this._validateCoverageTimeOffOverlap();
		}
		return this._valid;
	},

	_validateCoverageTimeOffOverlap: function() {
		var rosterScheduleSpanGr = new GlideRecord('roster_schedule_span');
		rosterScheduleSpanGr.addQuery("schedule.document", "sys_user");
		rosterScheduleSpanGr.addQuery("schedule.document_key", this.cmn_schedule_span.schedule.document_key + "");
		rosterScheduleSpanGr.addQuery("group", this.cmn_schedule_span.group);
		if (this.cmn_schedule_span.type == 'time_off' || this.cmn_schedule_span.type == 'time_off_in_approval')
			rosterScheduleSpanGr.addNotNullQuery('roster');
		else
			rosterScheduleSpanGr.addQuery("type", "!=", "on_call");

		if (this.cmn_schedule_span.sys_id)
			rosterScheduleSpanGr.addQuery("sys_id", "!=", this.cmn_schedule_span.sys_id + "");

		var startDateTimeObj = new GlideScheduleDateTime(this.cmn_schedule_span.start_date_time.getGlideObject());
		var endDateTimeObj = new GlideScheduleDateTime(this.cmn_schedule_span.end_date_time.getGlideObject());
		startDateTimeObj.addSeconds(1);
		endDateTimeObj.addSeconds(-1);

		var startDateTime = startDateTimeObj.getValue() + "";
		var endDateTime = endDateTimeObj.getValue() + "";

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[_validateCoverageTimeOffOverlap] startDateTime: " + startDateTime + " endDateTime: " + endDateTime);

		rosterScheduleSpanGr.addEncodedQuery(this._getDateLimitedEncQuery(rosterScheduleSpanGr.getEncodedQuery(), startDateTime, endDateTime));
		rosterScheduleSpanGr.query();

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[_validateCoverageTimeOffOverlap] encodedQuery: " + rosterScheduleSpanGr.getEncodedQuery());

		if (rosterScheduleSpanGr.next()) {
			this._valid = false;
			if (this.cmn_schedule_span.type == 'time_off')
				this._displayMessage(gs.getMessage("Time off request for user overlaps with existing Coverage request"));
			else if (this.cmn_schedule_span.type == 'time_off_in_approval')
				this._displayMessage(gs.getMessage("Time off - In approval request for user overlaps with existing Coverage request"));
			else if (rosterScheduleSpanGr.type == 'time_off_in_approval')
				this._displayMessage(gs.getMessage("Coverage request for user overlaps with existing Time off - In approval request"));
			else if (rosterScheduleSpanGr.type == 'time_off')
				this._displayMessage(gs.getMessage("Coverage request for user overlaps with existing Time off request"));
		}
	},

	isValidExtraCoverage: function(rotaSysId) {
		this._ensureRosterNoGroup();
		this._validateNoOverlapRota(rotaSysId);
		return this._valid;
	},

	_displayMessage: function(message) {
		this._message = message;
		if (this._showMessage)
			gs.addErrorMessage(this._message);
	},

	// Remove any group value, for a "Roster Schedule Type" Schedule
	_ensureRosterNoGroup: function() {
		if (this.cmn_schedule_span.schedule.type + "" === "create_new_roster") {
			if (JSUtil.notNil(this.cmn_schedule_span.group)) {
				this._displayMessage(gs.getMessage("Group may not be specified for the 'create_new_roster' schedule type. Group removed."));
				this.cmn_schedule_span.group = "";
			}
		}
	},

	// Ensure spans for a Rota Schedule do not overlap the spans in another Rota for the same Group
	_validateNoOverlapRota: function(rotaSysId) {
		if (this.cmn_schedule_span.schedule.type + "" === "roster") {
			var groupID = this._getRotaGroupForSchedule(this.cmn_schedule_span.schedule) + "";
			if (groupID) {
				// test all other Rota schedules for this Schedule's Group
				var rotaGR = new GlideRecord("cmn_rota");
				rotaGR.initialize();
				rotaGR.addQuery("group", groupID);
				rotaGR.addActiveQuery();
				if (rotaSysId)
					rotaGR.addQuery('sys_id', rotaSysId);
				rotaGR.query();

				if (this._log.atLevel(global.GSLog.DEBUG))
					this._log.debug("[_validateNoOverlapRota] encodedQuery: " + rotaGR.getEncodedQuery());

				while (rotaGR.next() && this._valid) {
					if (this._rotaScheduleOverlaps(rotaGR)) {
						this._valid = false;
						var msg = gs.getMessage("Span overlaps rotation schedule '{0}'", rotaGR.name);
						this._displayMessage(msg);
					}
				}
			}
		}
	},

	_validateNoOverlapTimeOff: function() {
		var spanType = this.cmn_schedule_span.type + "";

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[_validateNoOverlapTimeOff] spanType: " + spanType);

		if (spanType === "time_off" || spanType === "time_off_in_approval") {
			var gr = new GlideRecord("roster_schedule_span");
			gr.initialize();
			gr.addQuery("schedule.document", "sys_user");
			gr.addQuery("schedule.document_key", this.cmn_schedule_span.schedule.document_key + "");
			gr.addQuery("group", this.cmn_schedule_span.group);
			gr.addQuery("type", "IN", "time_off,time_off_in_approval");
			if (this.cmn_schedule_span.sys_id)
				gr.addQuery("sys_id", "!=", this.cmn_schedule_span.sys_id + "");

			var startDateTime = this.cmn_schedule_span.start_date_time.getGlideObject().getValue() + "";
			var endDateTime = this.cmn_schedule_span.end_date_time.getGlideObject().getValue() + "";

			if (this._log.atLevel(global.GSLog.DEBUG))
				this._log.debug("[_validateNoOverlapTimeOff] startDateTime: " + startDateTime + " endDateTime: " + endDateTime);

			gr.addEncodedQuery(this._getDateLimitedEncQuery(gr.getEncodedQuery(), startDateTime, endDateTime));
			gr.query();

			if (this._log.atLevel(global.GSLog.DEBUG))
				this._log.debug("[_validateNoOverlapTimeOff] encodedQuery: " + gr.getEncodedQuery());

			while (gr.next()) {
				if (this._rosterScheduleSpanOverlaps(gr)) {
					this._valid = false;
					this._displayMessage(gs.getMessage("Time off request for the user overlaps existing request."));
				}
			}
		}
	},

	/**
	 * limitedBy is an encoded query itself
	 * startDateTime and endDateTime are strings in format: yyyyMMddThhmmssZ
	 * e.g. 20160802T000000Z
	 */
	_getDateLimitedEncQuery: function(limitedBy, startDateTime, endDateTime) {
		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_getDateLimitedEncQuery] limitedBy: " + limitedBy + " startDateTime: " + startDateTime + " endDateTime: " + endDateTime);

		if (!startDateTime || !endDateTime)
			return limitedBy;

		var NQ = "^NQ";
		var startInEndIn = limitedBy + "^start_date_time>=" + startDateTime + "^end_date_time<=" + endDateTime;
		var startOutEndIn = limitedBy + "^start_date_time<=" + startDateTime + "^end_date_time>=" + startDateTime + "^end_date_time<=" + endDateTime;
		var startInEndOut = limitedBy + "^start_date_time>=" + startDateTime + "^start_date_time<=" + endDateTime + "^end_date_time>=" + endDateTime;
		var startOutEndOut = limitedBy + "^start_date_time<=" + startDateTime + "^end_date_time>=" + endDateTime;
		var repeatNotNull = limitedBy + "^repeat_type!=null" + "^repeat_until=00000000^ORrepeat_until=null^ORrepeat_until>=" + startDateTime.split("T")[0];
		var encodedQuery = startInEndIn + NQ + startOutEndIn + NQ + startInEndOut + NQ + startOutEndOut + NQ + repeatNotNull;

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_getDateLimitedEncQuery] encodedQuery: " + encodedQuery);

		return encodedQuery;
	},

	_getRotaGroupForSchedule: function(cmnSchedule) {
		// get the group that this schedule belongs to
		var rotaGroupGR = new GlideRecord("cmn_rota");
		rotaGroupGR.initialize();
		rotaGroupGR.addQuery("schedule", cmnSchedule);
		rotaGroupGR.query();
		if (!rotaGroupGR.next())
			return undefined;
		return rotaGroupGR.group;
	},

	_rotaScheduleOverlaps: function(cmnRotaGr) {
		var scheduleID = cmnRotaGr.schedule + "";
		var schedule = this._getSchedule();
		schedule.load(scheduleID, null, this.cmn_schedule_span.sys_id + "");
		var tz = this.cmn_schedule_span.schedule.time_zone + "";
		var overlaps = schedule.overlapsWith(this.cmn_schedule_span, tz);
		if (!overlaps.isEmpty())
			return true;
		return false;
	},

	_rosterScheduleSpanOverlaps: function(rosterScheduleSpanGr) {
		var scheduleID = rosterScheduleSpanGr.schedule + "";
		var schedule = this._getSchedule();
		schedule.load(scheduleID, null, this.cmn_schedule_span.sys_id + "");
		var tz = this.cmn_schedule_span.schedule.time_zone + "";
		var overlaps = schedule.overlapsWith(this.cmn_schedule_span, tz);
		if (!overlaps.isEmpty())
			return true;
		return false;
	},

	//getter to ease override in test
	_getSchedule: function() {
		var schedule = new GlideSchedule();
		return schedule;
	},

	type: 'RotaScheduleEntryValidation'
};

```