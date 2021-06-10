---
title: "OnCallCreationWizardUtilsSNC"
id: "oncallcreationwizardutilssnc"
---

API Name: global.OnCallCreationWizardUtilsSNC

```js
var OnCallCreationWizardUtilsSNC = Class.create();
OnCallCreationWizardUtilsSNC.prototype = {
	initialize: function () {
		this.onCallCommon = new OnCallCommon();
		this.onCallRotation = new OnCallRotation();
		this.onCallEscalationUtil = new OnCallEscalationUtil();
		this._log = new GSLog("com.snc.on_call_rotation.log.level", this.type);
	},
	
	DEFAULT_TIME_BETWEEN_REMINDERS: 900000, // in milliseconds

	TABLES: {
		CMN_ROTA: 'cmn_rota',
		SYS_USER_GROUP: 'sys_user_group',
		CMN_OTHER_SCHEDULE: 'cmn_other_schedule',
		ON_CALL_SHIFT_TEMPLATE: 'sys_on_call_shift_template',
		CMN_ROTA_ROSTER: 'cmn_rota_roster',
		CMN_ROTA_MEMBER: 'cmn_rota_member',
		ON_CALL_GROUP_PREFERENCE: 'on_call_group_preference',
		SYS_USER_GRMEMBER: 'sys_user_grmember',
		SYS_CHOICE: 'sys_choice',
		CMN_SCHEDULE_SPAN: 'cmn_schedule_span'
	},
	
	SHIFT_STATE: {
		DRAFT: "draft"
	},

	getDefaults: function () {
		var defaults = {};
		defaults.shift_schedule_type = "schedule_template";
		defaults.shift_all_day = false;
		defaults.shift_specify_holiday = false;
		defaults.shift_days = "1234567";
		defaults.rotation_interval_count = 1;
		defaults.rotation_interval_type = "weekly";
		defaults.send_reminders = true;
		defaults.reminder_lead_time = 2;
		defaults.attempts = 1; // This number will define how many reminders will be sent out before the Duty gets escalated
		defaults.time_between_reminders = 15; // In minutes
		defaults.send_reminders_shift_level = true;
		defaults.reminder_lead_time_shift_level = 2;
		defaults.coverage_lead_type = "weekly";
		defaults.coverage_interval = 12;
		return defaults;
	},
	
	getShiftsByGroup: function (groupSysId) {
		var rotas = [];
		var rotaGr = new GlideRecord(this.TABLES.CMN_ROTA);
		rotaGr.addQuery('group', groupSysId);
		rotaGr.orderBy('name');
		var qc = rotaGr.addQuery('active', true);
		var qcOR = qc.addOrCondition('active', false);
		qcOR.addCondition('state', 'draft');
		rotaGr.query();
		while(rotaGr.next()) {
			var rotaJS = this.onCallCommon.toJS(rotaGr, ['name', 'schedule', 'state', 'send_reminders', 'reminder_lead_time', 'coverage_lead_type', 'coverage_interval']);
			rotas.push(rotaJS);
		}
		return rotas;
	},

	getPreferencesByGroup: function(groupSysId) {
		var groupPreference = {};
		var groupPreferenceGr = new GlideRecord(this.TABLES.ON_CALL_GROUP_PREFERENCE);
		groupPreferenceGr.addQuery('group',groupSysId);
		groupPreferenceGr.setLimit(1);
		groupPreferenceGr.query();
		if (groupPreferenceGr.next()) {
			groupPreference['sys_id'] = groupPreferenceGr.getUniqueValue();
			groupPreference['allow_rota_overlap'] = groupPreferenceGr.getValue('allow_rota_overlap');
			groupPreference['escalation_rule_rota_overlap'] = groupPreferenceGr.getValue('escalation_rule_rota_overlap');
		}
		return groupPreference;
	},

	createUpdateShiftFromTemplates: function(shiftData, groupSysId) {
		var savedData = {};
		savedData['rotaData'] = [];
		for (var i = 0; i < shiftData.length; i++) {
			var rotaGr;
			
			if (shiftData[i]['groupPreferenceId']) {
				var groupPreferencesGr = this.createUpdateGroupPreferences(shiftData[i]);
				if (groupPreferencesGr) {
					savedData['groupPreferencesData'] = this.onCallCommon.toJS(groupPreferencesGr, ['allow_rota_overlap', 'escalation_rule_rota_overlap']);
				}
			}
			else if (shiftData[i]['schedule_type'] == 'simple' || shiftData[i]['schedule_type'] == 'schedule_template')
				rotaGr = this.createShiftFromTemplates(shiftData[i], groupSysId);
			else
				rotaGr = this.updateShift(shiftData[i]);

			if (rotaGr) {
				var rotaJS = this.onCallCommon.toJS(rotaGr, ['name', 'schedule', 'state', 'send_reminders', 'reminder_lead_time', 'coverage_lead_type', 'coverage_interval']);
				rotaJS['index'] = shiftData[i]['index'];
				savedData['rotaData'].push(rotaJS);
			}
		}
		return savedData;
	},

	/* 
		For Creating new rota when Schedule template is defined, Only Schedule Template SysId should be passed to the createNewRota function, except startGdt and Sched Temp SysId  remaining wont be considered.
		For Creating new rota when Schedule template is not defined, TimeZone should be passed as Schedule Template SysId createNewRota function.
	*/
	createShiftFromTemplates: function (shiftData, groupSysId) {

		var rotaSysId;

		if (shiftData['schedule_type'] == 'schedule_template')
			rotaSysId = this.onCallRotation.createNewRota(shiftData['name'], groupSysId, shiftData['schedule_template'], new GlideDateTime(shiftData['start_date']), null, 'weekly', null, null, shiftData['send_reminders'], shiftData['reminder_lead_time'], shiftData['coverage_lead_type'], shiftData['coverage_interval'], shiftData['days'], true);
		else if (shiftData['schedule_type'] == 'simple') {
			var isAllDay = shiftData['all_day'];
			var startGdt;
			var endGdt;
			if (!isAllDay) {
				startGdt = new GlideDateTime();
				startGdt.setDisplayValueInternal(shiftData['start_date_time']);
				endGdt = new GlideDateTime();
				endGdt.setDisplayValueInternal(shiftData['end_date_time']);
			} else {
				startGdt = new GlideDateTime();
				startGdt.setDisplayValueInternal(shiftData['start_date'] + " 00:00:00");
				endGdt = new GlideDateTime();
				endGdt.setDisplayValueInternal(shiftData['start_date'] + " 23:59:59");
			}
			
			var repeatType = "weekly";
			if (!shiftData['days'])
				repeatType = ""; // Do not repeat, in case days are not selected
			

			rotaSysId = this.onCallRotation.createNewRota(shiftData['name'], groupSysId, shiftData['time_zone'], startGdt, endGdt, repeatType, isAllDay, shiftData['name'], shiftData['send_reminders'], shiftData['reminder_lead_time'], shiftData['coverage_lead_type'], shiftData['coverage_interval'], shiftData['days'], true);

		}

		else {
			this._log.error("Error in Provided Shift Data");
			return;
		}

		if (rotaSysId) {
			var rotaGr = this._getGr(rotaSysId, this.TABLES.CMN_ROTA);
			if (shiftData['specify_holiday'] && shiftData['holiday_schedule'])
				this._addChildSchedule(rotaGr.schedule + "", shiftData['holiday_schedule']);

			return rotaGr;
		}

	},

	updateShift: function(shiftData) {
		var rotaGr = this._getGr(shiftData['sys_id'], this.TABLES.CMN_ROTA);
		
		for (var key in shiftData)
			rotaGr[key] = shiftData[key];

		if (rotaGr.update())
			return rotaGr;
	},

	_getGr: function (sysId, table) {
		var respGr = new GlideRecord(table);
		if (!respGr.canWrite()) {
			this._log.error("Security constraints prevent access to requested resource");
			return;
		}
		if (respGr.get(sysId))
			return respGr;
	},

	saveCatchAllDetails: function (shifts) {
		for (var index = 0; index < shifts.length; index++) {
			var shift = shifts[index];
			var rotaGr = this._getGr(shift.sys_id + "", this.TABLES.CMN_ROTA);
			if (rotaGr) {
				rotaGr.catch_all = shift.catchAll ? shift.catchAll.value : rotaGr.catch_all;
				rotaGr.catch_all_roster = shift.roster ? shift.roster.value : rotaGr.catch_all_roster;
				rotaGr.catch_all_member = shift.member ? shift.member.value : rotaGr.catch_all_member;

				rotaGr.update();
			}
		}
	},

	_addChildSchedule: function (schedule, childSchedule) {
		var otherScheduleGr = new GlideRecord(this.TABLES.CMN_OTHER_SCHEDULE);
		if (!otherScheduleGr.canCreate()) {
			this._log.error("Security constraints prevent access to requested resource");
			return;
		}
		otherScheduleGr.initialize();
		otherScheduleGr.schedule = schedule;
		otherScheduleGr.child_schedule = childSchedule;
		otherScheduleGr.type = 'include';
		otherScheduleGr.insert();
	},

	getShiftTemplates: function (groupTemplateSysId) {
		var requiredFields = ['sys_id', 'shift_name', 'schedule_type', 'start_time', 'end_time', 'time_zone', 'end_time_day', 'days', 'specify_holiday', 'holiday_schedule', 'schedule_template', 'all_day'];
		var respJS = {};
		var respArr = [];
		
		var shiftTemplateGR = new GlideRecord(this.TABLES.ON_CALL_SHIFT_TEMPLATE);
		shiftTemplateGR.addQuery('sys_on_call_group_template', groupTemplateSysId);
		shiftTemplateGR.orderBy('shift_name');
		shiftTemplateGR.query();

		if (!shiftTemplateGR.canRead()) {
			var respError = new sn_ws_err.ServiceError();
			respError.setStatus(403);
			respError.setMessage("Security constraints prevent access to requested resource");
			return respError;
		}

		while (shiftTemplateGR.next()) {
			var respJS = new OnCallCommon().toJS(shiftTemplateGR, requiredFields);
			if (respJS['schedule_type']['value'] == 'simple') {
				if (!respJS['time_zone']['value'])
					respJS['time_zone']['value'] = respJS['time_zone']['display_value'] = gs.getSession().getTimeZoneName();

				var gdt = new GlideDateTime();
				var tzObj = Packages.java.util.TimeZone.getTimeZone(respJS['time_zone']['value']);
				if (tzObj)
					gdt.setTZ(tzObj);
				respJS['start_date_time'] = gdt.getLocalDate() + " " + respJS['start_time']['value'].match(/.{1,2}/g).join(":");

				gdt.addDaysLocalTime(parseInt(respJS['end_time_day']['value']));
				respJS['end_date_time'] = gdt.getLocalDate() + " " + respJS['end_time']['value'].match(/.{1,2}/g).join(":");
			}
			respArr.push(respJS);
		}
		return respArr;

	},


	getRotasRostersMembersByGroup: function (groupSysId) {
		var requiredRotaData = ['sys_id', 'name', 'state', 'rotation_start_date'];
		var requiredRosterData = ['sys_id', 'name', 'send_reminders', 'reminder_lead_time', 'rotation_interval_type', 'dow_for_rotate', 'rotation_interval_count', 'rotation_start_date', 'order', 'rota'];
		var requiredMemberData = ['sys_id', 'member', 'order', 'roster'];
		var rotaData = this.onCallRotation.getRotas(groupSysId, "all");
		var rotaSysIds = Object.keys(rotaData);
		var rosterData = this.onCallRotation.getRostersByRotas(rotaSysIds.join(","), true, requiredRosterData);
		var memberData = this.onCallRotation.getMembers(Object.keys(rosterData).join(","), true, requiredMemberData);

		var result = [];
		var rotaObj = {};

		var that = this;
		rotaSysIds.forEach(function (rotaId) {
			rotaObj = that._getRequiredFields(rotaData[rotaId], requiredRotaData);
			rotaObj['rosters'] = that._getArr(rosterData, 'rota', rotaId);
			rotaObj['rosters'].forEach(function (rosterObj) {
				rosterObj['members'] = that._getArr(memberData, 'roster', rosterObj['sys_id'].value);
			});
			result.push(rotaObj);
		});
		return result;

	},


	_getRequiredFields: function (jsObj, requiredData) {
		var respObj = {};
		requiredData.forEach(function (item) {
			respObj[item] = jsObj[item];
		});
		return respObj;
	},


	_getArr: function (jsObj, key, value) {
		var respArr = [];
		for (var iter in jsObj) {
			if (jsObj[iter][key] && jsObj[iter][key].value == value) {
				respArr.push(jsObj[iter]);
			}
		}
		return respArr;
	},


	createUpdateRostersAndMembers: function (rosterData) {
		var rosterAndMembersCreatedArr = [];
		for (var i = 0; i < rosterData.length; i++) {
			var rosterAndMembers = {};
			if (!rosterData[i]['sys_id'])
				rosterAndMembers.rosterInfo = this.createRosterAndMembers(rosterData[i]);
			else
				rosterAndMembers.rosterInfo = this.updateRosterAndMembers(rosterData[i]);
			rosterAndMembers.shift_index = rosterData[i].shift_index;
			rosterAndMembers.roster_index = rosterData[i].roster_index;
			rosterAndMembersCreatedArr.push(rosterAndMembers);
		}
		return rosterAndMembersCreatedArr;
	},

	createRosterAndMembers: function(rosterData) {
		var numRosters = 1;
		var numReminders = 0;
		var timeBtwRemindersDur = new GlideDuration(this.DEFAULT_TIME_BETWEEN_REMINDERS);
		
		var rosterStartGdt = rosterData['rotation_start_date'] ? new GlideDateTime(rosterData['rotation_start_date']) : new GlideDateTime();
		
		var rotaScheduleStartTimeStr = this._getRotaScheduleStartTime(rosterData['rota']);
		if (rotaScheduleStartTimeStr) {
			this.onCallRotation.setRosterStartTime(rotaScheduleStartTimeStr);
		} else {
			this.onCallRotation.setIsAllDayRoster(true);
		}

		var rosterId = this.onCallRotation.createRosters(rosterData['rota'], numRosters, numReminders, rosterStartGdt, timeBtwRemindersDur, rosterData['rotation_interval_type'], parseInt(rosterData['rotation_interval_count']), rosterData['dow_for_rotate'], rosterData['name'], parseInt(rosterData['order']));

		var rosterAndMemberIds = {
			roster_id: rosterId[0]+""
		}; 
		rosterAndMemberIds.memberIds = this._createRosterMembers(rosterData['members'], rosterId[0]+"", rosterData['rotation_start_date']);
		return rosterAndMemberIds;
	},

	updateRosterAndMembers: function(rosterData) {
		var rosterGr = this._getGr(rosterData['sys_id'], this.TABLES.CMN_ROTA_ROSTER);
		var rosterAndMemberIds = {};
		rosterAndMemberIds.memberIds = [];
		var that = this;
		var existingMembersData = this.getUsersByRosters(rosterData['sys_id']);
		existingMembersData = Object.keys(existingMembersData);
		for (var key in rosterData) {
			if (key == 'members') {
				this._removeMissingMembers(rosterData['members'], rosterData['sys_id'], existingMembersData);
				rosterData['members'].forEach(function (item) {
					if (existingMembersData.indexOf(item['member']) > -1) {
						var memberGr = new GlideRecord(that.TABLES.CMN_ROTA_MEMBER);
						memberGr.addQuery('roster', rosterData['sys_id']);
						memberGr.addQuery('member',item['member']);
						memberGr.setLimit(1);
						memberGr.query();
						if (memberGr.next()) {
							for (var itemKey in item)
								memberGr.setValue(itemKey, item[itemKey]);
						}
						if (memberGr.update())
							rosterAndMemberIds.memberIds.push(memberGr.sys_id + "");
					}
					else {					
						rosterAndMemberIds.memberIds = that._createRosterMembers(new Array(item), rosterData['sys_id']);
					}
				});
				continue;
			}
			if (key == "rotation_start_date")
				rosterGr.setValue(key, rosterData[key].replace(/-/g, "")); //converting to integer date and setting the value
			else
				rosterGr[key] = rosterData[key];
		}
		if (rosterGr.update())
			rosterAndMemberIds.roster_id = rosterGr.sys_id + "";
		return rosterAndMemberIds;
	},
	
	getUsersByRosters: function(rosterSysIds) {
		if (this._log.atLevel(GSLog.DEBUG))
			this.timer.start("[getUsersByRosters]");

		var users = {};
		if (!rosterSysIds)
			return users;

		var gr = new GlideRecord(this.TABLES.CMN_ROTA_MEMBER);
		gr.addQuery("roster", "IN", rosterSysIds);
		gr.addActiveQuery();
		gr.query();
		while (gr.next()) {
			var sysId = gr.member + "";
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
			this.timer.stop("[getUsersByRosters]");

		return users;
	},


	_createRosterMembers: function(membersJsArr, rosterId, from) {
		var onCallMemberSysIds = []; 
		for (var i = 0; i < membersJsArr.length; i++) {
			var onCallMember = new OnCallMember();
			onCallMember.setRosterId(rosterId);
			onCallMember.setMemberId(membersJsArr[i]['member']);
			onCallMember.setOrder(parseInt(membersJsArr[i]['order']));
			if (from)
				onCallMember.setFrom(from);
			if (onCallMember.create())
				onCallMemberSysIds.push(onCallMember.getGr().sys_id + "");
		}
		return onCallMemberSysIds;
	},
	
	_getRotaScheduleStartTime: function(rotaSysId) {
		var cmnRotaGr = new GlideRecord(this.TABLES.CMN_ROTA);
		if (cmnRotaGr.get(rotaSysId) && cmnRotaGr.schedule) {
			var cmnScheduleSpanGr = new GlideRecord(this.TABLES.CMN_SCHEDULE_SPAN);
			cmnScheduleSpanGr.addQuery('type', 'on_call');
			cmnScheduleSpanGr.addQuery('schedule', cmnRotaGr.schedule + "");
			cmnScheduleSpanGr.orderBy('start_date_time');
			cmnScheduleSpanGr.query();
			if (cmnScheduleSpanGr.next()) {
				if (cmnScheduleSpanGr.all_day)
					return;
				else if (cmnScheduleSpanGr.start_date_time) {
					var rotaStartGDT = cmnScheduleSpanGr.start_date_time.getGlideObject().getGlideDateTime();
					rotaStartGDT.setTZ(this._parseTZ(cmnRotaGr.schedule.time_zone + ""));
					return rotaStartGDT.getLocalTime().getByFormat("HH:mm:ss"); // No additional DST handling required
				}
			}
		}
	},
	
	_parseTZ: function(timeZoneStr){
		var schedule = new GlideSchedule();
		schedule.setTimeZone(timeZoneStr);
		return schedule.getTZ();
	},

	_removeMissingMembers: function (membersJsArr, rosterId, existingMembersData) {
		var memberIds = [];
		membersJsArr.forEach(function (item) {
			memberIds.push(item['member']);
		});
		var missingMembers = [];
		existingMembersData.forEach(function (item) {
			if (memberIds.indexOf(item) < 0)
				missingMembers.push(item);
		});
		var memberGr = new GlideRecord(this.TABLES.CMN_ROTA_MEMBER);
		memberGr.addQuery('roster', rosterId);
		memberGr.addQuery('member', 'IN', missingMembers);
		memberGr.deleteMultiple();
	},


	getGroupMembers: function (groupSysId) {
		var userGroupGr = new GlideRecord(this.TABLES.SYS_USER_GRMEMBER);
		userGroupGr.addQuery("user.active", true);
		userGroupGr.addQuery("group", groupSysId);
		userGroupGr.query();

		var members = [];
		while (userGroupGr.next()) {
			var member = this.onCallCommon.toJS(userGroupGr, ['user', 'group']);
			members.push(member);
		}
		return members;
	},
	
	getGroupDetails: function(groupSysId) {
		var gr = new GlideRecord(this.TABLES.SYS_USER_GROUP);
		if (gr.get(groupSysId)) {
			var obj = {};
			obj.canRead = gr.canRead();
			if (obj.canRead) {
				var requiredFields = ["name", "description", "manager"];
				obj.groupJs = this.onCallCommon.toJS(gr, requiredFields);
			}
			return obj;
		}
	},
	
	/*
	 * Returns count of users how are active members of any roster from the given group
	 */
	getGroupMemberCount: function (groupSysId) {
		return this.onCallCommon.getGroupMemberCount(groupSysId, true);
	},
	
	getPreviewRotaDetails: function(groupSysId) {
		var rotas = [];
		var rotaGr = new GlideRecord(this.TABLES.CMN_ROTA);
		rotaGr.addQuery('group', groupSysId);
		rotaGr.orderBy('name');
		var qc = rotaGr.addQuery('active', true);
		var qcOR = qc.addOrCondition('active', false);
		qcOR.addCondition('state', 'draft');
		
		rotaGr.query();
		while(rotaGr.next()) {
			var rotaJs = this.onCallCommon.toJS(rotaGr, ["sys_id", "name", "schedule", "state", "use_custom_escalation"]);
			rotaJs.rota_members = [];
			var todayDate = new GlideDateTime().getDate().getValue(); // returns internal formatted date
			var memberGr = new GlideRecord(this.TABLES.CMN_ROTA_MEMBER);
			memberGr.addQuery("member.active", "=", true);
			memberGr.addQuery("roster.rota", "=", rotaGr.getUniqueValue());
			memberGr.addEncodedQuery("from=NULL^ORfrom<=" + todayDate);
			memberGr.addEncodedQuery("to=NULL^ORto>=" + todayDate);
			memberGr.query();

			var memberIds = [];
			while (memberGr.next())
				memberIds.push(memberGr.member + "");
			if (memberIds.length) {
				var userMemberGr = new GlideAggregate(this.TABLES.SYS_USER_GRMEMBER);
				userMemberGr.addQuery("group", groupSysId);
				userMemberGr.addQuery("user", "IN", memberIds.join(","));
				userMemberGr.addQuery("group.active", "true");
				userMemberGr.addEncodedQuery("JOINsys_user_grmember.group=cmn_rota.group");
				userMemberGr.query();
				while(userMemberGr.next()) {
					var rotaMemberJs = {
						value: userMemberGr.user + '',
						display_value: userMemberGr.getDisplayValue('user')
					};
					rotaJs.rota_members.push(rotaMemberJs);
				}
			}
			rotaJs.has_send_subscriptions_access = this._hasSendSubscriptionAccess();
			rotas.push(rotaJs);
		}
		return rotas;
	},
	
	_hasSendSubscriptionAccess: function() {
		return (gs.hasRole('admin') || gs.hasRole('rota_admin') || gs.hasRole('roster_admin'));
	},

	_getEscalationType: function (rotaGr, rotaDetails) {
		if (rotaGr.use_custom_escalation) {
			rotaDetails.escalationType = gs.getMessage("Custom");
			rotaDetails.isCustomEscalation = true;
			return;
		}
		rotaDetails.isCustomEscalation = false;

		var rosterGr = new GlideRecord(this.TABLES.CMN_ROTA_ROSTER);
		rosterGr.addQuery("rota", rotaGr.sys_id + "");
		rosterGr.query();

		if (rosterGr.getRowCount() == 1)
			rotaDetails.escalationType = gs.getMessage("Rotate through members");
		else
			rotaDetails.escalationType = gs.getMessage("Rotate through rosters");

		var rosterIds = [];
		while (rosterGr.next()) {
			rosterIds.push(rosterGr.getUniqueValue() + "");
		}
		rotaDetails.rosterIds = rosterIds.join(",");
	},

	_getGroupMembers: function (groupId) {
		var userGroupGr = new GlideRecord("sys_user_grmember");
		userGroupGr.query("group", groupId);
		userGroupGr.query("user.active", true);
		userGroupGr.query();
		var groupMemberIds = [];
		while (userGroupGr.next()) {
			groupMemberIds.push(userGroupGr.user + "");
		}
		return groupMemberIds.join(",");
	},

	_getGroupManager: function (groupId) {
		var groupGr = new GlideRecord(this.TABLES.SYS_USER_GROUP);
		if (groupGr.get(groupId)) {
			return this.onCallCommon.toJS(groupGr, ["manager"]);
		}
		return "";
	},

	getEscalationPanelDetails: function (groupId) {
		var rotaGr = new GlideRecord(this.TABLES.CMN_ROTA);
		rotaGr.addQuery("group", groupId);
		rotaGr.orderBy("name");
		var qc = rotaGr.addQuery("active", true);
		var qcOR = qc.addOrCondition("active", false);
		qcOR.addCondition("state", this.SHIFT_STATE.DRAFT);
		rotaGr.query();
		var rotaGroupDetails = {};
		var groupDetails = {};
		groupDetails.groupMembersIds = this._getGroupMembers(groupId);
		groupDetails.groupManager = this._getGroupManager(groupId);
		var rotasDetails = [];
		while (rotaGr.next()) {
			var rota = this.onCallCommon.toJS(rotaGr, ["name", "catch_all", "catch_all_member", "catch_all_roster", "state"]);
			rota.catch_all.label = rotaGr.catch_all.getLabel() + "";
			rota.catch_all_member.label = rotaGr.catch_all_member.getLabel();
			rota.catch_all_roster.label = rotaGr.catch_all_roster.getLabel();
			rota.catch_all_wait_time = this.getCatchAllWaitTimeJS(rotaGr);			
			this._getEscalationType(rotaGr, rota);
			rotasDetails.push(rota);
		}
		rotaGroupDetails.groupDetails = groupDetails;
		rotaGroupDetails.rotasDetails = rotasDetails;
		return rotaGroupDetails;
	},
	
	getCatchAllWaitTimeJS: function(rotaGr) {
		var seconds = this.onCallEscalationUtil.getCatchAllWaitTime(rotaGr);
		var duration = new GlideDuration(seconds * 1000);
		return {
			display_value: duration.getDisplayValue(),
			value: duration.getValue(),
			seconds: seconds,
			label: rotaGr.catch_all_wait_time.getLabel()
		};
	},
	
	getTableFieldsMap: function(table) {
		var fieldsMap = {};
		var gr = new GlideRecord(table);
		gr.initialize();
		var fields = gr.getFields();
		for (var i=0; i < fields.size(); i++) {
			var field = fields.get(i);
			var fieldName = field.getName() + "";
			fieldsMap[fieldName] = gr.getElement(fieldName).getLabel();
		}
		return fieldsMap;
	},

	createUpdateGroupPreferences: function(groupPreferencesData) {
		var groupPreferencesGr;
		if (groupPreferencesData['groupPreferenceId'] != 'new')
			groupPreferencesGr = this._getGr(groupPreferencesData['groupPreferenceId'], this.TABLES.ON_CALL_GROUP_PREFERENCE);
		else {
			groupPreferencesGr = new GlideRecord(this.TABLES.ON_CALL_GROUP_PREFERENCE);
			groupPreferencesGr.initialize();
			groupPreferencesGr.setValue('group', groupPreferencesData['group']);
			groupPreferencesGr.insert();
		}
		for (var key in groupPreferencesData) {
			if (key == 'groupPreferenceId')
				continue;
			groupPreferencesGr.setValue(key, groupPreferencesData[key]);
		}

		if (groupPreferencesGr.update())
			return groupPreferencesGr;
	},

	getAccessDetails: function() {
		var details = {};
		details.isRotaAdmin = new OnCallSecurityNG().rotaAdminAccess();
		if (!details.isRotaAdmin) {
			var userSysId = gs.getUserID();
			details.groupIds = this._filterGroupsByAccess(userSysId);
		}
		return details;
	},

	_filterGroupsByAccess: function(userSysId) {
		var ocsNg = new OnCallSecurityNG();
		var filteredGroups = {};
		
		// directly managed groups
		var userGroupGr = ocsNg.getManagedGroups(userSysId, true);
		while (userGroupGr.next())
			filteredGroups[userGroupGr.sys_id + ""] = true;
		
		// managed groups through delegation
		var userHasRoleGr = ocsNg.getDelegatedGroups(userSysId);
		while (userHasRoleGr.next())
			filteredGroups[userHasRoleGr.granted_by + ""] = true;
		
		// managed groups through preferences
		var groupIds = ocsNg.getManagedGroupsByPreferences(userSysId);
		groupIds.forEach(function(groupId) {
			filteredGroups[groupId] = true;
		});
		
		return this._getKeys(filteredGroups);
	},

	_getKeys: function(obj) {
		var keys = [];
		for (var key in obj)
			if (obj.hasOwnProperty(key))
				keys.push(key);
		return keys;
	},

	getFilterGroupQuery: function() {
		var accessDetails = this.getAccessDetails();
		var filterGroupQuery = 'active=true';
		if (!accessDetails.isRotaAdmin)
			filterGroupQuery = filterGroupQuery + '^sys_idIN' + accessDetails.groupIds.join(',');
		return filterGroupQuery;
	},

	type: 'OnCallCreationWizardUtilsSNC'
};
```