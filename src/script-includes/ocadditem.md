---
title: "OCAddItem"
id: "ocadditem"
---

API Name: global.OCAddItem

```js
var OCAddItem = Class.create();
OCAddItem.formatters = {'fullcalendar' : OCFullCalendarFormatter, 'dhtmlx' : OCDHTMLXCalendarFormatter};
OCAddItem.MSG_TYPE_INFO = "info";
OCAddItem.MSG_TYPE_WARNING = "warning";
OCAddItem.MSG_TYPE_ERROR = "error";
OCAddItem.MSG_TYPE_SUCCESS = "success";

OCAddItem.prototype = {

	initialize: function(formatter) {
		this.log = new GSLog("com.snc.on_call_rotation.log.level", this.type);
		this.formatter = formatter;
		if (this.formatter == null || this.formatter == undefined)
			this.formatter = new OCFullCalendarFormatter();
		this.rotaSysId = "";
		this.startDateTime = "";
		this.endDateTime = "";
		this.repeatUntil = "";
		this.repeatType = "";
		this.repeatCount = "";
		this.memberSysId = "";
		this.groupSysId = "";
		this.allDay = false;
		this.notes = "";
		this.proposedCover = "";
		this.rosterSpanApprovalUtil = new OCRosterSpanApprovalUtil();
	},

	createOverride: function(validateOnly) {
		var result = {scheduleSpanId: "", message: "", event: {}};

		this.log.debug("[createOverride] userSysId: " + this.getMemberSysId() + ", rosterSysId: " + this.getRosterSysId());
		if (JSUtil.nil(this.getMemberSysId())) {
			result.message = gs.getMessage("Member not selected");
			result.message_type = OCAddItem.MSG_TYPE_ERROR;
			return result;
		}

		var userGR = new GlideRecord("sys_user");
		if (!userGR.get(this.getMemberSysId())) {
			result.message = gs.getMessage("Member not found");
			result.message_type = OCAddItem.MSG_TYPE_ERROR;
			return result;
		}

		if (JSUtil.nil(this.getRosterSysId())) {
			result.message = gs.getMessage("Roster not selected");
			result.message_type = OCAddItem.MSG_TYPE_ERROR;
			return result;
		}

		// get roster
		var rosterGr = new GlideRecord("cmn_rota_roster");
		if (!rosterGr.get(this.getRosterSysId())) {
			this.log.warn("[createOverride] Could not find roster: " + this.getRosterSysId());
			result.message = gs.getMessage("Could not find roster with ID: {0}", [this.getRosterSysId()]);
			result.message_type = OCAddItem.MSG_TYPE_ERROR;
			return result;
		}

		var ptoApprovalRequired = this.rosterSpanApprovalUtil.isPTOApprovalRequired(this.groupSysId);

		var isPTOAccessible = (ptoApprovalRequired != this.rosterSpanApprovalUtil.PTO_CONFIG_PROP_VALUES.NOT_ALLOWED);

		// confirm user making request has write access for this group
		if (!new OCCalendarUtils().canWriteByGroupSysId(rosterGr.rota.group + "") && !isPTOAccessible) {
			this.log.warn("[createOverride] User does not have write access for this sys_user_group: " + rosterGr.rota.group);
			result.message = gs.getMessage("User does not have write access for this group");
			result.message_type = OCAddItem.MSG_TYPE_ERROR;
			return result;
		}

		// get schedule
		var scheduleId = this._createScheduleByUser(userGR);
		this.log.debug("[createOverride] user's schedule id = " + scheduleId);

		// create roster schedule span
		var gr = new GlideRecord("roster_schedule_span");
		gr.roster = this.getRosterSysId();
		gr.show_as = "on_call";
		gr.type = "on_call";
		gr.setValue("start_date_time", this._toScheduleDateTime(this.getStartDateTime()).getValue());
		gr.setValue("end_date_time", this._toScheduleDateTime(this.getEndDateTime()).getValue());
		gr.setDisplayValue('repeat_until', this.getRepeatUntil());
		gr.setValue('repeat_type', this.getRepeatType());
		gr.setValue('repeat_count', this.getRepeatCount());
		gr.name = rosterGr.name + "";
		gr.group = rosterGr.rota.group + "";
		gr.schedule = scheduleId + "";
		gr.user = this.getMemberSysId();

		var rotaScheduleEntryValidator = new RotaScheduleEntryValidation(gr).setShowMessage(false);
		if (!rotaScheduleEntryValidator.isValid()) {
			result.message = rotaScheduleEntryValidator.getMessage();
			result.message_type = OCAddItem.MSG_TYPE_ERROR;
			return result;
		}

		if (validateOnly !== true) {
			gr.insert();
			this.gr = gr;

			result.message = gs.getMessage("{0} ({1}) Schedule span created", [gr.schedule.name, gr.name]);
			result.message_type = OCAddItem.MSG_TYPE_SUCCESS;
			result.event = this._formatEvent(gr);
		}
		return result;
	},

	addExtraCoverage: function() {
		var result = {scheduleSpanId: "", message: "Provide the missing values", events: []};
		var missingValue = false;

		if (JSUtil.nil(this.rotaSysId)) {
			result.message += ", cmn_rota sys_id";
			missingValue = true;
		}
		if (JSUtil.nil(this.startDateTime)) {
			result.message += ", start date";
			missingValue = true;
		}
		if (JSUtil.nil(this.endDateTime)) {
			result.message += ", end date";
			missingValue = true;
		}

		if (missingValue) {
			result.message_type = OCAddItem.MSG_TYPE_ERROR;
			return result;
		}

		var gr = new GlideRecord('cmn_rota');
		gr.setWorkflow(false);
		if (!gr.get(this.rotaSysId)) {
			result.message = gs.getMessage("Could not find selected rotation schedule");
			result.message_type = OCAddItem.MSG_TYPE_ERROR;
			return result;
		}

		// confirm user making request has write access for this group
		if (!new OCCalendarUtils().canWriteByGroupSysId(gr.group + "")) {
			result.message = gs.getMessage("User does not have write access for this group");
			result.message_type = OCAddItem.MSG_TYPE_ERROR;
			return result;
		}

		var scheduleId = gr.schedule + "";
		if (!scheduleId)
			scheduleId = this._createScheduleByRota(gr);

		var spanGR = new GlideRecord('roster_schedule_span');
		spanGR.name = gr.name + "";
		spanGR.schedule = scheduleId;
		spanGR.group = gr.group + "";
		spanGR.show_as = "on_call";
		spanGR.type = "on_call";
		var scheduleSpanResult = this._createScheduleSpan(spanGR, scheduleId, true, 0, 'extra_coverage', this.rotaSysId);
		result.message = scheduleSpanResult.message;
		result.message_type = scheduleSpanResult.message_type;

		if (result.message_type == OCAddItem.MSG_TYPE_ERROR)
			return result;
		
		var spans = new OCRotationV2()
			.setStartDate(this.getStartDateTime())
			.setEndDate(this.getEndDateTime(), true)
			.setGroupIds(gr.group + "")
			.setRotaIds(this.rotaSysId)
			.setRosterIds("")
			.getSpans();

		result.events = result.events.concat(spans);
		if (result.events.length > 0) {
			result.message = "Extended On-call coverage";
			result.message_type = OCAddItem.MSG_TYPE_SUCCESS;
		} else {
			result.message = "FAILED to extended On-call coverage";
			result.message_type = OCAddItem.MSG_TYPE_ERROR;
		}

		return result;
	},

	timeOff: function() {
		var result = {scheduleSpanId: "", message: "Provide the missing values"};
		var missingValue = false;

		if (JSUtil.nil(this.memberSysId)) {
			result.message += ", member sys_id";
			missingValue = true;
		}
		if (JSUtil.nil(this.groupSysId)) {
			result.message += ", group sys_id";
			missingValue = true;
		}
		if (JSUtil.nil(this.startDateTime)) {
			result.message += ", start date";
			missingValue = true;
		}
		if (JSUtil.nil(this.endDateTime)) {
			result.message += ", end date";
			missingValue = true;
		}

		if (missingValue) {
			result.message_type = OCAddItem.MSG_TYPE_ERROR;
			return result;
		}

		this.log.debug("[timeOff] memberSysId: " + this.memberSysId);
		this.log.debug("[timeOff] groupSysId: " + this.groupSysId);
		this.log.debug("[timeOff] startDateTime: " + this.startDateTime);
		this.log.debug("[timeOff] endDateTime: " + this.endDateTime);
		var ptoApprovalRequired = this.rosterSpanApprovalUtil.isPTOApprovalRequired(this.groupSysId);
		
		var isPTOAccessible = (ptoApprovalRequired != this.rosterSpanApprovalUtil.PTO_CONFIG_PROP_VALUES.NOT_ALLOWED);
		var isPTOApprovalRequired = (ptoApprovalRequired == this.rosterSpanApprovalUtil.PTO_CONFIG_PROP_VALUES.WITH_APPROVAL);
		
		// confirm user making request has write access for this group
		if (!new OCCalendarUtils().canWriteByGroupSysId(this.groupSysId) && !(isPTOAccessible && this.memberSysId == gs.getUser().getID())) {
			result.message = gs.getMessage("User does not have write access for this group");
			result.message_type = OCAddItem.MSG_TYPE_ERROR;
			return result;
		}

		// get the schedule for this member - create one if needed
		var userGr = new GlideRecord("sys_user");
		if (!userGr.get(this.memberSysId)) {
			result.message = "User does not exist for member: " + this.memberSysId;
			result.message_type = OCAddItem.MSG_TYPE_ERROR;
			return result;
		}

		// Only create a schedule if the user does not have one
		var scheduleId = userGr.getValue("schedule");
		if (JSUtil.nil(scheduleId))
		    scheduleId = this._createScheduleByUser(userGr);
		
		var spanProposalGR = new GlideRecord(this.rosterSpanApprovalUtil.TABLE.ROSTER_SPAN_PROPOSAL);
		spanProposalGR.initialize();
		spanProposalGR.proposed_cover = this.getProposedCover();
		spanProposalGR.short_description = gs.getMessage('PTO Request for {0}', userGr.getDisplayValue());
		spanProposalGR.description = this.getNotes();
		spanProposalGR.state = 1;
		
		var spanGR = new GlideRecord('roster_schedule_span');
		spanGR.initialize();
		spanGR.name = "Time off";
		spanGR.show_as = "busy";
		spanGR.group = this.groupSysId;
		spanGR.all_day = this.getAllDay();
		spanGR.user = this.memberSysId;
		
		
		if (!isPTOApprovalRequired) {
		    spanGR.type = "time_off";
		    spanGR.notes = this.getNotes();
		}
		
		if (isPTOApprovalRequired && spanProposalGR)
		    spanGR.type = "time_off_in_approval";
		
		// Check for already requested timeoff span
		result = this._populateScheduleSpan(spanGR, scheduleId, true);
		if (result.message_type == OCAddItem.MSG_TYPE_ERROR)
		    return result;
		
		if (spanProposalGR && !isPTOApprovalRequired) {
		    //state 9 = Approval not required
		    spanProposalGR.state = "9";
		    // Allow auto swap in case approval is not required
		    spanProposalGR.auto_swap_coverage = "true";
		    // create coverage for time off member
		    result = this.rosterSpanApprovalUtil.provideCoverageForTimeOff(spanGR, spanProposalGR);
		    if (result.message_type == OCRosterSpanApprovalUtil.MSG_TYPE_FAILED) {
		        	gs.addErrorMessage(result.message);
		        return result;
		    }
		    if (result.message_type == OCRosterSpanApprovalUtil.MSG_TYPE_WARNING)
		        gs.addInfoMessage(result.message);
		}
		
		this._insertScheduleSpan(spanGR, 999999, result);
		
		result.remove = this._eventsToRemove(this.memberSysId, this.groupSysId);
		
		if (result.scheduleSpanId && spanProposalGR) {
		    spanProposalGR.roster_schedule_span = result.scheduleSpanId;
		    result.rosterSpanProposalId = spanProposalGR.insert();
		    spanGR.roster_schedule_span_proposal = spanProposalGR.getUniqueValue();
		    spanGR.update();
		}
		
		if (!isPTOApprovalRequired) {
			// Send notification to Rota Manager time off has been created without approval
			var rotaManagers = new OCRosterSpanApprovalUtil().getPTOApproversList(spanProposalGR);
			rotaManagers = rotaManagers.join(",");
			gs.eventQueue("oc.time_off.without_approval.created", spanProposalGR, rotaManagers, "");
		}

		return result;
	},

	getRotaSysId: function() {
		return this.rotaSysId;
	},

	getRosterSysId: function() {
		return this.rosterSysId;
	},

	getStartDateTime: function() {
		return this.startDateTime;
	},

	getRepeatUntil: function() {
		return this.repeatUntil;
	},

	getRepeatType: function() {
		return this.repeatType;
	},

	getRepeatCount: function() {
		return this.repeatCount;
	},

	getEndDateTime: function() {
		return this.endDateTime;
	},

	getMemberSysId: function() {
		return this.memberSysId;
	},

	getProposedCover: function() {
		return this.proposedCover;
	},

	getGroupSysId: function() {
		return this.groupSysId;
	},

	getAllDay: function() {
		return this.allDay;
	},

	getNotes: function() {
		return this.notes;
	},

	setRotaSysId: function(rotaSysId) {
		this.rotaSysId = JSUtil.nil(rotaSysId) ? "" : rotaSysId + "";
		return this;
	},

	setRosterSysId: function(rosterSysId) {
		this.rosterSysId = JSUtil.nil(rosterSysId) ? "" : rosterSysId + "";
		return this;
	},

	setStartDateTime: function(startDateTime) {
		this.startDateTime = JSUtil.nil(startDateTime) ? "" : startDateTime + "";
		return this;
	},

	setEndDateTime: function(endDateTime) {
		this.endDateTime = JSUtil.nil(endDateTime) ? "" : endDateTime + "";
		return this;
	},

	setMemberSysId: function(memberSysId) {
		this.memberSysId = JSUtil.nil(memberSysId) ? "" : memberSysId + "";
		return this;
	},

	setProposedCover: function(proposedCover /*sys_user - sys_id*/) {
		this.proposedCover = JSUtil.nil(proposedCover) ? "" : proposedCover + "";
		return this;
	},

	setGroupSysId: function(groupSysId) {
		this.groupSysId = JSUtil.nil(groupSysId) ? "" : groupSysId + "";
		return this;
	},

	setRepeatUntil: function(repeatUntil) {
		this.repeatUntil = JSUtil.nil(repeatUntil) ? "" : repeatUntil + "";
		return this;
	},

	setRepeatType: function(repeatType) {
		this.repeatType = JSUtil.nil(repeatType) ? "" : repeatType + "";
		return this;
	},

	setRepeatCount: function(repeatCount) {
		this.repeatCount = JSUtil.nil(repeatCount) ? "" : repeatCount + "";
		return this;
	},

	setAllDay: function(allDay) {
		if (allDay == 'true')
			this.allDay = true;
		else
			this.allDay = false;
		return this;
	},

	setNotes: function(notes) {
		this.notes = JSUtil.nil(notes) ? "" : notes + "";
		return this;
	},

	_createScheduleByRota: function(rotaGr) {
		return this._createSchedule(rotaGr);
	},

	_createScheduleByUser: function(userGr) {
		// only make a schedule if the user doesn't already have one
		if (JSUtil.nil(userGr.schedule + ""))
			return this._createSchedule(userGr);

		return userGr.schedule + "";
	},

	/**
	 * Create a new schedule and attach it to the passed in rotation schedule
	 *
	 * gr GlideRecord - Could be either a cmn_rota or a sys_user record.
	**/
	_createSchedule: function(gr) {
		var tableName = gr.getTableName();
		var schedGr = new GlideRecord("cmn_schedule");
		schedGr.initialize();
		schedGr.setWorflow(false);
		schedGr.time_zone = GlideUser.getUserByID(gr.sys_id).getTZ();
		schedGr.name = gr.getDisplayValue();
		schedGr.document = tableName;
		schedGr.document_key = gr.getUniqueValue();
		if (tableName == 'cmn_rota')
			schedGr.type = 'roster';

		// Create new schedule
		var id = schedGr.insert();

		this.log.debug("[_createSchedule] cmn_schedule record created: " + id);

		// update rota with newly created schedule
		gr.schedule = id;
		gr.setWorflow(false);
		gr.update();

		if (gr.instanceOf("sys_user"))
			this._createEntryInResourceManagement(gr);
		return id;
	},

	/**
	 * If Resource Management plugin is active, make an entry in user_has_schedule
	 * table for the user with default resource management schedule if a record
	 * doesnt exist for that user already
	 *
	 * userGr GlideRecord - User record
	**/
	_createEntryInResourceManagement: function(userGr) {

		if (!GlidePluginManager.isActive("com.snc.resource_management"))
			return;
		if (!userGr.instanceOf("sys_user"))
			return;

		//Check if user is also a resource user - has pps_resource role
		var userHasRole = new GlideRecord("sys_user_has_role");
		userHasRole.addQuery("user", userGr.getValue("sys_id"));
		userHasRole.addQuery("role", RMUtil.ppsResourceRoleId());
		userHasRole.setLimit(1);
		userHasRole.query();
		if (!userHasRole.next())
			return;

		//Check if default schedule is provided and is valid schedule
		var resDefaultSchedule = gs.getProperty("com.snc.resource_management.default_schedule");
		if (JSUtil.nil(resDefaultSchedule))
			return;
		var schedule = new GlideRecord("cmn_schedule");
		if (!schedule.get(resDefaultSchedule))
			return;

		var gr = new GlideRecord("user_has_schedule");
		if(!gr.isValid())
			return;
		gr.addQuery("user", userGr.getValue("sys_id"));
		gr.addQuery("context", "resource_management");
		gr.setLimit(1);
		gr.query();
		if (gr.next())
			return;

		gr.initialize();
		gr.setValue("user", userGr.getValue("sys_id"));
		gr.setValue("schedule", schedule.getValue("sys_id"));
		gr.setValue("context", "resource_management");
		gr.insert();
		this.log.debug("[_createEntryInResourceManagement] user_has_schedule record created for User: " + userGr.getValue("sys_id") + " and schedule: " + schedule.getValue("sys_id"));
	},
	
	_populateScheduleSpan: function(gr, scheduleId, validate, spanType, rotaSysId) {
		var result = {scheduleSpanId: "", message: "", message_type: "", event: {}};

		if (!scheduleId)
			return result;

		var scheduleGR = new GlideRecord("cmn_schedule");
		if (!scheduleGR.get(scheduleId)) {
			result.message_type = OCAddItem.MSG_TYPE_ERROR;
			return result;
		}
		gr.schedule = scheduleId;
		
		// If floating set time with no TZ conversion and do NOT suffix with Z
		if (JSUtil.nil(scheduleGR.time_zone)) {
			gr.setValue("start_date_time", this._toScheduleDateTimeNoTZ(this.getStartDateTime()).getValue());
			gr.setValue("end_date_time", this._toScheduleDateTimeNoTZ(this.getEndDateTime()).getValue());
		}
		// Apply TZ conversion and suffix with Z
		else {
			gr.setValue("start_date_time", this._toScheduleDateTime(this.getStartDateTime()).getValue());
			gr.setValue("end_date_time", this._toScheduleDateTime(this.getEndDateTime()).getValue());
		}

		this.log.debug("[_populateScheduleSpan] validate: " + validate);
		if (validate) {
			var rotaScheduleEntryValidator = new RotaScheduleEntryValidation(gr).setShowMessage(false);
			this.log.debug("[_populateScheduleSpan] isValid: " + rotaScheduleEntryValidator.isValid(true));
			if (spanType == 'extra_coverage') {
				if (!rotaScheduleEntryValidator.isValidExtraCoverage(rotaSysId)) {
					result.message = rotaScheduleEntryValidator.getMessage();
					result.message_type = OCAddItem.MSG_TYPE_ERROR;
				}
			} else if (!rotaScheduleEntryValidator.isValid()) {
				result.message = rotaScheduleEntryValidator.getMessage();
				result.message_type = OCAddItem.MSG_TYPE_ERROR;
			}
		}
		return result;
	},
	
	_insertScheduleSpan: function(gr, order, result) {
		var scheduleSpanId = gr.insert();
		
		this.log.debug("[_insertScheduleSpan] created: " + scheduleSpanId);

		gr.initialize();
		gr.get(scheduleSpanId);

		result.scheduleSpanId = scheduleSpanId;
		result.message = gs.getMessage("Schedule span created");
		result.message_type = OCAddItem.MSG_TYPE_SUCCESS;
		result.event = this._formatEvent(gr, order);
		return result;
	},

	_createScheduleSpan: function(gr, scheduleId, validate, order, spanType, rotaSysId) {
		var result = this._populateScheduleSpan(gr, scheduleId, validate, spanType, rotaSysId);
		if(result.message_type == OCAddItem.MSG_TYPE_ERROR)
			return result;
		return this._insertScheduleSpan(gr, order, result);
	},

	_toScheduleDateTime: function(dateTimeStr) {
		this.log.debug("[_toScheduleDateTime] dateTimeStr: " + dateTimeStr + " typeof: " + typeof dateTimeStr);

		var gdt = new GlideDateTime();
		gdt.setDisplayValueInternal(dateTimeStr);
		var sdt =  new GlideScheduleDateTime(gdt.getDisplayValue());

		//start with user's time zone, setter adjusts time hence called twice with different time zones
		var timeZone = gs.getSession().getTimeZoneName();
		sdt.setTimeZone(timeZone);
		sdt.setTimeZone("Etc/UTC");

		this.log.debug("[_toScheduleDateTime] TZ: [" + timeZone + "] applied sdt: " + sdt.getValue());
		return sdt;
	},
	
	_toScheduleDateTimeNoTZ: function(dateTimeStr) {
		this.log.debug("[_toScheduleDateTimeNoTZ] dateTimeStr: " + dateTimeStr + " typeof: " + typeof dateTimeStr);

		var gdt = new GlideDateTime();
		gdt.setDisplayValueInternal(dateTimeStr);
		var sdt =  new GlideScheduleDateTime(gdt.getDisplayValue());

		this.log.debug("[_toScheduleDateTimeNoTZ] sdt: " + sdt.getValue());
		return sdt;
	},

	_eventsToRemove: function(userSysId, groupSysId) {
		var spans = new OCRotationV2()
			.setStartDate(this.startDateTime)
			.setEndDate(this.endDateTime, true)
			.setUserIds(userSysId)
			.setGroupIds(groupSysId)
			.setRotaIds("")
			.setRosterIds("")
			.setExcludeTimeOff(false)
			.getSpans();

		var events = [];
		for (var i =0; i < spans.length; i++)
			if (spans[i].table == "cmn_rota_member")
				events.push(spans[i]);
		this.log.debug("[_eventsToRemove] events: " + JSON.stringify(events));
		return {events: events};
	},

	_formatEvent: function(gr, order) {
		this.log.debug("[_formatEvent] START: " + new GlideDateTime(this.getStartDateTime()).getDisplayValueInternal());
		this.log.debug("[_formatEvent] START: " + new GlideDateTime(this.getStartDateTime()).getDisplayValue());
		this.log.debug("[_formatEvent] START: " + new GlideDateTime(this.getStartDateTime()).getValue());

		var color = "red";
		var tableName = gr.sys_class_name + "";
		if (JSUtil.nil(tableName))
			tableName = gr.getTableName();

		if (gr.type && (gr.type == "time_off" || gr.type == "on_call"))
			color = "#FF9416";
		
		var eventTitle;
		if (gr.type && (gr.type == "time_off"))
			eventTitle = gs.getMessage("{0} ({1})", [this._getName(gr.schedule.document_key), gr.name]);
		else
			eventTitle = gr.name + "";
		
		var event = {
			title: eventTitle,
			color: color,
			textColor: new ChangeRotaColors().getContrast(color),
			start: new GlideDateTime(this.getStartDateTime()).getValue(),
			startNumeric: new GlideDateTime(this.getStartDateTime()).getNumericValue(),
			end: new GlideDateTime(this.getEndDateTime()).getValue(),
			endNumeric: new GlideDateTime(this.getEndDateTime()).getNumericValue(),
			sys_id: gr.sys_id + "",
			table: tableName,
			rota_id: gr.roster.rota + "",
			roster_id: gr.roster + "",
			user_id: gr.schedule.document_key + "",
			group_id: gr.group + "",
			order: order,
			description: "",
			type: gr.type
		};
		var result = this.formatter.formatEvent(event);
		this.log.debug("[formatEvent]" + JSON.stringify(result));
		return result;
	},
	
	_getName: function(userId) {
		if (JSUtil.nil(userId))
			return "";
		var gr = new GlideRecord("sys_user");
		gr.get(userId);
		return gr.name;
	},

	type: 'OCAddItem'
};
```