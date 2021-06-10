---
title: "OCEscalationDesigner"
id: "ocescalationdesigner"
---

API Name: global.OCEscalationDesigner

```js
var OCEscalationDesigner = Class.create();
OCEscalationDesigner.prototype = {
	initialize: function() {
		this.JSUtil = new JSUtil();
		this.OnCallCommon = new OnCallCommon();
	},
	TABLES: {
		ESCALATION_SET: 'cmn_rota_escalation_set',
		ESCALATION_STEP: 'cmn_rota_esc_step_def',
		CMN_ROTA: 'cmn_rota'
	},
	ATTRS: {
		NAME: 'name',
		CMN_ROTA: 'cmn_rota',
		CMN_ROTA_ROSTER: 'cmn_rota_roster',
		ROSTER_ESCALATION: 'roster_escalation',
		DESCRIPTION: 'description',
		ESCALATION_SET: 'escalation_set',
		ESCALATION_LEVEL: 'escalation_level',
		USERS_LIST: 'sys_users',
		GROUPS_LIST: 'sys_user_groups',
		DEVICES_LIST: 'cmn_notif_devices',
		REMINDERS: 'reminders',
		TIME_BETWEEN_REMINDERS: 'time_between_reminders',
		TIME_TO_NEXT_STEP: 'time_to_next_step',
		DEFAULT: 'default',
		GROUP_MANAGER: 'group_manager',
		ORDER: 'order',
		TABLE: 'table',
		CONDITION: 'condition',
		OVERRIDE_USER_CONTACT_PREFERENCE: 'override_user_contact_preference'
	},
	getRotaEscalationSets: function (rotaId) {
		var escalationSets = [];
		var escalationSetGr = new GlideRecord(this.TABLES.ESCALATION_SET);
		escalationSetGr.addQuery(this.ATTRS.CMN_ROTA, rotaId);
		escalationSetGr.addActiveQuery();
		escalationSetGr.orderBy("order");
		escalationSetGr.query();
		while (escalationSetGr.next()) {
			var escalationSet = {
				sys_id: escalationSetGr.getUniqueValue(),
				name: escalationSetGr.getDisplayValue(),
				is_default: escalationSetGr.getValue('default') == '1',
				table: {
				}
			}
			var tableName = escalationSetGr.getValue('table');
			if (tableName) {
				escalationSet.table.value = tableName;
				escalationSet.table.display_value = new GlideRecord(tableName).getClassDisplayValue();
			}
			escalationSets.push(escalationSet);
		}
		return escalationSets;
	},

	createEscalationSet: function(escalationSet) {
		var createEscalationSetResult = {
			success: false
		};
		var escalationSetGr = new GlideRecord(this.TABLES.ESCALATION_SET);
		escalationSetGr.initialize();
		escalationSetGr.setValue(this.ATTRS.NAME, escalationSet.name);
		escalationSetGr.setValue(this.ATTRS.CMN_ROTA, escalationSet.cmn_rota);
		escalationSetGr.setValue(this.ATTRS.DESCRIPTION, escalationSet.description);
		if (escalationSet.is_default == true || escalationSet.is_default == false) {
			escalationSetGr.setValue(this.ATTRS.DEFAULT, escalationSet.is_default);
		}
		if (escalationSetGr.insert()) {
			createEscalationSetResult.success = true;
			createEscalationSetResult.escalationSetGr = escalationSetGr;
		}
		return createEscalationSetResult;
	},
	getDefaultEscalation: function(rotaSysId, forceCreate) {
		var escalationSetGr = this.getDefaultEscalationSet(rotaSysId);
		if (escalationSetGr.next()) {
			return this.getEscalation(escalationSetGr);
		}
		else {
			if (forceCreate) {
				var defaultEscalationSetGr = this.createDefaultEscalationSet(rotaSysId);
				return this.getEscalation(defaultEscalationSetGr);
			}
			else {
				throw {
					message: gs.getMessage("no default escalation set found for rota with sys_id {0}", rotaSysId),
				};
			}
		}
	},
	createDefaultEscalationSet: function(rotaSysId) {
		var rotaGr = this._getRota(rotaSysId);
		var defaultEscalationSet = {};
		defaultEscalationSet.name = rotaGr.getDisplayValue() + ' - Default escalation set';
		defaultEscalationSet.cmn_rota = rotaGr.getUniqueValue();
		defaultEscalationSet.description = rotaGr.getDisplayValue() + ' - Default escalation set';
		defaultEscalationSet.is_default = true;
		var createEscalationSetResult = this.createEscalationSet(defaultEscalationSet);
		return createEscalationSetResult.escalationSetGr;
	},
	_getRota: function(sysId) {
		var rotaGr = new GlideRecord(this.TABLES.CMN_ROTA);
		if (rotaGr.get(sysId))
			return rotaGr;
	},
	getEscalationSet: function(sysId) {
		var escalationSetGr = new GlideRecord(this.TABLES.ESCALATION_SET);
		if (escalationSetGr.get(sysId))
			return this.getEscalation(escalationSetGr);
		else {
			throw {
				message: gs.getMessage("escalation set with sys_id {0} not found", sysId),
			};
		}
	},
	getEscalation: function(escalationSetGr) {
		if (escalationSetGr.canRead()) {
			var escalation = this.OnCallCommon.toJS(escalationSetGr, [this.ATTRS.NAME, this.ATTRS.CMN_ROTA, this.ATTRS.DESCRIPTION, this.ATTRS.DEFAULT, this.ATTRS.ORDER, this.ATTRS.TABLE, this.ATTRS.CONDITION, this.ATTRS.OVERRIDE_USER_CONTACT_PREFERENCE]);
			escalation.steps = [];
			var escalationStepGr = this.getEscalationSteps(escalationSetGr.getUniqueValue());
			var i = 0;
			var delayTillPreviousStep = 0;
			while (escalationStepGr.next()) {
				var escalationStep = this.OnCallCommon.toJS(escalationStepGr, [this.ATTRS.NAME, this.ATTRS.CMN_ROTA, this.ATTRS.ESCALATION_LEVEL, this.ATTRS.REMINDERS, this.ATTRS.TIME_BETWEEN_REMINDERS, this.ATTRS.ESCALATION_SET, this.ATTRS.CMN_ROTA_ROSTER, this.ATTRS.USERS_LIST, this.ATTRS.GROUPS_LIST, this.ATTRS.DEVICES_LIST, this.ATTRS.TIME_TO_NEXT_STEP, this.ATTRS.ROSTER_ESCALATION]);
				escalationStep.delay_till_previous_step = {
					value: delayTillPreviousStep,
					display_value: new GlideDuration(delayTillPreviousStep * 1000).getDisplayValue()
				};

				if (escalationStepGr.getValue(this.ATTRS.GROUP_MANAGER) == '1' && escalationSetGr.cmn_rota.group.manager) {
					escalationStep.group_manager = {
						sys_id: escalationSetGr.cmn_rota.group.manager,
						display_value: escalationSetGr.cmn_rota.group.manager.getDisplayValue(),
						label: escalationStepGr.getElement(this.ATTRS.GROUP_MANAGER).getLabel(),
						canRead: escalationStepGr.getElement(this.ATTRS.GROUP_MANAGER).canRead()
					};
				}

				var reminderDuration = escalationStepGr.time_between_reminders.getGlideObject();
				var reminderDelay = reminderDuration ? (reminderDuration.getNumericValue() / 1000) : 0;
				var reminders = parseInt(escalationStepGr.reminders + "");
				var timeToNextStep = escalationStepGr.time_to_next_step.getGlideObject();
				var timeTakenAtStep = reminderDelay * reminders + (timeToNextStep ? (timeToNextStep.getNumericValue() / 1000) : 0);
				delayTillPreviousStep = delayTillPreviousStep + timeTakenAtStep;
				escalationStep.detailed_reminders = [];
				for (var index = 1; index <= reminders; index++) {
					var timeSpentInReminder = index * reminderDelay * 1000;
					escalationStep.detailed_reminders.push({
						value: timeSpentInReminder,
						display_value: gs.getMessage("Reminder {0} - {1}", [index + "", new GlideDuration(timeSpentInReminder).getDisplayValue()])
					});
				}
				escalationStep.time_taken_at_step = {
					value: timeTakenAtStep * 1000,
					display_value: gs.getMessage("{0} delay", new GlideDuration(timeTakenAtStep * 1000).getDisplayValue())
				};
				escalation.steps.push(escalationStep);
				i++;
			}
			escalation.total_time = {
				value:delayTillPreviousStep,
				display_value: new GlideDuration(delayTillPreviousStep * 1000).getDisplayValue()
			};
			
			escalation.contactPreferences = new OnCallContactPreferenceUtil().getContactPreferences('escalation_set', escalationSetGr.getUniqueValue());
			return escalation;
		}
		else {
			throw {
				message: gs.getMessage("Does not have read permission"),
				securityError: true
			};
		}
	},
	getEscalationSteps: function(escalationSetSysId) {
		var escalationStepGr = new GlideRecord(this.TABLES.ESCALATION_STEP);
		escalationStepGr.addQuery(this.ATTRS.ESCALATION_SET, escalationSetSysId);
		escalationStepGr.orderBy(this.ATTRS.ESCALATION_LEVEL);
		escalationStepGr.query();
		return escalationStepGr;
	},
	getDefaultEscalationSet: function(rotaSysId) {
		var escalationSetGr = new GlideRecord(this.TABLES.ESCALATION_SET);
		escalationSetGr.addActiveQuery();
		escalationSetGr.addQuery(this.ATTRS.CMN_ROTA, rotaSysId);
		escalationSetGr.addQuery(this.ATTRS.DEFAULT, true);
		escalationSetGr.query();
		return escalationSetGr;
	},
	deleteEscalationSet: function(escalationSetSysId) {
		var escalationSetGr = new GlideRecord(this.TABLES.ESCALATION_SET);
		if (escalationSetGr.get(escalationSetSysId)) {
			if (escalationSetGr.canDelete())
				return escalationSetGr.deleteRecord();
			else {
				throw {
					message: gs.getMessage("Does not have delete permission"),
					securityError: true
				};
			}
		}
		else {
			throw {
				message: gs.getMessage("Record not found"),
			};
		}
	},
	deleteEscalationStep: function(escalationStepSysId) {
		var escalationStepGr = new GlideRecord(this.TABLES.ESCALATION_STEP);
		if (escalationStepGr.get(escalationStepSysId)) {
			if (escalationStepGr.canDelete())
				return escalationStepGr.deleteRecord();
			else {
				throw {
					message: gs.getMessage("Does not have delete permission"),
					securityError: true
				};
			}
		}
		else {
			throw {
				message: gs.getMessage("Record not found"),
			};
		}
	},
	hasCustomEscalation: function(rotaSysId) {
		var rotaGr = new GlideRecord(this.TABLES.CMN_ROTA);
		if (rotaGr.get(rotaSysId)) {
			return rotaGr.use_custom_escalation == true;
		}
	},
	incrementStepsEscalationLevel: function(escalationSetSysId, currentEscalationLevel) {
		var escalationSetGr = new GlideRecord(this.TABLES.ESCALATION_SET);
		if (escalationSetGr.get(escalationSetSysId)) {
			var escalationStepGr = new GlideRecord(this.TABLES.ESCALATION_STEP);
			escalationStepGr.addQuery(this.ATTRS.ESCALATION_SET, escalationSetSysId);
			escalationStepGr.addQuery(this.ATTRS.ESCALATION_LEVEL, '>=', currentEscalationLevel);
			escalationStepGr.orderByDesc(this.ATTRS.ESCALATION_LEVEL);
			escalationStepGr.query();
			while (escalationStepGr.next()) {
				if (escalationStepGr.escalation_level.canWrite()) {
					var escalationLevel = escalationStepGr.getValue(this.ATTRS.ESCALATION_LEVEL);
					escalationLevel++;
					escalationStepGr.setValue(this.ATTRS.ESCALATION_LEVEL, escalationLevel);
					escalationStepGr.setWorkflow(false);
					escalationStepGr.update();
				}
				else {
					throw {
						message: gs.getMessage("Does not have write permission"),
						securityError: true
					};
				}
			}
			return this.getEscalationSet(escalationSetSysId);
		}
		else {
			throw {
				message: gs.getMessage("escalation set with sys_id {0} not found", escalationSetSysId),
			};
		}
	},
	type: 'OCEscalationDesigner'
};
```