---
title: "OnCallEscalationUtilSNC"
id: "oncallescalationutilsnc"
---

API Name: global.OnCallEscalationUtilSNC

```js
var OnCallEscalationUtilSNC = Class.create();
OnCallEscalationUtilSNC.prototype = {
	initialize: function () {
		this.oncallCommon = new OnCallCommon();
		this.contactPrefUtil = new OnCallContactPreferenceUtil();
		this.oncallRotation = new OnCallRotation();
	},

	TABLES: {
		ON_CALL_ESCALATION: 'on_call_escalation',
		ON_CALL_ESCALATION_LEVEL: 'on_call_escalation_level',
		ON_CALL_ESCALATION_CON_ATTEMPT: 'on_call_escalation_con_attempt',
		ON_CALL_ESCALATION_COMM: 'on_call_escalation_comm',
		CMN_NOTIF_DEVICE: 'cmn_notif_device'
	},
	ESCALATION_TYPE: {
		ROTATE_THROUGH_MEMBER: 'rotate_through_member',
		ROTATE_THROUGH_ROSTER: 'rotate_through_roster',
		CUSTOM: 'custom'
	},
	ESCALATEE_TYPE: {
		USER: 'user',
		DEVICE: 'device'
	},
	ESCALATION_STATUS: {
		COMPLETE: 'complete',
		ACTIVE: 'active',
		PENDING: 'pending'
	},
	CATEGORY_FILTER: ['conferencing'],
	COMMUNICATION_TYPE: {
		EMAIL: 'email',
		SMS: 'sms',
		VOICE: 'voice',
		TASK: 'task',
		SLACK: 'slack'
	},
	COMMUNICATION_STATUS: {
		SENT: 'sent',
		FAILED: 'failed',
	},
	COMMUNICATION_RESPONSE: {
		ACCEPTED: 'accepted',
		REJECTED: 'rejected',
		ACCEPTED_FROM_OTHER_DEVICE: 'accepted_from_other_device',
		REJECTED_FROM_OTHER_DEVICE: 'rejected_from_other_device',
		AUTO_ASSIGNED: 'auto_assigned',
		INVALID_RESPONSE: 'invalid_response'
	},
	COMMUNICATION_RESPONSE_TYPE: {
		ACCEPTED: 'accepted',
		REJECTED: 'rejected',
		INVALID: 'invalid',
		PARTIAL_REJECT: 'partial_reject',
		NO_ANSWER: 'no_answer'
	},

	isEscalationLogEnabled: function () {
		return gs.getProperty("com.snc.on_call_rotation.log_escalations", "true") == "true";
	},

	setCommunicationResponseByUser: function(userSysId, response, table, source, escalationSysId /*optional*/) {
		if (!userSysId)
			return;

		var communicationGr = new GlideRecord(this.TABLES.ON_CALL_ESCALATION_COMM);
		communicationGr.addQuery('contact_attempt.escalation_level.escalation.table', table);
		communicationGr.addQuery('contact_attempt.escalation_level.escalation.source', source);
		if (escalationSysId)
			communicationGr.addQuery('contact_attempt.escalation_level.escalation', escalationSysId);
		
		communicationGr.addQuery('escalatee_type', this.ESCALATEE_TYPE.USER);
		communicationGr.addQuery('user', userSysId);
		communicationGr.orderByDesc('contact_attempt.escalation_level.level');
		communicationGr.orderByDesc('contact_attempt.contact_attempt');
		communicationGr.setLimit(1);
		communicationGr.query();
		if (communicationGr.next() && !communicationGr.response) {
			communicationGr.setValue('response', response);
			communicationGr.setValue('responded_at', new GlideDateTime());			
			communicationGr.update();
			this._updateOtherCommunicationsOfEscalatee(communicationGr);
			this._propagateAcknowledgedAt(communicationGr);
		}
	},
	
	setCommunicationResponse: function (table, source, commType, commValue, response, escalationId /*optional*/) {
		if (!this.isEscalationLogEnabled())
			return this._getResultPayload();
		/**
		 * There can be multiple escalations running for a task with different groups
		 * STEP-1: Get all rota ids across escalations for a given task
		 * STEP-2: find communication record ordered by level and with in level ordered by attempt
		 * STEP-3: update response details of that communication record
		 * STEP-4: find other communications sent out to that escalatee in the same attempt and update the response to "accepted/rejected from other device"
		 */
		var rotas = this._getRotasOfEscalation(table, source, escalationId);
		for (var i = 0; i < rotas.length; i++) {
			var communicationGr = this._getCommunicationGr(table, source, rotas[i], commType, commValue, escalationId);
			if (communicationGr) {
				var respondedAt = new GlideDateTime();
				communicationGr.setValue('response', response);
				communicationGr.setValue('responded_at', respondedAt);
				communicationGr.update();
				this._updateOtherCommunicationsOfEscalatee(communicationGr);
				this._propagateAcknowledgedAt(communicationGr);
			}
		}
	},
	_propagateAcknowledgedAt: function (communicationGr) {
		var response = communicationGr.response;
		var attemptedAtGdt = communicationGr.attempted_at.getGlideObject();
		var respondedAtGdt = communicationGr.responded_at.getGlideObject();
		if (response != this.COMMUNICATION_RESPONSE.ACCEPTED && response != this.COMMUNICATION_RESPONSE.AUTO_ASSIGNED) {
			return;
		}
		communicationGr.setValue('acknowledged', true);
		communicationGr.update();
		var contactAttemptGr = communicationGr.contact_attempt.getRefRecord();
		contactAttemptGr.setValue('acknowledged', true);
		contactAttemptGr.setValue('acknowledged_at', respondedAtGdt);
		contactAttemptGr.setValue('time_to_acknowledge', this._getDuration(attemptedAtGdt, respondedAtGdt));
		contactAttemptGr.update();
		var escalationLevelGr = contactAttemptGr.escalation_level.getRefRecord();
		escalationLevelGr.setValue('acknowledged', true);
		escalationLevelGr.setValue('acknowledged_at', respondedAtGdt);
		escalationLevelGr.setValue('time_to_acknowledge', this._getDuration(escalationLevelGr.sys_created_on.getGlideObject(), respondedAtGdt));
		escalationLevelGr.update();
		var escalationGr = escalationLevelGr.escalation.getRefRecord();
		escalationGr.setValue('acknowledged_at', respondedAtGdt);
		escalationGr.setValue('time_to_acknowledge', this._getDuration(escalationGr.start_time.getGlideObject(), respondedAtGdt));
		escalationGr.setValue('acknowledged_comm', communicationGr.getUniqueValue());
		escalationGr.setValue('acknowledged', true);
		escalationGr.update();
	},
	_getDuration: function (startGdt, endGdt) {
		var startMillis = startGdt.getNumericValue();
		var endMillis = endGdt.getNumericValue();
		return new GlideDuration(endMillis - startMillis);
	},
	_getRotasOfEscalation: function (table, source, escalationId) {
		var rotas = [];
		var escalationLevelGr = new GlideAggregate(this.TABLES.ON_CALL_ESCALATION_LEVEL);
		escalationLevelGr.addQuery('escalation.table', table);
		escalationLevelGr.addQuery('escalation.source', source);
		escalationLevelGr.addQuery('escalation.active', true);
		if (escalationId)
			escalationLevelGr.addQuery('escalation', escalationId);
		escalationLevelGr.groupBy('rota');
		escalationLevelGr.query();
		while (escalationLevelGr.next()) {
			rotas.push(escalationLevelGr.rota + '');
		}
		return rotas;
	},
	_updateOtherCommunicationsOfEscalatee: function (respondedCommunicationGr) {
		var escalateeResponse = respondedCommunicationGr.response + '';
		if (escalateeResponse != this.COMMUNICATION_RESPONSE.ACCEPTED && escalateeResponse != this.COMMUNICATION_RESPONSE.REJECTED)
			return;		
		var communicationGr = new GlideRecord(this.TABLES.ON_CALL_ESCALATION_COMM);
		communicationGr.addQuery('sys_id', '!=', respondedCommunicationGr.getUniqueValue());
		communicationGr.addQuery('contact_attempt', respondedCommunicationGr.contact_attempt + '');
		var escalateeType = respondedCommunicationGr.escalatee_type + '';
		if (escalateeType == this.ESCALATEE_TYPE.USER) {
			communicationGr.addQuery('escalatee_type', this.ESCALATEE_TYPE.USER);
			communicationGr.addQuery('user', respondedCommunicationGr.user + '');
		}
		else if (escalateeType == this.ESCALATEE_TYPE.DEVICE) {
			communicationGr.addQuery('device', respondedCommunicationGr.device + '');
		}
		communicationGr.query();
		while (communicationGr.next()) {
			if (escalateeResponse == this.COMMUNICATION_RESPONSE.ACCEPTED) {
				communicationGr.setValue('response', this.COMMUNICATION_RESPONSE.ACCEPTED_FROM_OTHER_DEVICE);
			}
			else if (escalateeResponse == this.COMMUNICATION_RESPONSE.REJECTED) {
				communicationGr.setValue('response', this.COMMUNICATION_RESPONSE.REJECTED_FROM_OTHER_DEVICE);
			}
			communicationGr.update();
		}
	},
	_getCommunicationGr: function (table, source, rotaId, commType, commValue, escalationId) {
		var communicationGr = new GlideRecord(this.TABLES.ON_CALL_ESCALATION_COMM);
		communicationGr.addQuery('communication_type', commType);
		if (commType == this.COMMUNICATION_TYPE.EMAIL || commType == this.COMMUNICATION_TYPE.SLACK) {
			communicationGr.addQuery('email', commValue);
		}
		else if (commType == this.COMMUNICATION_TYPE.SMS || commType == this.COMMUNICATION_TYPE.VOICE) {
			communicationGr.addQuery('phone_number', commValue);
		}
		communicationGr.addQuery('contact_attempt.escalation_level.escalation.table', table);
		communicationGr.addQuery('contact_attempt.escalation_level.escalation.source', source);
		communicationGr.addQuery('contact_attempt.escalation_level.escalation.active', true);
		if (escalationId)
			communicationGr.addQuery('contact_attempt.escalation_level.escalation', escalationId);
		communicationGr.addQuery('contact_attempt.escalation_level.rota', rotaId);
		communicationGr.orderByDesc('contact_attempt.escalation_level.level');
		communicationGr.orderByDesc('contact_attempt.contact_attempt');
		communicationGr.setLimit(1);
		communicationGr.query();
		if (communicationGr.next())
			return communicationGr;
	},


	logEscalationStart: function (group, table, source, workflowDefinition, workflowContext, parentEscalationLevelId, category, channels, ignoreDefReminders) {

		if (!this.isEscalationLogEnabled())
			return this._getResultPayload();

		if (!group) {
			return this._getResultPayload(false, 'invalid group');
		}
		if (!table) {
			return this._getResultPayload(false, 'invalid table');
		}
		if (!source) {
			return this._getResultPayload(false, 'invalid source');
		}

		var escalationGr = this._createEscalation(group, table, source, workflowDefinition, workflowContext, parentEscalationLevelId, category, channels, ignoreDefReminders);
		this._populateAdditionalEscalation(escalationGr, parentEscalationLevelId);

		return this._getResultPayload(true, '', escalationGr);
	},

	_populateAdditionalEscalation: function (escalationGr, parentEscalationLevelId) {
		if (!escalationGr || !parentEscalationLevelId)
			return;

		var parentEscalationLevelGr = new GlideRecord(this.TABLES.ON_CALL_ESCALATION_LEVEL);
		if (parentEscalationLevelGr.get(parentEscalationLevelId)) {
			var additionalEscalations = parentEscalationLevelGr.additional_escalations + '';

			if (additionalEscalations)
				additionalEscalations += ',';
			additionalEscalations += escalationGr.getUniqueValue();

			parentEscalationLevelGr.setValue('additional_escalations', additionalEscalations);
			parentEscalationLevelGr.update();
		}
	},

	logEscalationEnd: function (escalationId) {
		if (!this.isEscalationLogEnabled())
			return this._getResultPayload();

		if (!escalationId)
			return this._getResultPayload(false, 'invalid escalationId');

		var gr = new GlideRecord(this.TABLES.ON_CALL_ESCALATION);
		if (gr.get(escalationId)) {
			if (gr.active == true) {
				gr.setValue('active', false);
				gr.setValue('end_time', new GlideDateTime());
				gr.update();
			}
			return this._getResultPayload(true, '', gr);
		}

		return this._getResultPayload(false, 'escalation not found');
	},

	logEscalationLevel: function (escalationId, rotaId, level, escalatee, catchAll) {
		if (!this.isEscalationLogEnabled())
			return this._getResultPayload();

		if (!escalationId)
			return this._getResultPayload(false, 'invalid escalationId');

		if (!rotaId)
			return this._getResultPayload(false, 'invalid rotaId');

		if (!level)
			return this._getResultPayload(false, 'invalid level');

		if (!escalatee)
			return this._getResultPayload(false, 'invalid escalatee object');

		var escalationGr = this._getEscalationGr(escalationId);
		if (!escalationGr)
			return this._getResultPayload(false, 'unable to find escalation');

		var escalationType = escalatee.escalationType;
		var rosterOrCustEscStep = this._getRosterOrStepRefFromEscalatee(escalatee);

		var escalationLevelGr = this._getEscalationLevelGr(escalationId, rotaId, level);

		if (!escalationLevelGr)
			escalationLevelGr = this._createEscalationLevel(escalationId, rotaId, level, escalationType, rosterOrCustEscStep, catchAll);

		if (escalationLevelGr)
			return this._getResultPayload(true, '', escalationLevelGr);

		return this._getResultPayload(false, 'unable to create escalation level');
	},

	logEscalationAttempt: function (escalationId, rotaId, level, contactAttempt) {
		if (!this.isEscalationLogEnabled())
			return this._getResultPayload();

		if (!escalationId)
			return this._getResultPayload(false, 'invalid escalationId');

		if (!rotaId)
			return this._getResultPayload(false, 'invalid rotaId');

		if (!level)
			return this._getResultPayload(false, 'invalid level');

		if (!contactAttempt)
			return this._getResultPayload(false, 'invalid contactAttempt');

		var escalationGr = this._getEscalationGr(escalationId);
		if (!escalationGr)
			return this._getResultPayload(false, 'unable to find escalation');

		var escalationLevelGr = this._getEscalationLevelGr(escalationId, rotaId, level);
		if (!escalationLevelGr)
			return this._getResultPayload(false, 'unable to find escalation level');

		var contactAttemptGr = this._getContactAttemptGr(escalationLevelGr.getUniqueValue(), contactAttempt);

		if (!contactAttemptGr)
			contactAttemptGr = this._createContactAttempt(escalationLevelGr.getUniqueValue(), contactAttempt);

		if (contactAttemptGr)
			return this._getResultPayload(true, '', contactAttemptGr);

		return this._getResultPayload(false, 'unable to create escalation attempt');
	},

	_getRosterOrStepRefFromEscalatee: function (escalatee) {
		var escalationType = escalatee.escalationType;

		if (escalationType === this.ESCALATION_TYPE.ROTATE_THROUGH_ROSTER || escalationType === this.ESCALATION_TYPE.ROTATE_THROUGH_MEMBER) {

			return escalatee.rosterId;
		}
		else if (escalationType === this.ESCALATION_TYPE.CUSTOM) {
			return escalatee.cmnRotaEscStepDefId;
		}
	},

	logEscalationCommunication: function (escalationId, rotaId, level, contactAttempt, escalateeType, escalateeId, commType, commValue, status, escalatee, catchAll) {
		if (!this.isEscalationLogEnabled())
			return this._getResultPayload();

		if (!escalationId)
			return this._getResultPayload(false, 'invalid escalationId');

		if (!rotaId)
			return this._getResultPayload(false, 'invalid rotaId');

		if (!level)
			return this._getResultPayload(false, 'invalid level');

		if (!contactAttempt)
			return this._getResultPayload(false, 'invalid contactAttempt');

		if (!escalateeType)
			return this._getResultPayload(false, 'invalid escalateeType');

		if (!escalateeId)
			return this._getResultPayload(false, 'invalid escalateeId');

		if (!commType)
			return this._getResultPayload(false, 'invalid commType');

		if (!escalatee)
			return this._getResultPayload(false, 'invalid escalatee object');

		var escalationGr = this._getEscalationGr(escalationId);
		if (!escalationGr)
			return this._getResultPayload(false, 'unable to find escalation');

		var escalationLevelGr = this._getEscalationLevelGr(escalationId, rotaId, level);
		if (!escalationLevelGr) {
			var escalationType = escalatee.escalationType;
			var rosterOrCustEscStep = this._getRosterOrStepRefFromEscalatee(escalatee);

			escalationLevelGr = this._createEscalationLevel(escalationId, rotaId, level, escalationType, rosterOrCustEscStep, catchAll);
		}

		var contactAttemptGr = this._getContactAttemptGr(escalationLevelGr.getUniqueValue(), contactAttempt);
		if (!contactAttemptGr) {
			contactAttemptGr = this._createContactAttempt(escalationLevelGr.getUniqueValue(), contactAttempt);
		}

		var communicationGr = this._createCommunicationDetails(contactAttemptGr.getUniqueValue(), escalateeType, commType, escalateeId, commValue, status);
		if (communicationGr)
			return this._getResultPayload(true, '', communicationGr);

		return this._getResultPayload(false, 'unable to create communication');
	},

	_getResultPayload: function (success, errMsg, logGr) {
		var escalationLogEnabled = this.isEscalationLogEnabled();
		var result = {
			escalationLogEnabled: escalationLogEnabled
		};

		if (!escalationLogEnabled) {
			result.msg = 'Escalation log is not enabled';
			return result
		}

		result.success = success;
		if (success) {
			result.logGr = logGr;
		}
		else {
			result.error = {
				msg: errMsg
			}
		}

		return result;
	},

	_getEscalationGr: function (escalationId) {
		if (!escalationId)
			return;

		var gr = new GlideRecord(this.TABLES.ON_CALL_ESCALATION);
		if (gr.get(escalationId))
			return gr;
	},

	_getEscalationLevelGr: function (escalationId, rotaId, level) {
		if (!escalationId || !rotaId || !level)
			return;

		var gr = new GlideRecord(this.TABLES.ON_CALL_ESCALATION_LEVEL);
		gr.addQuery('escalation', escalationId);
		gr.addQuery('rota', rotaId);
		gr.addQuery('level', level);
		gr.query();

		if (gr.next())
			return gr;
	},

	_getContactAttemptGr: function (escalationLevelId, contactAttempt) {
		if (!escalationLevelId || !contactAttempt)
			return;

		var gr = new GlideRecord(this.TABLES.ON_CALL_ESCALATION_CON_ATTEMPT);
		gr.addQuery('escalation_level', escalationLevelId);
		gr.addQuery('contact_attempt', contactAttempt);
		gr.query();

		if (gr.next())
			return gr;
	},

	_createEscalation: function (groupId, tableName, sourceId, wfDefinition, wfContext, parentEscalationLevelId, category, channels, ignoreDefReminders) {
		var startTime = new GlideDateTime();

		var gr = new GlideRecord(this.TABLES.ON_CALL_ESCALATION);
		gr.initialize();

		gr.setValue('table', tableName);
		gr.setValue('source', sourceId);
		gr.setValue('group', groupId);
		gr.setValue('workflow_definition', wfDefinition);
		gr.setValue('workflow_context', wfContext);
		gr.setValue('start_time', startTime);
		gr.setValue('parent_escalation_level', parentEscalationLevelId);
		gr.setValue('category', category);
		gr.setValue('channels', channels);
		if (ignoreDefReminders)
			gr.setValue('ignore_def_reminders', true);
		
		if (gr.insert())
			return gr;
	},

	_createEscalationLevel: function (escId, shiftId, escLevel, escType, rosterOrCustEscStep, catchAll) {
		var gr = new GlideRecord(this.TABLES.ON_CALL_ESCALATION_LEVEL);
		gr.initialize();

		gr.setValue('rota', shiftId);
		gr.setValue('level', escLevel);
		gr.setValue('escalation', escId);
		gr.setValue('escalation_type', escType);
		if (catchAll) {
			gr.setValue('catch_all', true);
		}
		else {
			if (escType == this.ESCALATION_TYPE.ROTATE_THROUGH_ROSTER || escType == this.ESCALATION_TYPE.ROTATE_THROUGH_MEMBER) {
				gr.setValue('roster', rosterOrCustEscStep);
			}
			else if (escType == this.ESCALATION_TYPE.CUSTOM) {
				gr.setValue('custom_escalation_step', rosterOrCustEscStep);
			}
		}

		if (gr.insert())
			return gr;
	},

	_createContactAttempt: function (escLevelSysId, attempt) {
		var gr = new GlideRecord(this.TABLES.ON_CALL_ESCALATION_CON_ATTEMPT);
		gr.initialize();

		gr.setValue('escalation_level', escLevelSysId);
		gr.setValue('contact_attempt', attempt);

		if (gr.insert())
			return gr;
	},

	_getUserByDevice: function (deviceId) {
		if (!deviceId)
			return;

		var deviceGr = new GlideRecord(this.TABLES.CMN_NOTIF_DEVICE);
		if (deviceGr.get(deviceId))
			return deviceGr.user + '';
	},

	_createCommunicationDetails: function (attemptId, escltType, commType, escalateeId, commValue, status, attemptedAt) {
		attemptedAt = attemptedAt || new GlideDateTime();
		status = status || this.COMMUNICATION_STATUS.SENT;
		commValue = commValue || '';

		var gr = new GlideRecord(this.TABLES.ON_CALL_ESCALATION_COMM);
		gr.initialize();

		gr.setValue('escalatee_type', escltType);
		gr.setValue('contact_attempt', attemptId);
		if (escltType == this.ESCALATEE_TYPE.USER)
			gr.setValue('user', escalateeId);
		else if (escltType == this.ESCALATEE_TYPE.DEVICE) {
			gr.setValue('device', escalateeId);
			var user = this._getUserByDevice(escalateeId);
			if (escalateeId)
				gr.setValue('user', user);
		}

		gr.setValue('communication_type', commType);
		if (commType == this.COMMUNICATION_TYPE.SMS || commType == this.COMMUNICATION_TYPE.VOICE)
			gr.setValue('phone_number', commValue);
		else if (commType == this.COMMUNICATION_TYPE.EMAIL || commType == this.COMMUNICATION_TYPE.SLACK)
			gr.setValue('email', commValue);

		gr.setValue('status', status);
		gr.setValue('attempted_at', attemptedAt);

		if (gr.insert())
			return gr;
	},

	/* override */
	getCommResponseChoices: function() {
		return this.oncallCommon.getChoiceList(this.TABLES.ON_CALL_ESCALATION_COMM, 'response');
	},

	/* override */
	getAcceptedResponseChoices: function() {
		var self = this;
		return this.getCommResponseChoices().filter(function(choice) {
			return (choice.value === self.COMMUNICATION_RESPONSE.ACCEPTED ||
					choice.value === self.COMMUNICATION_RESPONSE.ACCEPTED_FROM_OTHER_DEVICE ||
					choice.value === self.COMMUNICATION_RESPONSE.AUTO_ASSIGNED
					);
		});
	},

	/* override */
	getRejectedResponseChoices: function() {
		var self = this;
		return this.getCommResponseChoices().filter(function(choice) {
			return (choice.value === self.COMMUNICATION_RESPONSE.REJECTED ||
					choice.value === self.COMMUNICATION_RESPONSE.REJECTED_FROM_OTHER_DEVICE ||
					choice.value === self.COMMUNICATION_RESPONSE.INVALID_RESPONSE
					);
		});
	},

	_getResponseType: function(responseValue) {
		if(this.getAcceptedResponseChoices().some(function(choice) {
			return choice.value === responseValue;
			}))
			return 'accepted';

		if (this.getRejectedResponseChoices().some(function(choice) {
			return choice.value === responseValue;
			}))
			return 'rejected';

		return 'invalid';
	},

	hasEscalations: function(sourceGr) {
		if (!sourceGr || !sourceGr.isValidRecord())
			return false;

		var escalationGr = new GlideRecord(this.TABLES.ON_CALL_ESCALATION);
		escalationGr.addQuery('source', sourceGr.getUniqueValue());
		escalationGr.addQuery('table', sourceGr.getRecordClassName());
		escalationGr.query();

		while(escalationGr.next()) {
			if (escalationGr.canRead())
				return true;
		}
		return false;
	},

	getEscalations: function (source, table, groupSysId, filterQuery) {
		if (!source || !table)
			return [];
		
		var escalations = [];
		var escalationGr = new GlideRecord(this.TABLES.ON_CALL_ESCALATION);
		escalationGr.addQuery("table", table);
		escalationGr.addQuery("source", source);
		escalationGr.orderByDesc("start_time");
		
		if (filterQuery)
			escalationGr.addEncodedQuery(filterQuery);
		
		if (groupSysId)
			escalationGr.addQuery("group", groupSysId);

		escalationGr.query();
		while (escalationGr.next()) {
			var escalation = this._getEscalationDetails(escalationGr);
			if (escalation)
				escalations.push(escalation);
		}
		return escalations;
	},

	getEscalationById: function (escalationSysId) {
		return this._getEscalationDetails(this._getEscalationGr(escalationSysId));
	},

	_getEscalationDetails: function (escalationGr) {
		if (!escalationGr || !escalationGr.isValidRecord())
			return {};

		var escalation = this.oncallCommon.toJS(escalationGr, ["start_time", "end_time", "category"]);
		if (escalationGr.active)
			escalation.active = true;
		
		escalation.channels = escalationGr.channels.split(",");
		escalation.group = this._getGroupDetails(escalationGr);
		escalation.shifts = this._getShiftDetails(escalationGr);

		return escalation;
	},

	_getGroupDetails: function (escalationGr) {
		var groupGr = escalationGr.group.getRefRecord();
		if (!groupGr.isValidRecord())
			return {};

		var result = {};
		result = this.oncallCommon.toJS(groupGr, ["name", "description"]);
		result.initials = this._getNameInitials(result.name.value);
		var aggregateMembers = new GlideAggregate("sys_user_grmember");
		aggregateMembers.addAggregate("COUNT");
		aggregateMembers.addQuery("group", groupGr.getUniqueValue());
		aggregateMembers.addQuery("user.active", true);
		aggregateMembers.query();
		var members = 0;
		if (aggregateMembers.next())
			members = aggregateMembers.getAggregate("COUNT");

		result.groupMembersCount = members;
		var managerGr = groupGr.manager.getRefRecord();
		if (managerGr.isValidRecord()) {
			var manager = GlideUser.getUserByID(managerGr.getUniqueValue());
			result.manager = {
				avatar: manager.getAvatar() || "",
				initials: manager.getInitials() || "",
				name: manager.getFullName() || "",
				title: manager.getTitle() || "",
				value: managerGr.getUniqueValue()
			};
		}
		return result;
	},

	_getShiftDetails: function (escalationGr) {
		var shifts = [];
		var escalationLevelGa = new GlideAggregate(this.TABLES.ON_CALL_ESCALATION_LEVEL);
		escalationLevelGa.addQuery("escalation", escalationGr.getUniqueValue());
		escalationLevelGa.addAggregate("count", "rota");
		escalationLevelGa.groupBy("rota");
		escalationLevelGa.query();

		while (escalationLevelGa.next()) {
			var shiftGr = escalationLevelGa.rota.getRefRecord();
			var shift = this.oncallCommon.toJS(shiftGr, ["name", "active"], true);
			var result = this._getEscalationLevels(escalationGr, shiftGr);
			if (result.escalation_set) {
				shift.escalation_set = result.escalation_set;
				shift.is_custom_escalation = true;
			}
			shift.escalation_levels = result.levels;
			shifts.push(shift);
		}
		return shifts;
	},

	_getEscalationLevels: function (escalationGr, shiftGr) {
		var result = { levels: [] };
		var escalationLevelGr = new GlideRecord(this.TABLES.ON_CALL_ESCALATION_LEVEL);
		escalationLevelGr.addQuery("escalation", escalationGr.getUniqueValue());
		escalationLevelGr.addQuery("rota", shiftGr.getUniqueValue());
		escalationLevelGr.orderBy('level');
		escalationLevelGr.query();
		
		while (escalationLevelGr.next()) {
			var fields = ["escalation_type", "sys_created_on"];
			if (escalationLevelGr.roster)
				fields.push("roster");

			if (escalationLevelGr.custom_escalation_step) {
				fields.push("custom_escalation_step");
				var escalationStepGr = escalationLevelGr.custom_escalation_step.getRefRecord();
				var escalationSetGr = escalationStepGr.escalation_set.getRefRecord();
				result.escalation_set = this.oncallCommon.toJS(escalationSetGr, ["name", "condition", "description", "default", "active", "table"], true);
			}
			var escalationLevel = this.oncallCommon.toJS(escalationLevelGr, fields);
			escalationLevel.escalation_level = parseInt(escalationLevelGr.level);
			if (escalationLevelGr.catch_all)
				escalationLevel.catch_all = true;

            escalationLevel.status = this.ESCALATION_STATUS.COMPLETE;

            var attemptDetails = this._getContactAttempts(escalationLevelGr, escalationLevel);
            escalationLevel.contact_attempts = attemptDetails.attempts;
			
            // Set escalation level response type
            escalationLevel.response_type = this._getEscalationLevelResponseType(escalationLevel);
			
            if (attemptDetails.acknowledged) {
                escalationLevel.acknowledged = attemptDetails.acknowledged;				
            }
			
            escalationLevel.roster_details = this.getRosterDetails(escalationLevelGr, escalationLevel, this.ESCALATION_STATUS.COMPLETE);
			if (escalationLevelGr.additional_escalations)
				escalationLevel.additional_escalations = this._getAdditonalEscalations(escalationLevelGr.additional_escalations + '');

			result.levels.push(escalationLevel);
			
		}

		// Set total completion time of all levels
		this.setEscalationLevelsDuration(result.levels, escalationGr);

		// If live escalation, process pending levels from escalation plan
		if (escalationGr.active) {
			var activeLevel = result.levels[result.levels.length - 1];
			activeLevel.status = this.ESCALATION_STATUS.ACTIVE;
			this.setContactAttemptStatus(activeLevel, this.ESCALATION_STATUS.ACTIVE);

			result.levels = result.levels.concat(this.getPendingLevels(activeLevel, escalationGr, shiftGr, result.escalation_set ? result.escalation_set.sys_id.value : ''));
			
			// Handle for overlapping shifts scenario
			if (activeLevel.shift_completed) {
				activeLevel.status = this.ESCALATION_STATUS.COMPLETE;
				this.setContactAttemptStatus(activeLevel, this.ESCALATION_STATUS.COMPLETE);
			}
		}
		return result;
	},

	_ignoreETA: function(escalationGr) {
		return escalationGr.ignore_def_reminders;
	},
	
	/*
	 * return value in seconds
	*/
	getCatchAllWaitTime: function(shiftGr) {
		if (shiftGr.catch_all_wait_time) {
			return shiftGr.catch_all_wait_time.getGlideObject().getNumericValue() / 1000;
		}
		return parseInt(gs.getProperty("com.snc.on_call_rotation.catch_all_wait_time") || 0);
	},
	
	_getAdditonalEscalations: function(escalationSysIds) {
		var escalations = escalationSysIds.split(',');
		var escalationGr = new GlideRecord(this.TABLES.ON_CALL_ESCALATION);
		var result = [];
		escalations.forEach(function(sysId) {
			escalationGr.initialize();
			escalationGr.get(sysId);
			result.push({ escalation_id: sysId, group: this._getGroupDetails(escalationGr) });
		}, this);
		return result;
	},

    setContactAttemptStatus: function(escalationLevel, status) {
		if (escalationLevel && escalationLevel.contact_attempts && escalationLevel.contact_attempts.length > 0) {
			escalationLevel.contact_attempts.sort(function(attempt1, attempt2) {
				return parseInt(attempt1.contact_attempt) - parseInt(attempt2.contact_attempt);
			});
			escalationLevel.contact_attempts[escalationLevel.contact_attempts.length - 1].status = status;
		}
    },

    getPendingLevels: function(activeLevel, escalationGr, shiftGr, escalationSetSysId) {
		var pendingLevels = [];
		var escalationStartGdt = new GlideDateTime(escalationGr.start_time);
		var rotaPath = new global.OCEscalationPathUtil().getOnCallEscalationShift(escalationGr.group + '', shiftGr.getUniqueValue(), escalationStartGdt, escalationSetSysId, escalationGr.table + '', escalationGr.source + '');

		var ignoreETA = this._ignoreETA(escalationGr);
		var escalationPlan;
		if (escalationSetSysId) {
			escalationPlan = this.oncallRotation.getEscalationPlanByEscalationSet(escalationSetSysId, escalationGr.group + '', shiftGr.getUniqueValue(), escalationStartGdt);
		} else {
			escalationPlan = this.oncallRotation.getEscalationPlan(escalationGr.group + '', escalationStartGdt, shiftGr.getUniqueValue(), escalationGr.source.getRefRecord());
		}
		
		if (rotaPath && rotaPath.escalationDetails && rotaPath.escalationDetails.data) {
			rotaPath.escalationDetails.data.sort(function(step1, step2) {
				return step1.level - step2.level;
			});
			var prevLevel = {};
			rotaPath.escalationDetails.data.forEach(function(step) {
				var pendingLevel = {};
				if (parseInt(activeLevel.escalation_level) == parseInt(step.level)) {
					this._setPendingNotifications(activeLevel, step.rosterDetails, '', ignoreETA, shiftGr);
					activeLevel.pending_preferences = this.getPendingLevelPreferences(activeLevel, escalationGr, shiftGr, escalationSetSysId, escalationPlan, ignoreETA);
					activeLevel.escAudiences = step.escAudiences;
					prevLevel = activeLevel;
				}
				if (parseInt(activeLevel.escalation_level) < parseInt(step.level)) {
					pendingLevel.escalation_level = step.level;
					pendingLevel.escAudiences = step.escAudiences;
					pendingLevel.status = this.ESCALATION_STATUS.PENDING;
					this._setPendingNotifications(pendingLevel, step.rosterDetails, prevLevel.last_contact_at, ignoreETA, shiftGr);
					pendingLevel.pending_preferences = this.getPendingLevelPreferences(pendingLevel, escalationGr, shiftGr, escalationSetSysId, escalationPlan, ignoreETA);
					prevLevel = pendingLevel;
					pendingLevels.push(pendingLevel);
				}
			}, this);
		}
		return pendingLevels;
    },

	_setPendingNotifications: function(escalationLevel, rosterDetails, lastContactedAt, ignoreETA, shiftGr) {
		if (!escalationLevel || !rosterDetails)
			return;

		var repeats = [];
		var lastReminderIndex = 0, lastReminder = {};
		var tempGdt = new GlideDateTime();

		if (escalationLevel.status == this.ESCALATION_STATUS.ACTIVE)
			tempGdt.setDisplayValueInternal(escalationLevel.sys_created_on.display_value_internal);

		if (escalationLevel.status == this.ESCALATION_STATUS.PENDING && lastContactedAt)
			tempGdt.setDisplayValueInternal(lastContactedAt.display_value_internal);

		escalationLevel.roster_details = JSON.parse(JSON.stringify(rosterDetails));  //deep copy
		
		// Handle for catch-all
		if (rosterDetails.catch_all) {
			if (escalationLevel.status === this.ESCALATION_STATUS.PENDING) {
				escalationLevel.catch_all = true;
				escalationLevel.roster_details.notifications = { repeats: []};
				var catchAllNotif = {};
				if (ignoreETA) {
					catchAllNotif.message = gs.getMessage("Escalation - Pending");
				} else {
					catchAllNotif.message = gs.getMessage("Escalation ETA - {0}", tempGdt.getDisplayValue());
					catchAllNotif.contact_eta = this.getDateTimeJS(tempGdt);
				}
				catchAllNotif.status = this.ESCALATION_STATUS.PENDING;
				catchAllNotif.is_attempt = true;
				escalationLevel.roster_details.notifications.repeats.push(catchAllNotif);
				return;
			} else {
				escalationLevel.roster_details.notifications = {};
				rosterDetails.isLastStep = true;
			}
		}
		
		if (rosterDetails.notifications.escalated_at)
			escalationLevel.roster_details.notifications.escalated_at = escalationLevel.sys_created_on;

		if (rosterDetails.notifications.overallTimeSec)
			escalationLevel.step_time_sec = rosterDetails.notifications.overallTimeSec;

		// Add overall time info for pending step
		if(escalationLevel.status == this.ESCALATION_STATUS.PENDING) {
			if (rosterDetails.notifications.overallTime) {
				var escalationNotif = {};
				escalationNotif.status = this.ESCALATION_STATUS.PENDING;
				escalationNotif.is_attempt = true;
				if (ignoreETA) {
					escalationNotif.message = gs.getMessage("Escalation - Pending");
				} else {
					escalationNotif.message = gs.getMessage("Escalation ETA - {0}", tempGdt.getDisplayValue());
					escalationNotif.contact_eta = this.getDateTimeJS(tempGdt);
				}
				repeats.push(escalationNotif);
			}
		}
		// Add completed reminders for active step
		if (escalationLevel.status == this.ESCALATION_STATUS.ACTIVE) {
			repeats = this._getCompletedReminders(escalationLevel);
			if (repeats.length > 0) {
				lastReminderIndex = repeats.length - 1;
				lastReminder = repeats[lastReminderIndex];
				tempGdt.setDisplayValueInternal(lastReminder.contacted_at.display_value_internal);
				escalationLevel.last_contact_at = lastReminder.contacted_at;
				lastReminder.status = this.ESCALATION_STATUS.ACTIVE;
			}
		}
		// Add Pending reminders for active/pending steps
		if (rosterDetails.notifications.repeats) {
			rosterDetails.notifications.repeats.forEach(function(reminder, index) {
				var notification = {
					status: this.ESCALATION_STATUS.PENDING
				};
				if (escalationLevel.status == this.ESCALATION_STATUS.PENDING || (escalationLevel.status == this.ESCALATION_STATUS.ACTIVE && index >= lastReminderIndex)) {
					tempGdt.addSeconds(parseInt(reminder.seconds));
					if (ignoreETA)
						notification.message = gs.getMessage("Reminder {0}", (index + 1) + "");
					else
						notification.message = gs.getMessage("Reminder {0} - {1}", [(index + 1) + "", tempGdt.getDisplayValue()]);
					
					notification.seconds = reminder.seconds;
					notification.is_attempt = true;
					notification.contact_eta = this.getDateTimeJS(tempGdt);
					escalationLevel.last_contact_at = this.getDateTimeJS(tempGdt);
					repeats.push(notification);
				}
			}, this);
		}
		// Next escalation time
		if (rosterDetails.gapBetweenSteps && rosterDetails.gapBetweenStepsSec && !ignoreETA) {
			var nextEscalationInfo = {
				status: this.ESCALATION_STATUS.PENDING,
				message: rosterDetails.gapBetweenSteps,
				is_attempt: false
			};
			if (tempGdt && tempGdt.isValid()) {
				tempGdt.addSeconds(parseInt(rosterDetails.gapBetweenStepsSec));
				nextEscalationInfo.message = gs.getMessage("Next escalation - {0}", tempGdt.getDisplayValue());
				nextEscalationInfo.contact_eta = this.getDateTimeJS(tempGdt);
				escalationLevel.last_contact_at = this.getDateTimeJS(tempGdt);
				
				if (rosterDetails.isLastStep) {
					nextEscalationInfo.message = gs.getMessage("Escalation ends at {0}", tempGdt.getDisplayValue());
					nextEscalationInfo.end = true;
					escalationLevel.timer_message = gs.getMessage("Time until end of escalation");
				}
			}
			repeats.push(nextEscalationInfo);
		}
		// Update timer
		if (!ignoreETA) {
			if (rosterDetails.catch_all)
				tempGdt.add(this.getCatchAllWaitTime(shiftGr) * 1000);

			escalationLevel.timer = this.getDateTimeJS(tempGdt);
			if (!escalationLevel.timer_message) {
				if (!rosterDetails.isLastStep)
					escalationLevel.timer_message = gs.getMessage("Time until next escalation");
				else
					escalationLevel.timer_message = gs.getMessage("Time until end of escalation");
			}
		}
		
		// Check if shift is completed - overlapping shift scenario	
		if (escalationLevel.status === this.ESCALATION_STATUS.ACTIVE && rosterDetails.isLastStep &&  !ignoreETA) {				
				var lastNotification = repeats[repeats.length - 1];
				var timeGdt;
				if (lastNotification.contact_eta) // when waiting for next step 
					timeGdt = new GlideDateTime(lastNotification.contact_eta.value);
				else if (lastNotification.contacted_on) // when last reminder sent and no time_to_next_step
					timeGdt = new GlideDateTime(lastNotification.contacted_at.value);
				if (timeGdt && new GlideDateTime().compareTo(timeGdt) == 1) { // timeGdt has elapsed
					escalationLevel.shift_completed = true;
					lastNotification.status = this.ESCALATION_STATUS.COMPLETE;
				}
			
		}
		
		escalationLevel.roster_details.notifications.repeats = repeats;
	},

    getPendingLevelPreferences: function(escalationLevel, escalationGr, shiftGr, escalationSetSysId, escalationPlan, ignoreETA) {
		if (!escalationLevel || !shiftGr)
			return [];

		var contactPreferences = [];
		var supportedChannels = escalationGr.channels.split(",");
		
		// Handle catch-all scenario
		if (escalationLevel.catch_all) {
			var catchAllStartGdt = new GlideDateTime();
			if (escalationLevel.contact_eta)
				catchAllStartGdt.setDisplayValueInternal(escalationLevel.contact_eta.display_value_internal);

			contactPreferences = this.contactPrefUtil.getCatchAllContacts(shiftGr.getUniqueValue(), catchAllStartGdt);
			
			contactPreferences.forEach(function(pref) {
				if (!ignoreETA)
					pref.fetch_time = catchAllStartGdt.getDisplayValue();
				
				pref.contact_preferences = pref.contact_preferences.filter(function(cp) {
					return supportedChannels.indexOf(cp.type) > -1;
				});
				pref.user_preferences = pref.user_preferences.filter(function(cp) {
					return supportedChannels.indexOf(cp.type) > -1;
				});
			});
			return contactPreferences;
		}
		
		var escalatee;
		if (escalationPlan)
			escalatee = escalationPlan[escalationLevel.escalation_level - 1];

		var contactAttempt = 1;
		if (escalationLevel.roster_details && escalationLevel.roster_details.notifications && escalationLevel.roster_details.notifications.repeats) {
			escalationLevel.roster_details.notifications.repeats.forEach(function(attempt, index) {
				if (attempt.status == this.ESCALATION_STATUS.PENDING && attempt.is_attempt) {
					var startGdt;
					if (attempt.contact_eta) {
						startGdt = new GlideDateTime(attempt.contact_eta.value);
					}
					var preferences = this.contactPrefUtil.getPreferencesByContactAttempt(escalationGr.group + '', escalationLevel.escalation_level, startGdt, shiftGr.getUniqueValue(), escalationSetSysId, escalationGr.table + '', escalationGr.source + '', index+1, escalatee);
	
					if (preferences) {
						preferences.forEach(function(pref) {
							// Filter contact preferences based on supported channels
							pref.contact_preferences = pref.contact_preferences.filter(function(cp) {
								return supportedChannels.indexOf(cp.type) > -1;
							});
							
							// Fetch user preferences
							if (pref.type === this.ESCALATEE_TYPE.USER) {
								var userPrefs = this.contactPrefUtil.getUserPreferences(pref.sys_id, index + 1, startGdt);
								if (userPrefs.length > 0)
									pref.user_preferences = pref.user_preferences.concat(userPrefs);
							}
							
							// Filter user preferences based on supported channels
							pref.user_preferences = pref.user_preferences.filter(function(up) {
								return supportedChannels.indexOf(up.type) > -1;
							});
							
							// Fetch default preferences if no preference found
							if (pref.contact_preferences.length == 0 && pref.user_preferences.length === 0) {
								pref.user_preferences = pref.user_preferences.concat(this.contactPrefUtil._getDefaultEscalateePreferences(pref.sys_id, supportedChannels));
							}
							
							if (!ignoreETA)
								pref.fetch_time = attempt.contact_eta.display_value;
						}, this);
					}

					contactPreferences = contactPreferences.concat(preferences);
				}
			}, this);
		}
		return contactPreferences;
    },
	
	setEscalationLevelsDuration: function(levels, escalationGr) {
		if (!levels || levels.length === 0)
			return;

		for (var i = 0; i < levels.length - 1; i++)
			if (levels[i].sys_created_on && levels[i + 1].sys_created_on)
				levels[i].total_time = this.getDuration(levels[i].sys_created_on.value, levels[i + 1].sys_created_on.value);

		// Calculate duration for the last escalation level if past escalation
		var lastLevel = levels[levels.length - 1];
		if (!escalationGr.active) {
			if (lastLevel.acknowledged && lastLevel.acknowledged.at)
				lastLevel.total_time = this.getDuration(lastLevel.sys_created_on.value, lastLevel.acknowledged.at.value);
			else if (escalationGr.end_time) {
				lastLevel.total_time = this.getDuration(lastLevel.sys_created_on.value, escalationGr.end_time.getGlideObject().getValue());
			}
		}
	},

	getDuration: function(start, end) {
        var gdtStart = new GlideDateTime(start);
        var gdtEnd = new GlideDateTime(end);
        var duration = GlideDateTime.subtract(gdtStart, gdtEnd);
        return duration.getDisplayValue();
    },

	getDateTimeJS: function(gdt) {
		var dateTime = {};
		if (gdt && gdt.isValid()) {
			dateTime.value = gdt.getValue();
			dateTime.display_value = gdt.getDisplayValue();
			dateTime.display_value_internal = gdt.getDisplayValueInternal();
		}
		return dateTime;
	},

	getRosterDetails: function(escalationLevelGr, escalationLevelJS, escalationStatus) {
		if (!escalationLevelGr.isValidRecord())
			return {};

		var result = {
			name: "",
			notifications: {
				repeats: []
			}
		};
		// Add roster name
		if (!escalationLevelJS.roster_details && escalationLevelGr && escalationLevelGr.isValidRecord())
			if (escalationLevelGr.escalation_type == this.ESCALATION_TYPE.CUSTOM && escalationLevelGr.custom_escalation_step) {
				result.name = escalationLevelGr.custom_escalation_step.getRefRecord().name;
			} else {
				if (escalationLevelGr.catch_all)
					result.name = gs.getMessage('Catch All');
				else
					if (escalationLevelGr.roster)
						result.name = escalationLevelGr.roster.getRefRecord().getDisplayValue();
			}
		// Add notification details
		if (escalationStatus == this.ESCALATION_STATUS.COMPLETE && escalationLevelJS) {
			result.notifications.escalated_at = escalationLevelJS.sys_created_on;
			if (escalationLevelJS.acknowledged)
					result.notifications.acknowledged = escalationLevelJS.acknowledged;

			// Add reminder details
			result.notifications.repeats = this._getCompletedReminders(escalationLevelJS);
		}
		return result;
	},

	_getCompletedReminders: function(escalationLevel) {
		var reminders = [];
		// Add reminder details
			if (escalationLevel && escalationLevel.contact_attempts && escalationLevel.contact_attempts.length > 0) {
				escalationLevel.contact_attempts.forEach(function(attempt, index) {
					var prefix = gs.getMessage("Reminder {0} - ", index);
					if (index == 0)
						prefix = gs.getMessage("Escalated at ");

					if (attempt.first_contacted_at && !attempt.acknowledged)
						reminders.push({status: this.ESCALATION_STATUS.COMPLETE, message: gs.getMessage("{0} {1}", [prefix, attempt.first_contacted_at.display_value]), contacted_at: attempt.first_contacted_at});

					if (attempt.acknowledged && attempt.acknowledged.at) {
						var ack = {};
						ack.status = this.ESCALATION_STATUS.COMPLETE;
						ack.contacted_at = attempt.acknowledged.at;
						ack.response_type = attempt.response_type;
						
						switch(attempt.response_type) {
							case this.COMMUNICATION_RESPONSE_TYPE.ACCEPTED:
													prefix = "Accepted at ";
													break;
							case this.COMMUNICATION_RESPONSE_TYPE.REJECTED:
													prefix = "Rejected at ";
													break;
							case this.COMMUNICATION_RESPONSE_TYPE.PARTIAL_REJECT:
													break;
							default:
								prefix = 'Acknowledged with invalid response at ';
								ack.response_type = this.COMMUNICATION_RESPONSE_TYPE.INVALID;
						}
						ack.message = gs.getMessage("{0} {1}", [prefix, attempt.acknowledged.at.display_value]);
						reminders.push(ack);
					}
				}, this);
			}
		return reminders;
	},

	/*
	*  no_answer, accepted, rejected
	*/
	_getEscalationLevelResponseType: function(escalationlevel) {
		if (!escalationlevel || !escalationlevel.contact_attempts)
			return '';

		var responseType = this.COMMUNICATION_RESPONSE_TYPE.NO_ANSWER;
		escalationlevel.contact_attempts.forEach(function(attempt) {
		if (attempt.response_type) {
			if (attempt.response_type === this.COMMUNICATION_RESPONSE_TYPE.REJECTED)
				responseType = this.COMMUNICATION_RESPONSE_TYPE.REJECTED;
			else 
				if (attempt.response_type === this.COMMUNICATION_RESPONSE_TYPE.ACCEPTED)
					responseType = this.COMMUNICATION_RESPONSE_TYPE.ACCEPTED;
			}
		}, this);
		return responseType;
	},
		
	/*
	*  no_answer, accepted, rejected, partial_reject
	*/
	_getAttemptResponseType: function(attempt) {
		var responseType = this.COMMUNICATION_RESPONSE_TYPE.NO_ANSWER;
		if (!attempt || !attempt.acknowledged || !attempt.communications.length === 0)
			return responseType;
		
		var escalateeCount = attempt.escalatee_count || 0;			
		if (attempt.rejected_count && attempt.rejected_count > 0) {
			if (attempt.rejected_count === escalateeCount)
				responseType = this.COMMUNICATION_RESPONSE_TYPE.REJECTED;
			else
				responseType = this.COMMUNICATION_RESPONSE_TYPE.PARTIAL_REJECT;
		}
		// Override if any one is accepted
		if (attempt.accepted_count && attempt.accepted_count > 0)
			responseType = this.COMMUNICATION_RESPONSE_TYPE.ACCEPTED;
		
		return responseType;
	},

	_getContactAttempts: function (escalationLevelGr) {
		var result = {
				attempts: []
		};
		var contactAttemptGr = new GlideRecord(this.TABLES.ON_CALL_ESCALATION_CON_ATTEMPT);
		contactAttemptGr.addQuery("escalation_level", escalationLevelGr.getUniqueValue());
		contactAttemptGr.orderBy('contact_attempt');
		contactAttemptGr.query();
		this.baseCommMap = undefined;
		while (contactAttemptGr.next()) {
			var contactAttempt = {};
            contactAttempt.contact_attempt = contactAttemptGr.getValue('contact_attempt');
            var commDetails = this._getCommunications(contactAttemptGr);
            contactAttempt.communications = commDetails.communications;
			contactAttempt.status = this.ESCALATION_STATUS.COMPLETE;
            if (commDetails.acknowledged) {
				// There can be only one ack from any communication record in one attempt
				contactAttempt.acknowledged = commDetails.acknowledged;
				result.acknowledged = commDetails.acknowledged;
			}
			contactAttempt.escalatee_count = commDetails.escalatee_count || 0;
			contactAttempt.accepted_count = commDetails.accepted_count || 0;
			contactAttempt.rejected_count = commDetails.rejected_count || 0;
			
			// Set contact attempt response type
			contactAttempt.response_type = this._getAttemptResponseType(contactAttempt);
			
			if (commDetails.first_contacted_at)
				contactAttempt.first_contacted_at = commDetails.first_contacted_at;

			result.attempts.push(contactAttempt);
		}
		this.baseCommMap = undefined;
		return result;
	},

	_getCommunications: function (contactAttemptGr) {
		var result = {
			communications: []
		};
		var communicationGr = new GlideRecord(this.TABLES.ON_CALL_ESCALATION_COMM);
		communicationGr.addQuery("contact_attempt", contactAttemptGr.getUniqueValue());
		communicationGr.orderBy('attempted_at');
		communicationGr.query();
		var rejectedCount = 0, escalateeCount = 0, acceptedCount = 0, escalateeSysId;
		var escalateeAcceptedMap = {}, escalateeMap = {}, escalateeRejectedMap = {};
		while (communicationGr.next()) {
			var communication = {};
			var fields = ["communication_type", "escalatee_type", "attempted_at", "status"];
			if (communicationGr.response)				
				fields.push("response");

			if (communicationGr.responded_at)
				fields.push("responded_at");

			if (communicationGr.email)
				fields.push("email");

			if (communicationGr.phone_number)
				fields.push("phone_number");

			communication = this.oncallCommon.toJS(communicationGr, fields, true);
			if (communication.escalatee_type.value == this.ESCALATEE_TYPE.USER && communicationGr.user) {
				var user = GlideUser.getUserByID(communicationGr.getValue("user"));
				communication.user = {
					sys_id: user.getID(),
					avatar: user.getAvatar() || "",
					initials: user.getInitials() || "",
					name: user.getFullName() || "",
					title: user.getTitle() || "",
					email: user.getEmail() || "",
					contact_number: user.getMobileNumber() || user.getBusinessNumber() || ""
				};
				escalateeSysId = communication.user.sys_id;
				if (!escalateeMap[escalateeSysId]) {
					escalateeMap[escalateeSysId] = 1;
					escalateeCount++;
				}
			}
			if (communicationGr.device) {
				var deviceGr = communicationGr.device.getRefRecord();
				communication.device = this.oncallCommon.toJS(deviceGr, ["name", "type", "phone_number", "email_address"], true);
				communication.device.initials = this._getNameInitials(deviceGr.name);
				escalateeSysId = communication.device.sys_id.value;
				if (!escalateeMap[escalateeSysId]) {
					escalateeMap[escalateeSysId] = 1;
					escalateeCount++;
				}
            }
            if (communication.response) {
				// Available choices = accepted, rejected, invalid
				communication.response_type = this._getResponseType(communication.response.value);
				if (communication.responded_at) {
					result.acknowledged = {
						at: communication.responded_at,
						response: communication.response,
						response_type: communication.response_type
					};
				}
				if (communication.response_type === this.COMMUNICATION_RESPONSE_TYPE.ACCEPTED) {
					escalateeMap[escalateeSysId] = {response: this.COMMUNICATION_RESPONSE_TYPE.ACCEPTED};
					if (!escalateeAcceptedMap[escalateeSysId]) {
						escalateeAcceptedMap[escalateeSysId] = 1;
						acceptedCount++;
					}
				}
				else {
					escalateeMap[escalateeSysId] = { response: this.COMMUNICATION_RESPONSE_TYPE.REJECTED, communication: JSON.parse(JSON.stringify(communication))};
					// Rejected and invalid response considered rejected
					if (!escalateeRejectedMap[escalateeSysId]) {
						escalateeRejectedMap[escalateeSysId] = 1;
						rejectedCount++; 
					}
				}
			} else {
				if (escalateeMap[escalateeSysId] && escalateeMap[escalateeSysId].response !== this.COMMUNICATION_RESPONSE_TYPE.ACCEPTED && this.COMMUNICATION_RESPONSE_TYPE.REJECTED !== escalateeMap[escalateeSysId].response)
					escalateeMap[escalateeSysId] = { response: this.COMMUNICATION_RESPONSE_TYPE.NO_ANSWER };
			}
			
			if (!result.first_contacted_at)
				result.first_contacted_at = communication.attempted_at;

			result.communications.push(communication);
		}
		result.accepted_count = acceptedCount;
		result.rejected_count = rejectedCount;			
		result.escalatee_count = escalateeCount;
		
		if(!this.baseCommMap) {
			this.baseCommMap = escalateeMap;
		} else {
			result.communications = result.communications.concat(this._getCommunicationGaps(this.baseCommMap, escalateeMap));
		}
		
		return result;
	},

	_getCommunicationGaps: function(baseCommMap, currentCommMap) {
		if (!baseCommMap || !currentCommMap)
			return;
		var dummyComms = [];
		for(var escalateeId in baseCommMap) {
			if (baseCommMap.hasOwnProperty(escalateeId) && baseCommMap[escalateeId].response === this.COMMUNICATION_RESPONSE_TYPE.REJECTED) {
				// Now next reminder may or may not have been sent depending on workflow implemention
				if (!currentCommMap[escalateeId]) {
					// No reminder sent i.e. further communication is discontinued
					var lastComm = baseCommMap[escalateeId].communication;
					var dummy = {};
					dummy.escalatee_type = lastComm.escalatee_type;
					if (lastComm.escalatee_type.value === this.ESCALATEE_TYPE.USER)
						dummy.user = lastComm.user;
					
					if (lastComm.escalatee_type.value === this.ESCALATEE_TYPE.DEVICE)
						dummy.device = lastComm.device;
					
					dummy.isDummy = true;
					dummy.status = { value: 'discontinued', display_value: gs.getMessage('Discontinued') };
					dummy.communication_type = { value: 'dummy', display_value: gs.getMessage('Dummy') };
					dummy.display_message = gs.getMessage("No communication sent as user has rejected earlier");
					dummyComms.push(dummy);
				}	
			}
			if (currentCommMap[escalateeId]) {
				// Update base map
				baseCommMap[escalateeId] = currentCommMap[escalateeId];
			}
		}
		return dummyComms;
	},
	
	_getNameInitials: function (name) {
		var splitName = name.split(" ");
		var initials = "";
		for (var index = 0; index < splitName.length && index < 2; index++)
			initials += splitName[index].charAt(0).toUpperCase();
		return initials;
	},

	updateCanceledEscalation: function (contextSysId) {
		var gr = new GlideRecord(this.TABLES.ON_CALL_ESCALATION);
		gr.addActiveQuery();
		gr.addQuery('workflow_context', contextSysId);
		gr.query();

		if (gr.next())
			this.logEscalationEnd(gr.getUniqueValue());
	},

	getCatchAllWaitTimeAnnotation: function() {
		var message = gs.getMessage('Time to wait, for Catch-All response, is set to {0} by administrator.', new GlideDuration(parseInt(gs.getProperty("com.snc.on_call_rotation.catch_all_wait_time") || 0) * 1000).getDisplayValue());

		if (gs.getProperty("glide.ui.escape_text") == "true")
			message += gs.getMessage('To override, users can specify the <b>"Catch-all wait time"</b> below.');
		else
			message += GlideStringUtil.unEscapeHTML(gs.getMessage('To override, users can specify the &lt;b&gt;"Catch-all wait time"&lt;/b&gt; below.'));
		
		return message;
	},

	type: 'OnCallEscalationUtilSNC'
};

```