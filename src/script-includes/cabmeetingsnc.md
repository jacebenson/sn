---
title: "CABMeetingSNC"
id: "cabmeetingsnc"
---

API Name: sn_change_cab.CABMeetingSNC

```js
var CABMeetingSNC = Class.create();

/**
 * Create a new meeting based on the definition and time span
 *
 * @param cabDefinition:
 *            CABDefinition object or GlideRecord("cab_definition")
 * @param timeSpan:
 *            Time Span from a Time Map created from definition spans
 */
CABMeetingSNC.newMeeting = function(cabDefinition, timeSpan) {
	// If insertUpdate isn't defined it's expected to be a GlideRecord so create the object
	if (cabDefinition && typeof cabDefinition.insertUpdate === "undefined")
		cabDefinition = new CABDefinition(cabDefinition);

	var cabMeetingGr = new GlideRecord(CAB.MEETING);
	cabMeetingGr.initialize();

	var cabMeeting = new CABMeeting(cabMeetingGr);
	cabMeeting._copyDataFromDef(cabDefinition);
	cabMeeting._copyDataFromTimeSpan(timeSpan);

	return cabMeeting;
};

CABMeetingSNC.prototype = Object.extendsObject(CABAbstractDefMeet, {

	// Fields to be copied from the cab definition. Included here to allow override.
	COPY_FIELDS: CAB.COPY_FIELDS,

	EXCLUDE_FIELDS: {
		"modified_fields": true,
		"sys_id": true,
		"sys_mod_count": true,
		"sys_created_on": true,
		"sys_created_by": true,
		"sys_updated_on": true,
		"sys_updated_by": true,
		"sys_tags": true
	},
	PENDING: "pending",
	IN_PROGRESS: "in_progress",
	COMPLETE: "complete",
	CANCELED: "canceled",

	initialize: function(_gr, _gs) {
		CABAbstractDefMeet.prototype.initialize.apply(this, arguments);

		this.arrayUtil = new global.ArrayUtil();
		this.jsonUtil = new global.JSON();
	},

	/**
	 * Refreshes a meeting from the definition and span taking into account field changes from the meeting.
	 *
	 * @param cabDefinition:
	 *            CABDefinition object or GlideRecord("cab_definition")
	 * @param timeSpan:
	 *            Time Span object from Time Map
	 */
	refresh: function(cabDefinition, timeSpan) {
		if (!cabDefinition)
			return;

		if (typeof cabDefinition.insertUpdate === "undefined")
			cabDefinition = new CABDefinition(cabDefinition);

		this._copyDataFromDef(cabDefinition);
		this._copyDataFromTimeSpan(timeSpan);

		this.ignoreModifiedFields();
		this.update();
	},

	/**
	 * Creates an exclude span for this meeting and assigns it to the meeting record.
	 */
	disconnect: function() {
		if (this._gr.cab_definition.nil() || this.isDisconnected())
			return;

		var startSDT = this._getScheduleDateTime(this._gr.start);
		var endSDT = this._getScheduleDateTime(this._gr.end);

		var exclude = new GlideRecord("cmn_schedule_span");
		exclude.name = "Auto exclude for meeting " + startSDT;
		exclude.schedule = this._gr.cab_definition;
		exclude.type = "exclude";
		exclude.start_date_time = startSDT;
		exclude.end_date_time = endSDT;

		if (exclude.insert()) {
			this._gr.cmn_schedule_span_exclude = exclude.getUniqueValue();
			this.update();
		}
	},

	/**
	 * Returns true if this meeting is no longer connected to the span it originated from (time has been changed)
	 */
	isDisconnected: function() {
		return !this._gr.cmn_schedule_span_exclude.nil();
	},

	setCanceled: function() {
		this._gr.state = this.CANCELED;
	},

	cancel: function() {
		this.setCanceled();
		this.update();
	},

	isCanceled: function() {
		return this._gr.state + "" === this.CANCELED;
	},

	setInProgress: function() {
		this._gr.state = this.IN_PROGRESS;
	},

	inProgress: function() {
		this.setInProgress();
		this.update();
	},

	isInProgress: function() {
		return this._gr.state + "" === this.IN_PROGRESS;
	},

	setPending: function() {
		this._gr.state = this.PENDING;
	},

	pending: function() {
		this.setPending();
		this.update();
	},

	isPending: function() {
		return this._gr.state + "" === this.PENDING;
	},

	setComplete: function() {
		this._gr.state = this.COMPLETE;
		this._gr.actual_end = new GlideDateTime();
	},

	complete: function() {
		this.setComplete();
		this.update();
	},

	isComplete: function() {
		return this._gr.state + "" === this.COMPLETE;
	},

	/**
	 * Returns a configured ScheduleDateTime for the given date time glide element
	 */
	_getScheduleDateTime: function(dateTimeElement) {
		var gdt = new GlideDateTime();
		gdt.setValue(dateTimeElement.dateNumericValue());
		var sdt = new GlideScheduleDateTime(gdt);
		sdt.setTimeZone(this._gr.cab_definition.time_zone.getDisplayValue());
		return sdt;
	},

	_copyDataFromDef: function(cabDefinition) {
		if (!cabDefinition)
			return;

		var modifiedFields = this._getModifiedFields();

		for (var i = 0; i < this.COPY_FIELDS.length; i++) {
			var fieldName = this.COPY_FIELDS[i];

			// If we're working on an existing record.
			if (this._gr.isValidRecord()) {
				// Check if this field has already been modified and if so we can't overwrite it
				if (modifiedFields[fieldName])
					continue;

				// otherwise set the CAB meeting field to the equivalent value from the CAB Definition
				this._gr[fieldName] = cabDefinition._gr[fieldName];
			} else
				this._gr[fieldName] = cabDefinition._gr[fieldName];
		}

		this._gr.cab_definition = cabDefinition._gr.getUniqueValue();
	},

	/**
	 * Copies timing and schedule span information from the provided time span
	 */
	_copyDataFromTimeSpan: function(timeSpan) {
		if (!timeSpan)
			return;

		// If there's an exclude span for this meeting, don't copy the time data
		// The meeting is disconnected from the time span.
		if (this.isDisconnected())
			return;

		this._gr.start = timeSpan.getStart().getGlideDateTime();
		this._gr.end = timeSpan.getEnd().getGlideDateTime();
		this._gr.cmn_schedule_span_origin = timeSpan.getOriginTimeSpan().getID();
		this._gr.cmn_schedule_span_start = timeSpan.getStartTimeSpan().getID();
		this._gr.cmn_schedule_span_end = timeSpan.getEndTimeSpan().getID();
	},

	setChangeRangeDates: function() {
		// If there's no end date on the meeting we can't work out what our change range is
		if (this._gr.end.nil())
			return;

		this._gr.ignore_change_date_range = this._gr.cab_definition.ignore_change_date_range;

		var meetingEnd = new GlideDateTime(this._gr.getValue("end"));
		this._gr.change_range_start = meetingEnd;

		var nextMeeting = new CABDefinition(this._gr.cab_definition.getRefRecord()).getNextMeetingStartingAfter(meetingEnd);
		if (nextMeeting && !nextMeeting.end.nil())
			this._gr.change_range_end = nextMeeting.end;
	},

	createChangeCondition: function() {
		if (this._gr.cab_definition.nil())
			return;

		this._gr.table_name = this._gr.cab_definition.table_name;
		this._gr.change_condition = this._gr.cab_definition.change_condition;
		return this._gr.change_condition;
	},

	getSortingFields: function(str) {
		var tokens = str.split("^EQ");
		var result = [];
		var sortFieldsIndex = tokens.length - 1;
		if (!tokens[sortFieldsIndex] || tokens[sortFieldsIndex].length === 0)
			return result;

		var orderByTokens = tokens[sortFieldsIndex].split("^ORDERBY");
		for (var i = 0; i < orderByTokens.length; i++) {
			var orderByToken = orderByTokens[i];
			if (!orderByToken || orderByToken.length === 0)
				continue;
			var direction = "atoz";

			if (orderByToken.startsWith("DESC")) {
				orderByToken = orderByToken.substr(4);
				direction = "ztoa";
			}
			if (!orderByToken || orderByToken.length === 0)
				continue;
			var orderByTerm = {
				columnName: orderByToken,
				direction: direction
			};
			result.push(orderByTerm);
		}

		return result;
	},

	/*
	 * Refresh the agenda items. Use the condition from the meeting to update agenda items.
	 */
	refreshChangeAgendaItems: function() {
		this._log.debug("[refreshAgendaItems]  Starting refresh of agenda items");

		var existingAutoAddedAgendaItemsMap = this._getAutoAddedAgendaItemsMap();

		// If there is a change condition, add changes
		if (!this._gr.change_condition.nil()) {
			var chgItm;
			var sortOb;

			this._cabDomUtil.runInRecordsDomain((function() {
				// Get the sys_ids of Changes matching our date range and the condition field
				chgItm = new GlideAggregate("change_request");

				if (this._cabDomUtil._domainsActive)
					chgItm.addQuery("sys_domain", this._gr.sys_domain);

				if (Boolean(this._gr.ignore_change_date_range) !== true) {
					if (!this._gr.change_range_start.nil())
						chgItm.addQuery("start_date", ">=", this._gr.change_range_start);
					if (!this._gr.change_range_end.nil())
						chgItm.addQuery("start_date", "<=", this._gr.change_range_end);
				}

				chgItm.addEncodedQuery(this._gr.change_condition);
				sortOb = this.getSortingFields(this._gr.change_condition + "");
				this._addSort(chgItm, sortOb);
				chgItm.groupBy("sys_id");
				chgItm.query();
			}).bind(this));

			var chgIdsToAdd = [];
			while (chgItm.next())
				chgIdsToAdd.push(chgItm.sys_id + "");

			// Break them up into chunks of 1000 to limit the in clause that we'll perform
			var chgIdsToAddChunks = [];
			for (var k = 0; k < chgIdsToAdd.length / 1000; k++) {
				if ((k * 1000) + 1 > chgIdsToAdd.length)
					break;

				chgIdsToAddChunks.push(chgIdsToAdd.slice(k * 1000, (k * 1000) + 1000));
			}

			var order = 0;

			// Create/update the new Agenda Items but first check that they don't already exist as a pending/in progress item
			// for another meeting instance of this CAB Definition
			for (var i = 0; i < chgIdsToAddChunks.length; i++) {
				var existingAgendaTaskIds = {};
				var chgIds = chgIdsToAddChunks[i];
				agendaItemGr = new GlideAggregate(CAB.AGENDA_ITEM);
				agendaItemGr.addQuery("cab_meeting.cab_definition", "=", this._gr.cab_definition);
				agendaItemGr.addQuery("cab_meeting", "!=", this._gr.getUniqueValue());
				agendaItemGr.addQuery("state", "IN", "pending,in_progress");
				agendaItemGr.addQuery("task", "IN", chgIds);
				agendaItemGr.groupBy("task");
				agendaItemGr.query();

				while (agendaItemGr.next())
					existingAgendaTaskIds["" + agendaItemGr.task] = true;

				chgIdsToAdd = chgIds.filter(function(chgId) {
					return !existingAgendaTaskIds[chgId];
				});

				chgItm = new GlideRecord("change_request");
				chgItm.addQuery("sys_id", "IN", chgIdsToAdd);
				this._addSort(chgItm, sortOb);
				chgItm.query();
				while (chgItm.next()) {
					order += 100;
					this._insertOrUpdateAgendaItem(chgItm, order, existingAutoAddedAgendaItemsMap);
				}
			}
		}
		this._removeInvalidAgendaItems(existingAutoAddedAgendaItemsMap);
	},


	_insertOrUpdateAgendaItem: function(agendaItem, order, existingAutoAddedAgendaItemsMap) {
		if (!agendaItem)
			return;

		if (existingAutoAddedAgendaItemsMap && existingAutoAddedAgendaItemsMap[agendaItem.getUniqueValue()]) {
			var aiGr = new GlideRecord(CAB.AGENDA_ITEM);
			aiGr.addQuery("cab_meeting", this._gr.getUniqueValue());
			aiGr.addQuery("task", agendaItem.getUniqueValue());
			aiGr.query();

			if (aiGr.next()) {
				if (aiGr.getValue('order') !== order + '') {
					aiGr.order = order;
					aiGr.update();
				}

				var ai = new CABAgendaItem(aiGr);
				if (!ai.hasAutoAddedAttendee())
					ai.refreshAttendees();

				delete existingAutoAddedAgendaItemsMap[agendaItem.getUniqueValue()];
			}
		} else
			this.addAgendaItem(agendaItem, order);
	},

	_removeInvalidAgendaItems: function(existingAutoAddedAgendaItemsMap) {
		var invalidAutoAddedAgendaItemTaskArray = Object.keys(existingAutoAddedAgendaItemsMap);
		
		if (invalidAutoAddedAgendaItemTaskArray.length > 0) {
			var agItms = new GlideRecord(sn_change_cab.CAB.AGENDA_ITEM);
			agItms.addQuery(CAB.MEETING, "=", this._gr.getUniqueValue());
			agItms.addQuery("added", "=", "auto");
			agItms.addQuery("task", "IN", invalidAutoAddedAgendaItemTaskArray.join(','));
			agItms.deleteMultiple();
		}

	},


	/*
	 * Check to see if the current user can an agenda item can be added to the meeting. return true if you can add an agenda item.
	 */
	canAddAgendaItem: function() {
		// If the meeting is pending and doesn't have the agenda locked,
		// if you're a cab_manager, or if you're the CAB Manager you can add agenda items
		if (Boolean(this._gr.agenda_locked) !== true && this._gr.state + "" === "pending")
			if (this._gr.manager + "" === this._gs.getUserID() + "" || this._gs.hasRole(CAB.MANAGER))
				return true;

		return false;
	},

	/*
	 * Adds an agenda item to the meeting.
	 *
	 * agendaItem: GlideRecord/ChangeRequest/CABAgendaItem representing cab_agenda_item/change_request to add to meeting return: sys id of agenda item if added successfully
	 */
	addAgendaItem: function(agendaItem, order) {
		if (!agendaItem)
			return;

		var newAgendaItem;
		var shortDesc;
		// If we have a GlideRecord passed in, create the CABAgendaItem
		if (typeof agendaItem.getTableName === "function") {
			if (agendaItem.getTableName() === CAB.AGENDA_ITEM) {
				newAgendaItem = new sn_change_cab.CABAgendaItem(agendaItem, this._gs);
				if (!agendaItem.task.nil() && !agendaItem.task.approval.nil()) {
					if (agendaItem.task.approval + "" === "approved")
						newAgendaItem.setPreApproved();
					else if (agendaItem.task.approval + "" === "rejected")
						newAgendaItem.setRejected();
				}

				agendaItem = newAgendaItem;
			} else if (agendaItem.getTableName() === "change_request") {
				shortDesc = agendaItem.short_description.nil() ? agendaItem.getDisplayValue() : agendaItem.short_description;
				newAgendaItem = sn_change_cab.CABAgendaItem.newAgendaItem(agendaItem);
				newAgendaItem.setValue("short_description", shortDesc);

				if (!agendaItem.approval.nil()) {
					if (agendaItem.approval + "" === "approved")
						newAgendaItem.setPreApproved();
					else if (agendaItem.approval + "" === "rejected")
						newAgendaItem.setRejected();
				}

				agendaItem = newAgendaItem;
			} else
				this._log.debug("[addAgendaItem] Invalid GlideRecord provided: " + agendaItem.getTableName());
		} else if (agendaItem.type === "ChangeRequest") {
			var agendaItemGr = agendaItem.getGlideRecord();
			shortDesc = agendaItemGr.short_description.nil() ? agendaItemGr.getDisplayValue() : agendaItemGr.short_description;
			newAgendaItem = sn_change_cab.CABAgendaItem.newAgendaItem(agendaItem);

			newAgendaItem.setValue("short_description", shortDesc);

			if (!agendaItemGr.approval.nil()) {
				if (agendaItemGr.approval + "" === "approved")
					newAgendaItemGr.setPreApproved();
				else if (agendaItemGr.approval + "" === "rejected")
					newAgendaItem.setRejected();
			}

			agendaItem = newAgendaItem;
		}

		// If we don't have a valid CABAgendaItem object at this point, return.
		if (agendaItem.type + "" !== "CABAgendaItem")
			return;

		if (order)
			agendaItem.setValue("order", order);
		agendaItem.setValue(CAB.MEETING, this._gr.getUniqueValue());
		agendaItem.setValue("added", "auto");

		if (agendaItem.isPreApproved() && Boolean(this._gr.complete_preapproved_changes) === true)
			agendaItem.setComplete();

		agendaItem.insertUpdate();
		agendaItem.refreshAttendees();
	},

	inProgressAgendaItemsToPending: function() {
		var aiGr = new GlideRecord(CAB.AGENDA_ITEM);
		aiGr.addQuery("cab_meeting", this._gr.getUniqueValue());
		aiGr.addQuery("state", "in_progress");
		aiGr.query();

		while (aiGr.next())
			new CABAgendaItem(aiGr).pending();
	},

	firstPendingAgendaItemToInProgress: function() {
		var firstAiGr = this.getFirstPendingAgendaItem();
		if (firstAiGr) {
			new CABAgendaItem(firstAiGr).inProgress();
			var crs = CABRuntimeState.get(this._gr.getUniqueValue());
			crs.setCurrentAgendaItem(firstAiGr.getUniqueValue());
			crs.update();
			return firstAiGr;
		}
		return null;
	},

	getFirstPendingAgendaItem: function() {
		var aiGr = new GlideRecord(CAB.AGENDA_ITEM);
		aiGr.addQuery("cab_meeting", this._gr.getUniqueValue());
		aiGr.addQuery("state", "pending");
		aiGr.orderBy("order");
		aiGr.query();
		if (aiGr.next())
			return aiGr;

		return null;
	},

	canAutoAddChanges: function() {
		if (this._gr.cab_definition.nil())
			return true;

		var def = this._gr.cab_definition.getRefRecord();
		return def.auto_add_changes;
	},

	getAgendaItemCount: function() {
		if (!this._gr.getUniqueValue())
			return 0;

		var agendaItemsGa = new GlideAggregate(CAB.AGENDA_ITEM);
		agendaItemsGa.addQuery(CAB.MEETING, this._gr.getUniqueValue());
		agendaItemsGa.addQuery("state", "pending");
		agendaItemsGa.addAggregate("COUNT");
		agendaItemsGa.query();

		if (!agendaItemsGa.next())
			return 0;

		return agendaItemsGa.getAggregate("COUNT");
	},

	// Populate the associated agenda items with the time per agenda item
	updateAgendaItemTime: function(previous) {
		if (!this._gr.getUniqueValue())
			return 0;

		var agendaItemGr = new GlideRecord(CAB.AGENDA_ITEM);
		agendaItemGr.addQuery(CAB.MEETING, this._gr.getUniqueValue());
		agendaItemGr.query();
		while (agendaItemGr.next()) {
			if (!agendaItemGr.getValue("alotted_time") || (agendaItemGr.getValue("alotted_time") === previous.getValue("time_per_agenda_item"))) {
				agendaItemGr.setValue("alotted_time", this._gr.getValue("time_per_agenda_item"));
				agendaItemGr.update();
			}
		}
	},

	checkForExtendTimings: function() {
		var extendTimings = {
			"adjustmentNeeded": false
		};

		var currentTimePerChange = this._gr.time_per_agenda_item;
		if (currentTimePerChange.nil())
			return extendTimings;

		var agendaItemCount = this.getAgendaItemCount();

		if (agendaItemCount < 1)
			return extendTimings;

		var meetingDuration = this.getMeetingDuration();

		if (meetingDuration.getNumericValue() < 1)
			return extendTimings;

		var requiredMeetingDurationMS = agendaItemCount * currentTimePerChange.dateNumericValue();

		if (requiredMeetingDurationMS <= meetingDuration.getNumericValue())
			return extendTimings;

		var adjustmentTimePerAgendaItem = new GlideDuration(Math.floor((meetingDuration.getNumericValue() / agendaItemCount) / 1000) * 1000);
		var adjustmentEndTime = new GlideDateTime(this._gr.getValue("start"));
		adjustmentEndTime.add(requiredMeetingDurationMS);

		extendTimings = {
			"adjustmentNeeded": true,
			"adjustmentTimePerAgendaItem": adjustmentTimePerAgendaItem,
			"adjustmentEndTime": adjustmentEndTime
		};

		return extendTimings;
	},

	setTimePerChange: function(duration) {
		if (typeof duration.getDurationValue !== "function") {
			// this isn't a GlideDuration object so assume it's the string value of a duration e.g. 1 23:45:57
			duration = new GlideDuration(duration);
			if (!duration.isValid()) {
				this._log.error("setTimePerChange: invalid duration value supplied - \"" + duration.toString() + "\"");
				return;
			}
		}

		this._gr.time_per_change = duration;
	},

	getMeetingDuration: function() {
		if (this._gr.start.nil() || this._gr.end.nil()) {
			this._log.debug("getMeetingDuration: One of start [" + this._gr.start.getValue() + "] or end date [" + this._gr.end.getValue() + "] is empty - returning 0 duration");
			return new GlideDuration(0);
		}

		var meetingStart = new GlideDateTime(this._gr.getValue("start"));
		var meetingEnd = new GlideDateTime(this._gr.getValue("end"));

		var duration = GlideDateTime.subtract(meetingStart, meetingEnd);
		if (duration.getNumericValue() < 0) {
			this._log.debug("getMeetingDuration: Start [" + this._gr.start.getValue() + "] is after End [" + this._gr.end.getValue() + "] - returning 0 duration");
			return new GlideDuration(0);
		}

		return duration;
	},


	getAgendaItemIds: function() {
		var agendaItemTaskIds = {};

		var agendaItemGr = new GlideAggregate(CAB.AGENDA_ITEM);
		agendaItemGr.addQuery("cab_meeting.cab_definition", "=", this._gr.cab_definition);
		agendaItemGr.addQuery("state", "IN", "pending,in_progress");
		agendaItemGr.groupBy("task");
		agendaItemGr.query();

		while (agendaItemGr.next())
			agendaItemTaskIds[agendaItemGr.getValue("task")] = true;

		return agendaItemTaskIds;
	},

	/**
	 * Returns a list of the agenda items identified by the ids provided
	 */
	getAgendaItems: function(agendaItemIds) {
		if (!agendaItemIds || (Array.isArray(agendaItemIds) && agendaItemIds.length === 0))
			return null;

		if (Array.isArray(agendaItemIds))
			agendaItemIds = agendaItemIds.join(",");

		var agendaItemGr = new GlideRecord(CAB.AGENDA_ITEM);
		agendaItemGr.addQuery("sys_id", "IN", agendaItemIds);
		agendaItemGr.orderBy("order");
		agendaItemGr.query();

		if (!agendaItemGr.hasNext())
			return null;

		var agendaItems = [];
		var agendaTaskIdx = {};
		var timePerAgendaItem = {};

		while (agendaItemGr.next()) {
			if (!agendaItemGr.canRead())
				continue;

			if (!agendaItemGr.cab_meeting.nil() && !timePerAgendaItem[agendaItemGr.cab_meeting + ""]) {
				var cabMeetingGr = agendaItemGr.cab_meeting.getRefRecord();
				timePerAgendaItem[cabMeetingGr.getUniqueValue()] = {
					"value": cabMeetingGr.time_per_agenda_item.toString(),
					"display_value": cabMeetingGr.time_per_agenda_item.getDisplayValue()
				};
			}

			var cabAgendaItem = new CABAgendaItem(agendaItemGr);
			var agendaItem = cabAgendaItem.toJS();
			if (!agendaItem)
				continue;

			if (agendaItemGr.alotted_time.nil() && timePerAgendaItem[agendaItemGr.cab_meeting + ""])
				agendaItem.alotted_time = timePerAgendaItem[agendaItemGr.cab_meeting + ""];

			var taskId = null;
			if (!agendaItemGr.task.nil()) {
				taskId = agendaItemGr.task + "";
				if (!agendaTaskIdx[taskId])
					agendaTaskIdx[taskId] = [];

				agendaTaskIdx[taskId].push(agendaItem);
			}

			agendaItems.push(agendaItem);
		}

		// If we have nothing, return null
		if (agendaItems.length === 0)
			return null;

		var taskGr = new GlideRecord("change_request");
		taskGr.addQuery("sys_id", "IN", Object.keys(agendaTaskIdx).join(","));
		taskGr.query();
		var tableFormCache = {};
		while (taskGr.next()) {
			if (!taskGr.canRead())
				continue;

			taskId = taskGr.getUniqueValue() + "";
			if (agendaTaskIdx[taskId]) {
				var cabTask = new CABChangeRequest(taskGr);
				var taskJS = cabTask.toJS(true);

				var tableName = taskGr.getTableName();

				if (!tableFormCache[tableName])
					tableFormCache[tableName] = cabTask.toSPForm();

				agendaTaskIdx[taskId].forEach(function(agendaItem) {
					agendaItem.task.record = taskJS;
					agendaItem.task._form = tableFormCache[tableName];
				});
			}
		}

		return agendaItems;
	},

	/**
	 * Builds the initial agenda state for the meeting.
	 */
	getInitialAgendaState: function() {
		function createItemState(agendaItemGr) {
			return {
				"sysId": agendaItemGr.getUniqueValue(),
				"taskId": agendaItemGr.task + "",
				"order": parseInt(agendaItemGr.getValue("order")),
				"state": agendaItemGr.getValue("state"),
				"decision": agendaItemGr.getValue("decision")
			};
		}

		function addAssignmentToState(taskGr, itemState) {
			itemState.assignment = {
				"assigned_to": taskGr.assigned_to + "",
				"requested_by": taskGr.requested_by + "",
				"cab_delegate": taskGr.cab_delegate + ""
			};
		}

		function randomIntBetween(min, max) {
			min = Math.ceil(min);
			max = Math.floor(max);
			return Math.floor(Math.random() * (max - min + 1)) + min;
		}

		// The maximum number of agenda items to request at a time.
		var limit = parseInt(this._gs.getProperty("com.snc.change_management.cab.agenda.initial_request_limit", 60));
		var skew = parseInt(this._gs.getProperty("com.snc.change_management.cab.agenda.initial_request_skew", 20));
		var numRecords = randomIntBetween(limit - skew, limit);

		var initialStates = ["pending", "in_progress", "paused"];

		var startTimer = Date.now();

		var agenda = [];
		var agendaTaskIdx = {};

		var nriStat = [];
		var nriTaskIdx = {};

		var agendaItemGr = new GlideRecord(CAB.AGENDA_ITEM);
		agendaItemGr.addQuery("cab_meeting", this._gr.getUniqueValue());
		agendaItemGr.orderBy("order");
		agendaItemGr.query();

		var taskSysIds = [];
		while (agendaItemGr.next()) {
			//Ignore if we can't read it.  Don't want this to happen
			if (!agendaItemGr.canRead())
				continue;

			var taskId = null;
			if (!agendaItemGr.task.nil()) {
				taskId = agendaItemGr.task + "";
				taskSysIds.push(taskId);
			}

			if (initialStates.indexOf(agendaItemGr.getValue("state")) === -1 || agenda.length === numRecords) {
				var memo = createItemState(agendaItemGr);
				nriStat.push(memo);

				if (taskId) {
					if (!nriTaskIdx[taskId])
						nriTaskIdx[taskId] = [];

					nriTaskIdx[taskId].push(memo);
				}
				continue;
			}

			var agendaItem = new CABAgendaItem(agendaItemGr);
			var agendaItemJS = agendaItem.toJS(); // Don't include the task or form info at this point
			agenda.push(agendaItemJS);

			if (taskId) {
				//Build task/agenda item index
				if (!agendaTaskIdx[taskId])
					agendaTaskIdx[taskId] = [];

				agendaTaskIdx[taskId].push(agendaItemJS);
			}
		}

		//Get change request records and augment agenda items
		var taskGr = new GlideRecord("change_request");
		taskGr.addQuery("sys_id", "IN", taskSysIds.join(","));
		taskGr.query();
		var tableFormCache = {};
		while (taskGr.next()) {
			if (!taskGr.canRead())
				continue;

			taskId = taskGr.getUniqueValue() + "";

			if (agendaTaskIdx[taskId]) {
				var cabTask = new CABChangeRequest(taskGr);
				var taskJS = cabTask.toJS(true);

				var tableName = taskGr.getTableName();

				if (!tableFormCache[tableName])
					tableFormCache[tableName] = cabTask.toSPForm();

				agendaTaskIdx[taskId].forEach(function(agendaItem) {
					agendaItem.task.record = taskJS;
					agendaItem.task._form = tableFormCache[tableName];
				});
			} else if (nriTaskIdx[taskId])
				nriTaskIdx[taskId].forEach(function(itemState) {
					addAssignmentToState(taskGr, itemState);
				});
		}

		var endTimer = Date.now();
		return {
			"agenda": agenda,
			"nriState": nriStat,
			"startTimer": startTimer,
			"endTimer": endTimer,
			"tranactionTime": ((endTimer - startTimer) / 1000) + "s"
		};
	},

	getPortalURL: function() {
		var url = "/" + CAB.PORTAL.SUFFIX + "/?id=" + CAB.WORKBENCH + "&sys_id=" + this._gr.getUniqueValue();

		return url;
	},

	refreshBoardAttendees: function() {
		var cabManager = [this.getManager()]; // Get this into an array as it helps when determining what changes we need to make
		var cabBoard = this.getAllBoardMembers();
		this.updateBoardAttendees({
			"cab_manager": cabManager,
			"cab_board": cabBoard
		});
	},

	updateBoardAttendees: function(attendees) {
		if (!attendees)
			return;

		if (!attendees[CAB.REASON.CAB_MANAGER])
			attendees[CAB.REASON.CAB_MANAGER] = [];

		var currentManagerId = attendees[CAB.REASON.CAB_MANAGER];

		if (!attendees[CAB.REASON.CAB_BOARD])
			attendees[CAB.REASON.CAB_BOARD] = [];

		var currentBoard = attendees[CAB.REASON.CAB_BOARD];

		var attendeesToAdd = {};
		var attendeesToUpdate = {};
		var attendeesToRemove = {};

		// Get all our attendees into an object broken down by reason with each reason object containing an object for each attendee (key'd by user_id)
		var attendeesByReason = this.getAttendeesByReason(null, null, ["attending_for_tasks"]);

		// And then get those into separate objects
		var currentManagerAttendees = attendeesByReason[CAB.REASON.CAB_MANAGER] || {};
		var currentBoardAttendees = attendeesByReason[CAB.REASON.CAB_BOARD] || {};
		var currentAttendeeAttendees = attendeesByReason[CAB.REASON.ATTENDEE] || {};

		// We'll also need these as array's of user ids so we can easily work out attendees to add/remove/update
		var currentManagerAttendeeIds = Object.keys(currentManagerAttendees);
		var currentBoardAttendeeIds = Object.keys(currentBoardAttendees);

		// Deal with CAB Manager first
		if (!currentManagerAttendees[currentManagerId]) {
			if (currentBoardAttendees[currentManagerId] || currentAttendeeAttendees[currentManagerId])
				attendeesToUpdate[CAB.REASON.CAB_MANAGER] = currentManagerId;
			else
				attendeesToAdd[CAB.REASON.CAB_MANAGER] = currentManagerId;
		}
		var managerAttendeesDiff = this.arrayUtil.diff(currentManagerAttendeeIds, currentManagerId);
		if (managerAttendeesDiff.length > 0)
			attendeesToRemove[CAB.REASON.CAB_MANAGER] = managerAttendeesDiff;

		// Now work out CAB Board attendee changes
		// - first handle the changes for board attendees that are no longer part of the board
		var boardAttendeesDiff = this.arrayUtil.diff(currentBoardAttendeeIds, currentBoard);
		var boardAttendeeId;
		for (var i = 0; i < boardAttendeesDiff.length; i++) {
			boardAttendeeId = boardAttendeesDiff[i];
			// if a board or attendee attendee is becoming the CAB Manager leave alone
			if (currentManagerId.indexOf(boardAttendeeId) >= 0)
				continue;
			// if the Board attendee still has tasks to attend for demote them to an "Attendee"
			if (currentBoardAttendees[boardAttendeeId].attending_for_tasks) {
				if (!attendeesToUpdate[CAB.REASON.ATTENDEE])
					attendeesToUpdate[CAB.REASON.ATTENDEE] = [];
				attendeesToUpdate[CAB.REASON.ATTENDEE].push(boardAttendeeId);
			} else {
				// otherwise this attendee can be removed
				if (!attendeesToRemove[CAB.REASON.CAB_BOARD])
					attendeesToRemove[CAB.REASON.CAB_BOARD] = [];
				attendeesToRemove[CAB.REASON.CAB_BOARD].push(boardAttendeeId);
			}
		}

		// - and now work out the board members who don't exist as board attendees
		boardAttendeesDiff = this.arrayUtil.diff(currentBoard, currentBoardAttendeeIds);
		for (var k = 0; k < boardAttendeesDiff.length; k++) {
			boardAttendeeId = boardAttendeesDiff[k];
			// if a board attendee is the same as the CAB Manager do not add
			if (currentManagerId.indexOf(boardAttendeeId) >= 0)
				continue;
			// if this board member is already a plain old attendee promote them to the board
			if (currentAttendeeAttendees[boardAttendeeId]) {
				if (!attendeesToUpdate[CAB.REASON.CAB_BOARD])
					attendeesToUpdate[CAB.REASON.CAB_BOARD] = [];
				attendeesToUpdate[CAB.REASON.CAB_BOARD].push(boardAttendeeId);
			} else {
				// otherwise this attendee needs to be added
				if (!attendeesToAdd[CAB.REASON.CAB_BOARD])
					attendeesToAdd[CAB.REASON.CAB_BOARD] = [];
				attendeesToAdd[CAB.REASON.CAB_BOARD].push(boardAttendeeId);
			}
		}

		this.removeAttendees(attendeesToRemove);
		this.updateAttendees(attendeesToUpdate);
		this.addAttendees(attendeesToAdd);
	},

	addAttendees: function(userIdsByReason) {
		if (!userIdsByReason || (typeof userIdsByReason !== "object"))
			return;

		var cabDelegates = [];
		if (!this._gr.delegates.nil())
			cabDelegates = this._gr.delegates.split(",");

		var reasons = Object.keys(userIdsByReason);
		for (var i = 0; i < reasons.length; i++) {
			var reason = reasons[i];
			var attendeeIds = userIdsByReason[reason];
			var attendee;
			for (var j = 0; j < attendeeIds.length; j++) {
				var userId = attendeeIds[j];
				attendee = CABAttendee.newAttendee(userId);
				attendee.setValue("cab_meeting", this._gr.getUniqueValue());
				attendee.setValue("reason", reason);
				attendee.setValue("added", "auto");
				if (reason === CAB.REASON.CAB_MANAGER)
					attendee.setValue("attendance", "attending");
				attendee.insertUpdate();

				if (reason === CAB.REASON.CAB_BOARD && cabDelegates.indexOf(userId) >= 0)
					attendee.createCABDelegateNotifyEvent();
			}
		}
	},

	updateAttendees: function(userIdsByReason) {
		if (!userIdsByReason || (typeof userIdsByReason !== "object"))
			return;

		var cabDelegates = [];
		if (!this._gr.delegates.nil())
			cabDelegates = this._gr.delegates.split(",");

		var attendeeGr = new GlideRecord(CAB.ATTENDEE);

		var reasons = Object.keys(userIdsByReason);
		for (var i = 0; i < reasons.length; i++) {
			var reason = reasons[i];
			var userId = userIdsByReason[reason];
			attendeeGr.initialize();
			attendeeGr.addQuery("cab_meeting", "=", this._gr.getUniqueValue());
			attendeeGr.addQuery("attendee", userId);
			attendeeGr.query();

			while (attendeeGr.next()) {
				attendeeGr.reason = reason;
				attendeeGr.update();

				if (reason === CAB.REASON.CAB_BOARD && cabDelegates.indexOf(userId) >= 0)
					new CABAttendee(attendeeGr).createCABDelegateNotifyEvent();
			}
		}
	},

	removeAttendees: function(userIdsByReason) {
		if (!userIdsByReason || (typeof userIdsByReason !== "object"))
			return;

		var attendeeIds = [];
		var reasons = Object.keys(userIdsByReason);
		for (var i = 0; i < reasons.length; i++)
			attendeeIds = attendeeIds.concat(userIdsByReason[reasons[i]]);

		var attendeeGr = new GlideRecord(CAB.ATTENDEE);
		attendeeGr.initialize();
		attendeeGr.addQuery("cab_meeting", "=", this._gr.getUniqueValue());
		attendeeGr.addQuery("attendee", attendeeIds);
		attendeeGr.deleteMultiple();
	},

	getAttendeeIdsListByReason: function(reasons) {
		var attendeesByReason = this.getAttendeeIdsByReason(reasons);

		var attendees = [];
		var reasons = Object.keys(attendeesByReason);
		for (var i = 0; i < reasons.length; i++)
			attendees = attendees.concat(attendeesByReason[reasons[i]]);

		return attendees;
	},

	getAttendeeIdsByReason: function(reasons, updatedAfter) {
		var attendees = {};

		var attendeeGr = new GlideAggregate(CAB.ATTENDEE);
		attendeeGr.addQuery("cab_meeting", "=", this._gr.getUniqueValue());
		attendeeGr.addNotNullQuery("attendee");
		if (reasons)
			attendeeGr.addQuery("reason", reasons);
		if (updatedAfter)
			attendeeGr.addQuery("sys_updated_on", ">=", updatedAfter);
		attendeeGr.groupBy("reason");
		attendeeGr.groupBy("attendee");
		attendeeGr.query();

		while (attendeeGr.next()) {
			var reason = attendeeGr.getValue("reason");
			if (!attendees[reason])
				attendees[reason] = [];

			attendees[reason].push(attendeeGr.getValue("attendee"));
		}

		return attendees;
	},

	getAttendeesByReasonGlideRecord: function(reasons, updatedAfter) {
		var attendeeGr = new GlideRecord(CAB.ATTENDEE);
		attendeeGr.addQuery("cab_meeting", "=", this._gr.getUniqueValue());
		attendeeGr.addNotNullQuery("attendee");
		if (reasons)
			attendeeGr.addQuery("reason", reasons);
		if (updatedAfter)
			attendeeGr.addQuery("sys_updated_on", ">=", updatedAfter);
		attendeeGr.query();

		return attendeeGr;
	},

	getAttendeesByReason: function(reasons, updatedAfter, fieldNames) {
		var attendees = {};

		var attendeeGr = this.getAttendeesByReasonGlideRecord(reasons, updatedAfter);
		while (attendeeGr.next()) {
			var reason = attendeeGr.getValue("reason");
			if (!attendees[reason])
				attendees[reason] = {};

			var fieldsObj = {};
			attendees[reason][attendeeGr.getValue("attendee")] = fieldsObj;
			if (fieldNames) {
				for (var i = 0; i < fieldNames.length; i++) {
					var fieldName = fieldNames[i];
					if (!attendeeGr.isValidField(fieldName))
						continue;

					fieldsObj[fieldName] = attendeeGr.getValue(fieldName);
				}
			}
		}

		return attendees;
	},

	setIcalDateFields: function() {
		if (!this._gr)
			return;

		var sdt;
		if (this._gr.start.nil())
			this._gr.start_sdt = "";
		else {
			sdt = new GlideScheduleDateTime(this._gr.start.getDisplayValue());
			sdt.convertTimeZone(this._gs.getSession().getTimeZoneName(), "UTC");
			this._gr.start_sdt = sdt.getValue();
		}

		if (this._gr.end.nil())
			this._gr.end_sdt = "";
		else {
			sdt = new GlideScheduleDateTime(this._gr.end.getDisplayValue());
			sdt.convertTimeZone(this._gs.getSession().getTimeZoneName(), "UTC");
			this._gr.end_sdt = sdt.getValue();
		}
	},

	/**
	 * Send cancel invitation to:
	 *     - Meeting attendees who have got the meeting invitation already
	 *     - Those who haven't declined the invitation
	 */
	fireEventForCancelNotification: function() {
		if (!this._gr || !this._gr.getUniqueValue())
			return;
		var attendeeGr = new GlideRecord(CAB.ATTENDEE);
		attendeeGr.addQuery("cab_meeting", "=", this._gr.getUniqueValue());
		attendeeGr.addNotNullQuery("attendee");
		attendeeGr.addQuery("attendance", "!=", "not_attending");
		attendeeGr.addQuery("invite_sent", true);
		attendeeGr.query();
		attendeeGr.setWorkflow(false);
		while (attendeeGr.next()) {
			gs.eventQueue("sn_change_cab.meeting.cancel.notify", attendeeGr);
			attendeeGr.sys_mod_count = attendeeGr.sys_mod_count + 1;
			attendeeGr.update();
		}
	},

	shareMeetingNotes: function() {
		var attendeeIds = this.getAttendeeIdsListByReason();
		var attendeeChunks = this.chunkArray(attendeeIds, 100);

		for (var i = 0; i < attendeeChunks.length; i++)
			gs.eventQueue('sn_change_cab.shareMeetingNotes', this._gr, attendeeChunks[i].toString());
	},

	createCABAttendeeNotifyEvents: function(updatedAfter) {
		if (!this._gr || !this._gr.getUniqueValue())
			return;

		var attendeeGr = this.getAttendeesByReasonGlideRecord(["cab_manager", "cab_board", "attendee"], updatedAfter);
		return this._sendNotifications(attendeeGr);
	},

	createCABAttendeeNotifyEventsForNewAttendees: function() {
		if (!this._gr || !this._gr.getUniqueValue())
			return;

		var attendeeGr = this.getAttendeesByReasonGlideRecord(["cab_manager", "cab_board", "attendee"]);
		attendeeGr.addQuery("invite_sent", false);
		attendeeGr.query();
		return this._sendNotifications(attendeeGr);
	},

	_sendNotifications: function(attendeeGr) {
		attendeeGr.setWorkflow(false);
		var notificationsSent = 0;
		while (attendeeGr.next()) {
			/*
			 * Increment "sys_mod_count" for each attendee receiving an invititation because this value is used as the sequence number in the iCal event we generate. Combination of UID (the meeting
			 * "sys_id) and the sequence ("sys_mod_count") in the iCal event determine allow updating of an existing calendar entry instead of creating a new one each time
			 */
			notificationsSent++;
			attendeeGr.sys_mod_count = attendeeGr.sys_mod_count + 1;
			attendeeGr.update();
			if (attendeeGr.reason + "" === CAB.REASON.CAB_BOARD) {
				var delegates = [];
				if (!this._gr.delegates.nil())
					delegates = this.getValue("delegates").split(",");

				if (delegates.indexOf(attendeeGr.getValue("attendee")) >= 0)
					gs.eventQueue("sn_change_cab.meeting.delegate.invite", attendeeGr);
				else
					gs.eventQueue("sn_change_cab.meeting.cab_board.invite", attendeeGr);
			} else
				gs.eventQueue("sn_change_cab.meeting.attendee.invite", attendeeGr);
		}
		return notificationsSent;
	},

	_getAutoAddedAgendaItemsMap: function() {
		var agendaItemMap = {};

		var agendaItemGr = new GlideRecord(CAB.AGENDA_ITEM);
		agendaItemGr.addQuery('cab_meeting', this._gr.getUniqueValue());
		agendaItemGr.addQuery('added', 'auto');
		agendaItemGr.query();

		while (agendaItemGr.next()) {
			agendaItemMap[agendaItemGr.getValue('task')] = agendaItemGr.getValue('order');
		}

		return agendaItemMap;
	},

	chunkArray: function(arrayToBeChunked, chunkSize) {
		var arrayChunks = [];

		if (!arrayToBeChunked || arrayToBeChunked.length === 0)
			return arrayChunks;

		if (!chunkSize)
			chunkSize = 100;

		for (var i = 0; i < arrayToBeChunked.length; i += chunkSize)
			arrayChunks.push(arrayToBeChunked.slice(i, i + chunkSize));

		return arrayChunks;
	},

	getAttendeeUserSysIds: function() {
		var attendeeSysIds = [];

		var attendeeGr = new GlideRecord(CAB.ATTENDEE);
		attendeeGr.addQuery("cab_meeting", this._gr.getUniqueValue());
		attendeeGr.orderBy("attendee.name");
		attendeeGr.query();

		while (attendeeGr.next())
			attendeeSysIds.push(attendeeGr.attendee + "");

		return attendeeSysIds;
	},

	searchAttendees: function(freetext, limit) {
		limit = isNaN(limit) ? 50 : parseInt(limit);

		var attendeeGr = new GlideRecord("cab_attendee");
		attendeeGr.addQuery("cab_meeting", this._gr.getUniqueValue());
		attendeeGr.addQuery("attendee.active", true);

		if (freetext !== "__firstInit") // Get the first 'limit' records returned
			attendeeGr.addQuery("attendee.name", "CONTAINS", freetext);

		attendeeGr.orderBy("attendee.name");
		attendeeGr.query();

		var attendeeList = [];

		var limitCount = 0;
		while (attendeeGr.next() && limitCount++ < limit) {
			if (!attendeeGr.canRead())
				continue;

			var attendee = new CABAttendee(attendeeGr);

			var attendeeJS = attendee.toJS();
			if (global.ChangeSoCUtil)
				attendeeJS.__profile = new global.ChangeSoCUtil().getUserProfile(attendeeGr.getValue("attendee"));

			attendeeList.push(attendeeJS);
		}

		return attendeeList;
	},

	/**
	 * deprecated.  No longer loading the attendee info like this.
	 */
	getAttendeeWidgetData: function() {
		var attendeeWidgetData = {};

		if (!this._gr || !this._gr.getUniqueValue())
			return attendeeWidgetData;

		attendeeWidgetData.meetingId = this._gr.getUniqueValue();
		attendeeWidgetData.currentUserId = gs.getUserID();
		attendeeWidgetData.attendees = {};

		attendeeWidgetData.sectionOrder = ["cab_manager", "cab_board", "attendee"];
		attendeeWidgetData.sectionData = {
			"cab_manager": {
				"name": gs.getMessage("CAB MANAGER"),
				"attendeeIds": []
			},
			"cab_board": {
				"name": gs.getMessage("BOARD MEMBERS"),
				"attendeeIds": []
			},
			"attendee": {
				"name": gs.getMessage("ATTENDEES"),
				"attendeeIds": []
			}
		};

		var attendeeGr = new GlideRecord(CAB.ATTENDEE);
		attendeeGr.addQuery("cab_meeting", this._gr.getUniqueValue());
		attendeeGr.orderBy("attendee.name");
		attendeeGr.query();

		while (attendeeGr.next()) {
			if (!this._canRead('sys_user', attendeeGr.attendee.sys_id))
				continue;

			var userId = attendeeGr.getValue("attendee");
			var attendeeReason = attendeeGr.getValue("reason");

			if (attendeeWidgetData.sectionData[attendeeReason])
				reason = attendeeReason;

			attendeeWidgetData.attendees[userId] = attendeeGr.getUniqueValue();
			attendeeWidgetData.attendees[userId] = new CABAttendee(attendeeGr).toJS();
			if (global.ChangeSoCUtil)
				attendeeWidgetData.attendees[userId].__profile = new global.ChangeSoCUtil().getUserProfile(userId);
			attendeeWidgetData.sectionData[reason].attendeeIds.push(userId);
		}

		return attendeeWidgetData;
	},

	canHostMeeting: function(hostId) {
		var users = this._gr.manager + ',' + this._gr.delegates;
		if (users.indexOf(hostId) >= 0)
			return true;
		return false;
	},

	updateModifiedFields: function() {
		if (!this._gr || !this._gr.getUniqueValue())
			return;

		// Get the current modified_fields data into an object
		var modifiedFields = this._getModifiedFields();

		/*
		 * If this "cab_meeting" record is being updated by a refresh from the CAB Definition we set a special property in the "modified_fields" as we can ignore any field changes that happen as part
		 * of the refresh
		 */
		if (modifiedFields["__IGNORE_THIS_UPDATE__"]) {
			delete modifiedFields["__IGNORE_THIS_UPDATE__"];
			this._setModifiedFields(modifiedFields);
			return;
		}

		// Now get all the elements in the CAB Meeting record...
		var fieldElements = this._gr.getElements();

		/*
		 * ...and loop over them finding out which ones have changed and adding them to the modifiedFields object
		 */
		for (var i = 0; i < fieldElements.length; i++) {
			var fieldName = fieldElements[i].getED().getName();
			if (!this.EXCLUDE_FIELDS[fieldName] && this._gr[fieldName].changes())
				modifiedFields[fieldName] = "1";
		}

		this._setModifiedFields(modifiedFields);
	},

	ignoreModifiedFields: function() {
		var modifiedFields = this._getModifiedFields();
		modifiedFields["__IGNORE_THIS_UPDATE__"] = "1";
		this._setModifiedFields(modifiedFields);

	},

	_getModifiedFields: function() {
		var modifiedFields = {};
		if (!this._gr.modified_fields.nil())
			modifiedFields = this.jsonUtil.decode(this._gr.modified_fields);

		return modifiedFields;
	},

	_setModifiedFields: function(modifiedFields) {
		if (!modifiedFields)
			modifiedFields = {};

		this.setValue("modified_fields", this.jsonUtil.encode(modifiedFields));
	},

	/*
	 * Refresh the 'CAB Date' field in the change request records of the agenda items. Invoke the agendaItem method named 'updateCABDate' for any agenda item related to this CAB Meeting
	 */
	updateCABDateInChangeRequests: function() {

		var agItms = new GlideRecord(sn_change_cab.CAB.AGENDA_ITEM);
		agItms.addQuery(CAB.MEETING, "=", this._gr.getUniqueValue());
		agItms.query();
		while (agItms.next()) {
			var agendaItem = new CABAgendaItem(agItms);
			agendaItem.updateCABDate();
		}

	},

	/*
	 * Return the next available order.
	 * Order is calculated by getting last pending agenda item order + 100.
	 * If there is no Agenda Item record in pending, return 100
	 */
	getNextOrder: function() {
		if (!this._gr || !this._gr.getUniqueValue())
			return -1;

		return this.getLastPendingAgendaItemOrder() + 100;
	},

	/*
	 * Return the max order value of the Agenda Item records in pending for this CAB meeting.
	 * If there is no Agenda Item record in pending, return 0
	 */
	getLastPendingAgendaItemOrder: function() {
		if (!this._gr || !this._gr.getUniqueValue())
			return -1;

		var agendaItemsGr = new GlideAggregate(CAB.AGENDA_ITEM);
		agendaItemsGr.addQuery(CAB.MEETING, this._gr.getUniqueValue());
		agendaItemsGr.addQuery('state', CAB.MEETING_STATE.PENDING);
		agendaItemsGr.addNotNullQuery('order');
		agendaItemsGr.orderByAggregate('MAX', 'order');
		agendaItemsGr.addAggregate('MAX', 'order');
		agendaItemsGr.query();
		return agendaItemsGr.next() ? parseInt(agendaItemsGr.getAggregate('MAX', 'order')) : 0;
	},

	/*
	 * Return the min order value of the Agenda Item records in pending for this CAB meeting.
	 * If there is no Agenda Item record in pending, return 0
	 */
	getFirstPendingAgendaItemOrder: function() {
		if (!this._gr || !this._gr.getUniqueValue())
			return -1;

		var agendaItemsGr = new GlideAggregate(CAB.AGENDA_ITEM);
		agendaItemsGr.addQuery(CAB.MEETING, this._gr.getUniqueValue());
		agendaItemsGr.addQuery('state', CAB.MEETING_STATE.PENDING);
		agendaItemsGr.addNotNullQuery('order');
		agendaItemsGr.addAggregate('MIN', 'order');
		agendaItemsGr.query();
		return agendaItemsGr.next() ? parseInt(agendaItemsGr.getAggregate('MIN', 'order')) : 0;
	},

	/*
	 * Redistribute the order values of the Agenda Item records of this CAB Meeting.
	 * The sequential order of the Agenda Item records (discussed and pending) is preserved and will not be modified.
	 * Also, after running this function any discussed Agenda Item (state in 'complete,no_decision') will have
	 * an order less than the current Agenda Item. In the same way, any pending Agenda Item will have order
	 * greather than the current one.
	 * Order values will be renewed based on multiples of 100:
	 * First value is 100 for the first Agenda Item, which can be the current one or the firstly discussed (if any).
	 * Then 200,300,400 (and so on) for the other Agenda Items
	 */
	redistributeOrderNumbers: function() {
		if (!this._gr || !this._gr.getUniqueValue())
			return;

		var agendaItem;
		var newOrder = 100;

		var discussedAgendaItemsGr = new GlideRecord(CAB.AGENDA_ITEM);
		discussedAgendaItemsGr.addQuery(CAB.MEETING, this._gr.getUniqueValue());
		discussedAgendaItemsGr.addQuery('state', 'IN', "complete,no_decision");
		discussedAgendaItemsGr.orderBy('order');
		discussedAgendaItemsGr.query();
		while (discussedAgendaItemsGr.next()) {
			agendaItem = new CABAgendaItem(discussedAgendaItemsGr);
			agendaItem.setValue('order', newOrder);
			agendaItem.update();
			newOrder += 100;
		}

		var agendaItemsGr = new GlideRecord(CAB.AGENDA_ITEM);
		agendaItemsGr.addQuery(CAB.MEETING, this._gr.getUniqueValue());
		agendaItemsGr.addQuery('state', 'IN', "pending,in_progress,paused");
		agendaItemsGr.orderBy('order');
		agendaItemsGr.query();
		var currentAgendaItemOrder = newOrder;
		while (agendaItemsGr.next()) {
			agendaItem = new CABAgendaItem(agendaItemsGr);
			if (agendaItem.isPending()) {
				newOrder += 100;
				agendaItem.setValue('order', newOrder);
			} else
				agendaItem.setValue('order', currentAgendaItemOrder);
			agendaItem.update();
		}
	},

	/*
	 * Adds the relevant sort orders to the given GlideRecord. If the sortOrder array is empty, "start_date ascending" will be the default
	 *
	 * glideRecord: the GlideRecord you want to sort
	 * sortOrder: sort order array containing objects {direction: "atoz"|"ztoa", columnName: ""}
	 */
	_addSort: function(glideRecord, sortOrder) {
		if (!glideRecord || !glideRecord.isValid())
			return;

		if (!sortOrder || sortOrder.length === 0) {
			glideRecord.orderBy("start_date");
			return;
		}

		for (var i = 0; i < sortOrder.length; i++) {
			if (sortOrder[i].direction === "atoz")
				glideRecord.orderBy(sortOrder[i].columnName);
			else
				glideRecord.orderByDesc(sortOrder[i].columnName);
		}
	},

	type: "CABMeetingSNC"
});
```