---
title: "OnCallRotationSNC"
id: "oncallrotationsnc"
---

API Name: global.OnCallRotationSNC

```js
var OnCallRotationSNC = Class.create();
OnCallRotationSNC.prototype = {
	TABLES: {
		CMN_ROTA: 'cmn_rota',
		CMN_ROTA_ESCALATION_SET: 'cmn_rota_escalation_set',
		CMN_ROTA_ESCALATION_DEFINITION: 'cmn_rota_esc_step_def',
		CMN_ROTA_ROSTER : 'cmn_rota_roster',
		CMN_ROTA_MEMBER: 'cmn_rota_member',
		SYS_USER: 'sys_user',
		SYS_USER_GROUP: 'sys_user_group',
		CMN_NOTIF_DEVICE: 'cmn_notif_device'
	},

	ESCALATION_TYPE: {
		ROTATE_THROUGH_MEMBER: 'rotate_through_member',
		ROTATE_THROUGH_ROSTER: 'rotate_through_roster',
		CUSTOM: 'custom'
	},

	initialize: function (_gs) {
		this._gs = _gs || gs;
		this._log = new GSLog("com.snc.on_call_rotation.log.level", this.type);
		this._onCallCommon = new OnCallCommon();
		this.arrayUtils = new global.ArrayUtil();

		if (this._log.atLevel(GSLog.DEBUG))
			this.timer = new OCTimer(this.type);

		// Data model used by who() function
		this._groupSysId = "";
		this._rotaSysIds = [];
		this._rotaCustomEscalation = false;
		this._rotaTimeZone = "";
		this._firstDelay = 0;

		// number of entries to return (-1 means all for active roster)
		this._maxEntries = -1;

		// _escalations stores the Escalation list for the current rota
		this._escalationList = new OnCallEscalation();
		this._currentEscalation = null;

		// _escalatees stores the on-call members' Escalation plan in order of escalation. Similar to _escalationList but without repeating entries for the same on-call members
		this._escalatees = this._initEscalationPlan();

		// fEscalationLevel will keep track on the level on the Escalation Plan as its being populated
		this._escalationLevel = 0;
		this._simulateEscalationToAllRotas = false;
	},

	/**
	 * Add members to all rosters of a particular rota and stagger the member orders by 1 for each roster
	 *
	 * rotaSysId [String]
	 * memberUserSysIds [string array]
	 */
	addRosterMembers: function(rotaSysId, memberUserSysIds) {
		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[addRosterMembers] rotaSysId: " + rotaSysId + " memberUserSysIds: " + memberUserSysIds);

		var rosterGr = new GlideRecord("cmn_rota_roster");
		rosterGr.addQuery("rota", rotaSysId + "");
		rosterGr.orderBy("order");
		rosterGr.query();
		var rosterCount = 1;
		while (rosterGr.next()) {
			GlideSession.get().putProperty(OnCallRotationSNC.PROPERTY_SKIP_COMPUTE_SCHEDULES, "true");
			var memberOrder = rosterCount;
			var memberFrom = rosterGr.rotation_start_date + "";
			var memberUserSysIdsLength = memberUserSysIds.length;

			if (this._log.atLevel(GSLog.DEBUG))
				this._log.debug("[addRosterMembers] memberOrder: " + memberOrder + " memberFrom: " + memberFrom + " memberUserSysIdsLength: " + memberUserSysIdsLength);

			for (var i = 0; i < memberUserSysIdsLength; i++) {
				var memberUserSysId = memberUserSysIds[i];
				var onCallMember = new OnCallMember();
				onCallMember.setRosterId(rosterGr.sys_id + "");
				onCallMember.setFrom(memberFrom);
				onCallMember.setMemberId(memberUserSysId);
				onCallMember.setOrder(memberOrder++);
				var onCallMemberSysId = onCallMember.create();

				if (this._log.atLevel(GSLog.DEBUG))
					this._log.debug("[addRosterMembers] onCallMemberSysId: " + onCallMemberSysId + " memberUserSysId: " + memberUserSysId);

				// set the count back to 1 when the number of members is exceeded
				if (memberOrder > memberUserSysIdsLength)
					memberOrder = 1;
			}
			GlideSession.get().putProperty(OnCallRotationSNC.PROPERTY_SKIP_COMPUTE_SCHEDULES, "false");
			this.computeRotationSchedules(rosterGr);
			rosterCount++;
		}
	},

	/**
	 * Add the current escalation to the list of those notified so we know
	 * who has been contacted and can react as appriopriate.
	 */
	addCurrentToNotified: function() {
		if (this._escalationList)
			if (this._currentEscalation)
				this._escalationList.addToNotified(this._currentEscalation);
			else
				this._log.error("addCurrentToNotified called without a current escalation");
		else
			this._log.error("addCurrentToNotified called without escalations defined");
	},

	/**
	 * Cancel any escalations for the GlideRecord that were started with
	 * 'startEscalations'.
	 */
	cancelEscalations: function(documentGr) {
		if (!documentGr)
			return;

		var sysId = documentGr.sys_id + "";
		if (!sysId)
			return;

		var rotaEscalationGr = new GlideRecord("cmn_rota_escalation");
		rotaEscalationGr.addQuery("instance", sysId);
		rotaEscalationGr.query();
		while (rotaEscalationGr.next()) {
			var triggerSysId = rotaEscalationGr.trigger + "";
			if (!triggerSysId)
				continue;
			var triggerGr = new GlideRecord("sys_trigger");
			if (triggerGr.get(triggerSysId))
				triggerGr.deleteRecord();
			rotaEscalationGr.deleteRecord();
		}
	},
/**
 * Recompute Roster Schedules based on timezones
 * Called from BRs 
 */
	getAffectedRotas: function(scheduleId) {
    var scheduleGr = new GlideRecord("cmn_schedule");
    if (scheduleGr.get(scheduleId)) {

        var scheduleType = scheduleGr.getValue("type");
        var rotas = [];
        if (scheduleType === "roster")
            rotas = this._getRotas(scheduleId);
        else {

            var otherScheduleGr = new GlideRecord("cmn_other_schedule");
            otherScheduleGr.addQuery("child_schedule", scheduleId);
            otherScheduleGr.addNotNullQuery("schedule.type").addOrCondition("schedule.type", "=", "roster");
            otherScheduleGr.query();
            while (otherScheduleGr.next()) {
                rotas = rotas.concat(this.getAffectedRotas(otherScheduleGr.getValue("schedule")));
            }
        }
        return this.arrayUtils.unique(rotas);
    }
},
    _getRotas: function(scheduleId) {
         var rotaGr = new GlideRecord("cmn_rota");
         rotaGr.addQuery("schedule", scheduleId);
         rotaGr.query();
         var rotas = [];
         while (rotaGr.next()) {
             rotas.push(rotaGr.getUniqueValue());
         }
         return rotas;
     },
     computeRotaSchedules: function(rotaSysId) {
         var rosterGR = new GlideRecord("cmn_rota_roster");
         rosterGR.initialize();
         rosterGR.addActiveQuery();
         rosterGR.addQuery("rota", rotaSysId);
         rosterGR.query();
         while (rosterGR.next())
             this.computeRotationSchedules(rosterGR);
     },
	/**
	 * Compute the rotation schedules for a roster based on the rotation
	 * values specified for the roster.
	 */
	computeRotationSchedules: function(rosterGr) {
		this._getOnCallRosterByGr(rosterGr).computeRotationSchedules();
	},

	_getTaskGrFromEscalation: function (escalationGr) {
		var taskTable = escalationGr.table;
		var taskSysId = escalationGr.instance;
		if (taskTable && taskSysId) {
			var taskGr = new GlideRecord(taskTable);
			if (taskGr.get(taskSysId))
				return taskGr;
		}
	},

	/**
	 * Continue the escalation process for the group (call after a successful
	 * call to whoIsNext from within the escalation business rule script)
	 */
	continueEscalations: function(escalationGr) {
		if (!this._groupSysId || !this._rotaSysIds || (this._rotaSysIds && this._rotaSysIds.length == 0)) {
			// Invalid calling sequence, Ignore this request
			// Call who or whoIsNext before this is called so that the notifications are properly set up for escalation
			if (escalationGr)
				escalationGr.deleteRecord();
			this._log.error("[continueEscalations] Escalations called out of sequence");
			return;
		}

		// Figure out when the first escalation needs to fire
		var runAt = this._escalationList.runAt();
		if (runAt < 0) {
			// No more escalations - see if there are more rosters to run through
			var taskGr = this._getTaskGrFromEscalation(escalationGr);
			this._escalationList.clear();
			this._currentEscalation = null;
			this._checkForMoreRotas(taskGr);
			if (this.isEmptyAnytime()) {
				escalationGr.deleteRecord();
				return;
			}
			runAt = this._escalationList.runAt();
		}

		escalationGr.setValue("escalation_document", this.getFullEscalationDocument());
		var gr = new GlideRecord(escalationGr.table + "");
		gr.get(escalationGr.instance + "");
		var triggerSysId = this._scheduleEscalationTrigger(gr, escalationGr.sys_id + "", runAt);
		if (triggerSysId)
			escalationGr.setValue("trigger", triggerSysId);
		escalationGr.update();
	},

	/**
	 * Create rosters for any particular rota
	 *
	 * rotaSysId [string]
	 * numRosters [number]
	 * numReminders [number]
	 * startGdt [GlideDateTime]
	 * timeBtwReminders [GlideDuration]
	 *
	 */
	createRosters: function(rotaSysId, numRosters, numReminders, startGdt, timeBtwRemindersDur, rotationIntervalType, rotationIntervalCount, dowForRotate, rosterName, rosterOrder) {
		var rosterSysIds = [];
		var isAllDay = this._isAllDayRoster;
		
		rotationIntervalType = rotationIntervalType ? rotationIntervalType : OnCallRotationSNC.DEFAULT_ROTATION_INTERVAL_TYPE;
		rotationIntervalCount = rotationIntervalCount ? rotationIntervalCount : OnCallRotationSNC.DEFAULT_ROTATION_INTERVAL_COUNT;

		if (this._log.atLevel(GSLog.DEBUG))
				this._log.debug("[createRosters] rotaSysId: " + rotaSysId + " numRosters: " + numRosters + " numReminders: " + numReminders + " startGdt: " + startGdt + " timeBtwRemindersDur: " + timeBtwRemindersDur + " isAllDay: " + isAllDay);

		var groupDomain = "";
		for (var i = 0; i < numRosters; i++) {
			var rosterGr = new GlideRecord("cmn_rota_roster");
			rosterGr.initialize();
			rosterGr.setValue("rota", rotaSysId);
			if (rosterOrder)
				rosterGr.setValue("order", rosterOrder);
			else
				rosterGr.setValue("order", i + 1);
			rosterGr.setValue("rotation_interval_type", rotationIntervalType);
			rosterGr.setValue("rotation_interval_count", rotationIntervalCount);
			rosterGr.setValue("rotation_all_day", isAllDay);
			rosterGr.setValue("attempts", numReminders);
			rosterGr.setValue("time_between_reminders", timeBtwRemindersDur.getValue() + "");
			rosterGr.setDisplayValue("rotation_start_date", startGdt.getDate().getDisplayValue() + "");
			if (rosterName)
				rosterGr.setValue("name", rosterName);
			else
				rosterGr.setValue("name", this._getSequenceName(i));
			if(rotationIntervalType == 'weekly' && !isNaN(dowForRotate))
				rosterGr.setValue("dow_for_rotate", dowForRotate);
			if (!isAllDay)
				rosterGr.setValue("rotation_start_time", this._onCallCommon.gitToTime(this._rosterStartGit));

			if (i === 0) {
				var rotaGr = new GlideRecord("cmn_rota");
				if (rotaGr.get(rotaSysId))
					groupDomain = rotaGr.group.sys_domain + "";
			}

			if (groupDomain)
				rosterGr.setValue("sys_domain", groupDomain);

			var rosterSysId = rosterGr.insert();
			rosterSysIds.push(rosterSysId);

			if (this._log.atLevel(GSLog.DEBUG))
				this._log.debug("[createRosters] rosterSysId: " + rosterSysId + " start: " + startGdt.getDate().getDisplayValue());
		}
		return rosterSysIds;
	},

	createSimpleRotaFromSchedule: function(rotaName, groupSysId, scheduleSysId, numRosters, numReminders, members, rosterStart, timeBtwReminders, rotationIntervalType, rotationIntervalCount, dowForRotate, sendReminders, reminderLeadTime, coverageLeadType, coverageInterval) {
		
		GlideSession.get().putProperty(OnCallRotationSNC.PROPERTY_IS_WIZARD, "true");
		rotaName = rotaName || "";
		groupSysId = groupSysId || "";
		scheduleSysId = scheduleSysId || "";
		numRosters = numRosters ? parseInt(numRosters) : 0;
		numReminders = numReminders ? parseInt(numReminders) : 0;
		members = (members + "").split(",");

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[createSimpleRotaFromSchedule] rotaName: " + rotaName + " groupSysId: " + groupSysId + " scheduleSysId: " + scheduleSysId +
			" numRosters: " + numRosters + " numReminders: " + numReminders + " members: " + members + " rosterStart: " + rosterStart +
			" timeBtwReminders: " + timeBtwReminders);

		var rosterStartGdt = new GlideDateTime();
		if (rosterStart)
			rosterStartGdt.setValue(rosterStart);
		var timeBtwRemindersDur = new GlideDuration(parseInt(timeBtwReminders) * 60000);
		var rotaSysId = this.createNewRota(rotaName, groupSysId, scheduleSysId, rosterStartGdt, null, null, null, null, sendReminders, reminderLeadTime, coverageLeadType, coverageInterval);
		if (rotaSysId) {
			this.createRosters(rotaSysId, parseInt(numRosters), parseInt(numReminders), rosterStartGdt, timeBtwRemindersDur, rotationIntervalType, parseInt(rotationIntervalCount), dowForRotate);
			this.addRosterMembers(rotaSysId, members);
		}
		GlideSession.get().putProperty(OnCallRotationSNC.PROPERTY_IS_WIZARD, "false");
		return rotaSysId;
	},

	createSimpleRotaNewSchedule: function(rotaName, groupSysId, timezone, startGdt, endGdt, repeats, isAllDay, numRosters, numReminders, rosterStart, members, timeBtwReminders, scheduleName, rotationIntervalType, rotationIntervalCount, dowForRotate, sendReminders, reminderLeadTime, coverageLeadType, coverageInterval) {
		GlideSession.get().putProperty(OnCallRotationSNC.PROPERTY_IS_WIZARD, "true");
		rotaName = rotaName || "";
		groupSysId = groupSysId || "";
		timezone = timezone || "";
		startGdt = new GlideDateTime(startGdt);
		endGdt = new GlideDateTime(endGdt);
		repeats = repeats || "";
		isAllDay = isAllDay + "" === "true" ? true : false;
		numRosters = numRosters ? parseInt(numRosters) : 0;
		numReminders = numReminders ? parseInt(numReminders) : 0;
		members = (members + "").split(",");
		scheduleName = scheduleName || "";
		members = (members + "").split(",");

		if (isAllDay) {
			endGdt.setDisplayValueInternal(startGdt.getDisplayValueInternal());
			endGdt.addSeconds(86399); //(23 * 60 * 60) + (59 * 60) + 59
		}

		var rosterStartGdt = new GlideDateTime();
		if (rosterStart)
			rosterStartGdt.setValue(rosterStart);
		var timeBtwRemindersDur = new GlideDuration(parseInt(timeBtwReminders) * 60000);

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[createSimpleRotaNewSchedule] rotaName: " + rotaName + " groupSysId: " + groupSysId + " timezone: " + timezone +
			" startGdt: " + startGdt + " endGdt: " + endGdt + " repeats: " + repeats + " isAllDay: " + isAllDay + " numRosters: " + numRosters +
			" numReminders: " + numReminders + " members: " + members + " rosterStart: " + rosterStart + " scheduleName: " + scheduleName +
			" timeBtwReminders: " + timeBtwReminders);

		var rotaSysId = this.createNewRota(rotaName, groupSysId, timezone, startGdt, endGdt, repeats, isAllDay, scheduleName, sendReminders, reminderLeadTime, coverageLeadType, coverageInterval);
		if (rotaSysId) {
			this.createRosters(rotaSysId, parseInt(numRosters), parseInt(numReminders), rosterStartGdt, timeBtwRemindersDur, rotationIntervalType, parseInt(rotationIntervalCount), dowForRotate);
			this.addRosterMembers(rotaSysId, members);
		}
		GlideSession.get().putProperty(OnCallRotationSNC.PROPERTY_IS_WIZARD, "false");
		return rotaSysId;
	},

	/**
	 * Create a new rota and a new schedule to go with it with the given params
	 *
	 * rotaName [string]
	 * groupSysId [string]
	 * scheduleSysId [string] schedule sys_id OR timzone if scheduleName defined (from overloaded java method)
	 * startGdt [GlideDateTime]
	 * endGdt [GlideDateTime]
	 * repeats
	 * isAllDay [boolean]
	 * scheduleName [string]
	 */
	createNewRota: function(rotaName, groupSysId, scheduleSysId, startGdt, endGdt, repeats, isAllDay, scheduleName, sendReminders, reminderLeadTime, coverageLeadType, coverageInterval, days, isDraft) {
		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[createNewRota] rotaName: " + rotaName + " groupSysId: " + groupSysId + " scheduleSysId: " + scheduleSysId + " startGdt: " + startGdt + " endGdt: " + endGdt + " repeats: " + repeats + " isAllDay: " + isAllDay + " scheduleName: " + scheduleName);

		// Overlapping check for existing rota
		if (!scheduleName && scheduleSysId) {
			var overlappingRota = this._getExistingSpanOverlappingRota(groupSysId, scheduleSysId, startGdt);
			if (JSUtil.notNil(overlappingRota)) {
				gs.addErrorMessage(gs.getMessage("Cannot create the shift, The selected schedule overlaps with the '{0}' rotation schedule.", [overlappingRota]));
				return "";
			}
		}

		var rotaGr = this._createNewRota(rotaName, groupSysId, isDraft);
		if (!rotaGr)
			return "";

		rotaGr.setValue('send_reminders', sendReminders);
		rotaGr.setValue('reminder_lead_time', reminderLeadTime);
		rotaGr.setValue('coverage_lead_type', coverageLeadType);
		rotaGr.setValue('coverage_interval', coverageInterval);

		if (scheduleName) {
			var timezone = scheduleSysId;
			scheduleSysId = this._createNewRosterSchedule(timezone, scheduleName);
			rotaGr.setValue("schedule", scheduleSysId);
			rotaGr.update();
			var newScheduleSpanSysId = this._createScheduleSpanWithDefaults(startGdt || new GlideDateTime(), endGdt || new GlideDateTime(), repeats + "", isAllDay	+ "" === "true" ? true : false, days);
			// Overlapping check for new rota, schedule span creation fails, so simply verifying it.
			if (!newScheduleSpanSysId) {
				rotaGr.get(rotaGr.sys_id + "");
				rotaGr.deleteRecord();
				gs.addErrorMessage(gs.getMessage("Cannot create the shift"));
				return "";
			} else {
				//Overlapping check for new draft shift spans
				var overlappingDraftRota = this._getExistingSpanOverlappingRota(groupSysId, scheduleSysId, startGdt);
				if (JSUtil.notNil(overlappingDraftRota)) {
					rotaGr.get(rotaGr.sys_id + "");
					rotaGr.deleteRecord();
					gs.addErrorMessage(gs.getMessage("Cannot create the shift, The selected schedule overlaps with the '{0}' rotation schedule.", [overlappingDraftRota]));
					return "";
				}
			}
		} else if (scheduleSysId) {
			rotaGr.setValue("based_on", scheduleSysId);
			rotaGr.setValue("schedule", this._createRosterScheduleFromExisting(scheduleSysId, startGdt || new GlideDateTime()));
			rotaGr.update();
		}

		return rotaGr.sys_id + "";
	},

	_getExistingSpanOverlappingRota: function(groupSysId, scheduleSysId, startGdt) {
		if (!this._onCallCommon.isOverlapAllowed(groupSysId)) {
			var newSpan = new GlideRecord("cmn_schedule_span");
			newSpan.addQuery("schedule", scheduleSysId);
			newSpan.addQuery("type", "on_call");
			newSpan.addQuery("show_as", "on_call");
			newSpan.query();
			while (newSpan.next()) {
				// if we get a rota name back that means this span overlaps an existing rota schedule

				var overlappingRota = new ValidateSchedule().scheduleOverlaps(newSpan, groupSysId, startGdt);
				if (JSUtil.notNil(overlappingRota))
					return overlappingRota;
			}
		}
	},

	updateGroupPreferences: function(groupSysId, rotaManagers, ptoApprovalConfig, allowRotaOverlap, escalationRuleRotaOverlap) {
		var groupPrefGr = this.getGroupPreferenceByGroup(groupSysId);
		if (groupPrefGr) {
			this.populateGroupPreferenceRecord(groupPrefGr, groupSysId, rotaManagers, ptoApprovalConfig, allowRotaOverlap, escalationRuleRotaOverlap);
			groupPrefGr.update();
		} else {
			groupPrefGr = new GlideRecord('on_call_group_preference');
			groupPrefGr.initialize();
			this.populateGroupPreferenceRecord(groupPrefGr, groupSysId, rotaManagers, ptoApprovalConfig, allowRotaOverlap, escalationRuleRotaOverlap);
			groupPrefGr.insert();
		}
	},

	populateGroupPreferenceRecord: function(groupPrefGr, groupSysId, rotaManagers, ptoApprovalConfig, allowRotaOverlap, escalationRuleRotaOverlap) {
		groupPrefGr.setValue('group', groupSysId);
		groupPrefGr.setValue('rota_managers', rotaManagers + '');
		groupPrefGr.setValue('pto_approval_config', ptoApprovalConfig);
		groupPrefGr.setValue('allow_rota_overlap', allowRotaOverlap);
		groupPrefGr.setValue('escalation_rule_rota_overlap', escalationRuleRotaOverlap);
	},

	getGroupPreferenceByGroup: function(groupSysId) {
		var groupPrefGr = new GlideRecord('on_call_group_preference');
		groupPrefGr.addQuery('group', groupSysId);
		groupPrefGr.query();
		if (groupPrefGr.next())
			return groupPrefGr;
	},

	/**
	 *  Get an array of active Rotas (cmn_rota) for a given Group ID (sys_user_group)
	 *
	 * groupSysIds [string or array] sys_user_group sys_ids
	 * return [Array]: An array of rota objects which each contain three keys, 'sys_id', 'name', and 'group_sys_id' of the cmn_rota record
	 *
	 */
	getRotasByGroup: function(groupSysIds) {
		var rotas = [];
		if (!groupSysIds)
			return rotas;
		var gr = new GlideRecord("cmn_rota");
		gr.addQuery("group", "IN", groupSysIds);
		gr.addActiveQuery();
		gr.query();
		while (gr.next())
			rotas.push({
				name: gr.name + "",
				sys_id: gr.sys_id + "",
				group_sys_id: gr.group + ""
			});
		return rotas;
	},

	gotoTop: function() {
		this._escalationList.gotoTop();
	},

	getEscalationPlan: function(groupSysId, gdt, rotaSysIds, taskGr) {
		groupSysId = groupSysId || this._escalationList.getGroupID();
		gdt = gdt || new GlideDateTime();
		if (!groupSysId) {
			this._log.error("Must have exactly two arguments (String groupID, GlideDateTime time) or have who(String groupSysId) called with valid groupSysId");
			return null;
		}
		this.whoAt(groupSysId, gdt, rotaSysIds, taskGr);
		return this._escalatees;
	},

	getEscalationPlanByEscalationSet: function (escalationSetSysId, groupSysId, rotaSysIds, gdt) {
		gdt = gdt || new GlideDateTime();

		if (!groupSysId || !rotaSysIds) {
			var escalationSetGr = this._getEscalationSetById(escalationSetSysId);
			if (escalationSetGr) {
				groupSysId = escalationSetGr.cmn_rota.group + '';
				rotaSysIds = escalationSetGr.cmn_rota + '';
			}
			else
				return [];
		}
		this.forcedEscalationSetSysId = escalationSetSysId;
		this.whoAt(groupSysId, gdt, rotaSysIds);
		this.forcedEscalationSetSysId = null;
		return this._escalatees;
	},

	/**
	 * Get the escalation document with all of the entries in it
	 *
	 * return [string] XML document containing all escalations
	 */
	getFullEscalationDocument: function() {
		return GlideXMLUtil.toString(this._escalationList.toXml(true));
	},

	getMaxEntries: function() {
		return this._maxEntries;
	},

	/**
	 * Provide list of escalatees that are On-call for a given time. If no time specified
	 * then current time is used. If no groupSysIds are provided return empty list
	 *
	 * groupIds [String]: comma seperated list of sys_user_group sys_ids to filter by
	 * rotaIds [String]: comma seperated list of cmn_rota sys_ids to filter records by
	 * rosterIds [String]: comma seperated list of cmn_rota_roster sys_ids to filter records by
	 * gdt [GlideDateTime]: date in UTC timezone
	 *
	 */
	getEscalatees: function(groupIds, rotaIds, rosterIds, gdt, overrideCustomEscalation, taskGr) {
		var members = [];
		var escalatees = this._getEscalatees(groupIds, rotaIds, rosterIds, gdt, false, overrideCustomEscalation, taskGr);
		escalatees.forEach(function(escalatee) {
			members.push({
				memberId: escalatee.getMemberId(),
				memberIds: escalatee.getMemberIds(),
				userId: escalatee.getUserId(),
				userIds: escalatee.getUserIds(),
				roster: escalatee.getRosterId(),
				rota: escalatee.getRotaId(),
				group: escalatee.getGroupId(),
				escalationGroups: escalatee.getEscalationGroups(),
				deviceId: escalatee.getDeviceId(),
				deviceIds: escalatee.getDeviceIds(),
				isDevice: escalatee.getIsDevice(),
				order: escalatee.getOrder(),
				isOverride: escalatee.getIsOverride(),
				rotationScheduleId: escalatee.getRotaScheduleId(),
				memberScheduleId: escalatee.getMemberScheduleId()
			});
		});
		return members;
	},

	/**
	 * Get the escalatee (either a user or device record depending on the notification rules) at a specific time and
	 * position.
	 *
	 * groupSysId [String]
	 * gdt [GlideDateTime]
	 * position [number]
	 * return [GlideRecord] escalateeGr
	 */
	getEscalateeAt: function(groupSysId, gdt, position) {

		// build the escalation document for the specified group and time and extract the escalatee XML nodes
		this.whoAt(groupSysId, gdt);

		if (position < 1 || position > this._escalatees.length)
			return null;

		var escalatee = this._escalatees[position - 1];
		var escalateeSysId = escalatee.getUserId();
		var tableName = "sys_user";

		if (!escalateeSysId) {
			escalateeSysId = escalatee.getDeviceId();
			tableName = "cmn_notif_device";
		}

		var escalateeGr = new GlideRecord(tableName);
		if (escalateeSysId && escalateeGr.get(escalateeSysId))
			return escalateeGr;
		return null;
	},

	/**
	 * Get the escalatees (either a user or device record depending on the notification rules) at a specific time and position.
	 *
	 * groupSysId [String]
	 * gdt [GlideDateTime]
	 * position [number]
	 * return [GlideRecord] escalateeGr
	 */
	getEscalateesAt: function(groupSysId, gdt, position, taskGr) {

		// build the escalation document for the specified group and time and extract the escalatee XML nodes
		this.whoAt(groupSysId, gdt, '', taskGr);

		if (position < 1 || position > this._escalatees.length)
			return null;

		var escalateesGr = [];
		var escalateeGr;
		var escalatee = this._escalatees[position - 1];
		var users = [];
		var groups = [];
		var devices = [];
		if (escalatee.getUserId())
			users.push(escalatee.getUserId());
		if (escalatee.getUserIds() && escalatee.getUserIds().length > 0)
			users = users.concat(escalatee.getUserIds());
		var i, j;
		for (i = 0; i < users.length; i++) {
			escalateeGr = new GlideRecord(this.TABLES.SYS_USER);
			if (escalateeGr.get(users[i]))
				escalateesGr.push(escalateeGr);
		}

		if (escalatee.getEscalationGroups() && escalatee.getEscalationGroups().length > 0)
			groups = groups.concat(escalatee.getEscalationGroups());

		for (i = 0; i < groups.length; i++) {
			escalateeGr = new GlideRecord(this.TABLES.SYS_USER_GROUP);
			if (escalateeGr.get(groups[i]))
				escalateesGr.push(escalateeGr);
		}

		if (escalatee.getDeviceId())
			devices.push(escalatee.getDeviceId());
		if (escalatee.getDeviceIds() && escalatee.getDeviceIds().length > 0)
			devices = devices.concat(escalatee.getDeviceIds());

		for (i = 0; i < devices.length; i++) {
			escalateeGr = new GlideRecord(this.TABLES.CMN_NOTIF_DEVICE);
			if (escalateeGr.get(devices[i]))
				escalateesGr.push(escalateeGr);
		}

		if (escalatee.additionalEscalatees) {
			for (i = 0; i < escalatee.additionalEscalatees.length; i++) {
				var additionalEscalatee = escalatee.additionalEscalatees[i];

				users = [];
				groups = [];
				devices = [];
				if (additionalEscalatee.getUserId())
					users.push(additionalEscalatee.getUserId());
				if (additionalEscalatee.getUserIds() && additionalEscalatee.getUserIds().length > 0)
					users = users.concat(additionalEscalatee.getUserIds());

				for (j = 0; j < users.length; j++) {
					escalateeGr = new GlideRecord(this.TABLES.SYS_USER);
					if (escalateeGr.get(users[j]))
						escalateesGr.push(escalateeGr);
				}

				if (additionalEscalatee.getEscalationGroups() && additionalEscalatee.getEscalationGroups().length > 0)
					groups = groups.concat(additionalEscalatee.getEscalationGroups());

				for (j = 0; j < groups.length; j++) {
					escalateeGr = new GlideRecord(this.TABLES.SYS_USER_GROUP);
					if (escalateeGr.get(groups[j]))
						escalateesGr.push(escalateeGr);
				}

				if (additionalEscalatee.getDeviceId())
					devices.push(additionalEscalatee.getDeviceId());
				if (additionalEscalatee.getDeviceIds() && additionalEscalatee.getDeviceIds().length > 0)
					devices = devices.concat(additionalEscalatee.getDeviceIds());

				for (j = 0; j < devices.length; j++) {
					escalateeGr = new GlideRecord(this.TABLES.CMN_NOTIF_DEVICE);
					if (escalateeGr.get(devices[j]))
						escalateesGr.push(escalateeGr);
				}
			}
		}

		return escalateesGr;
	},

	getEscalationType: function(rotaSysId) {
		return this._escalationList.getEscalationType(rotaSysId);
	},

	/**
	 * Get a value from the current notification. The 'get' methods are used to get information about
	 * the current notification information that was set up as a result of a 'who' or 'whoAt' call.
	 *
	 * The current notification is positioned by calling calling the next() method
	 *
	 * name: [string] key to fetch the value for
	 * return: [string] the value of the key/value pair
	 */
	getValue: function(name) {
		if ("rota" === name)
			return this._escalationList.getRotaID();
		if ("group" === name)
			return this._groupSysId;
		if ("primary_user" === name)
			return this._escalationList.getPrimaryUserID();
		if ("primary_users" === name)
			return this._escalationList.getPrimaryUsers();
		if ("primary_user_name" === name)
			return this._escalationList.getPrimaryUserName();
		if ("first_delay" === name)
			return this._firstDelay + "";
		if (this._currentEscalation)
			return this._currentEscalation.get(name);
		return null;
	},

	/**
	 * Get the type of notification - can be:
	 * device - group device such as phone, pager or email
	 * rotation - user notification for an roster rotation member
	 * user - user notification to a specific member of the group
	 */
	getType: function() {
		return this.getValue("type");
	},

	/**
	 * Get the delay time for this notification
	 * return [GlideDuration] with the delay set
	 */
	getDelay: function() {
		var dur = new GlideDuration();
		var delay = parseInt(this.getValue("delay"));
		if (isNaN(delay))
			delay = 0;
		dur.setValue(delay * 1000);
		return dur;
	},

	/**
	* Get the time of contact for this notification
	*
	* retun [GlideDateTime] run at time set
	*/
	getContactAt: function() {
		var runAt = new GlideDateTime();
		var runAtTime = parseInt(this.getValue("run_at")) * 1;
		if (runAtTime > 0) {
			runAt.setValue(runAtTime);
		}
		return runAt;
	},

	/**
	 * Get the escalation group id for this notification
	 * return [String] escalationGroupId
	 */
	getEscalationGroupId: function() {
		return this.getValue("group_id");
	},

	/**
	 * Get the device id for this notification
	 * return [String] deviceId
	 */
	getDeviceId: function() {
		return this.getValue("device_id");
	},

	/**
	 * Get the sys_id of the catch all record
	 *
	 * rotaSysId [String] the rota sys_id
	 * return [String] the rota catch all sys_id
	 */
	getCatchAll: function(rotaSysId) {
		var rotaGr = new GlideRecord("cmn_rota");
		if (!rotaGr.get(rotaSysId))
			return null;

		if(rotaGr.getValue('use_custom_escalation') == '1')
			return null;

		var catchAll = (rotaGr.catch_all + "").toLowerCase();
		if (catchAll === "group_manager") {
			var groupGr = new GlideRecord("sys_user_group");
			if (groupGr.get(rotaGr.group + ""))
				return groupGr.manager + "";
			return null;
		}
		if (catchAll === "individual") {
			var catchAllMember = rotaGr.catch_all_member + "";
			if (catchAllMember)
				return catchAllMember;
			return null;
		}
		if (catchAll === "all") {
			var catchAllRoster = rotaGr.catch_all_roster + "";
			if (catchAllRoster)
				return catchAllRoster;
			return null;
		}
		return null;
	},

	getRotaIDs: function () {
		//_escalationList.rotaSysIds is set when who() method is invoked
		return this._escalationList.getRotaIDs();
	},

	/**
	 * Get the catch all type for this rota
	 *
	 * rotaSysId [String] the rota sys_id
	 * return [String] the rota catch all type
	 */
	getCatchAllType: function(rotaSysId) {
		var rotaGr = new GlideRecord("cmn_rota");
		if (rotaGr.get(rotaSysId)) {
			if(rotaGr.getValue('use_custom_escalation') == '1')
				return null;
			return rotaGr.catch_all + "";
		}
		return null;
	},

	/**
	 * Get the id of the current primary contact
	 */
	getPrimaryUser: function() {
		return this.getValue("primary_user");
	},

	/**
	 * Get the list of the primary contacts
	 */
	getPrimaryUsers: function() {
		return this.getValue("primary_users");
	},

	/**
	 * Get the id of the current primary contact
	 */
	getPrimaryUserByRota: function(rotaSysId) {
		return this.getValue("primary_users")[rotaSysId] ? this.getValue("primary_users")[rotaSysId].userSysId : null;
	},

	/**
	 * Get the name of the current primary contact
	 */
	getPrimaryUserName: function() {
		return this.getValue("primary_user_name");
	},

	/**
	 * Get the id of the current primary contact
	 */
	getPrimaryUserNameByRota: function(rotaSysId) {
		return this.getValue("primary_users")[rotaSysId] ? this.getValue("primary_users")[rotaSysId].userName : null;
	},

	/**
	 * Get the id of the group this rotation is associated with
	 */
	getGroup: function() {
		return this.getValue("group");
	},

	/**
	 * Get the name of the group this rotation is associated with
	 */
	getGroupName: function() {
		return this.getValue("group_name");
	},

	/**
	 * Get the id of the currently active rota
	 */
	getRota: function() {
		return this.getValue("rota");
	},

	/**
	 * Get the id of the rota from current escalation
	 */
	getRotaFromCurrentEscalation: function() {
		if (this._currentEscalation)
			return this._currentEscalation.get("rota");
		return null;
	},

	/**
	 * Get the id of the currently active roster
	 */
	getRoster: function() {
		return this.getValue("roster");
	},

	/**
	 * Get the name of user to notify
	 * (only valid when getType() returns something other than 'device')
	 */
	getUserName: function() {
		return this.getValue("user_name");
	},

	/**
	 * Get the id of the user to notify
	 * (only valid when getType() returns something other than 'device')
	 */
	getUser: function() {
		return this.getValue("user");
	},

	/**
	 * Get the device info (including the email_suffix is this is an sms message with a phone number)
	 * (only valid when getType() returns 'device')
	 */
	getDevice: function() {
		return this.getValue("device");
	},

	getDeviceName: function() {
		return this.getValue("device_name");
	},

	getDeviceEmail: function() {
		return this.getValue("device_email");
	},

	getDeviceSMSAddress: function() {
		return this.getValue("device_sms_address");
	},

	getDevicePhoneNumber: function() {
		return this.getValue("device_phone_number");
	},

	/**
	 * Get a flag indicating whether this should be an SMS message
	 * (only valid when getType() returns 'device')
	 * @Invalid method
	 * @deprecated
	 */
	getSMS: function() {
		throw 'deprecated';
	},

	/**
	 * Get the device service provider name
	 * (only valid when getType() returns 'device')
	 */
	getProvider: function() {
		return this.getValue("device_provider");
	},

	/**
	 * Get the base device contact info (should really use getDevice() method to get this information
	 * as that method handles appending the SMS email suffix if required)
	 * (only valid when getType() returns 'device')
	 */
	getDeviceContact: function() {
		return this.getValue("device_contact");
	},

	/**
	 * Get the type of device to notify - can be:
	 * phone
	 * pager
	 * email
	 *
	 * (only valid when getType() returns 'device')
	 */
	getDeviceType: function() {
		return this.getValue("device_type");
	},

	/**
	 * Returns true if there are no notifications available now
	 *
	 * return: [boolean] are there any more notifications
	 */
	isEmpty: function() {
		this._escalationList.gotoTop();
		var found = this.next();
		this._escalationList.gotoTop();
		return !found;
	},

	/**
	 * True if there are no notifications available at any time
	 *
	 * return [boolean] whether there are any notifications at any given time
	 */
	isEmptyAnytime: function() {
		this._escalationList.gotoTop();
		var found = this.nextAnytime();
		this._escalationList.gotoTop();

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[isEmptyAnytime] no notifications available at any time: " + !found);

		return !found;
	},

	/**
	 * Move to the next notification entry so that calls to get...() will
	 * return information about the next entry.
	 *
	 * Returns true if there is another entry that is ready to be notified
	 * or false if there are no more entries available for notification.
	 */
	next: function() {
		this._currentEscalation = this._escalationList.next();
		if (this._currentEscalation != null)
			if (this._currentEscalation.getRunAt() <= new GlideDateTime().getNumericValue())
				return true;
		this._currentEscalation = null;
		return false;
	},

	/**
	 * Move to the next notification entry so that calls to get...() will
	 * return information about the next entry.
	 *
	 * This is different from 'next' in that 'next' only returns the next
	 * entry if it is ready to be notified.  This function returns the
	 * next notification entry even if it is to be notified in the future.
	 *
	 * See next: function() comments for more details
	 *
	 * return [boolean] true if there is another entry or false if there are no more
	 * entries available for notification.
	 */
	nextAnytime: function() {
		this._currentEscalation = this._escalationList.next();
		return this._currentEscalation ? true : false;
	},

	/**
	 * Returns data used by the OnCall Groups landing page.
	 *
	 * dateTime [String]: "yyyy-MM-dd HH:mm:ss" format in UTC timezone. Default is now
	 * offset [integer]: number of records to skip at begining of dataset. Default is 0 (do not skip any records)
	 * groupsLimit [integer]: number of records to return, but cannot exceed com.snc.on_call_rotation.landing_page.group_limit which is also the default.
	 *
	 */
	onCallGroups: function(dateTime, offset, groupsLimit, filter, textSearch, excludeGroupSysIds, textSearchType) {
		if (this._log.atLevel(GSLog.DEBUG))
			this.timer.start("[onCallGroups]");

		offset = offset || 0;
		dateTime = dateTime + "";
		var gdt = new GlideDateTime();
		if (dateTime)
			gdt.setValue(dateTime);

		groupsLimit = parseInt(groupsLimit);

		if (!groupsLimit || isNaN(groupsLimit) || groupsLimit > this.groupsLimit)
			groupsLimit = parseInt(this._gs.getProperty("com.snc.on_call_rotation.landing_page.group_limit", "20"));

		textSearch = textSearch || "";
		excludeGroupSysIds = excludeGroupSysIds || "";

		var groups = new OCRotationV2().getGroups(groupsLimit, offset, filter, textSearch, excludeGroupSysIds, textSearchType);
		var showPendingActions = gs.getProperty("com.snc.on_call_rotation.landing_page.show_pending_actions", "true") == "true";
		if (showPendingActions)
			this._addPendingActionsCount(groups);
		return this._processOnCallGroups(groups, gdt);
	},

	_addPendingActionsCount: function (groups) {
		var days = gs.getProperty("com.snc.on_call_rotation.upcoming_rota_days", 30);
		var ocSecurityNg = new OnCallSecurityNG();
		var oc = new OCOddityChecker();
		var context = this;
		
		var todayDate = new GlideDate();
		var from = todayDate.getDisplayValueInternal();
		todayDate.addDays(days);
		var to = todayDate.getDisplayValueInternal();
		
		var dateDiff = gs.dateDiff(from, to, true);
		var dateDiffInDays = parseInt(dateDiff / (24 * 60 * 60));
		
		var groupSysIds = [];
		for (var i = 0; i < groups.length; i++) {
			groupSysIds.push(groups[i].sys_id);
		}
		var groupManagerAccessMap = ocSecurityNg.getManagerAccessForGroups(groupSysIds);
		
		groups = groups.map(function(group) {
			if (!groupManagerAccessMap[group.sys_id])
				return group;
			
			var rotaIds = [];
			if (group.sys_id) {
				var rotaGr = new GlideRecord(context.TABLES.CMN_ROTA);
				rotaGr.addQuery("group", group.sys_id);
				rotaGr.query();
				while (rotaGr.next()) {
					rotaIds.push(rotaGr.getUniqueValue());
				}
			}
			
			var formatterClass = OCFormatterMapping.formatters["dhtmlx"];
			var formatter = new formatterClass();

			var ocrRotaV2 = new OCRotationV2(null, formatter);
			var spans = ocrRotaV2
				.setStartDate(from)
				.setEndDate(to, false)
				.setGroupIds(group.sys_id)
				.setRotaIds(rotaIds.join(','))
				.getSpans();
			
			var actionsCount = {};
			var gaps = oc.getGaps(from, to, group.sys_id, dateDiffInDays, spans);
			actionsCount.gaps = parseInt(gaps.total_count) || 0;
			
			var oddities = oc.getConflictsInGroup(from, to, group.sys_id, dateDiffInDays, spans);
			actionsCount.oddities = oddities.length || 0;
			
			var timeOffRequests = oc.getPendingTimeOffRequests();
			actionsCount.timeOffRequests = parseInt(timeOffRequests) || 0;
			
			if ((actionsCount.gaps + actionsCount.oddities  + actionsCount.timeOffRequests) > 0)
				group.actionsCount = actionsCount;
			return group;
		});
	},

	_processOnCallGroups: function(groups, gdt) {
		if (this._log.atLevel(GSLog.DEBUG))
			this.timer.start("[_processOnCallGroups]");

		var groupSysIds = [];
		for (var i = 0; i < groups.length; i++) {
			groupSysIds.push(groups[i].sys_id);
		}
		var onCallSecurityNG = new OnCallSecurityNG();
		var rotaMgrAccessMap = onCallSecurityNG.rotaMgrAccessForGroups(groupSysIds);
		var groupData = {};
		if (groups) {
			groups.map(function(group) {
				var isCurrentUserRotaMgr = rotaMgrAccessMap[group.sys_id];
				group['isCurrentUserRotaMgr'] = isCurrentUserRotaMgr;
				
				var todayDate = new GlideDateTime().getDate().getValue(); // returns internal formatted date
				var memberGr = new GlideRecord('cmn_rota_member');
				memberGr.addQuery("member", "=", gs.getUserID());
				memberGr.addQuery("roster.rota.group", "=", group.sys_id);
				memberGr.addEncodedQuery("from=NULL^ORfrom<=" + todayDate);
				memberGr.addEncodedQuery("to=NULL^ORto>=" + todayDate);
				memberGr.setLimit(1);
				memberGr.query();
				group['isCurrentUserGrpMember'] = memberGr.hasNext() && gs.getUser().isMemberOf(group.sys_id + "");

				groupData[group.sys_id + ""] = group;
			});
		}
		groupSysIds = Object.keys(groupData).join(",");
		var rotaData = this.getRotas(groupSysIds);
		var rotaSysIds = Object.keys(rotaData).join(",");
		var rosterData = this.getRostersByRotas(rotaSysIds);
		var rosterSysIds = Object.keys(rosterData).join(",");
		var onCallData = this.whoIsOnCall(groupSysIds, "", "", gdt);

		var userSysIds = [];
		onCallData.forEach(function(onCall) {
			if (onCall.userId)
				userSysIds.push(onCall.userId);
		});
		
		var result = {
			onCallData: onCallData,
			groups: groupData,
			users: this._getUsers(userSysIds),
			rotas: rotaData,
			rosters: rosterData,
			members: this.getMembers(rosterSysIds)
		};

		if (this._log.atLevel(GSLog.DEBUG))
			this.timer.stop("[_processOnCallGroups]");

		return result;
	},
	
	processIndividualOCData: function (groups, gdt) {
		return this._processOnCallGroups(groups, gdt);
	},

	/**
	 * Start the escalations for a document and group (call after a successful call to who or whoAt)
	 * and specify the event name for the escalation notifications.  In addition,
	 * specify the name of the business rule to call when an escalation occurs.
	 */
	startEscalations: function(gr, eventName, escalationScriptName) {
		if (!this._groupSysId || !this._rotaSysIds || (this._rotaSysIds && this._rotaSysIds.length == 0)) {
			// Invalid calling sequence, Ignore this request
			// Call who or whoIsNext before this is called so that the notifications are properly set up for escalation
			this._log.error("[continueEscalations] Escalations called out of sequence");
			return;
		}

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[startEscalations] groupSysId: " + this._groupSysId + " rotaSysId: " + this._rotaSysIds[0] + " eventName: " + eventName + " escalationScriptName: " + escalationScriptName);

		// Figure out when the first escalation needs to fire
		var runAt = this._escalationList.runAt();

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[startEscalations] runAt: " + runAt);

		if (runAt < 0) {
			// No more escalations - see if there are more rotas to run through
			this._escalationList.clear();
			this._currentEscalation = null;
			this._checkForMoreRotas(gr);
			if (this.isEmptyAnytime())
				return;
		}
		this._saveEscalation(gr, eventName, escalationScriptName, runAt);
	},

	getCurrentRotaID: function() {
		return this._rotaSysIds[0];
	},

	/*
	 * Return array of rota ids in case overlapping schedule
	 */
	getCurrentRotaIDs: function() {
		return this._rotaSysIds;
	},

	setCurrentRotaID: function(rotaSysId) {
		this._rotaSysIds = [rotaSysId];
	},

	setCurrentRotaIDs: function(rotaSysIds) {
		this._rotaSysIds = rotaSysIds;
	},

	addCurrentRotaID: function(rotaSysId) {
		if(!this._rotaSysIds){
			this._rotaSysIds = [];
		}
		this._rotaSysIds.push(rotaSysId);
	},

	/**
	 * Set max entries to return for call to who/whoAt (-1 means all for active roster)
	 */
	setMaxEntries: function(entries) {
		this._maxEntries = entries;
	},

	/**
	 * Set up the notification list for this group based on the
	 * current time.
	 *
	 * When this method returns, next() should be called until it
	 * returns false to indicate no more current notifications.
	 * At that point, a call to startEscalations() should be made
	 * to set up for the pending notifications set up by the who()
	 * call.
	 *
	 * Usage:
	 *    var rota = new OnCallRotation();
	 *    rota.who();
	 *    while (rota.next()) {
	 *    	// generate event based on the properties of the user to be notified
	 *    }
	 *
	 *    // set up to get any future notifications
	 *    rota.startEscalations(glide_record);
	 *
	 *  Notes:
	 *    After you call rota.who(), you may retrieve the primary contact that is on-call
	 *    right now using:
	 *
	 *       rota.getPrimaryUser();
	 *       rota.getPrimaryUserName();
	 *
	 * groupSysId [String]: sys_id of the group to check for
	 * gdt [GlideDateTime]: "yyyy-MM-dd HH:mm:ss" format in UTC timezone. Default is now
	 * nullifyOverrideRoster [boolean]: if set to true it is not for a specific roster
	 * return [boolean]: true means found at least one match, false if no matches found
	 */
	who: function(groupSysId, gdt, nullifyOverrideRoster, rotaSysIds, overrideCustomEscalation, taskGr) {
		this._escalationList.clear();
		this._clearEscalationLineUp();

		this._groupSysId = groupSysId ? groupSysId + "" : "";
		this._escalationList.setGroupID(this._groupSysId);
		this._currentEscalation = null;
		this._rotaSysIds = [];
		if (typeof nullifyOverrideRoster === "undefined")
			nullifyOverrideRoster = false;
		gdt = gdt || new GlideDateTime();

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[who] groupSysId: " + groupSysId + " gdt: " + gdt + " nullifyOverrideRoster: " + nullifyOverrideRoster);

		var wrktimeGdt = new GlideDateTime(gdt);
		var rosterGr;
		if (this._onCallCommon.isOverlapAllowed(this._groupSysId)) {
			var rotas = this._getAllRotaWithOverlappingSchedule(wrktimeGdt, rotaSysIds);
			if (rotas !== -1 && rotas.length > 0) {
				if(!this._simulateEscalationToAllRotas){
					var escalationSettings = this._onCallCommon.getEscalationSettings(this._groupSysId);
					if (escalationSettings == this._onCallCommon.escalation_rule_rota_overlap.START) {
						rotas = [this._findFirstStartedRota(rotas)];
					} else if (escalationSettings == this._onCallCommon.escalation_rule_rota_overlap.END) {
						rotas = [this._findEndingLastRota(rotas)];
					}
				}
				this._rotaSysIds = [];
				for (var i = 0; i < rotas.length; i++) {
					this._rotaSysIds.push(rotas[i].rotaSysId);
					this._rotaTimeZone = rotas[i].rotaTimeZone;
					var isAdditionalRoster = (i == 0 ? false : true);
					if (!overrideCustomEscalation && rotas[i].rotaCustomEscalation) {
						this._getCustomEscalation(rotas[i].rotaSysId, wrktimeGdt, isAdditionalRoster, taskGr);
					} else {
						rosterGr = new GlideRecord(this.TABLES.CMN_ROTA_ROSTER);
						rosterGr.addQuery("rota", this._rotaSysIds[this._rotaSysIds.length - 1]);
						rosterGr.addActiveQuery();
						rosterGr.orderBy("order");
						rosterGr.query();
						this._getRotaNotifications(rosterGr, wrktimeGdt, nullifyOverrideRoster, isAdditionalRoster);
					}
				}
			}
		} else {
			this._firstDelay = this._getFirstDelay(wrktimeGdt);

			if (this._rotaSysIds[this._rotaSysIds.length - 1]) {
				this._escalationList.setRotaID(this._rotaSysIds[this._rotaSysIds.length - 1]);
				if (!overrideCustomEscalation && this._rotaCustomEscalation) {
					this._getCustomEscalation(this._rotaSysIds[this._rotaSysIds.length - 1], wrktimeGdt, false, taskGr);
				} else {
					wrktimeGdt.addSeconds(this._firstDelay);
					rosterGr = new GlideRecord(this.TABLES.CMN_ROTA_ROSTER);
					rosterGr.addQuery("rota", this._rotaSysIds[this._rotaSysIds.length - 1]);
					rosterGr.addActiveQuery();
					rosterGr.orderBy("order");
					rosterGr.query();
					if (!rosterGr.hasNext())
						this._setPrimaryUser(wrktimeGdt);
					this._getRotaNotifications(rosterGr, wrktimeGdt, nullifyOverrideRoster);
				}
			}
		}
		return !this.isEmpty();
	},

	/*
	 * Find rota which will end first
	 * rotas [array]
	 */
	_findEndingLastRota: function(rotas) {
		if (rotas.length === 1) {
			return rotas[0];
		}
		var selectedRotaIndex = 0;
		var selectedEndTime = (new GlideDateTime(rotas[0].end)).getNumericValue();

		var rotaLength = rotas.length;
		for (var i = 1; i < rotaLength; i++) {
			var endTime = (new GlideDateTime(rotas[i].end)).getNumericValue();
			if (endTime > selectedEndTime) {
				selectedEndTime = endTime;
				selectedRotaIndex = i;
			}
		}
		return rotas[selectedRotaIndex];
	},

	/*
	 * Find rota which has started recently
	 * rotas [array]
	 */
	_findFirstStartedRota: function(rotas) {
		if (rotas.length === 1) {
			return rotas[0];
		}
		var selectedRotaIndex = 0;
		var selectedStartTime = (new GlideDateTime(rotas[0].start)).getNumericValue();

		var rotaLength = rotas.length;
		for (var i = 1; i < rotaLength; i++) {
			var startTime = (new GlideDateTime(rotas[i].start)).getNumericValue();
			if(startTime < selectedStartTime) {
				selectedStartTime = startTime;
				selectedRotaIndex = i;
			}
		}
		return rotas[selectedRotaIndex];
	},

	_getCustomEscalation: function (rotaId, gdt, isAdditionalRota, taskGr) {
		if(!isAdditionalRota){
			this._escalationList.clear();
			this._clearEscalationLineUp();
			this._escalationList.setGroupID(this._groupSysId);
			this._escalationList.setRotaID(this._rotaSysIds[this._rotaSysIds.length - 1]);
			this._escalationList.setTimeZone(this._rotaTimeZone);
		} else {
			this._escalationLevel = 0;
			this._escalationList.addRotaID(this._rotaSysIds[this._rotaSysIds.length - 1]);
		}

		this._addPrimaryMembers(rotaId, gdt, isAdditionalRota);

		var rotaEscalationSet = this.getRotaEscalationSet(rotaId, taskGr);
		if(!rotaEscalationSet)
			return;
		var rotaEscalationDefinitionGr = this._getRotaEscalationDefinition(rotaEscalationSet.getValue('sys_id'));
		var delayTillPreviousStep = 0;
		while (rotaEscalationDefinitionGr.next()) {
			var rotaEscalationDefinitionSysId = rotaEscalationDefinitionGr.getValue('sys_id');
			var reminderDuration = rotaEscalationDefinitionGr.time_between_reminders.getGlideObject();
			var reminderDelay = reminderDuration ? (reminderDuration.getNumericValue() / 1000) : 0;
			var reminders = parseInt(rotaEscalationDefinitionGr.reminders + "");
			reminders = isNaN(reminders) ? 1 : reminders + 1;
			var totalDelay;
			var remindersLeft;

			var users = rotaEscalationDefinitionGr.getValue('sys_users');
			var usersArray = [];
			if (users) {
				var usersGr = new GlideRecord(this.TABLES.SYS_USER);
				usersGr.addQuery('sys_id', "IN", users);
				usersGr.addActiveQuery();
				usersGr.query();
				while (usersGr.next()) {
					usersArray.push(usersGr.getUniqueValue());
					totalDelay = delayTillPreviousStep;
					remindersLeft = reminders - 1;
					this._addCustomEscalation('user', usersGr.getUniqueValue(), gdt, totalDelay);
					while (remindersLeft > 0) {
						totalDelay += reminderDelay;
						this._addCustomEscalation('user', usersGr.getUniqueValue(), gdt, totalDelay);
						remindersLeft--;
					}
				}
			}

			var escalateToGroupManager = rotaEscalationDefinitionGr.getValue('group_manager');
			if (escalateToGroupManager == '1' && rotaEscalationSet.cmn_rota.group.manager && rotaEscalationSet.cmn_rota.group.manager.active) {
					var groupManager = rotaEscalationSet.cmn_rota.group.manager + "";
					usersArray.push(groupManager);
					totalDelay = delayTillPreviousStep;
					remindersLeft = reminders - 1;
					this._addCustomEscalation('user', groupManager, gdt, totalDelay);
					while (remindersLeft > 0) {
						totalDelay += reminderDelay;
						this._addCustomEscalation('user', groupManager, gdt, totalDelay);
						remindersLeft--;
					}
			}

			var groups = rotaEscalationDefinitionGr.getValue('sys_user_groups');
			var groupsArray = [];
			if (groups) {
				var groupsGr = new GlideRecord(this.TABLES.SYS_USER_GROUP);
				groupsGr.addQuery('sys_id', "IN", groups);
				groupsGr.addActiveQuery();
				groupsGr.query();
				while (groupsGr.next()) {
					groupsArray.push(groupsGr.getUniqueValue());
					totalDelay = delayTillPreviousStep;
					remindersLeft = reminders - 1;
					this._addCustomEscalation('group', groupsGr.getUniqueValue(), gdt, totalDelay);
					while (remindersLeft > 0) {
						totalDelay += reminderDelay;
						this._addCustomEscalation('group', groupsGr.getUniqueValue(), gdt, totalDelay);
						remindersLeft--;
					}
				}
			}

			var devices = rotaEscalationDefinitionGr.getValue('cmn_notif_devices');
			var devicesArray = [];
			if (devices) {
				var devicesGr = new GlideRecord(this.TABLES.CMN_NOTIF_DEVICE);
				devicesGr.addQuery('sys_id', "IN", devices);
				devicesGr.addActiveQuery();
				devicesGr.query();
				while (devicesGr.next()) {
					devicesArray.push(devicesGr.getUniqueValue());
					totalDelay = delayTillPreviousStep;
					remindersLeft = reminders - 1;
					this._addCustomEscalation('device', devicesGr.getUniqueValue(), gdt, totalDelay);
					while (remindersLeft > 0) {
						totalDelay += reminderDelay;
						this._addCustomEscalation('device', devicesGr.getUniqueValue(), gdt, totalDelay);
						remindersLeft--;
					}
				}
			}

			var rosterSysId = rotaEscalationDefinitionGr.getValue('cmn_rota_roster');
			var membersArray = [];
			if (rosterSysId) {
				var memberGr = new GlideRecord(this.TABLES.CMN_ROTA_MEMBER);
				if (this._getRotationMember(memberGr, gdt, rosterSysId)) {
					var memberSysId = memberGr.sys_id + "";
					var userSysId = this._checkForOverrideMemberByRoster(gdt, rosterSysId);

					if (!userSysId)
						userSysId = this._checkForOverrideMember(gdt);

					if (!userSysId)
						userSysId = memberGr.member + "";

					var isPrimaryMemberTimeOff = this._isTheUserOff(userSysId, gdt);
					// check if the person is off
					if (!isPrimaryMemberTimeOff) {
						totalDelay = delayTillPreviousStep;
						this._addRotationEscalation(memberGr, userSysId, gdt, totalDelay, rosterSysId);

						usersArray.unshift(userSysId);
						membersArray.push(memberGr.getValue('sys_id'));

						// repeat the first user if multiple attempts are requested
						remindersLeft = reminders - 1;
						while (remindersLeft > 0) {
							totalDelay += reminderDelay;
							this._addRotationEscalation(memberGr, userSysId, gdt, totalDelay, rosterSysId);
							remindersLeft--;
						}
					}

					var maxMemberCnt = 0;
					if (rotaEscalationDefinitionGr.getValue('roster_escalation') == 'all_members')
						maxMemberCnt = 100;
					else if(isPrimaryMemberTimeOff)
						maxMemberCnt = 1;

					var memberCnt = 1;
					var done = false;
					while (!done) {
						if (memberCnt > maxMemberCnt)
							done = true;

						if (!done) {
							if (!memberGr.next()) {
								memberGr.setLocation(-1);
								memberGr.next();
							}

							if (memberGr.sys_id + "" === memberSysId)
								done = true;
							else {
								userSysId = memberGr.member + "";

								if (this._isTheUserOff(userSysId, gdt))
									continue;

								totalDelay = delayTillPreviousStep;
								this._addRotationEscalation(memberGr, userSysId, gdt, totalDelay, rosterSysId);

								usersArray.push(userSysId);
								membersArray.push(memberGr.getValue('sys_id'));

								remindersLeft = reminders - 1;
								while (remindersLeft > 0) {
									totalDelay += reminderDelay;
									this._addRotationEscalation(memberGr, userSysId, gdt, totalDelay, rosterSysId);
									remindersLeft--;
								}
							}
							memberCnt++;
						}
					}
				}
			}

			usersArray = usersArray.filter(function(val, index, self) {
				return self.indexOf(val) == index;
			});
			var timeToNextStep = rotaEscalationDefinitionGr.time_to_next_step.getGlideObject();
			var forcedCommunicationChannel = rotaEscalationDefinitionGr.getValue('forced_communication_channel');
			var overrideUserContactPreference = rotaEscalationDefinitionGr.escalation_set.override_user_contact_preference + "";
			if (!isAdditionalRota)
				this._addCustomEscalateeToEscalationLineUp(usersArray, groupsArray, devicesArray, membersArray, new GlideDuration(reminderDuration), (reminders - 1), new GlideDuration(timeToNextStep), rotaEscalationDefinitionSysId, rosterSysId, forcedCommunicationChannel, this._escalationLevel + 1, overrideUserContactPreference);
			else
				this._addAdditionalCustomEscalateeToEscalationLineUp(usersArray, groupsArray, devicesArray, membersArray, new GlideDuration(reminderDuration), (reminders - 1), new GlideDuration(timeToNextStep), rotaEscalationDefinitionSysId, rosterSysId, forcedCommunicationChannel, this._escalationLevel + 1, overrideUserContactPreference);

			this._escalationLevel++;
			delayTillPreviousStep = delayTillPreviousStep + reminderDelay * (reminders - 1) + (timeToNextStep ? (timeToNextStep.getNumericValue()/1000) : 0);
		}
	},

	_addPrimaryMembers: function(rotaId, gdt, isAdditionalRota) {
		var workTimeGdt = new GlideDateTime(gdt);
		var rosterGr = new GlideRecord(this.TABLES.CMN_ROTA_ROSTER);
		rosterGr.addQuery("rota", rotaId);
		rosterGr.addActiveQuery();
		rosterGr.orderBy("order");
		rosterGr.query();
		var memberGr;
		var userSysId;
		if (rosterGr.getRowCount() === 1) {
			rosterGr.next();
			memberGr = new GlideRecord(this.TABLES.CMN_ROTA_MEMBER);
			if (this._getRotationMember(memberGr, workTimeGdt, rosterGr.sys_id + "")) {
				userSysId = this._checkForOverrideMemberByRoster(workTimeGdt, rosterGr.sys_id + "");

				if (!userSysId)
					userSysId = this._checkForOverrideMember(workTimeGdt);

				if (!userSysId)
					userSysId = memberGr.member + "";

				var isPrimaryMemberTimeOff = this._isTheUserOff(userSysId, workTimeGdt);
				// check if the person is off
				if (!isPrimaryMemberTimeOff) {
					if (!isAdditionalRota) {
						this._escalationList.setPrimaryUserID(userSysId, rotaId, rosterGr.getUniqueValue());
					} else if (!this._escalationList.getPrimaryUserIdByRota(rotaId)) {
						this._escalationList.addPrimaryUserID(userSysId, rotaId, rosterGr.getUniqueValue());
					}
				}
			}
		} else if (rosterGr.getRowCount() > 1) {
			while (rosterGr.next()) {
				var rosterSysId = rosterGr.sys_id + "";
				memberGr = new GlideRecord(this.TABLES.CMN_ROTA_MEMBER);

				if (this._getRotationMember(memberGr, workTimeGdt, rosterSysId)) {
					userSysId = this._checkForOverrideMemberByRoster(workTimeGdt, rosterGr.sys_id + "");

					if (!userSysId)
						userSysId = this._checkForOverrideMember(workTimeGdt);

					if (!userSysId)
						userSysId = memberGr.member + "";

					if (this._isTheUserOff(userSysId, workTimeGdt))
						continue;

					if (!isAdditionalRota) {
						if (!this._escalationList.getPrimaryUserID())
							this._escalationList.setPrimaryUserID(userSysId, rotaId, rosterSysId);
					} else if (!this._escalationList.getPrimaryUserIdByRota(rotaId)) {
						this._escalationList.addPrimaryUserID(userSysId, rotaId, rosterSysId);
					}
				}
			}
		}
	},

	_getRotaDefaultEscalationSet: function (rotaId) {
		var escalationSetGr = new GlideRecord(this.TABLES.CMN_ROTA_ESCALATION_SET);
		escalationSetGr.addQuery('cmn_rota', rotaId);
		escalationSetGr.addQuery('default', true);
		escalationSetGr.addActiveQuery();
		escalationSetGr.query();
		if (escalationSetGr.next())
			return escalationSetGr;
	},

	_getEscalationSetById: function (sysId) {
		var escalationSetGr = new GlideRecord(this.TABLES.CMN_ROTA_ESCALATION_SET);
		if (escalationSetGr.get(sysId))
			return escalationSetGr;
	},

	_getRotaEscalationSetByTask: function (rotaId, taskGr) {
		var escalationSetGr = new GlideRecord(this.TABLES.CMN_ROTA_ESCALATION_SET);
		escalationSetGr.addQuery('cmn_rota', rotaId);
		escalationSetGr.addQuery('default', false);
		escalationSetGr.orderBy('order');
		escalationSetGr.addActiveQuery();
		escalationSetGr.query();
		while (escalationSetGr.next()) {
			var tableMatched = escalationSetGr.getValue('table') == taskGr.getRecordClassName();
			if (tableMatched) {
				var conditionMatched = GlideFilter.checkRecord(taskGr, escalationSetGr.condition);
				if (conditionMatched)
					return escalationSetGr;
			}
		}
		return this._getRotaDefaultEscalationSet(rotaId);
	},

	getRotaEscalationSet: function (rotaId, taskGr) {
		if (this.forcedEscalationSetSysId)
			return this._getEscalationSetById(this.forcedEscalationSetSysId);
		if (taskGr)
			return this._getRotaEscalationSetByTask(rotaId, taskGr);
		return this._getRotaDefaultEscalationSet(rotaId);
	},

	_getRotaEscalationDefinition: function(escalationDefinitionId) {
		var cmnRotaEscalationDefinitionGr = new GlideRecord(this.TABLES.CMN_ROTA_ESCALATION_DEFINITION);
		cmnRotaEscalationDefinitionGr.addQuery('escalation_set', escalationDefinitionId);
		cmnRotaEscalationDefinitionGr.orderBy('escalation_level');
		cmnRotaEscalationDefinitionGr.query();
		return cmnRotaEscalationDefinitionGr;
	},

	/**
	 * Set up the notification list for this group based on the
	 * specified time.  See who() for more information on the
	 * usage of this method.
	 *
	 * groupSysId [string]
	 * gdt [GlideDateTime or string]: in the user's date-time format
	 */
	whoAt: function(groupSysId, gdt, rotaSysIds, taskGr) {
		var _gdt = new GlideDateTime();
		if (typeof gdt === "string")
			_gdt.setDisplayValue(gdt);
		else
			_gdt = gdt;
		return this.who(groupSysId, _gdt, false, rotaSysIds, false, taskGr);
	},

	/**
	 * This is used by the escalation business rules to determine who in the rota do we contact next. The escalation
	 * record passed to the method tracks the escalation between invocations of the business rule.
	 *
	 * 1. If we are still within the rotation schedule for the current rota, find the next member in the rota to contact
	 *
	 * 2. If there are no more members, create an escalation that fires when the next rota begins its schedule, unless
	 * this is the first rota that we started with, in which case we have tried everyone, so give up
	 *
	 * escalation: [GlideRecord] the escalation record
	 */
	whoIsNext: function(escalationGr) {
		this._groupSysId = escalationGr.group + "";

		// Load the rota notifications from the escalation
		this._escalationList.fromXml(escalationGr.escalation_document + "");
		this._currentEscalation = null;
		this._rotaSysIds = this._escalationList.getRotaIDs();
		var taskGr = this._getTaskGrFromEscalation(escalationGr);
		return !this.isEmpty() || this._checkForMoreRotas(taskGr);
	},

	/**
	 * Provide list of users that are On-call for a given time. If no time specified
	 * then current time is used. If no groupSysIds are provided return empty list
	 *
	 * groupSysIds [String]: comma seperated list of sys_user_group sys_ids to filter by
	 * rotaSysIds [String]: comma seperated list of cmn_rota sys_ids to filter records by
	 * rosterSysIds [String]: comma seperated list of cmn_rota_roster sys_ids to filter records by
	 * gdt [GlideDateTime]: date in UTC timezone
	 *
	 */
	whoIsOnCall: function(groupSysIds, rotaSysIds, rosterSysIds, gdt) {
		groupSysIds = groupSysIds ? groupSysIds + "" : "";
		rotaSysIds = rotaSysIds ? rotaSysIds + "" : "";
		rosterSysIds = rosterSysIds ? rosterSysIds + "" : "";

		if (!groupSysIds)
			if (rotaSysIds)
				groupSysIds = this._getGroupIdByRota(rotaSysIds);
			else if (rosterSysIds)
				groupSysIds = this._getGroupIdByRoster(rosterSysIds);

		gdt = gdt || new GlideDateTime();
		return this.getEscalatees(groupSysIds, rotaSysIds, rosterSysIds, gdt, true);
	},

	isBrowserSupported: function(scopeName) {
		if (this._isGlobalScope())
			return !new GlideCollaborationCompatibility().isIncompatible();
		else
			return !new GlideUICompatibility(scopeName || OnCallRotationSNC.SCOPE_NAME).isBlocked();
	},

	getBrowserCompatibility: function(scopeName) {
		if (this._isGlobalScope())
			return new GlideCollaborationCompatibility().getCompatibility();
		else
			return new GlideUICompatibility(scopeName || OnCallRotationSNC.SCOPE_NAME).getCompatibility();
	},

	getRotaMembersByUserAndGroupURL: function(userSysId, groupSysId) {
		var url = "";
		url = this._setPageAndPrepare(OnCallRotationSNC.CMN_ROTA_MEMBER_LIST, url);
		if (!userSysId || !groupSysId)
			return url;
		url += "sysparm_query=memberIN" + userSysId + "^roster.rota.groupIN" + groupSysId;
		return url;
	},

	/**
	 * Check if the child span(s) overlap with the parent span(s)
	 *
	 * parent [array]
	 * child [array]
	 * timeZone [String]
	 * return [boolean] overlap
	 */
	spansOverlap: function(parent, child, timeZone) {
		var parentMap = new GlideScheduleTimeMap();
		parentMap.addIncludeSpans(parent);
		parentMap.buildMap(timeZone);

		var childMap = new GlideScheduleTimeMap();
		childMap.addIncludeSpans(child);
		childMap.buildMap(timeZone);

		var overlap = parentMap.overlapsWith(childMap, timeZone);
		overlap.buildMap(timeZone);

		return !overlap.isEmpty();
	},

	isWizardRunning: function() {
		return GlideSession.get().getBooleanProperty(OnCallRotationSNC.PROPERTY_IS_WIZARD, false);
	},

	toString: function() {
		return this.type;
	},

	// PRIVATE METHODS

	/**
	 * Returns an array with size and get functions to preserve original behaviour
	 * of the Java List collection.
	 *
	 */
	_initEscalationPlan: function() {
		var escalationPlan = [];
		escalationPlan.get = function (i) { return this[i]; };
		escalationPlan.size = function () { return this.length; };
		return escalationPlan;
	},

	/**
	 * Sets a timezone on the sys_choice table to active. Used before adding a timezone to a new schedule
	 *
	 * timezone [string]
	 */
	_activateTimezone: function(timezone) {
		var timeZoneChoiceGr = new GlideRecord("sys_choice");
		timeZoneChoiceGr.addQuery("name", "sys_user");
		timeZoneChoiceGr.addQuery("element", "time_zone");
		timeZoneChoiceGr.addQuery("value", timezone);
		timeZoneChoiceGr.query();

		while (timeZoneChoiceGr.next()) {
			if (timeZoneChoiceGr.inactive + "" === "true") {
				timeZoneChoiceGr.setValue("inactive", false);
				timeZoneChoiceGr.update();
			}
		}
	},

	/**
	 * Add an Escalatee to the Escalation Lineup.
	 *
	 * order [number]
	 * userId [string]
	 * deviceId [string]
	 * isDevice [boolean]
	 * timeBetweenReminders [GlideDuration]
	 * reminderNum [number]
	 * rosterId [string]
	 * memberId [string]
	 * isOverride [boolean]
	 */
	_addToEscalationLineUp: function (userId, deviceId, isDevice, timeBetweenReminders, reminderNum, rosterId, memberId, isOverride, forcedCommunicationChannel, overrideUserContactPreference, escalationType) {
		this._escalationLevel++;
		this._escalatees.push(new Escalatee({
			order: this._escalationLevel,
			userId: userId,
			deviceId: deviceId,
			isDevice: isDevice,
			timeBetweenReminders: timeBetweenReminders,
			reminderNum: reminderNum,
			rosterId: rosterId,
			memberId: memberId,
			isOverride: isOverride,
			forcedCommunicationChannel: forcedCommunicationChannel,
			overrideUserContactPreference: overrideUserContactPreference,
			escalationType: escalationType
		}));
	},

	_addCustomEscalateeToEscalationLineUp: function (userIds, groupIds, deviceIds, memberIds, timeBetweenReminders, reminderNum, timeToNextStep, cmnRotaEscStepDefId, rosterId, forcedCommunicationChannel, escalationLevel, overrideUserContactPreference) {
		this._escalatees.push(new Escalatee({
			order: escalationLevel,
			userIds: userIds,
			escalationGroups: groupIds,
			deviceIds: deviceIds,
			timeBetweenReminders: timeBetweenReminders,
			reminderNum: reminderNum,
			timeToNextStep: timeToNextStep,
			memberIds: memberIds,
			cmnRotaEscStepDefId: cmnRotaEscStepDefId,
			rosterId: rosterId,
			forcedCommunicationChannel: forcedCommunicationChannel,
			overrideUserContactPreference: overrideUserContactPreference,
			escalationType: this.ESCALATION_TYPE.CUSTOM
		}));
	},

	_addAdditionalEscalateeToEscalationLineUp: function (userId, deviceId, isDevice, timeBetweenReminders, reminderNum, rosterId, memberId, isOverride, forcedCommunicationChannel, overrideUserContactPreference, escalationType) {
		this._escalationLevel++;
		if (this._escalatees.length < this._escalationLevel) {
			this._escalatees.push(new Escalatee());
		}
		this._escalatees[this._escalationLevel-1].addAdditionalEscalatee(new Escalatee({
			order: this._escalationLevel,
			userId: userId,
			deviceId: deviceId,
			isDevice: isDevice,
			timeBetweenReminders: timeBetweenReminders,
			reminderNum: reminderNum,
			rosterId: rosterId,
			memberId: memberId,
			isOverride: isOverride,
			forcedCommunicationChannel: forcedCommunicationChannel,
			overrideUserContactPreference: overrideUserContactPreference,
			escalationType: escalationType
		}));
	},

	_addAdditionalCustomEscalateeToEscalationLineUp: function (userIds, groupIds, deviceIds, memberIds, timeBetweenReminders, reminderNum, timeToNextStep, cmnRotaEscStepDefId, rosterId, forcedCommunicationChannel, escalationLevel, overrideUserContactPreference) {
		if (this._escalatees.length < escalationLevel) {
			this._escalatees.push(new Escalatee());
		}
		this._escalatees[escalationLevel-1].addAdditionalEscalatee(new Escalatee({
			order: escalationLevel,
			userIds: userIds,
			escalationGroups: groupIds,
			deviceIds: deviceIds,
			timeBetweenReminders: timeBetweenReminders,
			reminderNum: reminderNum,
			timeToNextStep: timeToNextStep,
			memberIds: memberIds,
			cmnRotaEscStepDefId: cmnRotaEscStepDefId,
			rosterId: rosterId,
			forcedCommunicationChannel: forcedCommunicationChannel,
			overrideUserContactPreference: overrideUserContactPreference,
			escalationType: this.ESCALATION_TYPE.CUSTOM
		}));
	},

	simulateEscalationToAllRotas: function(simulateEscalationToAllRotasFlag){
		this._simulateEscalationToAllRotas = simulateEscalationToAllRotasFlag;
	},
	/**
	 * Create an escalation list for escalation of type 'rotate through rosters'
	 *
	 * roster - GlideRecord of the roster for the specified Rota
	 * time - GlideDateTime the time point for which to create the escalation for
	 * nullifyOverrideRoster
	 */
	_addDutyEscalations: function(rosterGr, gdt, nullifyOverrideRoster, isAdditionalRoster) {
		gdt = gdt || new GlideDateTime();
		nullifyOverrideRoster = nullifyOverrideRoster + "" === "true";
		var totalDelay = 0;

		// iterate over all active rosters associated to our rota so we can get the on call person from each roster
		while (rosterGr.next()) {
			var attempts = parseInt(rosterGr.attempts + "");
			attempts = isNaN(attempts) ? 1 : attempts + 1;
			var reminderDuration = rosterGr.time_between_reminders.getGlideObject();
			var reminderDelay = reminderDuration ? (reminderDuration.getNumericValue() / 1000) : 0;
			var rosterSysId = rosterGr.sys_id + "";
			var memberGr = new GlideRecord("cmn_rota_member");
			var workTimeGdt = new GlideDateTime(gdt);
			var gd = workTimeGdt.getDate().getValue(); // returns internal formatted date
			memberGr.addEncodedQuery("from=NULL^ORfrom<=" + gd);
			memberGr.addEncodedQuery("to=NULL^ORto>=" + gd);
			memberGr.addQuery("member.active", "=", true);
			
			if (this._log.atLevel(GSLog.DEBUG))
				this._log.debug("[_addDutyEscalations] reminderDelay: " + reminderDelay + " totalDelay: " + totalDelay + " reminderDuration: " + reminderDuration);

			// check if the rota member is on call, note that this method will - not return a rotation member, but
			// a boolean _if_ a member is on call - modify member by reference where the member will be the member
			// on call - use the rosterID to query the member
			if (this._getRotationMember(memberGr, workTimeGdt, rosterSysId)) {
				// member is on call, check if another member has an override schedule for this time making them first
				// contact for the rotation instead of member within same roster
				var userSysId = this._checkForOverrideMemberByRoster(workTimeGdt, rosterGr.sys_id + "");

				if (!userSysId)
					userSysId = this._checkForOverrideMember(workTimeGdt);

				var isOverride = false;

				if (!userSysId)
					userSysId = memberGr.member + "";
				else {
					if (nullifyOverrideRoster)
						rosterSysId = null;
					isOverride = true;
				}

				if (!userSysId)
					this._log.error("No valid sys_user sys_id for cmn_rota_member: " + memberGr.sys_id);

				if (this._isTheUserOff(userSysId, workTimeGdt))
					continue;

				if (!isAdditionalRoster) {
					if (!this._escalationList.getPrimaryUserID())
						this._escalationList.setPrimaryUserID(userSysId, this._rotaSysIds[this._rotaSysIds.length - 1], rosterSysId);
				} else if (!this._escalationList.getPrimaryUserIdByRota(this._rotaSysIds[this._rotaSysIds.length - 1])) {
					this._escalationList.addPrimaryUserID(userSysId, this._rotaSysIds[this._rotaSysIds.length - 1], rosterSysId);
				}

				this._addRotationEscalation(memberGr, userSysId, gdt, totalDelay, rosterSysId);

				var forcedCommunicationChannel = rosterGr.getValue('forced_communication_channel');
				var overrideUserContactPreference = rosterGr.rota.override_user_contact_preference + "";
				// Add a new Escalatee to the Lineup for the notification type = 'Rotate through rosters'
				if (!isAdditionalRoster)
					this._addToEscalationLineUp(userSysId, null, false, new GlideDuration(reminderDuration), (attempts - 1), rosterSysId, memberGr.sys_id + "", isOverride, forcedCommunicationChannel, overrideUserContactPreference, this.ESCALATION_TYPE.ROTATE_THROUGH_ROSTER);
				else
					this._addAdditionalEscalateeToEscalationLineUp(userSysId, null, false, new GlideDuration(reminderDuration), (attempts - 1), rosterSysId, memberGr.sys_id + "", isOverride, forcedCommunicationChannel, overrideUserContactPreference, this.ESCALATION_TYPE.ROTATE_THROUGH_ROSTER);

				if (this._isMaxEntries())
					return;

				// repeat the first user if multiple attempts are requested
				var attemptsLeft = attempts - 1;

				while (attemptsLeft > 0) {
					totalDelay += reminderDelay;

					// add a delayed escalation record for this member
					this._addRotationEscalation(memberGr, userSysId, gdt, totalDelay, rosterSysId);
					attemptsLeft--;
				}

				// add delay before next roster is processed
				totalDelay += reminderDelay;
			}
		}
	},

	/**
	 * add rotation escalation
	 *
	 * memberGr [GlildeRecord] rota member record
	 * userID [string] sys_user id of this rota member (why pass this if it is already in memberGR?)
	 * gdt [GlideDateTime] the time point to add an escalation for
	 * delay [number] the delay in minutes
	 * rosterID [string] the sys_id of the roster
	 */
	_addRotationEscalation: function(memberGr, userSysId, gdt, delay, rosterSysId) {
		var escalationEntry = new OnCallEscalationEntry();
		escalationEntry.escalationType = "rotation";
		escalationEntry.rotaSysId = this._rotaSysIds[this._rotaSysIds.length - 1];
		escalationEntry.rosterSysId = rosterSysId;
		escalationEntry.memberSysId = memberGr.sys_id + "";
		escalationEntry.setUserID(userSysId);
		escalationEntry.setDelay(gdt, delay);
		this._escalationList.add(escalationEntry);
	},

	/**
	 * add custom escalation
	 *
	 * type escalation type (user, group, device)
	 * escalationId [string] id of escalation record. Escalation record could be user, group or device based on type
	 * gdt [GlideDateTime] the time point to add an escalation for
	 * delay [number] the delay in minutes
	 */
	_addCustomEscalation: function(type, escalationId, gdt, delay) {
		var escalationEntry = new OnCallEscalationEntry();
		escalationEntry.escalationType = type;
		escalationEntry.rotaSysId = this._rotaSysIds[this._rotaSysIds.length - 1];
		escalationEntry.setDelay(gdt, delay);
		if(type == 'user')
			escalationEntry.setUserID(escalationId);
		else if(type == 'group')
			escalationEntry.setGroupId(escalationId);
		else if(type == 'device')
			escalationEntry.setDeviceID(escalationId);
		else
			return; //Invalid type
		this._escalationList.add(escalationEntry);
	},

	_addTime: function(gd, gt) {
		if (!gd || !gt) {
			this._log.error("[_addTime] glideDate: " + gd + " glideTime: " + gt);
			return "";
		}

		var gdt = new GlideDateTime(gd);
		gdt.add(gt);
		var dateTimeStr = gdt.getValue() + "";
		dateTimeStr = dateTimeStr.replace(/-/g, "");
		dateTimeStr = dateTimeStr.replace(/:/g, "");
		var dateTimeArr = dateTimeStr.split(" ");
		dateTimeStr = dateTimeArr[0] + "T" + dateTimeArr[1];

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_addTime] dateTimeStr: " + dateTimeStr);

		return dateTimeStr;
	},

	/**
	 * Create an escalation list for escalation of type 'rotate through members'
	 *
	 * rosterGr [GlideRecord] of type cmn_rota_roster
	 * gdt [GlideDateTime] the time point for which to create the escalation for
	 * nullifyOverrideRoster
	 */
	_addRotationEscalations: function(rosterGr, gdt, nullifyOverrideRoster, isAdditionalRoster) {
		nullifyOverrideRoster = nullifyOverrideRoster + "" === "true";
		var rosterSysId = rosterGr.sys_id + "";
		var reminderDuration = rosterGr.time_between_reminders.getGlideObject();
		var reminderDelay = reminderDuration ? (reminderDuration.getNumericValue() / 1000) : 0;
		var totalDelay = 0;
		var attempts = parseInt(rosterGr.attempts + "");
		attempts = isNaN(attempts) ? 1 : attempts + 1;
		var attemptsLeft;
		var wrktimeGdt = new GlideDateTime(gdt);
		var memberGr = new GlideRecord("cmn_rota_member");
		var gd = wrktimeGdt.getDate().getValue(); // returns internal formatted date
		memberGr.addEncodedQuery("from=NULL^ORfrom<=" + gd);
		memberGr.addEncodedQuery("to=NULL^ORto>=" + gd);
		memberGr.addQuery("member.active", "=", true);
		
		if (this._log.atLevel(GSLog.DEBUG))
		this._log.debug("[_addRotationEscalations] reminderDelay: " + reminderDelay + " totalDelay: " + totalDelay + " reminderDuration: " + reminderDuration);

		if (this._getRotationMember(memberGr, wrktimeGdt, rosterGr.sys_id + "")) {
			var memberSysId = memberGr.sys_id + "";
			var userSysId = this._checkForOverrideMemberByRoster(wrktimeGdt, rosterGr.sys_id + "");
			var forcedCommunicationChannel = rosterGr.getValue('forced_communication_channel');
			var overrideUserContactPreference = rosterGr.rota.override_user_contact_preference + "";

			if (!userSysId)
				userSysId = this._checkForOverrideMember(wrktimeGdt);

			var isOverride = false;

			if (!userSysId)
				userSysId = memberGr.member + "";
			else {
				if (nullifyOverrideRoster)
					rosterSysId = null;
				isOverride = true;
			}

			if (!userSysId)
				this._log.error("No valid sys_user sys_id for cmn_rota_member: " + memberSysId);

			var isPrimaryMemberTimeOff = this._isTheUserOff(userSysId, wrktimeGdt);
			// check if the person is off
			if (!isPrimaryMemberTimeOff) {
				if (!isAdditionalRoster) {
					this._escalationList.setPrimaryUserID(userSysId, this._rotaSysIds[this._rotaSysIds.length - 1], rosterSysId);
				} else if (!this._escalationList.getPrimaryUserIdByRota(this._rotaSysIds[this._rotaSysIds.length - 1])) {
					this._escalationList.addPrimaryUserID(userSysId, this._rotaSysIds[this._rotaSysIds.length - 1], rosterSysId);
				}
				this._addRotationEscalation(memberGr, userSysId, gdt, totalDelay, rosterSysId);

				// Add the first Escalatee to the Lineup (for the notification type = 'Rotate through members')
				if (!isAdditionalRoster)
					this._addToEscalationLineUp(userSysId, null, false, new GlideDuration(reminderDuration), (attempts - 1), rosterSysId, memberGr.sys_id + "", isOverride, forcedCommunicationChannel, overrideUserContactPreference, this.ESCALATION_TYPE.ROTATE_THROUGH_MEMBER);
				else
					this._addAdditionalEscalateeToEscalationLineUp(userSysId, null, false, new GlideDuration(reminderDuration), (attempts - 1), rosterSysId, memberGr.sys_id + "", isOverride, forcedCommunicationChannel, overrideUserContactPreference, this.ESCALATION_TYPE.ROTATE_THROUGH_MEMBER);

				if (this._isMaxEntries())
					return;

				// repeat the first user if multiple attempts are requested
				attemptsLeft = attempts - 1;
				while (attemptsLeft > 0) {
					totalDelay += reminderDelay;
					this._addRotationEscalation(memberGr, userSysId, gdt, totalDelay, rosterSysId);
					attemptsLeft--;
				}
			}

			// And add in the rest of the roster rotation members
			var memberCnt = 1;
			var done = false;
			while (!done) {
				if (memberCnt > 100)
					// Only put a max of 100 members in the notification list
					done = true;

				if (!done) {
					if (!memberGr.next()) {
						memberGr.setLocation(-1);
						memberGr.next();
					}

					if (memberGr.sys_id + "" === memberSysId)
						done = true;
					else {
						userSysId = memberGr.member + "";

						if (this._isTheUserOff(userSysId, wrktimeGdt))
							continue;

						// Add more Escalatees to the Lineup for the notification type = 'Rotate through members'
						if (!isAdditionalRoster)
							this._addToEscalationLineUp(userSysId, null, false, new GlideDuration(reminderDuration), (attempts - 1), rosterSysId, memberGr.sys_id + "", isOverride, forcedCommunicationChannel, overrideUserContactPreference, this.ESCALATION_TYPE.ROTATE_THROUGH_MEMBER);
						else
							this._addAdditionalEscalateeToEscalationLineUp(userSysId, null, false, new GlideDuration(reminderDuration), (attempts - 1), rosterSysId, memberGr.sys_id + "", isOverride, forcedCommunicationChannel, overrideUserContactPreference, this.ESCALATION_TYPE.ROTATE_THROUGH_MEMBER);

						if(isPrimaryMemberTimeOff) {
							totalDelay -= reminderDelay;
							isPrimaryMemberTimeOff = false;
						}
						attemptsLeft = attempts;
						while (attemptsLeft > 0) {
							totalDelay += reminderDelay;
							this._addRotationEscalation(memberGr, userSysId, gdt, totalDelay, rosterGr.sys_id + "");
							attemptsLeft--;
						}
					}
					memberCnt++;
				}
			}
		}
	},

	_checkForMoreRotas: function(taskGr) {
		var that = this;
		this._rotaSysIds.forEach(function(rotaSysId) {
			if (!that._escalationList.isInRotaList(rotaSysId)) {
				that._escalationList.addRotaToList(rotaSysId);
			}
		});
		var time = new GlideDateTime();
		if (this._onCallCommon.isOverlapAllowed(this._groupSysId)) {
			var rotas = this._getAllRotaWithOverlappingSchedule(time);
			if (rotas !== -1 && rotas.length > 0) {
				var escalationSettings = this._onCallCommon.getEscalationSettings(this._groupSysId);
				if (escalationSettings == this._onCallCommon.escalation_rule_rota_overlap.START) {
					rotas = [this._findFirstStartedRota(rotas)];
				} else if (escalationSettings == this._onCallCommon.escalation_rule_rota_overlap.END) {
					rotas = [this._findEndingLastRota(rotas)];
				}
				for (var i = 0; i < rotas.length; i++) {
					if (!this._escalationList.isInRotaList(rotas[i].rotaSysId)) {
						this._rotaSysIds.push(rotas[i].rotaSysId);
						if(rotas[i].rotaCustomEscalation) {
							this._getCustomEscalation(rotas[i].rotaSysId, time, true, taskGr);
						} else {
							this._getRotaNotificationsByTimeAndRota(time, rotas[i].rotaSysId, true, true);
						}
					}
				}
			}
		} else {
			this._firstDelay = this._getFirstDelay(time);
			if (this._rotaSysIds[this._rotaSysIds.length - 1]) {
				if(this._rotaCustomEscalation) {
					this._getCustomEscalation(this._rotaSysIds[this._rotaSysIds.length - 1], time, true, taskGr);
				} else {
					time.addSeconds(this._firstDelay);
					this._getRotaNotificationsByTime(time, true);
				}
			}
		}
		var moreRotas = !this.isEmpty();
		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_checkForMoreRotas] moreRotas: " + moreRotas);

		return moreRotas;
	},

	_getUserScheduleByGroupId: function(groupId) {
		var userSchedules = {};
		var sysUserGr = new GlideRecord("sys_user");
		sysUserGr.initialize();
		groupId = groupId || "";
		if (!groupId)
			return userSchedules;
		sysUserGr.addQuery("JOINsys_user.sys_id=sys_user_grmember.user!group=" + groupId);
		sysUserGr.query();

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_getUserScheduleByGroupId] table: " + sysUserGr.getTableName() + " encodedQuery: " + sysUserGr.getEncodedQuery());

		while (sysUserGr.next()) {
			var userSysId = sysUserGr.sys_id + "";
			var userScheduleSysId = sysUserGr.schedule + "";
			if (userSysId && userScheduleSysId)
				userSchedules[userSysId] = userScheduleSysId;
		}
		return userSchedules;
	},

	/**
	 * Get the sys_id of a member that has an override specified for the time we are looking for (or null if none)
	 *
	 * gdt [GlideDateTime] the time point to look for
	 * return [string] sys_id of the user (or null)
	 */
	_checkForOverrideMember: function(gdt) {
		gdt = gdt ? gdt : new GlideDateTime();
		var dateStr = gdt.getDate() + "";
		var userSchedules = this._getUserScheduleByGroupId(this._groupSysId);
		var userSysIds = Object.keys(userSchedules);
		var userSysIdsLength = userSysIds.length;
		for (var i = 0; i < userSysIdsLength; i++) {
			var userSysId = userSysIds[i];
			var userScheduleSysId = userSchedules[userSysId];
			if (!userScheduleSysId)
				continue;

			var rosterScheduleSpanGr = new GlideRecord("roster_schedule_span");
			var encQuery = "schedule=" + userScheduleSysId + "^type=on_call^group=" + this._groupSysId + "^roster=NULL";
			rosterScheduleSpanGr.addEncodedQuery(this._onCallCommon.getDateLimitedEncQuery(encQuery, dateStr, dateStr));
			rosterScheduleSpanGr.query();

			if (this._log.atLevel(GSLog.DEBUG))
				this._log.debug("[_checkForOverrideMember] table: " + rosterScheduleSpanGr.getTableName() + " encodedQuery: " + rosterScheduleSpanGr.getEncodedQuery());

			var overrideSchedule = new GlideSchedule();
			overrideSchedule.addTimeSpans(rosterScheduleSpanGr);

			// backwards-compatibility check
			var scheduleSpanGr = new GlideRecord("cmn_schedule_span");
			encQuery = "sys_class_name!=roster_schedule_span^schedule=" + userScheduleSysId + "^type=on_call^group=" + this._groupSysId;
			scheduleSpanGr.addEncodedQuery(this._onCallCommon.getDateLimitedEncQuery(encQuery, dateStr, dateStr));
			scheduleSpanGr.query();

			if (this._log.atLevel(GSLog.DEBUG))
				this._log.debug("[_checkForOverrideMember] table: " + scheduleSpanGr.getTableName() + " encodedQuery: " + scheduleSpanGr.getEncodedQuery());

			overrideSchedule.addTimeSpans(scheduleSpanGr);
			if (overrideSchedule.isValid() && overrideSchedule.isInSchedule(gdt))
				return userSysId;
		}
		return null;
	},

	_clearEscalationLineUp: function() {
		this._escalatees = this._initEscalationPlan();
		this._escalationLevel = 0;
	},

	/**
	 * Get the sys_id of a member that has an override specified for the time we are looking for (or null if none)
	 *
	 * gdt [GlideDateTime] the time point to look for
	 * rosterSysId [String]: roster to search in
	 * return [string] sys_id of the user (or null)
	 */
	_checkForOverrideMemberByRoster: function(gdt, rosterSysId) {
		gdt = gdt ? gdt : new GlideDateTime();
		var dateStr = gdt.getDate() + "";
		var userSchedules = this._getUserScheduleByGroupId(this._groupSysId);
		var userSysIds = Object.keys(userSchedules);
		var userSysIdsLength = userSysIds.length;
		for (var i = 0; i < userSysIdsLength; i++) {
			var rosterScheduleSpanGr = new GlideRecord("roster_schedule_span");
			var userSysId = userSysIds[i];
			var userScheduleSysId = userSchedules[userSysId];
			if (!userScheduleSysId)
				continue;

			rosterScheduleSpanGr.initialize();
			var encQuery = "schedule=" + userScheduleSysId + "^type=on_call^group=" + this._groupSysId + "^roster=" + rosterSysId;
			rosterScheduleSpanGr.addEncodedQuery(this._onCallCommon.getDateLimitedEncQuery(encQuery, dateStr, dateStr));
			rosterScheduleSpanGr.query();

			if (this._log.atLevel(GSLog.DEBUG))
				this._log.debug("[_checkForOverrideMemberByRoster] table: " + rosterScheduleSpanGr.getTableName() + " encodedQuery: " + rosterScheduleSpanGr.getEncodedQuery());

			var overrideSchedule = new GlideSchedule();
			overrideSchedule.addTimeSpans(rosterScheduleSpanGr);
			if (overrideSchedule.isValid() && overrideSchedule.isInSchedule(gdt))
				return userSysId;
		}
		return null;
	},

	_createEscalationRecord: function(gr, eventName, escalationScriptName) {
		var escalationGr = new GlideRecord("cmn_rota_escalation");
		escalationGr.setValue("table", gr.getTableName());
		escalationGr.setValue("instance", gr.sys_id + "");
		escalationGr.setValue("group", this._groupSysId);
		escalationGr.setValue("name", "Rota-" + gr.getDisplayValue());
		escalationGr.setValue("event_name", eventName);
		escalationGr.setValue("escalation_document", this.getFullEscalationDocument());
		escalationGr.setValue("script_name", escalationScriptName);
		var escalationSysId = escalationGr.insert();

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_createEscalationRecord] escalationSysId: " + escalationSysId);

		return escalationGr;
	},

	_createNewRota: function(rotaName, groupSysId, isDraft) {
		if (!rotaName || !groupSysId)
			return null;

		var rotaGr = new GlideRecord("cmn_rota");
		rotaGr.setValue("group", groupSysId);
		rotaGr.setValue("name", rotaName);
		var groupGr = new GlideRecord("sys_user_group");
		if (!groupGr.get(groupSysId))
			return null;

		var groupDomain = groupGr.sys_domain + "";
		rotaGr.setValue("sys_domain", groupDomain);
		if (isDraft) {
			rotaGr.setValue("state", "draft");
			rotaGr.setValue("active", false);
		}
		rotaGr.insert();
		this._rotaGr = rotaGr;
		return rotaGr;
	},

	_createNewRosterSchedule: function(timezone, scheduleName) {
		var document = this._rotaGr.getTableName();
		var documentKey = this._rotaGr.sys_id + "";

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_createNewRosterSchedule] timezone: " + timezone + " scheduleName: " + scheduleName + " document: " + document + " documentKey: " + documentKey);

		var scheduleGr = new GlideRecord("cmn_schedule");
		scheduleGr.setValue("name", scheduleName);
		scheduleGr.setValue("time_zone", timezone);
		scheduleGr.setValue("type", "roster");
		scheduleGr.setValue("document", document);
		scheduleGr.setValue("document_key", documentKey);
		scheduleGr.setValue("read_only", false);
		var scheduleSysId = scheduleGr.insert();
		this._scheduleGr = scheduleGr;

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_createNewRosterSchedule] scheduleSysId: " + scheduleSysId);

		return scheduleSysId;
	},

	/**
	 * Creates a roster schedule and schedule span(s) by copying data from the given scheduleId
	 *
	 * existingScheduleSysId [String]
	 * groupSysId [String]
	 * startGdt [GlideDateTime]
	 * return scheduleSysId [String]
	 */
	_createRosterScheduleFromExisting: function(existingScheduleSysId, startGdt) {
		var timezone = this._getTimeZoneBySchedule(existingScheduleSysId);
		var rotaName = this._rotaGr.name + "";
		var rosterScheduleGr = new GlideRecord("cmn_schedule");
		rosterScheduleGr.setValue("name", rotaName);
		rosterScheduleGr.setValue("type", "roster");
		rosterScheduleGr.setValue("document", "cmn_rota");
		rosterScheduleGr.setValue("document_key", this._rotaGr.sys_id + "");
		rosterScheduleGr.setValue("time_zone", timezone);
		var scheduleSysId = rosterScheduleGr.insert() + "";

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_createRosterScheduleFromExisting] scheduleSysId: " + scheduleSysId);

		this._rosterScheduleGr = rosterScheduleGr;
		var fromGr = new GlideRecord("cmn_schedule_span");
		fromGr.addQuery("schedule", existingScheduleSysId);
		fromGr.orderBy("parent");
		fromGr.query();
		var rowCount = parseInt(fromGr.getRowCount());
		var rosterStartTimeStr;

		var scheduleTZ = this._parseTZ(timezone);
		startGdt.setTZ(scheduleTZ); // required, for checking isDST in rota schedule's timezone
		while (fromGr.next()) {
			var gdt = fromGr.start_date_time.getGlideObject().getGlideDateTime();
			if (!fromGr.schedule.time_zone) // floating
				rosterStartTimeStr = gdt.getTime().getByFormat("HH:mm:ss");
			else
				rosterStartTimeStr = gdt.getTime().getDisplayValueInternal();
			// adjust start and end time based on DST
			this._adjustStartEndByDST(fromGr, startGdt, scheduleTZ);
			var rosterDates = this._getStartEndByRosterStart(fromGr.start_date_time + "", fromGr.end_date_time + "", startGdt, this._rosterScheduleGr.time_zone + "", rowCount);
			var scheduleSpanSysId = this._createScheduleSpan(rotaName, scheduleSysId, fromGr.show_as + "", fromGr.type + "", fromGr.override_start_date + "",
				rosterDates.start, rosterDates.end, (fromGr.all_day + "" === "true"), fromGr.repeat_until + "", fromGr.repeat_type + "", fromGr.repeat_count + "",
				fromGr.days_of_week + "", fromGr.monthly_type + "", fromGr.yearly_type + "", fromGr.month + "", fromGr.float_day + "", fromGr.float_week + "");
			if (this._log.atLevel(GSLog.DEBUG))
				this._log.debug("[_createRosterScheduleFromExisting] scheduleSpanSysId: " + scheduleSpanSysId);
		}

		if (rowCount === 1 && fromGr.all_day + "" !== "true") {
			this._isAllDayRoster = false;
			this.setRosterStartTime(rosterStartTimeStr);
		} else
			this._isAllDayRoster = true;

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_createRosterScheduleFromExisting] scheduleSysId: " + scheduleSysId);

		return scheduleSysId;
	},
		
	_adjustStartEndByDST: function(fromGr, rotationStartGdt, scheduleTZ) {
		var fromStartGdt = fromGr.start_date_time.getGlideObject().getGlideDateTime();
		fromStartGdt.setTZ(scheduleTZ); // required, for checking isDST in rota schedule's timezone
		if (fromGr.schedule.time_zone && fromStartGdt.isDST() != rotationStartGdt.isDST()) {
			var dstOffSet = (fromStartGdt.getDSTOffset() - rotationStartGdt.getDSTOffset()) / 1000;
			fromGr.start_date_time.getGlideObject().addSeconds(dstOffSet);
			fromGr.end_date_time.getGlideObject().addSeconds(dstOffSet);
		}
	},
	
	_parseTZ: function(timeZoneStr){
		var schedule = new GlideSchedule();
		schedule.setTimeZone(timeZoneStr);
		return schedule.getTZ();
	},

	/**
	 * Creates a schedule span with defaults
	 *
	 * startGdt [GlideDateTime]
	 * endGdt [GlideDateTime]
	 * repeats [string]
	 * isAllDay [Boolean
	 * groupSysId [string
	 * return scheduleSpanSysId [string]
	 */
	_createScheduleSpanWithDefaults: function(startGdt, endGdt, repeats, isAllDay, days) {
		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_createScheduleSpanWithDefaults] startGdt: " + startGdt + " endGdt: " + endGdt + " repeats: " + repeats + " isAllDay: " + isAllDay);

		this._isAllDayRoster = isAllDay;
		var startSdt = new GlideScheduleDateTime(startGdt.getDisplayValueWithoutTZ());
		var endSdt = new GlideScheduleDateTime(endGdt.getDisplayValueWithoutTZ());
		var timezone = this._scheduleGr.getValue("time_zone");

		if (isAllDay) {
			startSdt.setBeginningOfDay();
			endSdt.setEndOfDay();
		} else {
			var time = new GlideTime();
			time.setDisplayValue(startSdt.getGlideDateTime().getTime().toString());
			this.setRosterStartTime(time.getDisplayValueInternal());
		}

		var repeatType = "";
		if (repeats !== "none")
			repeatType = repeats;
		if (!days)
			days = "1234567";

		var	rotaName = this._rotaGr.name + "";
		var scheduleSysId = this._scheduleGr.sys_id + "";
		var startSdtStr = this._applyTimeZone(startSdt.getValue(), timezone).getValue();
		var endSdtStr = this._applyTimeZone(endSdt.getValue(), timezone).getValue();

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_createScheduleSpanWithDefaults] startSdtStr: " + startSdtStr + " endSdtStr: " + endSdtStr);

		var scheduleSpanSysId = this._createScheduleSpan(rotaName, scheduleSysId, "on_call", "on_call", 0, startSdtStr, endSdtStr, this._isAllDayRoster, 0, repeatType, 1, days, "dom", "doy", 1, "1", "1");
		return scheduleSpanSysId;
	},

	/**
	 *
	 * name [string]
	 * scheduleSysId [string]
	 * showAs [string]
	 * type [string]
	 * overrideStartDate [number]
	 * startSchedDateTime [string]
	 * endSchedDateTime [string]
	 * isAllDay [boolean]
	 * repeatUntil [number]
	 * repeatType [string]
	 * repeatCount [number]
	 * daysOfWeek [string]
	 * monthType [string]
	 * yearlyType [string]
	 * month [number]
	 * floatDay [string]
	 * floatWeek [string]
	 * return scheduleSpanSysId [string]
	 */
	_createScheduleSpan: function(name, scheduleSysId, showAs, type, overrideStartDate, startSchedDateTime, endSchedDateTime,
		isAllDay, repeatUntil, repeatType, repeatCount, daysOfWeek, monthType, yearlyType, month, floatDay, floatWeek) {
			name = name || "";
			scheduleSysId = scheduleSysId || "";
			showAs = showAs || "";
			type = type || "";
			overrideStartDate = overrideStartDate || 0;
			startSchedDateTime = startSchedDateTime || "";
			endSchedDateTime = endSchedDateTime || "";
			isAllDay = isAllDay + "" === "true" ? true : false;
			repeatUntil = repeatUntil || 0;
			repeatType = repeatType || "";
			repeatCount = repeatCount || 1;
			daysOfWeek = daysOfWeek || "1234567";
			monthType = monthType || "dom";
			yearlyType = yearlyType || "doy";
			month = month || 1;
			floatDay = floatDay || "1";
			floatWeek = floatWeek || "1";

			if (this._log.atLevel(GSLog.DEBUG))
				this._log.debug("[_createScheduleSpan] name: " + name + " scheduleSysId: " + scheduleSysId + " showAs: " + showAs + " type: " + type +
				" overrideStartDate: " + overrideStartDate + " startSchedDateTime: " + startSchedDateTime + " endSchedDateTime: " + endSchedDateTime +
				" isAllDay: " + isAllDay + " repeatUntil: " + repeatUntil + " repeatType: " + repeatType + " repeatCount: " + repeatCount +
				" daysOfWeek: " + daysOfWeek + " monthType: " + monthType + " yearlyType: " + yearlyType + " month: " + month + " floatDay: " + floatDay +
				" floatWeek: " + floatWeek);

			var spanGr = new GlideRecord("cmn_schedule_span");
			spanGr.setValue("name", name);
			spanGr.setValue("schedule", scheduleSysId);
			spanGr.setValue("show_as", showAs);
			spanGr.setValue("type", type);
			spanGr.setValue("start_date_time", startSchedDateTime + "");
			spanGr.setValue("end_date_time", endSchedDateTime + "");
			spanGr.setValue("all_day", isAllDay);
			spanGr.setValue("repeat_until", repeatUntil + "");
			spanGr.setValue("repeat_type", repeatType);
			spanGr.setValue("repeat_count", repeatCount);
			spanGr.setValue("days_of_week", daysOfWeek);
			spanGr.setValue("monthly_type", monthType);
			spanGr.setValue("yearly_type", yearlyType);
			if (month >= 0)
				spanGr.setValue("month", month);
			spanGr.setValue("float_day", floatDay);
			spanGr.setValue("float_week", floatWeek);
			spanGr.setValue("override_start_date", overrideStartDate + "");
			var scheduleSpanSysId = spanGr.insert();

			if (this._log.atLevel(GSLog.DEBUG))
				this._log.debug("[_createScheduleSpan] scheduleSpanSysId: " + scheduleSpanSysId);

			return scheduleSpanSysId;
	},

	/**
	 * Get the cmn_schedule.time_zone and if this is set to floating get the user time zone,
	 * or system time zone if user time zone is not defined. Finally activates the time zone.
	 *
	 * existingSchedule [string]
	 * return timezone [string]
	 */
	_getTimeZoneBySchedule: function(scheduleSysId) {
		var timezone = "";
		var scheduleGr = new GlideRecord("cmn_schedule");
		if (scheduleGr.get(scheduleSysId))
			timezone = scheduleGr.time_zone + "";
		if (!timezone)
			timezone = this._gs.getSession().getTimeZoneName();
		this._activateTimezone(timezone);
		return timezone;
	},

	/**
	 * Determine the roster that:
	 *
	 * 1. Has not already been processed (is not in the fEscalations roster list)
	 * 2. Is the next roster to become active (which might mean it is currently active)
	 *
	 * gdt: [GlideDateTime] the timepoint to search for
	 * return: [number] seconds until the next roster is 'active': 0 -> now, -1 -> no more rosters
	 */
	_getFirstDelay: function(gdt) {
		if (!this._groupSysId)
			return -1;

		var rotaGr = new GlideRecord("cmn_rota");
		rotaGr.addQuery("group", this._groupSysId);
		rotaGr.addActiveQuery();
		rotaGr.query();
		while (rotaGr.next()) {
			var rotaSysId = rotaGr.sys_id + "";
			if (this._escalationList.isInRotaList(rotaSysId))
				this._rotaSysIds = [];
			else {
				var schedule = new GlideSchedule(rotaGr.schedule + "");
				if (schedule.isValid() && schedule.isInSchedule(gdt)) {
					this._rotaSysIds = [rotaSysId];
					this._rotaCustomEscalation = rotaGr.getValue('use_custom_escalation') == '1' ? true : false;
					this._rotaTimeZone = schedule.getTimeZone();

					if (this._log.atLevel(GSLog.DEBUG))
						this._log.debug("[_getFirstDelay] this._groupSysId: " + this._groupSysId + " this._rotaSysId: " + this._rotaSysIds[0] + " gdt: " + gdt);

					return 0;
				}
			}
		}
		return -1;
	},

	_sortRotasByDate: function (rotasList) {
		rotasList.sort(function (rota1, rota2) {
			var gdt1 = new GlideDateTime();
			gdt1.setDisplayValueInternal(rota1.start);
			var gdt2 = new GlideDateTime();
			gdt2.setDisplayValueInternal(rota2.start);
			if (gdt1.before(gdt2))
				return -1;
			if (gdt1.equals(gdt2))
				return 0;
			else
				return 1;
		});

		return rotasList;
	},

	_getAllRotaWithOverlappingSchedule: function(gdt, rotaSysIds) {
		if (!this._groupSysId)
			return -1;

		var rotaGr = new GlideRecord("cmn_rota");
		rotaGr.addQuery("group", this._groupSysId);
		rotaGr.addActiveQuery();
		if(rotaSysIds) {
			rotaGr.addQuery('sys_id', 'IN', rotaSysIds);
		}
		rotaGr.query();
		var overlappingRotas = [];
		while (rotaGr.next()) {
			var rotaSysId = rotaGr.sys_id + "";
			var schedule = new GlideSchedule(rotaGr.schedule + "");
			if (schedule.isValid() && schedule.isInSchedule(gdt)) {
				var scheduleTimeMap = schedule.fetchTimeMapWithExcludes(gdt, gdt, null, false);

				var rotaInfo = {
					rotaSysId: rotaSysId,
					rotaTimeZone: schedule.getTimeZone(),
					rotaCustomEscalation: rotaGr.getValue('use_custom_escalation') == '1' ? true : false
				};

				if (scheduleTimeMap.hasNext()) {
					var span = scheduleTimeMap.next();
					rotaInfo.start = span.getActualStart().getDisplayValueInternal();
					rotaInfo.end = span.getActualEnd().getDisplayValueInternal();
				}
				overlappingRotas.push(rotaInfo);
			}
		}
		return this._sortRotasByDate(overlappingRotas);
	},

	getOverlappingRotas: function (groupId, gdt) {
		this._groupSysId = groupId;
		var rotas = this._getAllRotaWithOverlappingSchedule(gdt);
		if (rotas !== -1 && rotas.length > 0) {
			var escalationSettings = this._onCallCommon.getEscalationSettings(groupId);
			if (escalationSettings == this._onCallCommon.escalation_rule_rota_overlap.START) {
				rotas = [this._findFirstStartedRota(rotas)];
			} else if (escalationSettings == this._onCallCommon.escalation_rule_rota_overlap.END) {
				rotas = [this._findEndingLastRota(rotas)];
			}
		}
		return rotas;
	},

	_getEscalatees: function(groupSysIds, rotaSysIds, rosterSysIds, gdt, nullifyOverrideRoster, overrideCustomEscalation, taskGr) {
		var groupSysIdList = groupSysIds ? (groupSysIds + "").split(",") : [];
		var rotaSysIdList = rotaSysIds ? (rotaSysIds + "").split(",") : [];
		var rosterSysIdList = rosterSysIds ? (rosterSysIds + "").split(",") : [];
		gdt = gdt || new GlideDateTime();
		nullifyOverrideRoster = nullifyOverrideRoster + "" === "true";

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_getEscalatees] groupSysIds: " + groupSysIds + " rotaSysIds: " + rotaSysIds + " rosterSysIds: " + rosterSysIds + " gdt: " + gdt + " nullifyOverrideRoster: " + nullifyOverrideRoster);

		var escalatees = [];
		if (!groupSysIdList || groupSysIdList.length === 0)
			return escalatees;

		var groupSysIdListLength = groupSysIdList.length;
		for (var i =0; i < groupSysIdListLength; i++) {
			var groupSysId = groupSysIdList[i];
			var escalationPlan = this._getEscalationsByGroup(groupSysId, gdt, nullifyOverrideRoster, overrideCustomEscalation, taskGr);
			var escalationPlanLength = escalationPlan.length;
			for (var j = 0; j < escalationPlanLength; j++) {
				var escalatee = escalationPlan[j];
				if (rotaSysIdList && rotaSysIdList.length > 0 && rotaSysIdList.indexOf(escalatee.getRotaId()) === -1)
					continue;

				var memberRosterId = escalatee.getRosterId();
				if (!memberRosterId && escalatee.getMemberId())
					memberRosterId = this._getRosterByMemberId(escalatee.getMemberId());

				if (memberRosterId && rosterSysIdList && rosterSysIdList.length > 0 && rosterSysIdList.indexOf(memberRosterId) === -1)
					continue;

				if (escalatee.getUserId() || escalatee.getDeviceId() || (escalatee.getUserIds() && escalatee.getUserIds().length > 0) || (escalatee.getDeviceIds() && escalatee.getDeviceIds().length > 0) || (escalatee.getEscalationGroups() && escalatee.getEscalationGroups().length > 0))
					escalatees.push(escalatee);

				if (escalatee.additionalEscalatees && escalatee.additionalEscalatees.length > 0) {
					var additionalEscalateeLength = escalatee.additionalEscalatees.length;
					for (var k = 0; k < additionalEscalateeLength; k++) {
						var additionalEscalatee = escalatee.additionalEscalatees[k];
						if (rotaSysIdList && rotaSysIdList.length > 0 && rotaSysIdList.indexOf(additionalEscalatee.getRotaId()) === -1)
							continue;

						memberRosterId = additionalEscalatee.getRosterId();
						if (!memberRosterId)
							memberRosterId = this._getRosterByMemberId(additionalEscalatee.getMemberId());

						if (memberRosterId && rosterSysIdList && rosterSysIdList.length > 0 && rosterSysIdList.indexOf(memberRosterId) === -1)
							continue;

						escalatees.push(additionalEscalatee);
					}
				}
			}
		}

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_getEscalatees] escalatees: " + escalatees);

		return escalatees;
	},

	_getStartEndByRosterStart: function(startStr, endStr, rosterStartGdt, timezone, spanCount) {
		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_getStartEndByRosterStart] startStr: " + startStr + " endStr: " + endStr + " rosterStartGdt: " + rosterStartGdt + " timezone: " + timezone);

		var start;
		var end;

		// Check if the schedule is starting in the past and reset the start date based on user input
		var startSdt = new GlideScheduleDateTime();
		startSdt.setValue(startStr);

		var startbeforeToday = startSdt.compareTo(new GlideScheduleDateTime(rosterStartGdt.getDisplayValue())) < 0;
		if (startbeforeToday && rosterStartGdt && !this._cloneStartEndDate) {
			start = this._addTime(rosterStartGdt.getDate(), startSdt.getGlideDateTime().getTime());
			var rotationStartSdt = new GlideScheduleDateTime();
			rotationStartSdt.setValue(start);
			var endSdt = new GlideScheduleDateTime();
			endSdt.setValue(endStr);
			end = this._getEndDateByDiff(rotationStartSdt, startSdt, endSdt);

			// Absence of Z means floating
			if (!startSdt.isFloating()) {
				start += "Z";
				end += "Z";
			}
		} else {
			start = startStr;
			end = endStr;
		}

		start = this._applyTimeZone(start, timezone).getValue();
		end = this._applyTimeZone(end, timezone).getValue();

		return {start: start, end: end};
	},

	_getSequenceName: function(index) {
		return index < OnCallRotationSNC.SEQUENCE_NAMES.length ? OnCallRotationSNC.SEQUENCE_NAMES[index] : index + 1;
	},

	_applyTimeZone: function(sdt, timeZone) {
		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_applyTimeZone] sdt: " + sdt + " timeZone: " + timeZone);

		var sdtTZ = new GlideScheduleDateTime();
		sdtTZ.setValue(sdt);
		sdtTZ.setTimeZone(timeZone);
		sdtTZ.setTimeZone("Etc/UTC");

		return sdtTZ;
	},

	/**
	 * Calculate the difference between start and end and add the result to
	 * start of the rotation.
	 *
	 * rotationStartSdt [ScheduleDateTime] when the rotation will start according to specified start date
	 * startSdt [ScheduleDateTime] the date and time specified in the schedule entry definition
	 * endSdt [ScheduleDateTime] the date and time specified in the schedule entry definition
	 * return rosterEnd
	 */
	_getEndDateByDiff: function(rotationStartSdt, startSdt, endSdt) {
		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_getEndDateByDiff] rotationStartSdt: " + rotationStartSdt + " startSdt: " + startSdt + " endSdt: " + endSdt);

		var diff = endSdt.getMS() - startSdt.getMS();
		var rotationEndGdt = new GlideDateTime(rotationStartSdt.getGlideDateTime());
		rotationEndGdt.add(diff);
		return this._addTime(rotationEndGdt.getDate(), rotationEndGdt.getTime());
	},

	/**
	 * Who within a roster is on the rotation schedule for the specified time
	 *
	 * Note that this method will: - not return a rotation member, but a boolean _if_ a member is on call - modify
	 * member by reference where the member will be the member on call - use the rosterID to query the member
	 *
	 * Example usage: GlideRecord member = new GlideRecord(CMN_ROTA_MEMBER); GlideDateTime time = new GlideDateTime();
	 * String rosterID = roster.sys_id + ""; // roster = GlideRecord(CMN_ROTA_ROSTER) if (member, time, rosterID) {
	 * // member is now a reference to the member record of the member // that is on call at the specified time }
	 *
	 * memberGr [GlideRecord] instance of CMN_ROTA_MEMBER
	 * gdt [GlideDateTime] the time to check for
	 * rosterSysId [String] with the unique ID of a roster record
	 * return [boolean] is someone on call in a roster at a certain time
	 */
	_getRotationMember: function(memberGr, gdt, rosterSysId) {
		memberGr.addQuery("roster", rosterSysId);
		memberGr.orderBy("order");
		memberGr.query();
		while (memberGr.next()) {
			var memberRotaSchedule = new GlideSchedule(memberGr.rotation_schedule + "");
			var justAfterGdt = new GlideDateTime(gdt);
			justAfterGdt.addSeconds(1);
			var scheduleTimeMap = memberRotaSchedule.getTimeMap(new GlideDateTime(gdt), justAfterGdt);

			// This member is one that is on-call at the specified time
			if (memberRotaSchedule.isValid() && !scheduleTimeMap.isEmpty())
				return true;
		}
		return false;
	},

	/**
	 * Get the set of notifications for the current rota based on the rota's escalation type and rotation members
	 * rosterGr [GlideRecord] of the roster for the specified Rota
	 * gdt [GlideDateTime] the time point to get notifications for
	 * nullifyOverrideRoster [boolean]
	 */
	_getRotaNotifications: function(rosterGr, gdt, nullifyOverrideRoster, isAdditionalRota) {
		nullifyOverrideRoster = nullifyOverrideRoster + "" === "true";
		if(!isAdditionalRota){
			this._escalationList.clear();
			this._clearEscalationLineUp();
			this._escalationList.setGroupID(this._groupSysId);
			this._escalationList.setRotaID(this._rotaSysIds[this._rotaSysIds.length - 1]);
			this._escalationList.setTimeZone(this._rotaTimeZone);
		} else {
			this._escalationLevel = 0;
			this._escalationList.addRotaID(this._rotaSysIds[this._rotaSysIds.length - 1]);
		}

		if (rosterGr.getRowCount() === 1) {
			rosterGr.next();
			this._addRotationEscalations(rosterGr, gdt, nullifyOverrideRoster, isAdditionalRota);
		} else if (rosterGr.getRowCount() > 1)
			this._addDutyEscalations(rosterGr, gdt, nullifyOverrideRoster, isAdditionalRota);
	},

	/**
	 * Get the set of notifications for the current rota based on the rota's escalation type and rotation members
	 * gdt [GlideDateTime] the time point to get notifications for
	 * nullifyOverrideRoster [boolean]
	 */
	_getRotaNotificationsByTime: function(gdt, nullifyOverrideRoster, isAdditionalRota) {
		var gr = new GlideRecord('cmn_rota_roster');
		gr.addQuery("rota", this._rotaSysIds[this._rotaSysIds.length - 1]);
		gr.addActiveQuery();
		gr.query();
		this._getRotaNotifications(gr, gdt, nullifyOverrideRoster, isAdditionalRota);
	},

	_getRotaNotificationsByTimeAndRota: function(gdt, rotaSysId, nullifyOverrideRoster, isAdditionalRota) {
		var gr = new GlideRecord('cmn_rota_roster');
		gr.addQuery("rota", rotaSysId);
		gr.addActiveQuery();
		gr.query();
		this._getRotaNotifications(gr, gdt, nullifyOverrideRoster, isAdditionalRota);
	},

	_getRosterByMemberId: function(memberSysId) {
		if (!memberSysId)
			return "";

		var gr = new GlideRecord("cmn_rota_member");
		if (!gr.get(memberSysId))
			return "";

		return gr.roster + "";
	},

	_getEscalationsByGroup: function(groupSysId, dateTime, nullifyOverrideRoster, overrideCustomEscalation, taskGr) {
		nullifyOverrideRoster = nullifyOverrideRoster + "" === "true";
		this.who(groupSysId, dateTime, nullifyOverrideRoster, "", overrideCustomEscalation, taskGr);
		return this._escalatees;
	},

	/**
	 * ical: yyyymmddThhmmss
	 * return time hh:mm:ss
	 */
	_iCalToTime: function(iCal) {
			var sdt = new GlideScheduleDateTime();
			sdt.setValue(iCal);
			var time = sdt.getDisplayValue().split(" ")[1] + "";
			if (this._log.atLevel(GSLog.DEBUG))
				this._log.debug("[_iCalToTime] iCal: " + iCal + " time: " + time);
			return time;
	},

	/**
	 * Checks if the given user is off at the given time period
	 *
	 * userSysId [String] the sys_user id of this rota member
	 * gdt [GlideDateTime] the time point to check the member availability
	 **/
	_isTheUserOff: function(userSysId, gdt) {
		if (!userSysId)
			return false;

		gdt = gdt ? gdt : new GlideDateTime();
		var dateStr = gdt.getDate() + "";

		// Check the user availability
		var memberGr = new GlideRecord("sys_user");
		memberGr.setWorkflow(false);	// inactive users are not visible to non-admins
		memberGr.addQuery("JOINsys_user.sys_id=sys_user_grmember.user!group=" + this._groupSysId);
		memberGr.addQuery("sys_id", userSysId);
		memberGr.query();
		while (memberGr.next()) {
			if (!memberGr.active)
				return true;

			var userScheduleSysId = memberGr.schedule + "";
			if (!userScheduleSysId)
				continue;

			var rosterScheduleSpanGr = new GlideRecord("roster_schedule_span");
			var encQuery = "schedule=" + userScheduleSysId + "^group=" + this._groupSysId + "^ORgroup=NULL^type=time_off";
			rosterScheduleSpanGr.addEncodedQuery(this._onCallCommon.getDateLimitedEncQuery(encQuery, dateStr, dateStr));
			rosterScheduleSpanGr.query();

			if (this._log.atLevel(GSLog.DEBUG))
				this._log.debug("[_isTheUserOff] table: " + rosterScheduleSpanGr.getTableName() + " encodedQuery: " + rosterScheduleSpanGr.getEncodedQuery());

			var timeOffSchedule = new GlideSchedule();
			timeOffSchedule.addTimeSpans(rosterScheduleSpanGr);
			if (timeOffSchedule.isValid() && timeOffSchedule.isInSchedule(gdt))
				return true;
		}
		return false;
	},

	_setPageAndPrepare: function(page, url) {
		page += "";
		url += page;
		if (!page.endsWith(OnCallRotationSNC.DOT_DO_Q)) {
			if (page.endsWith(OnCallRotationSNC.DOT_DO))
				url += OnCallRotationSNC.Q;
			else if (page.includes(OnCallRotationSNC.DOT_DO_Q))
				url += OnCallRotationSNC.AMP;
			else
				url += OnCallRotationSNC.DOT_DO_Q;
		}
		return url;
	},

	_getGroupIdByRota: function(rotaId) {
		rotaId = this._firstValidSysId(rotaId);
		if (JSUtil.nil(rotaId))
			return "";
		var gr = new GlideRecord("cmn_rota");
		gr.get(rotaId);
		return gr.group + "";
	},

	_getGroupIdByRoster: function(rosterId) {
		rosterId = this._firstValidSysId(rosterId);
		if (JSUtil.nil(rosterId))
			return "";
		var gr = new GlideRecord("cmn_rota_roster");
		if (gr.get(rosterId))
			return gr.rota.group + "";
		return "";
	},

	_firstValidSysId: function(sysIds) {
		sysIds = (sysIds + "").split(",");
		if (sysIds.length < 1)
			return "";
		return sysIds[0];
	},

	_getOnCallRosterByGr: function(rosterGr) {
		if (rosterGr && !this._onCallRoster || this._onCallRoster.getId !== rosterGr.sys_id + "")
			this._onCallRoster = new OnCallRoster(rosterGr);

		if (!this._onCallRoster)
			this._log.error("[_getOnCallRosterByGr] called without valid cmn_rota_roster GlideRecord");

		return this._onCallRoster;
	},

	getRotas: function(groupSysIds, fetchPreference) {
		var rotas = {};
		if (!groupSysIds)
			return rotas;

		var gr = new GlideRecord("cmn_rota");
		gr.addQuery("group", "IN", groupSysIds);
		gr.orderBy("name");
		if (!fetchPreference)
			gr.addActiveQuery();
		else if (fetchPreference == 'draft')
			gr.addQuery("state", "draft");
		else if (fetchPreference == 'all') {
			var qc = gr.addQuery("active", true);
			var qcOR = qc.addOrCondition("active", false);
			qcOR.addCondition("state", "draft");
		}
		
		gr.query();
		while (gr.next()) {
			var sysId = gr.sys_id + "" + "";
			var rotaTime = this._getRotaTime(gr.schedule + "");
			rotas[sysId] = {
				sys_id: sysId,
				id: sysId,
				start: rotaTime.start,
				end: rotaTime.end,
				startTime: rotaTime.startTime,
				endTime: rotaTime.endTime,
				name: SNC.GlideHTMLSanitizer.sanitize(gr.getDisplayValue() + ""),
				group: gr.group + "",
				state: gr.state + ""
			};
		}
		return rotas;
	},

	_getUsers: function(userSysIds) {
		if (this._log.atLevel(GSLog.DEBUG))
			this.timer.start("[_getUsers]");

		var users = {};
		if (!userSysIds || userSysIds.length == 0)
			return users;

		for (var index = 0; index < userSysIds.length; index++) {
			var sysId = userSysIds[index];
			if (!sysId || users[sysId])
				continue;

			var user = GlideUser.getUserByID(sysId);
			if (!user || !user.getID())
				continue;

			users[sysId] = {
				sys_id: sysId,
				id: sysId,
				sysUserId: sysId,
				userID: sysId,
				avatar: user.getAvatar() || "",
				initials: user.getInitials() || "",
				name: user.getFullName() || "",
				title: user.getTitle() || "",
				email: user.getEmail() || "",
				contact_number: user.getMobileNumber() || user.getBusinessNumber() || ""
			};
		}

		if (this._log.atLevel(GSLog.DEBUG))
			this.timer.stop("[_getUsers]");

		return users;
	},

	_getRotaTime: function(scheduleSysId, dateFormat, timeGdt) {
		var rotaTime = {};
		rotaTime.start = "";
		rotaTime.end = "";

		if (!scheduleSysId)
			return rotaTime;

		timeGdt = timeGdt || new GlideDateTime();
		var schedule = new GlideSchedule(scheduleSysId);
		var scheduleTimeMap = schedule.fetchTimeMapWithExcludes(timeGdt, timeGdt, null, false);

		if (!scheduleTimeMap.hasNext())
			return rotaTime;

		// Only interested in span for this timeGdt (start and end time the same so will only match one span)
		var span = scheduleTimeMap.next();
		if (!span)
			return rotaTime;

		
		var startDateTime = span.getActualStart().getDisplayValue().split(" ");
		var endDateTime = span.getActualEnd().getDisplayValue().split(" ");
		
		// Get time of start date and end date
		var startTime = this._getHoursMins(startDateTime[1]);
		var endTime = this._getHoursMins(endDateTime[1]);
		
		var ampmStart = startDateTime[2] ? startDateTime[2].toLowerCase() : "";
		var ampmEnd = endDateTime[2] ? endDateTime[2].toLowerCase() : "";
		
		startTime = gs.getMessage("{0} {1}", [startTime, ampmStart]);
		startTime = (startTime + "").trim();
		endTime = gs.getMessage("{0} {1}", [endTime, ampmEnd]);
		endTime = (endTime + "").trim();
		
		rotaTime.start = startDateTime.join(" ");
		rotaTime.end = endDateTime.join(" ");
		rotaTime.startTime = startTime;
		rotaTime.endTime = endTime;
		return rotaTime;
	},

	_getHoursMins: function(time) {
		time = time + "";
		var timeSeparater = ":";
		if (time.indexOf(":") > -1)
			timeSeparater = ":";
		else if (time.indexOf(".") > -1)
			timeSeparater = ".";
		var timeArr = time.split(timeSeparater);
		if (time.length < 6)
			return time;
		return timeArr.slice(0, 2).join(timeSeparater);
	},

	getRostersByRotas: function(rotaSysIds, toJS, requiredFields) {
		var rosters = {};
		if (!rotaSysIds)
			return rosters;

		var gr = new GlideRecord("cmn_rota_roster");
		gr.addQuery("rota", "IN", rotaSysIds);
		gr.addActiveQuery();
		gr.query();
		while (gr.next()) {
			var sysId = gr.sys_id + "" + "";
			if (toJS) {
				rosters[sysId] = this._onCallCommon.toJS(gr, requiredFields);
			} else
				rosters[sysId] = {
					sys_id: sysId,
					id: sysId,
					name: gr.getDisplayValue() + "",
					rota: gr.rota + ""
				};
		}
		return rosters;
	},

	getMembers: function(rosterSysIds, toJS, requiredFields) {
		var members = {};
		if (!rosterSysIds)
			return members;

		var gr = new GlideRecord("cmn_rota_member");
		gr.addQuery("roster", "IN", rosterSysIds);
		gr.addActiveQuery();
		gr.query();
		while (gr.next()) {
			var sysId = gr.sys_id + "" + "";
			if (toJS) {
				members[sysId] = this._onCallCommon.toJS(gr, requiredFields);
			} else
				members[sysId] = {
					sys_id: sysId,
					id: sysId,
					roster: gr.roster + ""
				};
			
		}
		return members;
	},

	_getGlideJobContext: function(escalationSysId, gr) {
		var context = "#" + new GlideDateTime().getDisplayValue() + "\n" + 
			"fcDocumentClass=" + gr.sys_class_name + "\n" +
			"fcEscalation=" + escalationSysId +"\n" +
			"fcDocumentKey=" + gr.sys_id;
		return context;
	},

	_isGlobalScope: function() {
		return this._gs.getCurrentScopeName() === "rhino.global";
	},

	_isMaxEntries: function() {
		return ((this._maxEntries > 0) && (this._escalationList.size() >= this._maxEntries));
	},

	_saveEscalation: function(gr, eventName, escalationScriptName, runAt) {
		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_saveEscalation] gr tablename: " + gr.getTableName() + " escalationScriptName: " + escalationScriptName + " eventName: " + eventName + " runAt: " + runAt);

		var escalationGr = this._createEscalationRecord(gr, eventName, escalationScriptName);
		var triggerSysId = this._scheduleEscalationTrigger(gr, escalationGr.sys_id + "", runAt);
		if (triggerSysId) {
			escalationGr.setValue("trigger", triggerSysId);
			escalationGr.update();
		}
	},

	_scheduleEscalationTrigger: function(gr, escalationSysId, runAt) {
		var next = new GlideDateTime();
		next.setNumericValue(runAt);

		var trigger = new GlideRecord("sys_trigger");
		trigger.setValue("name", "Rota-" + gr.getDisplayValue());
		trigger.setValue("document", gr.getRecordClassName());
		trigger.setValue("document_key", gr.sys_id + "");
		trigger.setValue("trigger_type", OnCallRotationSNC.TRIGGER_ONCE_ONLY);
		trigger.setValue("next_action", next);
		trigger.setValue("trigger_class", "com.glide.job.RotaEscalationJob");
		trigger.setValue("job_context", this._getGlideJobContext(escalationSysId, gr));
		trigger.setValue("job_id", "NULL");
		trigger.setValue("state", OnCallRotationSNC.STATE_READY);
		var triggerSysId = trigger.insert();

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_scheduleEscalationTrigger] triggerSysId: " + triggerSysId);

		return triggerSysId;
	},

	/**
	 * time [string] time can be in either of these formats: hh:mm:ss or hhmmss
	 */
	setRosterStartTime: function(time) {
		if (!time)
			this._log.error("setRosterStartTime called empty parameter: time");

		var hour;
		var minute;
		var second;

		if (time.indexOf(":") !== -1) {
			var timeArr = time.split(":");

			if (timeArr.length !== 3)
				this._log.error("setRosterStartTime called invalid time parameter. Should be in format 00:00:00");

			hour = timeArr[0];
			minute = timeArr[1];
			second = timeArr[2];
		} else {
			hour = time.substring(0, 2);
			minute = time.substring(2, 4);
			second = time.substring(4, 6);
		}

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[setRosterStartTime] time: " + time + " hour: " + hour + " minute: " + minute + " second: " + second);

		var startTimeGit = new GlideIntegerTime();
		startTimeGit.setTime(hour, minute, second);
		this._rosterStartGit = startTimeGit;

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[setRosterStartTime] rosterStartGit hour: " + this._rosterStartGit.getHour() + " min: " + this._rosterStartGit.getMinute() + " sec: " + this._rosterStartGit.getSecond());
	},
	
	setIsAllDayRoster: function(isAllDayRoster) {
		this._isAllDayRoster = isAllDayRoster;
	},

	/**
	 * Find the on call person for a particular point in time for the primary roster and set that user as the primary
	 * user for the escalation(s)
	 *
	 * Used for manually populated rotas, which do not have rosters
	 *
	 * dateTime: [GlideDateTime] the time point to search for
	 */
	_setPrimaryUser: function(dateTime) {
		var userSysId = this._checkForOverrideMember(dateTime);
		if (userSysId)
			this._escalationList.setPrimaryUserID(userSysId);
	},

	/**
	 * Used by Escalation Report
	 */
	deleteExistingRecords: function() {
		var gr = new GlideRecord("v_on_call");
		gr.initialize();
		gr.addQuery("current_user_id", this._gs.userID());
		gr.deleteMultiple();
	},

	/**
	 * Used by Escalation Report
	 */
	populateOnCallList: function(params) {
		if (!params)
			params = {};

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[populateOnCallList] params: " + JSON.stringify(params));

		var dateTime = "";
		if (params.startDate && typeof params.startDate !== "undefined")
			dateTime = params.startDate;

		var showTypeOnCallPerson = false;
		if (params.showType && typeof params.showType !== "undefined" && params.showType == "true")
			showTypeOnCallPerson = true;

		var groups = "";
		if (params.groups && typeof params.groups !== "undefined")
			groups = params.groups;

		var groupList = groups.split(",");
		var groupListLength = groupList.length;
		if (groupListLength > 0) {
			var index = groupList.indexOf("--");
			if (index !== -1)
				groupList.splice(index, 1);
		}
		if (showTypeOnCallPerson) {
			for (var i = 0; i < groupListLength; i++)
				this._generatePrimaryMembers(groupList[i], dateTime);
		} else {
			for (var j = 0; j < groupListLength; j++)
				this._generateRota(groupList[j], dateTime);
		}
		return dateTime;
	},
	
	_generatePrimaryMembers: function(groupId, dateTime) {
		this.whoIsOnCall(groupId, dateTime);
		var primaryMembersData = this.getPrimaryUsers();
		var gr = new GlideRecord("v_on_call");
		while (this.nextAnytime()) {
			var rota = this.getRotaFromCurrentEscalation();
			if(primaryMembersData.hasOwnProperty(rota) && this.getUser() == primaryMembersData[rota].userSysId){
				gr.initialize();
				gr.current_user_id = this._gs.userID();
				gr.group = groupId;
				gr.rota = rota;
				gr.roster = this.getRoster();
				gr.primary_user = primaryMembersData[rota].userSysId;
				gr.delay_duration.setDateNumericValue(this.getDelay().getNumericValue());
				gr.contact_at.setDateNumericValue(this.getContactAt().getNumericValue());
				gr.user = primaryMembersData[rota].userSysId;
				gr.type = this.getType();
				gr.insert();
				delete primaryMembersData[rota];
			}
		}
	},

	_generateRota: function(groupId, dateTime) {
		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_generateRota] groupId: " + groupId + " dateTime: " + dateTime);

		if (dateTime)
			this.whoAt(groupId, dateTime);
		else
			this.who(groupId);

		var sysIds = [];
		var rotaIds = {};
		var gr = new GlideRecord("v_on_call");
		while (this.nextAnytime()) {
			gr.initialize();
			gr.current_user_id = this._gs.userID();
			gr.group = groupId;
			gr.rota = this.getRotaFromCurrentEscalation();
			gr.roster = this.getRoster();
			gr.primary_user = this.getPrimaryUserByRota(this.getRotaFromCurrentEscalation());
			gr.delay_duration.setDateNumericValue(this.getDelay().getNumericValue());
			gr.contact_at.setDateNumericValue(this.getContactAt().getNumericValue());
			gr.user = this.getUser();
			gr.type = this.getType();
			if (gr.type + "" === "device") {
				gr.device = this.getDevice();
				gr.device_type = this.getDeviceType();
			}
			gr.escalation_group = this.getEscalationGroupId();
			gr.cmn_notif_device = this.getDeviceId();
			if (!rotaIds[gr.rota +""]) {
				rotaIds[gr.rota + ""] = {rotaId: gr.rota+"", delay_duration: gr.delay_duration, contact_at: gr.contact_at};
			}
			sysIds.push(gr.insert());
		}

		// if show active roster members is chosen and gr.rota is not empty inserts catch all members to a notification report
		var that = this;
		Object.keys(rotaIds).forEach(function(key) {
			that._insertCatchAllMembers(groupId, rotaIds[key]);
		});
	},

	_insertCatchAllMembers: function(groupId, rota) {
		var rotaSysId = rota.rotaId;

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_insertCatchAllMembers] rotaSysId: " + rotaSysId);

		var catchAllType = this.getCatchAllType(rotaSysId);
		if (catchAllType) {
			var catchAllSysID = this.getCatchAll(rotaSysId);
			var timeBetweenReminders = this._getTimeBetweenReminders(catchAllType, catchAllSysID);
			var delayDuration = new GlideDateTime(rota.delay_duration);
			var contactAt = new GlideDateTime(rota.contact_at);

			var sysIds = [];
			var gr = new GlideRecord("v_on_call");
			gr.initialize();
			gr.current_user_id = this._gs.userID();
			gr.group = groupId;
			gr.rota = rotaSysId;
			gr.primary_user = this.getPrimaryUserByRota(rotaSysId);
			gr.type = catchAllType;
			gr.delay_duration.setDateNumericValue(delayDuration.getNumericValue() + timeBetweenReminders);
			gr.contact_at.setDateNumericValue(contactAt.getNumericValue() + timeBetweenReminders);
			if (catchAllType === "all") {
				var rotaMember = new GlideRecord("cmn_rota_member");
				rotaMember.addQuery("roster", catchAllSysID);
				rotaMember.query();
				while (rotaMember.next()) {
					gr.user = rotaMember.member;
					gr.roster = catchAllSysID;
					sysIds.push(gr.insert());
				}
			} else {
				var userGr = new GlideRecord("sys_user");
				if (userGr.get(catchAllSysID)) {
					gr.roster = "";
					gr.user = userGr.sys_id;
					sysIds.push(gr.insert());
				}
			}

			if (this._log.atLevel(GSLog.DEBUG))
				this._log.debug("[_insertCatchAllMembers] catchAllType: " + catchAllType + " sysIds: " + sysIds.join(","));
		}
	},

	_getTimeBetweenReminders: function(catchAllType, rosterId) {
		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_getTimeBetweenReminders] catchAllType: " + catchAllType + " rosterId: " + rosterId);

		var gdt = null;
		// if catchAllType is Notify All then get time_between_reminders from cmn_rota_roster table
		if (catchAllType === "all") {
			var rosterGr = new GlideRecord("cmn_rota_roster");
			if (rosterGr.get(rosterId))
				gdt = new GlideDateTime(rosterGr.time_between_reminders);
		} else {
			var vOnCallGr = new GlideRecord("v_on_call");
			vOnCallGr.orderByDesc("delay_duration");
			vOnCallGr.setLimit(2);
			vOnCallGr.query();
			// if catchAllType is Manager or Individual then calculate time_between_reminders by substracting delay_duration from last two records from v_on_call
			if (vOnCallGr.next()) {
				var lastDelayDuration = new GlideDateTime(vOnCallGr.delay_duration);
				if (vOnCallGr.next()) {
					var beforeLastDelayDuration = new GlideDateTime(vOnCallGr.delay_duration);
					gdt = new GlideDuration(lastDelayDuration.getNumericValue() - beforeLastDelayDuration.getNumericValue());
				}
			}
		}
		var timeBetweenReminders = gdt ? gdt.getNumericValue() : 0;

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_getTimeBetweenReminders] timeBetweenReminders: " + timeBetweenReminders);

		return timeBetweenReminders;
	},

	isRotationCalcRequired: function(gr) {
		if (gr.last_reminder_time.changes())
			return false;

		if (this.isWizardRunning())
			return false;

		/* Fields has to be added to this array if changing only these fields will not affect the rotation */
		var rotationNoImpactFields = ['override_user_contact_preference'];
		
		var gru = GlideScriptRecordUtil.get(gr);
		var changedFields = gru.getChangedFieldNames();
		changedFields = j2js(changedFields);
		for (var i = 0; i < changedFields.length; i++) {
			if (rotationNoImpactFields.indexOf(changedFields[i]) < 0)
				return true;
		}
		return false;
	},

	type: "OnCallRotationSNC"
};

OnCallRotationSNC.TRIGGER_ONCE_ONLY = 0;
OnCallRotationSNC.STATE_READY = 0;

OnCallRotationSNC.CMN_ROTA_MEMBER_LIST = "cmn_rota_member_list";
OnCallRotationSNC.AMP = "&";
OnCallRotationSNC.DOT_DO = ".do";
OnCallRotationSNC.DOT_DO_Q = ".do?";
OnCallRotationSNC.Q = "?";
OnCallRotationSNC.SCOPE_NAME = "sn.on_call";
OnCallRotationSNC.SEQUENCE_NAMES = ["Primary", "Secondary", "Tertiary", "Quaternary", "Quinary", "Senary", "Septenary", "Octonary", "Nonary"];
OnCallRotationSNC.PROPERTY_SKIP_COMPUTE_SCHEDULES = "com.snc.on_call_rotation.skip_compute_member_rotation_schedules";
OnCallRotationSNC.PROPERTY_IS_WIZARD = "com.snc.on_call_rotation.is_wizard";
OnCallRotationSNC.DEFAULT_ROTATION_INTERVAL_TYPE = 'weekly';
OnCallRotationSNC.DEFAULT_ROTATION_INTERVAL_COUNT = '1';

OnCallRotationSNC.isBrowserSupported = function(scopeName) {
	if (this._isGlobalScope())
		return !new GlideCollaborationCompatibility().isIncompatible();
	else
		return !new GlideUICompatibility(scopeName || OnCallRotationSNC.SCOPE_NAME).isBlocked();
};

OnCallRotationSNC.getCompatibility = function(scopeName) {
	if (this._isGlobalScope())
		return new GlideCollaborationCompatibility().getCompatibility();
	else
		return new GlideUICompatibility(scopeName || OnCallRotationSNC.SCOPE_NAME).getCompatibility();
};


```