---
title: "OnCallCommonSNC"
id: "oncallcommonsnc"
---

API Name: global.OnCallCommonSNC

```js
var OnCallCommonSNC = Class.create();
OnCallCommonSNC.prototype = {
	initialize: function () {
		this.escalation_rule_rota_overlap = {
			START: 'start',
			END: 'end',
			ALL: 'all'
		};
		this.TABLES = {
			CMN_ROTA: 'cmn_rota',
			CMN_ROTA_MEMBER: 'cmn_rota_member',
			CMN_ROTA_ROSTER: 'cmn_rota_roster',
			SYS_USER_GRMEMBER: 'sys_user_grmember',
			USER: 'sys_user',
			SYS_CHOICE: 'sys_choice',
			SYS_UI_ACTION: 'sys_ui_action'
		};

		this.SYS_USER_FIELDS = {
			TIMEZONE: "time_zone"
		};
	},

	/**
	 * Constrain a provided encoded query by the start and end dates that concern the query.
	 *
	 * @param limitedBy [String]
	 * @param startDate [String]
	 * @param endDate [String]
	 * @return [String] encoded query
	**/
	getDateLimitedEncQuery: function (limitedBy, startDate, endDate) {
		var startDateTime = this.formatDateStr(this.getGlideDateTimeStr(false, startDate));
		var endDateTime = this.formatDateStr(this.getGlideDateTimeStr(true, endDate));
		var and = "^";
		var or = "^NQ";
		var startInEndIn = limitedBy + and + "start_date_time>=" + startDateTime + and + "end_date_time<=" + endDateTime;
		var startOutEndIn = limitedBy + and + "start_date_time<=" + startDateTime + and + "end_date_time>=" + startDateTime + and + "end_date_time<=" + endDateTime;
		var startInEndOut = limitedBy + and + "start_date_time>=" + startDateTime + and + "start_date_time<=" + endDateTime + and + "end_date_time>=" + endDateTime;
		var startOutEndOut = limitedBy + and + "start_date_time<=" + startDateTime + and + "end_date_time>=" + endDateTime;
		var repeatNotNull = limitedBy + and + "repeat_type!=null" + and + "repeat_until=00000000^ORrepeat_until=null^ORrepeat_until>=" + startDateTime.split("T")[0];
		var encodedQueryStr = startInEndIn + or + startOutEndIn + or + startInEndOut + or + startOutEndOut + or + repeatNotNull;
		return encodedQueryStr;
	},

	/**
	 * @param endOfDay [Boolean]: End of current day.
	 * @param date [String]: a string in the yyyy-MM-dd format. A default is applied if not provided which is the start of day, unless endOfDay is true
	 * return: yyyy-MM-dd hh:mm:ss [String]
	 *
	 */
	getGlideDateTimeStr: function (endOfDay, dateStr) {
		var timePart = endOfDay ? " 23:59:59" : " 00:00:00";
		var dateTime = "";

		if (JSUtil.nil(dateStr)) {
			var currentDateTime = new GlideDateTime();
			dateTime = new GlideDateTime(currentDateTime.getDate() + timePart).getValue();
		} else
			dateTime = new GlideDateTime(dateStr + timePart).getValue();

		return dateTime;
	},

	/*
	 * Input: yyyy-MM-dd hh:mm:ss
	 * Output: yyyyMMddThhmmssZ
	 * e.g.
	 * 2016-08-02 00:00:00
	 * 20160802T000000Z
	 */
	formatDateStr: function (strDate) {
		var iCalDate = strDate + "";
		iCalDate = iCalDate.replace(/\s+/g, "T");
		iCalDate = iCalDate.replace(/\-/g, "");
		iCalDate = iCalDate.replace(/\:/g, "");
		iCalDate += "Z"; // Denotes UTC, hence expecting UTC input
		return iCalDate;
	},

	/**
	 * Rhino engine parseInt does not behave like JS parseInt dumping floats
	 */
	parseInt: function (str) {
		if (!str)
			return 0;
		var number = str.split(".");
		return parseInt(number[0]);
	},

	/**
	 * ensure number is at least 2 digits long
	 */
	pad: function (number) {
		number = parseInt(number || "");
		if (isNaN(number))
			return "00";
		if (number >= 10)
			return number;
		return "0" + number;
	},

	/**
	 * git [GlideIntegerTime]
	 * return time hhmmss
	 */
	gitToTime: function (git) {
		return (this.pad(git.getHour()) + "") + (this.pad(git.getMinute()) + "") + (this.pad(git.getSecond()) + "");
	},

	/**
	 * gd [GlideDate]
	 * return time yyyymmdd
	 */
	gdToDate: function (gd) {
		return (gd.getYearUTC() + "") + (this.pad(gd.getMonthUTC()) + "") + (this.pad(gd.getDayOfMonthUTC()) + "");
	},

	/**
	 * gdt [GlideDateTime]
	 * return time yyyymmdd
	 */
	gdtToDate: function (gdt) {
		return (gdt.getYearLocalTime() + "") + (this.pad(gdt.getMonthLocalTime()) + "") + (this.pad(gdt.getDayOfMonthLocalTime()) + "");
	},

	/*
	 * Check if overlapping shift is allowed for a group
	 * @param String groupId
	 *
	 * @return true if overlapping shift is allowed for a group
	 */
	isOverlapAllowed: function (groupId) {
		var onCallGroupPreferenceGR = new GlideRecord("on_call_group_preference");
		var hasGroupPreference = onCallGroupPreferenceGR.get("group", groupId);
		if ((hasGroupPreference && (onCallGroupPreferenceGR.getValue("allow_rota_overlap") === 'yes' || (onCallGroupPreferenceGR.getValue("allow_rota_overlap") === 'default' && gs.getProperty('com.snc.on_call_rotation.allow_rota_overlap') == 'true'))) || (!hasGroupPreference && gs.getProperty('com.snc.on_call_rotation.allow_rota_overlap') == 'true'))
			return true;
		return false;
	},

	getEscalationSettings: function (groupId) {
		var onCallGroupPreferenceGR = new GlideRecord("on_call_group_preference");
		var hasGroupPreference = onCallGroupPreferenceGR.get("group", groupId);
		var escalationSetting;
		if (hasGroupPreference) {
			escalationSetting = onCallGroupPreferenceGR.getValue("escalation_rule_rota_overlap");
			if (escalationSetting == 'default') {
				escalationSetting = gs.getProperty('com.snc.on_call_rotation.escalation_rule_rota_overlap');
			}
		} else {
			escalationSetting = gs.getProperty('com.snc.on_call_rotation.escalation_rule_rota_overlap');
		}
		return escalationSetting;
	},

	toJS: function (gr, requiredFields, skipACL) {
		if (!gr)
			return;
		if (!gr.canRead() && !skipACL)
			return;
		if (!requiredFields)
			requiredFields = [];

		var obj = {};
		obj.sys_id = {};
		obj.sys_id.value = gr.getUniqueValue();

		var el = gr.getFields();
		for (var i = 0; i < el.size(); i++) {
			var elem = el.get(i);
			var elName = elem.getName() + "";
			var fieldType = elem.getED().getInternalType();

			if (requiredFields.indexOf(elName) == -1 || fieldType == 'journal' || fieldType == 'journal_input' || fieldType == 'journal_list')
				continue;

			obj[elName] = {};
			obj[elName].canRead = elem.canRead();
			if (obj[elName].canRead || skipACL) {
				obj[elName].display_value = elem.getDisplayValue();
				obj[elName].value = elem.toString();
				obj[elName].label = elem.getLabel();

				if (gr[elName] != null && gr[elName].getGlideObject() && gr[elName]
					.getGlideObject().getDisplayValueInternal()) {
					obj[elName].display_value_internal = gr[elName].getGlideObject().getDisplayValueInternal();
				}
			}
		}
		return obj;
	},

	hasActiveRotas: function (groupId) {
		var rotaGr = new GlideRecord(this.TABLES.CMN_ROTA);
		rotaGr.addActiveQuery();
		rotaGr.addQuery("group", groupId);
		rotaGr.query();
		return rotaGr.hasNext();
	},

	/**
 	 * @param managerGroupGr [GlideRecord]: sys_user_group's GlideRecord.
	 * @param userSysId [String]
 	 * @param isRotaAdmin [Boolean]
 	 */
	addManagedGroupsQuery: function (managerGroupGr, userSysId, isRotaAdmin) {
		if (!isRotaAdmin)
			managerGroupGr.addQuery("manager", userSysId);
		managerGroupGr.addActiveQuery();
		managerGroupGr.addEncodedQuery("JOINsys_user_group.sys_id=cmn_rota.group!active=true");
	},

	/*
	 * Returns count of users how are active members of any roster from the given group
	 */
	getGroupMemberCount: function (groupId, includeDraft) {
		var todayDate = new GlideDateTime().getDate().getValue(); // returns internal formatted date
		var memberGr = new GlideRecord(this.TABLES.CMN_ROTA_MEMBER);
		memberGr.addQuery("member.active", "=", true);
		var qc = memberGr.addQuery("roster.rota.active", true);
		if (includeDraft) {
			var qcOR = qc.addOrCondition("roster.rota.active", false);
			qcOR.addCondition("roster.rota.state", "draft");
		}
		memberGr.addEncodedQuery("from=NULL^ORfrom<=" + todayDate);
		memberGr.addEncodedQuery("to=NULL^ORto>=" + todayDate);
		memberGr.query();

		var memberIds = [];
		while (memberGr.next())
			memberIds.push(memberGr.member + "");
		if (!memberIds.length)
			return 0;

		var count = 0;
		var userMemberGa = new GlideAggregate(this.TABLES.SYS_USER_GRMEMBER);
		userMemberGa.addQuery("group", groupId);
		userMemberGa.addQuery("user", "IN", memberIds.join(","));
		userMemberGa.addQuery("group.active", "true");
		userMemberGa.addEncodedQuery("JOINsys_user_grmember.group=cmn_rota.group");
		userMemberGa.addAggregate('COUNT');
		userMemberGa.query();
		if (userMemberGa.next())
			count = userMemberGa.getAggregate('COUNT');
		return count;
	},

	getChoiceList: function (table, field) {
		var choices = [];
		var loggedInUserLanguage = gs.getSession().getLanguage();
		var choiceGr = new GlideRecord(this.TABLES.SYS_CHOICE);
		choiceGr.addQuery("name", table);
		choiceGr.addQuery("element", field);
		choiceGr.addQuery("language", loggedInUserLanguage);
		var qc = choiceGr.addNullQuery("inactive");
		qc.addOrCondition("inactive", false);
		choiceGr.orderBy('sequence');
		choiceGr.query();
		while (choiceGr.next()) {
			var choice = {
				name: choiceGr.label + "",
				value: choiceGr.value + ""
			};
			choices.push(choice);
		}
		return choices;
	},

	_sortTZ: function (timezones) {
		timezones = timezones.sort(function (tz1, tz2) {
			var tz1Name = tz1.name.toLowerCase();
			var tz2Name = tz2.name.toLowerCase();

			if (tz1Name < tz2Name)
				return -1;
			else if (tz1Name > tz2Name)
				return 1;
			else return 0;
		});
		return timezones;
	},

	getTimezoneList: function () {
		var timezones = this.getChoiceList(this.TABLES.USER, this.SYS_USER_FIELDS.TIMEZONE);
		var sessionTZ = gs.getSession().getTimeZoneName();
		timezones = timezones.filter(function (timezone) {
			return timezone.value !== "NULL_OVERRIDE";
		});

		var isSessionTZAvailable = timezones.some(function (timezone) {
			return timezone.value === sessionTZ + "";
		});

		if (!isSessionTZAvailable) {
			timezones.push({
				name: sessionTZ,
				value: sessionTZ
			});
		}
		return this._sortTZ(timezones);
	},

	_getEscalationOfRotateMembers: function (rosterGr, rotaGr) {
		var numberOfReminders = rosterGr.attempts ? parseInt(rosterGr.attempts) : 0;
		var reminderDuration = rosterGr.time_between_reminders ? rosterGr.time_between_reminders.getGlideObject().getNumericValue() : 0;

		var memberGr = new GlideRecord(this.TABLES.CMN_ROTA_MEMBER);
		memberGr.addQuery("roster", rosterGr.getUniqueValue());
		memberGr.query();

		var rostersCount = rosterGr.getRowCount();
		rostersCount = !!rostersCount ? rostersCount : 0;
		var timeToStart = 0;
		var level = 1;
		var escalationSteps = [];
		while (memberGr.next()) {
			var step = {};
			step.name = {
				value: gs.getMessage("On Call Member {0}", level + ""),
				display_value: gs.getMessage("On Call Member {0}", level + "")
			};
			step.escalation_level = {
				value: level,
				display_value: level
			};
			step.delay_till_previous_step = {
				value: timeToStart,
				display_value: new GlideDuration(timeToStart).getDisplayValue()
			};
			step.roster_sys_id = {
				value: rosterGr.getUniqueValue()
			};
			step.reminders = {
				label: gs.getMessage("Number of Reminders"),
				value: numberOfReminders
			};
			step.time_between_reminders = {
				value: reminderDuration,
				display_value: rosterGr.getDisplayValue('time_between_reminders')
			};
			step.detailed_reminders = [];
			var reminderNumber = 1;
			var perLevelOverallDuration = 0;
			while (reminderNumber <= numberOfReminders) {
				step.detailed_reminders.push({
					value: reminderDuration,
					display_value: gs.getMessage("Reminder {0} - {1}", [reminderNumber + "", new GlideDuration(reminderDuration).getDisplayValue()])
				});
				reminderNumber++;
				perLevelOverallDuration += reminderDuration;
			}
			var timeTakenDisplayValue = new GlideDuration(perLevelOverallDuration + reminderDuration).getDisplayValue();
			step.time_taken_at_step = {
				value: perLevelOverallDuration + reminderDuration,
				display_value: gs.getMessage("{0} delay", timeTakenDisplayValue)
			};
			step.time_to_next_step = {
				value: reminderDuration,
				display_value: new GlideDuration(reminderDuration).getDisplayValue()
			};
			timeToStart = timeToStart + perLevelOverallDuration + reminderDuration;
			level++;
			escalationSteps.push(step);
		}
		var totalTime;
		if (rotaGr && rotaGr.catch_all) {
			var catchAllStep = this._getCatchAllStep(rotaGr);
			catchAllStep.delay_till_previous_step = {
				value: timeToStart,
				display_value: new GlideDuration(timeToStart).getDisplayValue()
			};
			escalationSteps.push(catchAllStep);
			totalTime = {
				value: "",
				display_value: ""
			};
		} else {
			totalTime = {
				value: timeToStart,
				display_value: new GlideDuration(timeToStart).getDisplayValue()
			};
		}
		var escalation = {};
		escalation.steps = escalationSteps;
		escalation.total_time = totalTime;
		escalation.rosters_count = rostersCount;
		return escalation;
	},

	_getCatchAllStep: function (rotaGr) {
		var catchAllStep = {};
		catchAllStep.name = {
			value: 'catch_all',
			display_value: gs.getMessage("Catch-all")
		};
		catchAllStep.catch_all_type = {
			value: rotaGr.catch_all,
			display_value: rotaGr.getDisplayValue('catch_all')
		};
		switch (rotaGr.catch_all + '') {
			case 'all':
				catchAllStep.value = rotaGr.catch_all_roster;
				catchAllStep.display_value = rotaGr.getDisplayValue('catch_all_roster');
				break;
			case 'individual':
				catchAllStep.value = rotaGr.catch_all_member;
				catchAllStep.display_value = rotaGr.getDisplayValue('catch_all_member');
				break;
			case 'group_manager':
				catchAllStep.value = rotaGr.group.manager;
				catchAllStep.display_value = rotaGr.getDisplayValue('group.manager');
				break;
			default:
				catchAllStep.value = '';
				catchAllStep.display_value = '';
		}
		return catchAllStep;
	},

	_getEscalationOfRotateRoster: function (rosterGr, rotaGr) {
		var timeToStart = 0;
		var level = 1;
		var escalationSteps = [];
		var rostersCount = rosterGr.getRowCount();
		rostersCount = !!rostersCount ? rostersCount : 0;
		while (rosterGr.next()) {
			var numberOfReminders = rosterGr.attempts ? parseInt(rosterGr.attempts) : 0;
			var reminderDuration = rosterGr.time_between_reminders ? rosterGr.time_between_reminders.getGlideObject().getNumericValue() : 0;

			var step = {};
			step.name = {
				value: rosterGr.name + "",
				display_value: rosterGr.name + ""
			};
			step.escalation_level = {
				value: level,
				display_value: level
			};
			step.delay_till_previous_step = {
				value: timeToStart,
				display_value: new GlideDuration(timeToStart).getDisplayValue()
			};
			step.roster_sys_id = {
				value: rosterGr.getUniqueValue()
			};
			step.reminders = {
				label: gs.getMessage("Number of Reminders"),
				value: numberOfReminders
			};
			step.time_between_reminders = {
				value: reminderDuration,
				display_value: rosterGr.getDisplayValue('time_between_reminders')
			};
			step.detailed_reminders = [];
			var reminderNumber = 1;
			var perLevelOverallDuration = 0;
			while (reminderNumber <= numberOfReminders) {
				step.detailed_reminders.push({
					value: reminderDuration,
					display_value: gs.getMessage("Reminder {0} - {1}", [reminderNumber + "", new GlideDuration(reminderDuration).getDisplayValue()])
				});
				reminderNumber++;
				perLevelOverallDuration += reminderDuration;
			}
			var timeTakenDisplayValue = new GlideDuration(perLevelOverallDuration + reminderDuration).getDisplayValue();
			step.time_taken_at_step = {
				value: perLevelOverallDuration + reminderDuration,
				display_value: gs.getMessage("{0} delay", timeTakenDisplayValue)
			};
			step.time_to_next_step = {
				value: reminderDuration,
				display_value: new GlideDuration(reminderDuration).getDisplayValue()
			};
			timeToStart = timeToStart + perLevelOverallDuration + reminderDuration;
			level++;
			escalationSteps.push(step);
		}

		var totalTime;
		if (rotaGr && rotaGr.catch_all) {
			var catchAllStep = this._getCatchAllStep(rotaGr);
			catchAllStep.delay_till_previous_step = {
				value: timeToStart,
				display_value: new GlideDuration(timeToStart).getDisplayValue()
			};
			escalationSteps.push(catchAllStep);
			totalTime = {
				value: "",
				display_value: ""
			};
		} else {
			totalTime = {
				value: timeToStart,
				display_value: new GlideDuration(timeToStart).getDisplayValue()
			};
		}
		var escalation = {};
		escalation.steps = escalationSteps;
		escalation.total_time = totalTime;
		escalation.rosters_count = rostersCount;
		return escalation;
	},

	getEscalationPathDefinition: function (rotaId, escalationSetId) {
		/**
		 * @type {CmnRotaRosterGR}
		*/

		var rotaGr = new GlideRecord(this.TABLES.CMN_ROTA);
		if (!rotaGr.get(rotaId)) {
			return;
		}
		var rosterGr = new GlideRecord(this.TABLES.CMN_ROTA_ROSTER);
		rosterGr.addQuery("rota", rotaId);
		rosterGr.orderBy("order");
		rosterGr.query();
		if (rotaGr.use_custom_escalation) {
			if (escalationSetId)
				return new OCEscalationDesigner().getEscalationSet(escalationSetId + "");
			else
				return new OCEscalationDesigner().getDefaultEscalation(rotaId + "");
		} else if (rosterGr.getRowCount() == 1) {
			rosterGr.next();
			return this._getEscalationOfRotateMembers(rosterGr, rotaGr);
		} else {
			return this._getEscalationOfRotateRoster(rosterGr, rotaGr);
		}
	},

	/* Check whether to show the option to deactivate the schedule entry
	*  show for group and shift managers.
	*/
	showDeactivateScheduleSpan: function (current) {
		if (current.group)
			return new OnCallSecurityNG().rotaMgrAccess(current.group);
		if (current.schedule.document == this.TABLES.CMN_ROTA) {
			var rotaGr = new GlideRecord(this.TABLES.CMN_ROTA);
			rotaGr.get(current.schedule.document_key);
			if (rotaGr)
				return new OnCallSecurityNG().rotaMgrAccess(rotaGr.group);
		}
		return false;
	},

	evaluateUiAction: function (table, current, actionName) {
		if (!table || !current || !actionName)
			return;

		var uiActionGr = new GlideRecord(this.TABLES.SYS_UI_ACTION);
		uiActionGr.addActiveQuery();
		uiActionGr.addQuery('table', table);
		uiActionGr.addQuery('action_name', actionName);
		uiActionGr.query();
		if (uiActionGr.next()) {
			var evaluator = new GlideScopedEvaluator();
			var result = evaluator.evaluateScript(uiActionGr, 'condition', {
				current: current
			});
			if (result != null) {
				if (result.toString() != "true")
					return false;
			}
			return true;
		}
		return false;
	},

	/**
	* To get Spans (Primarily for Mobile use case)
	*/
	getAllSpans: function (startDate, endDate, groupId, formatterType) {
		var formatter = null;
		var scriptInclude = OCFormatterMapping.formatters[formatterType];
		if (scriptInclude === OCDHTMLXCalendarFormatter)
			formatter = new scriptInclude(null, gs.getSession().getTimeZoneName() + "");
		else if (scriptInclude)
			formatter = new scriptInclude();

		var ocrRotaV2 = new OCRotationV2(null, formatter);
		return ocrRotaV2
			.setStartDate(startDate)
			.setEndDate(endDate, false)
			.setGroupIds(groupId)
			.getSpans();
	},

	/**
	* To Request Time Off (Primarily for Mobile use case)
	*/
	requestTimeOff: function (startDate, endDate, allDayEvent, groupId, notes, proposedCover, memberSysId, formatterType) {
		if (!memberSysId)
			memberSysId = gs.getUserID();
		var maxDateRangeDaysDuration = parseInt(gs.getProperty("com.snc.on_call_rotation.calendar_span.max_time_off_days", "365"));
		var coverageDateDiff = gs.dateDiff(startDate, endDate, true);
		if (coverageDateDiff <= 0) {
			throw "Invalid time off spans";
		}
		var providedCoverageDurationInDays = parseInt(coverageDateDiff / (24 * 60 * 60));
		if (providedCoverageDurationInDays > maxDateRangeDaysDuration) {
			throw "Can not provide time off for more than " + maxDateRangeDaysDuration + " consecutive days.";
		}

		var formatter = null;
		var scriptInclude = OCFormatterMapping.formatters[formatterType];
		if (scriptInclude)
			formatter = new scriptInclude();
		return new OCAddItem(formatter)
			.setMemberSysId(memberSysId)
			.setGroupSysId(groupId)
			.setStartDateTime(startDate)
			.setEndDateTime(endDate)
			.setAllDay(allDayEvent)
			.setNotes(notes)
			.setProposedCover(proposedCover)
			.timeOff();
	},

	/** 
	* To Provide coverage for mobile and web
	*/
	addOverride: function (startSpanDate, endSpanDate, userId, rosterIds, groupId, format) {
		var scriptInclude = OCFormatterMapping.formatters[format];
		var spans = [];
		var formatter = null;
		if (scriptInclude)
			formatter = new scriptInclude();
		var rosterSysIds = [];
		if (rosterIds.indexOf(",") > -1)
			rosterSysIds = rosterIds.split(",");
		else
			rosterSysIds.push(rosterIds);

		var isCoverageRotaTimesOnlyEnabled = (gs.getProperty("com.snc.on_call_rotation.coverage.rota_times_only", "true") == "true");

		var maxDateRangeDaysDuration = parseInt(gs.getProperty("com.snc.on_call_rotation.calendar_span.max_date_range_days", "30"));
		var coverageDateDiff = gs.dateDiff(startSpanDate, endSpanDate, true);
		if (JSUtil.nil(coverageDateDiff)) {
			throw "Invalid coverage spans";
		}
		var providedCoverageDuration = parseInt(coverageDateDiff / (24 * 60 * 60));
		if (providedCoverageDuration > maxDateRangeDaysDuration) {
			throw "Can not provide coverage for more than " + maxDateRangeDaysDuration + " consecutive days.";
		}

		if (isCoverageRotaTimesOnlyEnabled) {
			var rotaRosterMap = {};
			var rosterNameMap = {};
			var rotaIds = [];
			var rosterGr = new GlideRecord('cmn_rota_roster');
			rosterGr.addQuery('sys_id', 'IN', rosterSysIds);
			rosterGr.query();
			while (rosterGr.next()) {
				if (!rotaRosterMap[rosterGr.getValue('rota')]) {
					rotaRosterMap[rosterGr.getValue('rota')] = {};
					rotaRosterMap[rosterGr.getValue('rota')].rosters = [rosterGr.getUniqueValue()];
					rotaIds.push(rosterGr.getValue('rota'));
				} else {
					rotaRosterMap[rosterGr.getValue('rota')].rosters.push(rosterGr.getUniqueValue());
				}
				rosterNameMap[rosterGr.getUniqueValue()] = rosterGr.getValue('name');
			}
			var ocRotationFormatter = new OCDHTMLXCalendarFormatter();
			var ocrRotaV2 = new OCRotationV2(null, ocRotationFormatter);

			var isSuccessAddedInSpan = false,
				isWarningAddedInSpan = false;
			var allSpansFromStartAndEndDate = ocrRotaV2
				.setStartDate(startSpanDate, true)
				.setEndDate(endSpanDate, null, true)
				.setRosterIds(rosterIds)
				.setGroupIds(groupId)
				.setRotaIds(rotaIds)
				.getSpans();


			var filteredRotaSpans = [];
			var filteredOverrideSpans = [];

			for (var i = 0; i < allSpansFromStartAndEndDate.length; i++) {
				if (allSpansFromStartAndEndDate[i].type == 'rota')
					filteredRotaSpans.push(allSpansFromStartAndEndDate[i]);
				if (allSpansFromStartAndEndDate[i].type == 'override')
					filteredOverrideSpans.push(allSpansFromStartAndEndDate[i]);
			}

			var createOverride = function (rosterId, startDate, endDate) {
				var successResult = new OCAddItem(formatter)
					.setMemberSysId(userId)
					.setRosterSysId(rosterId + "")
					.setStartDateTime(startDate + "")
					.setEndDateTime(endDate + "")
					.createOverride();
				spans.push(successResult);
			};

			var conflictingOverrideSkipped = false;
			var errorMessagesData = {};

			for (var i = 0; i < filteredRotaSpans.length; i++) {
				var rotaSpan = filteredRotaSpans[i];
				var rotaId = rotaSpan.rota_id + '';
				var rosters = rotaRosterMap[rotaId].rosters.slice(0);

				var rotaStartDate = new GlideDateTime();
				rotaStartDate.setDisplayValueInternal(rotaSpan.start_date);
				var rotaEndDate = new GlideDateTime();
				rotaEndDate.setDisplayValueInternal(rotaSpan.end_date);

				for (var k = 0; k < rosters.length; k++) {

					var rosterId = rosters[k] + '';

					var rosterCompletelyOverlaps = false;
					var rosterPartiallyOverlaps = false;

					var previousOverrideEndDate = null;
					var previousOverrideEndDateGDT = null;

					//search for an conflicting override for that roster
					for (var j = 0; j < filteredOverrideSpans.length; j++) {

						var overrideSpan = filteredOverrideSpans[j];

						if (rosterId == (overrideSpan.roster_id + '')) {
							var overrideSpanStartDate = new GlideDateTime();
							overrideSpanStartDate.setDisplayValueInternal(overrideSpan.start_date);

							var overrideSpanEndDate = new GlideDateTime();
							overrideSpanEndDate.setDisplayValueInternal(overrideSpan.end_date);

							// if rota span in completely overlapped by existing override
							if (rotaStartDate.compareTo(overrideSpanStartDate) >= 0 && rotaEndDate.compareTo(overrideSpanEndDate) <= 0) {
								rosterCompletelyOverlaps = true;
								break;
							}

							// if rota span is partially overlapping with existing override
							else if ((rotaStartDate.compareTo(overrideSpanStartDate) <= 0 && rotaEndDate.compareTo(overrideSpanEndDate) >= 0) || (rotaStartDate.compareTo(overrideSpanStartDate) <= 0 && rotaStartDate.compareTo(overrideSpanEndDate) >= 0) || (rotaEndDate.compareTo(overrideSpanStartDate) <= 0 && rotaEndDate.compareTo(overrideSpanEndDate) >= 0)) {
								rosterPartiallyOverlaps = true;

								if (!previousOverrideEndDate && rotaStartDate.compareTo(overrideSpanStartDate) < 0)
									createOverride(rosterId, rotaSpan.start_date, overrideSpan.start_date);
								else if (previousOverrideEndDate && previousOverrideEndDateGDT.compareTo(overrideSpanStartDate) < 0)
									createOverride(rosterId, previousOverrideEndDate, overrideSpan.start_date);

								previousOverrideEndDate = overrideSpan.end_date;
								previousOverrideEndDateGDT = overrideSpanEndDate;

								if (!errorMessagesData[rosterId])
									errorMessagesData[rosterId] = [];
								errorMessagesData[rosterId].push({
									start: overrideSpanStartDate.getDisplayValue(),
									end: overrideSpanEndDate.getDisplayValue()
								});
							}
						}
					}

					if (previousOverrideEndDate && previousOverrideEndDateGDT.compareTo(rotaEndDate) < 0)
						createOverride(rosterId, previousOverrideEndDate, rotaSpan.end_date);

					if (rosterCompletelyOverlaps || rosterPartiallyOverlaps)
						conflictingOverrideSkipped = true;

					if (!rosterCompletelyOverlaps && !rosterPartiallyOverlaps && rotaStartDate.compareTo(rotaEndDate) < 0)
						createOverride(rosterId, rotaSpan.start_date, rotaSpan.end_date);

					if (rosterCompletelyOverlaps) {
						if (!errorMessagesData[rosterId])
							errorMessagesData[rosterId] = [];
						errorMessagesData[rosterId].push({
							start: rotaStartDate.getDisplayValue(),
							end: rotaEndDate.getDisplayValue()
						});
					}

				}

			}

			if (conflictingOverrideSkipped) {
				var errorResult = {};
				errorResult.message = gs.getMessage("Some Coverages spans were not created since they already have a Coverage defined");
				errorResult.message_type = "warning";
				errorResult.no_hide = true;
				spans.push(errorResult);


				Object.keys(errorMessagesData).forEach(function (rosterId) {
					var dateRanges = "";

					errorMessagesData[rosterId].forEach(function (obj) {
						if (GlideI18NStyle.getDirection() == 'ltr')
							dateRanges = dateRanges + "(" + obj.start + " - " + obj.end + ") ";
						else
							dateRanges = " (" + obj.end + " - " + obj.start + ")" + dateRanges;
					});

					errorResult = {};
					errorResult.message = gs.getMessage("Coverage creation skipped for {0} on date(s) {1} as there was a conflicting Coverage present.", [rosterNameMap[rosterId], dateRanges]);
					errorResult.message_type = "warning";
					errorResult.no_hide = true;
					spans.push(errorResult);
				});

			}

		} else { // Legacy behaviour maintained for coverage creation

			for (var i = 0; i < rosterSysIds.length; i++)
				spans.push(new OCAddItem(formatter)
					.setMemberSysId(userId)
					.setRosterSysId(rosterSysIds[i])
					.setStartDateTime(startSpanDate)
					.setEndDateTime(endSpanDate)
					.createOverride());
		}
		return spans;
	},

    /**
    * To Delete coverage (for Mobile and web)
    */
	deleteCoverage: function (tableName, sysId) {
		if (JSUtil.nil(tableName) || JSUtil.nil(sysId)) {
			return new sn_ws_err.BadRequestError("Invalid Table OR Sys_id provided");
		}

		var tableGr = new GlideRecord(tableName);
		if (tableGr.get(sysId)) {
			if (tableGr.canDelete()) {
				if (!tableGr.deleteRecord()) {
					return new sn_ws_err.BadRequestError("Could not delete the record");
				}
			} else {
				var respError = new sn_ws_err.ServiceError();
				respError.setStatus(403);
				respError.setMessage("Security constraints prevent access to requested resource");
				return respError;
			}
		}
	},

    /**
    * To Replace coverage (for Mobile and web)
    */
	replaceCoverage: function (startSpanDate, endSpanDate, userId, rosterId, groupId, tableName, sysId, format) {
		var formatter = null;
		var scriptInclude = OCFormatterMapping.formatters[format];
		if (scriptInclude)
			formatter = new scriptInclude();

		var result = new OCAddItem(formatter)
			.setMemberSysId(userId)
			.setRosterSysId(rosterId)
			.setStartDateTime(startSpanDate)
			.setEndDateTime(endSpanDate)
			.createOverride(true);

		if (result.message_type !== "error") {
			//delete coverage
			if (JSUtil.nil(tableName) || JSUtil.nil(sysId)) {
				return new sn_ws_err.BadRequestError("Invalid Table OR Sys_id provided");
			}

			var tableGr = new GlideRecord(tableName);
			if (tableGr.get(sysId)) {
				if (tableGr.canDelete()) {
					if (!tableGr.deleteRecord()) {
						return new sn_ws_err.BadRequestError("Could not delete the record");
					}
				} else {
					var respError = new sn_ws_err.ServiceError();
					respError.setStatus(403);
					respError.setMessage("Security constraints prevent access to requested resource");
					return respError;
				}
			}

			//create coverage
			result = new OCAddItem(formatter)
				.setMemberSysId(userId)
				.setRosterSysId(rosterId)
				.setStartDateTime(startSpanDate)
				.setEndDateTime(endSpanDate)
				.createOverride();
		}
		return result;
	},

    /**
     * to get the PTO Configuration for the given group
     */
	getPTOConfiguration: function (groupId) {
		return new OCRosterSpanApprovalUtil().isPTOApprovalRequired(groupId);
	},

	getManagedGroups: function () {
		var groupId;
		var myGroups = [];
		var isRotaAdmin = false;
		var ocsNG = new OnCallSecurityNG();

		var userSysId = gs.getUserID();

		if (gs.hasRole('rota_admin')) {
			isRotaAdmin = true;
		}

		var managerGroupGr = new GlideRecord("sys_user_group");
		this.addManagedGroupsQuery(managerGroupGr, userSysId, isRotaAdmin);
		managerGroupGr.query();

		while (managerGroupGr.next()) {
			myGroups.push(managerGroupGr.getUniqueValue());
		}

		if (!isRotaAdmin) {
			var gaHasRole = ocsNG.getDelegatedGroups(userSysId);

			while (gaHasRole.next()) {
				groupId = gaHasRole.getValue('granted_by');
				myGroups.push(groupId);
			}

			var groupIds = ocsNG.getManagedGroupsByPreferences(userSysId);

			groupIds.forEach(function (grId) {
				myGroups.push(grId);
			});
		}

		return myGroups;
	},

	getMyGroups: function () {
		var myGroups = [];
		var userSysId = gs.getUserID();

		var memberGroupGr = new GlideRecord("sys_user_grmember");
		memberGroupGr.addQuery('user', userSysId);
		memberGroupGr.addEncodedQuery("JOINsys_user_grmember.group=cmn_rota.group!active=true");
		memberGroupGr.query();

		while (memberGroupGr.next()) {
			myGroups.push(memberGroupGr.group);
		}

		return myGroups;
	},

	getUserGroups: function () {
		if (this.getManagedGroups())
			return (this.getManagedGroups()).concat(this.getMyGroups());
		else
			return this.getMyGroups();
	},
	
	getOnCallDashboardURL: function () {
	
		if(GlidePluginManager.isActive("com.snc.pa.premium") && gs.hasRole("rota_prem_dashboard_user"))
			g_response.sendRedirect("$pa_dashboard.do?sysparm_dashboard=292ad76653e700100c54ddeeff7b12a0");
		else 
			g_response.sendRedirect("$pa_dashboard.do?sysparm_dashboard=af9f6e7d53af00100c54ddeeff7b127f");
	},

	type: 'OnCallCommonSNC'
};
```