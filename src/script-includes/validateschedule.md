---
title: "ValidateSchedule"
id: "validateschedule"
---

API Name: global.ValidateSchedule

```js
var ValidateSchedule = Class.create();
ValidateSchedule.prototype =  Object.extendsObject(AbstractAjaxProcessor, {
	isPublic: function() {
		return false;
	},
	
	/**
	 * Checks if the given schedule overlaps with any existing rotation schedules for a
	 * particular group
	 *
	 * @return String in this format --> "false|||error_message" or "true"
	 */
	isValidExistingSpan: function() {
		var schedType = this.getParameter('sysparm_sched_type');	
		var group = this.getParameter('sysparm_sched_group');

		// get all the spans for the selected schedule type
		var newSpan = new GlideRecord("cmn_schedule_span");
		newSpan.addQuery("schedule", schedType);
		newSpan.addQuery("type", "on_call");
		newSpan.addQuery("show_as", "on_call");
		newSpan.query();
		var i18nMsg;
		// exit early if there are no spans
		if (!newSpan.hasNext()) {
			i18nMsg = gs.getMessage("The selected schedule has no spans");
			return "false|||" + i18nMsg;
		}

		var onCallCommon = new OnCallCommon();
		if(onCallCommon.isOverlapAllowed(group))
			return "true";

		// check whether or not all the spans overlap with existing rotation schedules
		while (newSpan.next()) {
			// if we get a rota name back that means this span overlaps an existing rota schedule
			var overlappingRota = this.scheduleOverlaps(newSpan, group);
			if (JSUtil.notNil(overlappingRota)) {
				var message = gs.getMessage("The selected schedule overlaps with the '{0}' rotation schedule", [overlappingRota]);
				return "false|||" + message;
			}
		}

		return "true";
	},

	/**
	 * Checks if the given parameters are valid for inserting a schedule span.
	 * This is called via GlideAjax from a client script in the Create New Schedule wizard
	 *
	 * @return String in this format --> "false|||error_message" or "true"
	 */
	isValidNewSpan: function() {
		var message;
		var group = this.getParameter('sysparm_sched_group');
		var tz = this.getParameter('sysparm_sched_tz');
		var name = this.getParameter('sysparm_sched_name');
		var shiftStart = this.getParameter('sysparm_shift_start');
		var shiftEnd = this.getParameter('sysparm_shift_end');
		var shiftRepeats = this.getParameter('sysparm_shift_repeats');
		var isAllDay = this.getParameter('sysparm_shift_all_day') == 'Yes' ? true : false;

		// We have to create temporarily a new schedule and span so we can check if it
		// overlaps with any existing schedules of rota's belonging to the selected group
		var newSched = new GlideRecord("cmn_schedule");
		newSched.initialize();
		newSched.name = name;
		newSched.time_zone = tz;
		newSched.type = "roster";
		newSched.read_only = false;
		var newSchedId = newSched.insert();
		
		// convert string date times to schedule date time objects
		var startSdt = this._convertToTz(shiftStart, tz);
		var endSdt = this._convertToTz(shiftEnd, tz);

		// create and insert the span for the new schedule
		var newSpan = new GlideRecord("cmn_schedule_span");
		newSpan.initialize();
		newSpan.type = "on_call";
		newSpan.schedule =  newSchedId;
		newSpan.setValue("start_date_time", startSdt.getValue());
		if (isAllDay) {
			startSdt.addSeconds(86399); //(23 * 60 * 60) + (59 * 60) + 59
			newSpan.setValue("end_date_time", startSdt.getValue());
		} else
			newSpan.setValue("end_date_time", endSdt.getValue());
		
		if(shiftRepeats != "NULL_OVERRIDE")
			newSpan.repeat_type = shiftRepeats;
		
		newSpan.repeat_count = 1;
		newSpan.show_as = "on_call";
		newSpan.month = 1;
		newSpan.float_week = 1;
		newSpan.float_day = 1;
		newSpan.override_start_date = 0;
		newSpan.days_of_week = 1;
		newSpan.monthly_type = "dom";
		newSpan.yearly_type = "day";
		var newSpanId = newSpan.insert();

		var onCallCommon = new OnCallCommon();
		// check if the insert fails or if the span overlaps with an existing rota's schedule(s)
		if (JSUtil.nil(newSpanId)) {
			// pop the first error message and return it
			var errors = gs.getErrorMessages();
			
			// flush the messages so that when the data is correct and user proceeds to next panel
			// the error messages dont get displayed twice
			gs.flushMessages();

			message = "false|||" + errors.get(0);
		} else if (onCallCommon.isOverlapAllowed(group))
			message = "true";
		else {
			// if we get a rota name back that means this span overlaps an existing rota schedule
			var overlappingRota = this.scheduleOverlaps(newSpan, group);
			if (JSUtil.notNil(overlappingRota)) {
				var i18nMsg = gs.getMessage("The selected schedule overlaps with the '{0}' rotation schedule", [overlappingRota]);
				message = "false|||" + i18nMsg;
			}
			else
				message = "true";
		}

		// delete the record so we can create it later this will cascade and delete any
		// spans created
		newSched.get(newSchedId);
		newSched.deleteRecord();
		
		return message;
	},

	/**
	 * Converts a GlideDateTime string to a GlideScheduleDate Time Object
	 *
	 * @param String theTime
	 * @param String timeZone
	 *
	 * @return GlideScheduleDateTime scheduleDateTime
	 */
	_convertToTz: function(theTime, timeZone) {
		var sdt = new GlideScheduleDateTime(theTime);
		sdt.setTimeZone(timeZone);
		sdt.setTimeZone("Etc/UTC");
		return sdt;
	},
	
	/**
	 * Checks if a schedule span overlaps with any rotation schedules that belong
	 * to a specific group
	 *
	 * @param GlideRecord[cmn_schedule_span] scheduleSpan 
	 * @param String groupId
	 *
	 * @return String rotaName or null if there is no overlapping schedule
	 */
	scheduleOverlaps: function(scheduleSpan, group, startGdt) {

		// get all rotas for this group
		var rotas = new GlideRecord("cmn_rota");
		rotas.addQuery("group", group);
		var activeQc = rotas.addQuery("active", true);
		var draftQC = activeQc.addOrCondition("active", false);
		draftQC.addCondition("state", "draft");
		rotas.query();

		// check if a given span overlaps with any of the group's rota schedules
		var schedule;
		while(rotas.next()) {
			// load the rotas schedule but exclude the span we are checking
			schedule = new GlideSchedule();
			schedule.load(rotas.schedule + "", null, scheduleSpan.sys_id + "");
			var overlaps;
			if(!startGdt)
				overlaps = schedule.overlapsWith(scheduleSpan, rotas.schedule.time_zone);
			else
				overlaps = schedule.overlapsWithAfterStart(scheduleSpan, rotas.schedule.time_zone, startGdt);
			if(!overlaps.isEmpty())
				return rotas.name;
		}
		return null;
	},

    type: 'ValidateSchedule'
});
```