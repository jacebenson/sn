---
title: "OCRosterSpanApprovalUtil"
id: "ocrosterspanapprovalutil"
---

API Name: global.OCRosterSpanApprovalUtil

```js
var OCRosterSpanApprovalUtil = Class.create();
OCRosterSpanApprovalUtil.MSG_TYPE_SUCCESS = "SUCCESS";
OCRosterSpanApprovalUtil.MSG_TYPE_WARNING = "WARNING";
OCRosterSpanApprovalUtil.MSG_TYPE_FAILED = "FAILED";
OCRosterSpanApprovalUtil.prototype = {
	PROPERTY_PTO_APPROVAL_REQUIRED: 'com.snc.on_call_rotation.pto.approval.required',
	PROPERTY_PTO_CONFIG: 'com.snc.on_call_rotation.pto.configuration',
	TABLE: {
		USER_GRMEMBER: 'sys_user_grmember',
		CMN_ROTA: 'cmn_rota',
		ROSTER_SPAN_PROPOSAL: 'roster_schedule_span_proposal',
		USER: 'sys_user',
		GROUP_SETTING: 'on_call_group_preference' 
	},
	SPAN_TYPE: {
		TIME_OFF: 'time_off',
		TIME_OFF_REJECTED: 'time_off_rejected'
	},
	PTO_CONFIG_PROP_VALUES: {
		WITH_APPROVAL: "with_approval",
		WITHOUT_APPROVAL: "without_approval",
		NOT_ALLOWED: "not_allowed"
	},
	PTO_GROUP_SETTING_CONFIG: {
		WITH_APPROVAL: "with_approval",
		WITHOUT_APPROVAL: "without_approval",
		NOT_ALLOWED: "not_allowed",
		DEFAULT: "default"
	},
	ROSTER_SPAN_PROPOSAL_STATE_VALUES: {
		APPROVED: "5",
		APPROVAL_NOT_REQUIRED: "9"
	},
	
	initialize: function() {},
	
	_getGroupSetting: function (groupId) {
		var groupSettingValue = this.PTO_GROUP_SETTING_CONFIG.DEFAULT;

		var gr = new GlideRecord(this.TABLE.GROUP_SETTING);
		gr.addQuery("group", groupId);
		gr.query();
		if (gr.next())
			groupSettingValue = gr.getValue("pto_approval_config");
		return groupSettingValue;
	},

	isPTOApprovalRequired: function (groupId) {
		var groupSetting = this._getGroupSetting(groupId);

		if (groupSetting == this.PTO_GROUP_SETTING_CONFIG.DEFAULT)
			return gs.getProperty(this.PROPERTY_PTO_CONFIG, this.PTO_GROUP_SETTING_CONFIG.DEFAULT);

		return groupSetting;
	},

	getPTOApprovalAndCoverageStatusByGroups: function (groupSysIds) {
		if (!groupSysIds)
			groupSysIds = [];
		
		var globalPtoApproval = gs.getProperty(this.PROPERTY_PTO_CONFIG, this.PTO_GROUP_SETTING_CONFIG.DEFAULT);
		var groupSettingsMap = {};
		for (var i = 0; i < groupSysIds.length; i++) {
			var group = groupSysIds[i];
			groupSettingsMap[group] = {
				ptoApproval: this.PTO_GROUP_SETTING_CONFIG.DEFAULT,
				isPTOAccessible: true,
				isProposedCoverMandatory: false
			};
		}
		
		var gr = new GlideRecord(this.TABLE.GROUP_SETTING);
		gr.addQuery("group", "IN", groupSysIds.join());
		gr.query();
		while (gr.next()) {
			var groupSysId = gr.group + '';
			var thisGroupSettings = groupSettingsMap[groupSysId];
			thisGroupSettings.ptoApproval = gr.getValue("pto_approval_config");
		}
		
		for (var groupId in groupSettingsMap) {
			var groupSettings = groupSettingsMap[groupId];
			
			if (groupSettings.ptoApproval == this.PTO_GROUP_SETTING_CONFIG.DEFAULT) {
				groupSettings.ptoApproval = globalPtoApproval;
			}
			if (groupSettings.ptoApproval == this.PTO_CONFIG_PROP_VALUES.NOT_ALLOWED)
				groupSettings.isPTOAccessible = false;
			if (groupSettings.ptoApproval == this.PTO_CONFIG_PROP_VALUES.WITHOUT_APPROVAL)
				groupSettings.isProposedCoverMandatory = true;
		}
		return groupSettingsMap;
	},
	
	getPTOApproversList: function (rosterSpanProposalGr) {
		var userSysId = rosterSpanProposalGr.roster_schedule_span.schedule.document_key +
			'';
		var sysUserGrMember = new GlideRecord(this.TABLE.USER_GRMEMBER);
		sysUserGrMember.addQuery('user', userSysId);
		sysUserGrMember.query();
		var userGroups = [];
		while (sysUserGrMember.next()) {
			userGroups.push(sysUserGrMember.group + '');
		}
		var rotaGr = new GlideRecord(this.TABLE.CMN_ROTA);
		rotaGr.addQuery('group', 'IN', userGroups.join(','));
		rotaGr.query();
		var rotaMgrs = [];
		while (rotaGr.next())
			if (rotaGr.group && rotaGr.group.manager)
				rotaMgrs.push(rotaGr.group.manager + '');

		return rotaMgrs;
	},

	getContextualCalUrlPerSpanProposal: function (rosterSpanProposalGr) {
		var rosterSpan = rosterSpanProposalGr.roster_schedule_span;
		var contextualDate = new GlideScheduleDateTime(rosterSpan.start_date_time.getGlideObject())
			.getGlideDateTime().getLocalDate();
		var url = '/$oc.do?' + 'sysparm_include_view=daily,weekly,monthly' + '&' +
			'sysparm_current_view=weekly' + '&' + 'sysparm_group_id=' +
			rosterSpan.group + '&' + 'sysparm_start_date=' + contextualDate;
		return url;
	},

	getUserNamePerSpanProposal: function (rosterSpanProposalGr) {
		var userSysId = rosterSpanProposalGr.roster_schedule_span.schedule.document_key + '';
		var userGr = new GlideRecord(this.TABLE.USER);
		if (userGr.get(userSysId))
			return userGr.getDisplayValue();
		return '';
	},

	getFromDateDisplayValuePerSpanProposal: function (rosterSpanProposalGr) {
		var rosterSpan = rosterSpanProposalGr.roster_schedule_span;
		return new GlideScheduleDateTime(rosterSpan.start_date_time.getGlideObject())
			.getGlideDateTime().getDisplayValue();
	},

	getToDateDisplayValuePerSpanProposal: function (rosterSpanProposalGr) {
		var rosterSpan = rosterSpanProposalGr.roster_schedule_span;
		return new GlideScheduleDateTime(rosterSpan.end_date_time.getGlideObject())
			.getGlideDateTime().getDisplayValue();
	},

	approvePTOSpan: function (rosterSpanProposalGr) {
		var rosterSpanGr = rosterSpanProposalGr.roster_schedule_span.getRefRecord();
		
		var result = this.provideCoverageForTimeOff(rosterSpanGr, rosterSpanProposalGr);

		if (result.message_type == OCRosterSpanApprovalUtil.MSG_TYPE_FAILED) {
			gs.addErrorMessage(result.message);
			return;
		}
		if (result.message_type == OCRosterSpanApprovalUtil.MSG_TYPE_WARNING)
			gs.addInfoMessage(result.message);

		rosterSpanGr.type = this.SPAN_TYPE.TIME_OFF;
		rosterSpanGr.update();
	},

	provideCoverageForTimeOff: function (rosterSpanGr, rosterSpanProposalGr) {
		var startDate = rosterSpanGr.getDisplayValue("start_date_time");
		var endDate = rosterSpanGr.getDisplayValue("end_date_time");
		var proposalGdtStart = new GlideDateTime();
		var proposalGdtEnd = new GlideDateTime();
		var rosterSpanProposalState = rosterSpanProposalGr.state;
		var proposedMember = rosterSpanProposalGr.proposed_cover;
		var result = {};

		proposalGdtStart.setDisplayValue(startDate);
		proposalGdtEnd.setDisplayValue(endDate);

		if (JSUtil.nil(proposedMember)) {
			result.message = gs.getMessage("No Proposed Coverage was specified, so Coverage cannot be created automatically for the Time-off");
			result.message_type = OCRosterSpanApprovalUtil.MSG_TYPE_WARNING;
			return result;
		}
		
		var proposedStartInternal = new GlideDateTime();
		proposedStartInternal.setDisplayValueInternal(proposalGdtStart.getDisplayValueInternal());
		var proposedEndInternal = new GlideDateTime();
		proposedEndInternal.setDisplayValueInternal(proposalGdtEnd.getDisplayValueInternal());

		if (rosterSpanProposalGr.auto_swap_coverage == false) {
			result.message = gs.getMessage("Proposed Cover was not accepted, so Coverage was not automatically created for the time-off");
			result.message_type = OCRosterSpanApprovalUtil.MSG_TYPE_WARNING; // Do not create the coverage if auto swap coverage is not clicked
			return result;
		}

		// Check if the roster span proposal record's state is in 'Approved' or 'Approval not required'
		if (!(rosterSpanProposalState == this.ROSTER_SPAN_PROPOSAL_STATE_VALUES.APPROVED || rosterSpanProposalState == this.ROSTER_SPAN_PROPOSAL_STATE_VALUES.APPROVAL_NOT_REQUIRED)) {
			result.message = gs.getMessage("Coverage was not automatically created as the Proposed Cover was not accepted");
			result.message_type = OCRosterSpanApprovalUtil.MSG_TYPE_FAILED;
			return result;
		}

		var formatter = new OCDHTMLXCalendarFormatter();
		var spans = new OCRotationV2(null, formatter)
			.setStartDate(proposalGdtStart.getLocalDate())
			.setEndDate(proposalGdtEnd.getLocalDate())
			.setGroupIds(rosterSpanGr.group + "")
			.setUserIds(rosterSpanGr.user + "")
			.getSpans();

		spans.forEach(function (span) {
			if ((span.type + "") == "roster") {
				// calculate end time for providing coverage, so that it does not cover the full span only provide coverage for the given time
				var endDateTime = span.end_date + "";
				var startDateTime = span.start_date + "";

				var spanStartDateInternal = new GlideDateTime();
				spanStartDateInternal.setDisplayValueInternal(startDateTime);

				var spanEndDateInternal = new GlideDateTime();
				spanEndDateInternal.setDisplayValueInternal(endDateTime);

				// Check proposed coverage time is overlapping with the current span
				if (spanEndDateInternal.before(proposedStartInternal))
					return;
				// Check proposed coverage time is overlapping with the current span
				if (spanStartDateInternal.after(proposedEndInternal))
					return;
				// Change end date to the proposed end date if span end date is after that
				if (spanEndDateInternal.after(proposedEndInternal))
					endDateTime = proposedEndInternal.getDisplayValueInternal();
				// Change start date to the proposed start date if span start date is before that
				if (spanStartDateInternal.before(proposedStartInternal))
					startDateTime = proposedStartInternal.getDisplayValueInternal();

				new OCAddItem(formatter)
					.setMemberSysId(proposedMember)
					.setRosterSysId(span.roster_id + "")
					.setStartDateTime(startDateTime + "")
					.setEndDateTime(endDateTime + "")
					.setGroupSysId(rosterSpanGr.group + "")
					.createOverride();
			}
		});

		result.message_type = OCRosterSpanApprovalUtil.MSG_TYPE_SUCCESS;
		result.message = gs.getMessage("Successfully created coverage");
		return result;
	},

	rejectPTOSpan: function(rosterSpanGr) {
		rosterSpanGr.type = this.SPAN_TYPE.TIME_OFF_REJECTED;
		rosterSpanGr.update();
	},

	type: 'OCRosterSpanApprovalUtil'
};
```