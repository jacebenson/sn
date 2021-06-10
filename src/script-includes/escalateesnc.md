---
title: "EscalateeSNC"
id: "escalateesnc"
---

API Name: global.EscalateeSNC

```js
var EscalateeSNC = Class.create();
EscalateeSNC.prototype = {
	TABLES: {
		CMN_ROTA_ESC_STEP_DEF : 'cmn_rota_esc_step_def'
	},
	initialize: function (params) {
		if (!params)
			params = {};

		this.order = params.order || 0;
		this.userId = params.userId || "";
		this.userIds = params.userIds || [];
		this.deviceId = params.deviceId || "";
		this.deviceIds = params.deviceIds || [];
		this.escalationGroups = params.escalationGroups || [];
		this.isDevice = params.isDevice + "" === "true";
		this.timeBetweenReminders = params.timeBetweenReminders || null;
		this.timeToNextStep = params.timeToNextStep || null;
		this.cmnRotaEscStepDefId = params.cmnRotaEscStepDefId || null;
		this.reminderNum = params.reminderNum || 0;
		this.rosterId = params.rosterId || "";
		this.memberId = params.memberId || "";
		this.memberIds = params.memberIds || [];
		this.isOverride = params.isOverride + "" === "true";
		this.additionalEscalatees = params.additionalEscalatees || [];
		this.forcedCommunicationChannel = params.forcedCommunicationChannel || "";
		this.overrideUserContactPreference = params.overrideUserContactPreference == "true";
		this.escalationType = params.escalationType || "";

		if (this.rosterId) {
			var gr = new OnCallRoster(this.rosterId).getGr();
			if (gr) {
				this.rotaId = gr.rota + "";
				this.groupId = gr.rota.group + "";
				this.rotaScheduleId = gr.rota.schedule + "";
				this.escalationSetId = "";
			}
		} else if (this.cmnRotaEscStepDefId) {
			var cmnRotaEscStepDef = new GlideRecord(this.TABLES.CMN_ROTA_ESC_STEP_DEF);
			cmnRotaEscStepDef.get(this.cmnRotaEscStepDefId);
			this.rotaId = cmnRotaEscStepDef.escalation_set.cmn_rota + "";
			this.groupId = cmnRotaEscStepDef.escalation_set.cmn_rota.group + "";
			this.rotaScheduleId = cmnRotaEscStepDef.escalation_set.cmn_rota.schedule + "";
			this.escalationSetId = cmnRotaEscStepDef.escalation_set.sys_id;
		} else {
			this.rotaId = "";
			this.groupId = "";
			this.rotaScheduleId = "";
			this.escalationSetId = "";
		}

		this.memberScheduleId = "";
		if (this.memberId)
			this.memberScheduleId = this.getMemberRotaSchedule(this.memberId);
	},

	getOverrideUserContactPreference: function () {
		return this.overrideUserContactPreference;
	},

	getDeviceId: function () {
		return this.deviceId;
	},

	getDeviceIds: function () {
		return this.deviceIds;
	},

	getEscalationGroups: function() {
		return this.escalationGroups;
	},

	getIsDevice: function () {
		return this.isDevice;
	},

	getIsOverride: function () {
		return this.isOverride;
	},

	getMemberId: function () {
		return this.memberId;
	},

	getMemberIds: function () {
		return this.memberIds;
	},

	getOrder: function () {
		return this.order;
	},

	getReminderNum: function () {
		return this.reminderNum;
	},

	getRosterId: function () {
		return this.rosterId;
	},

	getRotaId: function () {
		return this.rotaId;
	},

	getEscalationSetId: function () {
		return this.escalationSetId;
	},

	getGroupId: function () {
		return this.groupId;
	},

	getRotaScheduleId: function () {
		return this.rotaScheduleId;
	},

	getMemberScheduleId: function () {
		return this.memberScheduleId;
	},

	getTimeBetweenReminders: function () {
		return this.timeBetweenReminders;
	},

	getTimeToNextStep: function () {
		return this.timeToNextStep;
	},

	getCmnRotaEscStepDefId: function () {
		return this.cmnRotaEscStepDefId;
	},

	getUserId: function () {
		return this.userId;
	},

	getUserIds: function () {
		return this.userIds;
	},

	getAdditionalEscalatees: function(){
		return this.additionalEscalatees;
	},

	getForcedCommunicationChannel: function() {
		return this.forcedCommunicationChannel;
	},

	setForcedCommunicationChannel: function(forcedCommunicationChannel) {
		this.forcedCommunicationChannel = forcedCommunicationChannel;
	},

	setDeviceId: function (deviceId) {
		this.deviceId = deviceId;
	},

	setDeviceIds: function (deviceIds) {
		this.deviceIds = deviceIds;
	},

	setEscalationGroups: function(escalationGroups) {
		this.escalationGroups = escalationGroups;
	},

	setIsDevice: function (isDevice) {
		this.isDevice = isDevice;
	},

	setIsOverride: function (isOverride) {
		this.isOverride = isOverride;
	},

	setMemberId: function (memberId) {
		this.memberId = memberId;
	},

	setMemberIds: function (memberIds) {
		this.memberIds = memberIds;
	},

	setOrder: function (order) {
		this.order = order;
	},

	setReminderNum: function (reminderNum) {
		this.reminderNum = reminderNum;
	},

	setRosterId: function (rosterId) {
		this.rosterId = rosterId;
	},

	setRotaId: function (rotaId) {
		this.rotaId = rotaId;
	},

	setGroupId: function (groupId) {
		this.groupId = groupId;
	},

	setRotaScheduleId: function (rotaScheduleId) {
		this.rotaScheduleId = rotaScheduleId;
	},

	setMemberScheduleId: function (memberScheduleId) {
		this.memberScheduleId = memberScheduleId;
	},

	setTimeBetweenReminders: function (timeBetweenReminders) {
		this.timeBetweenReminders = timeBetweenReminders;
	},

	setTimeToNextStep: function (timeToNextStep) {
		this.timeToNextStep = timeToNextStep;
	},

	setCmnRotaEscStepDefId: function (cmnRotaEscStepDefId) {
		this.cmnRotaEscStepDefId = cmnRotaEscStepDefId;
	},

	setUserId: function (userId) {
		this.userId = userId;
	},

	setAdditionalEscalatees: function(additionalEscalatees){
		this.additionalEscalatees = additionalEscalatees;
	},

	addAdditionalEscalatee: function(additionalEscalatee){
		if(!this.additionalEscalatees){
			this.additionalEscalatees = [];
		}
		this.additionalEscalatees.push(additionalEscalatee);
	},

	toString: function () {
		return "[" + this.type + "]" + " order: " + this.order + " userId: " + this.userId + " isDevice: " + this.isDevice +
		" timeBetweenReminders: " + this.timeBetweenRemindersGDur + " reminderNum: " + this.reminderNum + " rosterId: " + this.rosterId +
		" memberId: " + this.memberId + " isOverride: " + this.isOverride + " rosterId: " + this.rosterId + " groupId: " + this.groupId +
		" rotaScheduleId: " + this.rotaScheduleId + " memberScheduleId: " + this.memberScheduleId + " userId: " + this.userId;
	},

	getMemberRotaSchedule: function(memberId) {
		if (!memberId)
			return "";

		var gr = new GlideRecord("cmn_rota_member");
		if (gr.get(memberId))
			return gr.rotation_schedule + "";
		return "";
	},

	type: "EscalateeSNC"
};

```