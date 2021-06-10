---
title: "ChangeConflictScheduleSNC"
id: "changeconflictschedulesnc"
---

API Name: global.ChangeConflictScheduleSNC

```js
var ChangeConflictScheduleSNC = Class.create();
ChangeConflictScheduleSNC.prototype = {

	/**
	 * changeGR GlideRecord find windows for this change_request
	 * proposedStart GlideDateTime provide a start time if the current value is not to be used
	 * proposedEnd GlideDateTime provide an end time if the current value is not to be used
	 * range {startDate: GlideDateTime, endDate: GlideDateTime} Factor these dates when calculating windows
	*/
	initialize: function(changeGR, proposedStart, proposedEnd, range) {
		this.setChangeGR(changeGR);
		this.maintenanceSchedules = {};
		this.blackoutSchedules = {};
		this.setTimeZoneId(gs.getSession().getTimeZoneName());
		this._initPlannedStartEndDate(proposedStart, proposedEnd);
		this._initRangeStartEndDate(range);
		this.duration = this.getDurationSeconds();
		this.mode = gs.getProperty(ChangeCheckConflicts.CHANGE_CONFLICT_MODE, "advanced");
	},

	/**
	 * availability Object has a message property, which stores a reason for unavailability.
	 *
	 * Factors Maintenance schedules, Blackout schedules, and Conflicting Change Requests to generate
	 * a Time Map that contains maintenance availability.
	 *
	 * return timeMap GlideScheduleTimeMap represents available maintenance windows to schedule the current Change Request.
	**/
	buildAvailabilityTimeMap: function(availability) {
		var changeSchedules = this.getSchedules();

		// Create a schedule for each maintenance schedule
		this.buildMaintenanceSchedules(changeSchedules.maintenance);

		// Find the intersect of all available schedules
		var timeMap = this._calculateCommonTimeMap(this.rangeStart, this.rangeEnd);
		if (!timeMap || timeMap.isEmpty()) {
			availability.message = this.getReasonForUnavailability("maintenance");
			return null;
		}

		// Create timeMaps for each blackout schedule for our range
		this.buildBlackoutSchedules(changeSchedules.blackout, this.rangeStart, this.rangeEnd);

		// Exclude Blackout schedules and scheduled change_requests
		this._excludeSpans(timeMap, changeSchedules.scheduled);

		if (!timeMap || timeMap.isEmpty()) {
			availability.message = this.getReasonForUnavailability("blackout");
			return null;
		}

		return timeMap;
	},

	/*
	 * numChoice Number of suggested windows to be returned
	**/
	findScheduleWindows: function(numChoice) {
		var availability = {
			windows: [],
			spans: [],
			rangeStart: this.rangeStart.getValue(),
			rangeEnd: this.rangeEnd.getValue(),
			plannedStartDate: this.plannedStart.getValue(),
			plannedEndDate: this.plannedEnd.getValue(),
			message: ""
		};

		if (!this._isDateTimeValid(this.plannedStart) || !this._isDateTimeValid(this.plannedEnd) || this.duration === 0) {
			availability.message = this.getReasonForUnavailability("default");
			return availability;
		}

		// Do not support the addition of a value greater than 2147483647.
		// GlideScheduleDateTime.addSeconds takes an Integer.
		// This is because it makes use of java.util.Calendar,
		// which only supports addition with Integers.
		if (this.duration > 2147483647) {
			availability.message = this.getReasonForUnavailability("maximum");
			return availability;
		}

		var timeMap = this.buildAvailabilityTimeMap(availability);
		if (!timeMap || timeMap.isEmpty())
			return availability;

		var spanLimit = parseInt(gs.getProperty("change.conflict.next_available.choice_limit", "30"), 10);
		if (numChoice)
			spanLimit = numChoice;
		var windows = [];
		var spans = [];
		var timeSpan = null;
		while (spans.length <= spanLimit && timeMap.hasNext()) {
			timeSpan = timeMap.next();
			windows.push(timeSpan + "");
			spans = spans.concat(this._calculateWindows(timeSpan, spanLimit, spans.length));
		}
		availability.windows = windows;
		availability.spans = spans;

		if (spans.length === 0) {
			if (timeSpan) {
				var start = timeSpan.getStart().getGlideDateTime();
				var end = timeSpan.getEnd().getGlideDateTime();
				var suggestDuration = GlideDateTime.subtract(start, end);
				availability.message = this.getReasonForUnavailability("duration_suggest", [suggestDuration.getDisplayValue()]);
			} else
				availability.message = this.getReasonForUnavailability("duration");
			return availability;
		}

		return availability;
	},

	getSchedules: function() {
		var changeConflictConf = {
			date_range: [this.rangeStart, this.rangeEnd],
			dry_run: true,
			collect_window_data: true,
			allow_partially_overlapping_windows: true,
			include_blackout_window: true,
			identify_most_critical: false,
			populate_impacted_cis: false,
			mode: this.mode
		};
		return this._findConfigItemSchedules(changeConflictConf);
	},

	buildBlackoutSchedules: function(blackoutSchedules, startWindow, endWindow) {
		for (var id in blackoutSchedules)
			if (blackoutSchedules.hasOwnProperty(id))
				for (var i = 0; i < blackoutSchedules[id].length; i++) {
					if (this.blackoutSchedules[blackoutSchedules[id][i].scheduleId])
						continue;
					var blackoutSchedule = new GlideSchedule(blackoutSchedules[id][i].scheduleId);
					blackoutSchedule.setTimeZone(this.timeZoneId);
					var excludes = [];
					var timeMap = blackoutSchedule.getTimeMap(startWindow, endWindow);
					while (timeMap.hasNext())
						excludes.push(timeMap.next());
					this.blackoutSchedules[blackoutSchedules[id][i].scheduleId] = excludes;
				}
	},

	buildMaintenanceSchedules: function(maintenanceSchedules) {
		// No maintenance schedule associated with this change_request, use a 24x7 schedule
		if (Object.keys(maintenanceSchedules).length === 0) {
			var schedule = this.get247ScheduleSpan();
			this.maintenanceSchedules["247"] = schedule;
		}

		// Generate maintenance schedule objects
		for (var key in maintenanceSchedules)
			if (maintenanceSchedules.hasOwnProperty(key))
				for (var i = 0; i < maintenanceSchedules[key].length; i++) {
					var scheduleSysId = maintenanceSchedules[key][i].scheduleId;
					if (this.maintenanceSchedules[scheduleSysId])
						continue;
					var maint = new GlideSchedule(scheduleSysId);
					maint.setTimeZone(this.timeZoneId);
					this.maintenanceSchedules[scheduleSysId] = maint;
				}
	},

	getReasonForUnavailability: function(reason, formatValues) {
		switch (reason) {
			case "blackout":
				return gs.getMessage("Reason: Blackout windows overlap with the available maintenance windows");
			case "duration_suggest":
				return gs.getMessage("Reason: Duration of this change request exceeds the available {0} maintenance window", formatValues);
			case "duration":
				return gs.getMessage("Reason: Duration of this change request exceeds the available maintenance window");
			case "maintenance":
				return gs.getMessage("Reason: No common windows found between the related maintenance schedules");
			case "maximum":
				return gs.getMessage("Reason: Duration of this change request exceeds the maximum of 68 years");
			default:
				return gs.getMessage("Reason: Unable to find availability with this criteria");
		}
	},

	get247ScheduleSpan: function() {
		// Initialize a 24x7 span and add to our schedule
		var gr = new GlideRecord("cmn_schedule_span");
		gr.initialize();
		gr.setValue("name", "24x7");
		gr.setValue("type", null);
		gr.setValue("repeat_until", "00000000");
		gr.setValue("repeat_type", "daily"); 
		gr.setValue("repeat_count", 1);
		gr.setValue("days_of_week", 1);
		gr.setValue("monthly_type", "dom");
		gr.setValue("yearly_type", "doy");
		gr.setValue("month", 1);
		gr.setValue("float_week", 1);
		gr.setValue("float_day", 1); 
		gr.setValue("start_date_time", "20070101T000000");
		gr.setValue("end_date_time", "20070101T235959");
		gr.setValue("all_day", 1);

		var schedule = new GlideSchedule();
		schedule.setTimeZone(this.timeZoneId);
		schedule.addTimeSpan(gr);

		return schedule;
	},

	getDurationSeconds: function() {
		if (!this._isDateTimeValid(this.plannedStart) || !this._isDateTimeValid(this.plannedEnd))
			return 0;
		var duration = GlideDateTime.subtract(this.plannedStart, this.plannedEnd);
		return duration.getNumericValue() / 1000;
	},

	setMode: function(mode) {
		this.mode = mode;
	},

	getMode: function() {
		return this.mode;
	},

	getChangeGR: function() {
		return this.changeGR;
	},

	setChangeGR: function(changeGR) {
		if (changeGR && typeof changeGR.isValid === "function" && changeGR.isValid()) {
			this.changeGR = changeGR;
			return true;
		}
		return false;
	},

	getPlannedStart: function() {
		return this.plannedStart;
	},

	setPlannedStart: function(plannedStart) {
		if (this._isDateTimeValid(plannedStart)) {
			this.plannedStart = plannedStart;
			return true;
		}
		return false;
	},

	getPlannedEnd: function() {
		return this.plannedEnd;
	},

	setPlannedEnd: function(plannedEnd) {
		if (this._isDateTimeValid(plannedEnd)) {
			this.plannedEnd = plannedEnd;
			return true;
		}
		return false;
	},

	getRangeStart: function() {
		return this.rangeStart;
	},

	setRangeStart: function(rangeStart) {
		if (this._isDateTimeValid(rangeStart)) {
			this.rangeStart = rangeStart;
			return true;
		}
		return false;
	},

	getRangeEnd: function() {
		return this.rangeEnd;
	},

	setRangeEnd: function(rangeEnd) {
		if (this._isDateTimeValid(rangeEnd)) {
			this.rangeEnd = rangeEnd;
			return true;
		}
		return false;
	},

	getTimeZoneId: function() {
		return this.timeZoneId;
	},

	setTimeZoneId: function(timeZoneId) {
		if (!timeZoneId)
			return;
		var gsdt = new GlideScheduleDateTime();
		gsdt.setTimeZone(timeZoneId);
		var timeZone = gsdt.getTimeZone();
		if (!timeZone)
			return;
		this.timeZone = timeZone;
		this.timeZoneId = timeZone.getID();
	},

	_findMaintenanceSchedules: function() {
		// Maintenance - ChangeCollisionHelper.getConditionalMaintenanceSchedules
		var maintenanceSchedules = [];
		var scheduleGR = new GlideRecord("cmn_schedule_maintenance");
		scheduleGR.addNotNullQuery("applies_to");
		scheduleGR.query();
		while (scheduleGR.next()) {
			maintenanceSchedules.push({
				sys_id : scheduleGR.sys_id.toString(),
				condition : scheduleGR.condition.toString(),
				name : scheduleGR.name.toString(),
				applies_to : scheduleGR.applies_to.toString()
			});
		}
		return maintenanceSchedules;
	},

	_findBlackoutSchedules: function() {
		var blackoutSchedules = [];
		var scheduleGR = new GlideRecord("cmn_schedule_blackout");
		scheduleGR.addQuery("type", "blackout");
		scheduleGR.query();
		while (scheduleGR.next()) {
			blackoutSchedules.push({
				sys_id : scheduleGR.sys_id.toString(),
				condition : scheduleGR.condition.toString(),
				name : scheduleGR.name.toString(),
				applies_to : scheduleGR.applies_to.toString()
			});
		}
		return blackoutSchedules;
	},

	_excludeSpans: function(timeMap, scheduledChanges) {
		this._excludeBlackoutTimeMap(timeMap);
		this._excludeScheduledChanges(timeMap, scheduledChanges);
		timeMap.buildMap(this.timeZoneId);
	},

	_excludeBlackoutTimeMap: function(timeMap) {
		if (Object.keys(this.blackoutSchedules).length === 0)
			return;
		for (var id in this.blackoutSchedules)
			if (this.blackoutSchedules.hasOwnProperty(id))
				for (var i = 0; i < this.blackoutSchedules[id].length; i++)
					timeMap.addExclude(this.blackoutSchedules[id][i]);
	},

	_excludeScheduledChanges: function(timeMap, scheduledChanges) {
		if (!scheduledChanges || (scheduledChanges && Object.keys(scheduledChanges).length === 0))
			return;
		for (var changeSysId in scheduledChanges)
			if (scheduledChanges.hasOwnProperty(changeSysId)) {
				var timeSpan = this._getScheduleDateTimeSpan(scheduledChanges[changeSysId].start, scheduledChanges[changeSysId].end);
				if (!timeSpan)
					continue;
				timeMap.addExclude(timeSpan);
			}
	},
	
	_calculateCommonTimeMap: function(startWindow, endWindow) {
		var timeMap = null;
		var maintSchedLength = Object.keys(this.maintenanceSchedules).length;
		for (var key in this.maintenanceSchedules)
			if (this.maintenanceSchedules.hasOwnProperty(key)) {
				var scheduleTimeMap = this.maintenanceSchedules[key].getTimeMap(startWindow, endWindow);
				if (maintSchedLength === 1)
					return scheduleTimeMap;
				if (!timeMap && !scheduleTimeMap.isEmpty())
					timeMap = scheduleTimeMap;
				else if (!scheduleTimeMap.isEmpty())
					timeMap = timeMap.overlapsWith(scheduleTimeMap, this.timeZoneId);
			}

		return timeMap;
	},

	_calculateWindows: function(timeSpan, spanLimit, spanLength) {
		var timesPerSpan = [];
		var spanStart = timeSpan.getStart();
		var spanEnd = timeSpan.getEnd();
		var movingStart = new GlideScheduleDateTime(spanStart);
		movingStart.setTimeZone(this.timeZoneId);
		var movingEnd = new GlideScheduleDateTime(movingStart);
		movingEnd.setTimeZone(this.timeZoneId);
		movingEnd.addSeconds(this.duration);
		while ((spanLength + timesPerSpan.length) < spanLimit && timeSpan.include(movingStart) && (timeSpan.include(movingEnd) || spanEnd.equals(movingEnd))) {
			var start = movingStart.getGlideDateTime();
			start.setTZ(this.timeZone);
			var end = movingEnd.getGlideDateTime();
			end.setTZ(this.timeZone);

			// Case where there is a DST shift
			var startOffset = start.getDSTOffset();
			var endOffset = end.getDSTOffset();
			if (startOffset > endOffset) {
				movingEnd.addSeconds(startOffset / 1000);
				end = movingEnd.getGlideDateTime();
				end.setTZ(this.timeZone);
			}
			timesPerSpan.push({
				start: {
					value: start.getValue(),
					display_value: start.getDisplayValue()
				},
				end: {
					value: end.getValue(),
					display_value: end.getDisplayValue()
				}
			});

			movingStart = new GlideScheduleDateTime(movingEnd);
			movingStart.setTimeZone(this.timeZoneId);
			movingEnd = new GlideScheduleDateTime(movingStart);
			movingEnd.setTimeZone(this.timeZoneId);
			movingEnd.addSeconds(this.duration);
		}
		return timesPerSpan;
	},

	_findConfigItemSchedules: function (conf) {
		var conflictChecker = new global.ChangeCheckConflicts(this.changeGR, conf);
		if (!conflictChecker.getWindowData)
			return {maintenance:{}, blackout:{}};
		conflictChecker.check();
		return conflictChecker.getWindowData();
	},
	
	_getScheduleDateTimeSpan: function(start, end) {
		var startGDT = new GlideDateTime(start);
		var endGDT = new GlideDateTime(end);
		if (!startGDT.isValid() || !endGDT.isValid())
			return null;
		return new GlideScheduleDateTimeSpan(new GlideScheduleDateTime(startGDT), new GlideScheduleDateTime(endGDT));
	},
	
	_initPlannedStartEndDate: function(proposedStart, proposedEnd) {
		if (this.setPlannedStart(proposedStart) && this.setPlannedEnd(proposedEnd))
			return;
		var plannedStart = new GlideDateTime();
		plannedStart.setValue(this.changeGR.getValue("start_date"));
		this.setPlannedStart(plannedStart);
		var plannedEnd = new GlideDateTime();
		plannedEnd.setValue(this.changeGR.getValue("end_date"));
		this.setPlannedEnd(plannedEnd);
	},

	_initRangeStartEndDate: function(range) {
		if (range && range.startDate && range.endDate && this.setRangeStart(range.startDate) && this.setRangeEnd(range.endDate))
			return;
		this.setRangeStart(new GlideDateTime(this.plannedStart));
		var rangeEnd = new GlideDateTime(this.plannedEnd);
		var scheduleWindow = parseInt(gs.getProperty("change.conflict.next_available.schedule_window", "90"), 10);
		// 7 days is the smallest window of time used to search for the next available time
		if (scheduleWindow < 7)
			scheduleWindow = 7;
		// 1000 days is the largest window of time used to search for the next available time
		else if (scheduleWindow > 1000)
			scheduleWindow = 1000;
		rangeEnd.addDaysUTC(scheduleWindow);
		this.setRangeEnd(rangeEnd);
	},

	_isDateTimeValid: function(glideDateTime) {
		 return glideDateTime && typeof glideDateTime.isValid === "function" && glideDateTime.isValid();
	},

    type: 'ChangeConflictScheduleSNC'
};
```