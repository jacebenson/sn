---
title: "OnCallUserPreferencesSNC"
id: "oncalluserpreferencessnc"
---

API Name: global.OnCallUserPreferencesSNC

```js
var OnCallUserPreferencesSNC = Class.create();
OnCallUserPreferencesSNC.prototype = {
	initialize: function (_gs) {
		this._gs = _gs || gs;
		this._onCallCommon = new OnCallCommon();
		this._occpUtils = new OnCallContactPreferenceUtil();
		this._communicationTypes = [];
		for (var key in this._occpUtils.COMMUNICATION_TYPES) {
			this._communicationTypes.push(this._occpUtils.COMMUNICATION_TYPES[key]);
		}
	},

	TABLES: {
		USER_CONTACT_PREFERENCE: 'on_call_user_contact_preference',
		SYS_ON_CALL_CONTACT_SOURCE: 'sys_on_call_contact_source',
		CMN_NOTIF_DEVICE: 'cmn_notif_device',
		SYS_USER: 'sys_user',
		CMN_ROTA: 'cmn_rota',
		CMN_ROTA_CONTACT_PREFERENCE: 'cmn_rota_contact_preference',
		CMN_ROTA_ESCALATION_SET: 'cmn_rota_escalation_set',
		SYS_USER_GROUP: 'sys_user_group',
		SYS_USER_GRMEMBER: 'sys_user_grmember',
		ON_CALL_COMMUNICATION_TYPE: 'on_call_communication_type'
	},

	ROTA_PREFERENCE_TYPES: {
		ROTA: 'rota',
		ESCALATION_SET: 'escalation_set'
	},

	getUserPreferenceDetails: function (userPreferenceGr) {
		return this._onCallCommon.toJS(userPreferenceGr, ["name", "schedule_type", "start_time", "end_time", "schedule", "days_of_week"]);
	},

	getUserContactPreferences: function (userPreferenceSysId, userSysId) {
		var contactAttempts = [];
		var userContactPreferenceGr = new GlideRecord(this.TABLES.USER_CONTACT_PREFERENCE);
		userContactPreferenceGr.addQuery("on_call_user_preference", userPreferenceSysId);
		userContactPreferenceGr.orderBy('contact_attempt');
		userContactPreferenceGr.query();
		while (userContactPreferenceGr.next()) {
			var contactAttempt = this.convertUserContactPreferenceToJS(userContactPreferenceGr);
			contactAttempts.push(contactAttempt);
		}
		return contactAttempts;
	},

	convertUserContactPreferenceToJS: function (userContactPreferenceGr) {
		return this._onCallCommon.toJS(userContactPreferenceGr, ["contact_attempt", "email", "sms", "voice", "devices", "slack"]);
	},

	getUserDevicesAndContacts: function (userSysId) {
		var userDevicesAndContacts = {};

		userDevicesAndContacts.devices = [];
		var notifyDeviceGr = new GlideRecord(this.TABLES.CMN_NOTIF_DEVICE);
		notifyDeviceGr.addActiveQuery();
		notifyDeviceGr.addQuery('user', userSysId);
		notifyDeviceGr.query();
		while (notifyDeviceGr.next()) {
			var device = this._occpUtils.getPreferenceFromDevice(notifyDeviceGr);
			device.name = notifyDeviceGr.name + "";
			device.sys_id = notifyDeviceGr.sys_id + "";
			device.table_name = this.TABLES.CMN_NOTIF_DEVICE;
			userDevicesAndContacts.devices.push(device);
		}

		userDevicesAndContacts.contacts = [];
		var contactSourceGr = new GlideRecord(this.TABLES.SYS_ON_CALL_CONTACT_SOURCE);
		contactSourceGr.addActiveQuery();
		contactSourceGr.query();
		while (contactSourceGr.next()) {
			var contact = this.getPreferenceFromSource(contactSourceGr, userSysId);
			if (contact) {
				contact.name = contactSourceGr.name + "";
				contact.sys_id = contactSourceGr.sys_id + "";
				contact.table_name = this.TABLES.SYS_ON_CALL_CONTACT_SOURCE;
				userDevicesAndContacts.contacts.push(contact);
			}
		}
		return userDevicesAndContacts;
	},

	getPreferenceFromSource: function (contactSourceGr, userSysId) {
		var sourceTable = contactSourceGr.table + '';
		var userField = 'sys_id';
		if (sourceTable != this.TABLES.SYS_USER)
			userField = contactSourceGr.user_field + '';

		var sourceTableGr = new GlideRecord(sourceTable);
		sourceTableGr.addQuery(userField, userSysId);
		sourceTableGr.setLimit(1);
		sourceTableGr.query();
		if (sourceTableGr.next()) {
			var preference = {
				source_type: contactSourceGr.getValue("source_type")
			};
			if (contactSourceGr.getValue("source_type") == "phone_number") {
				preference.number = sourceTableGr.getValue(contactSourceGr.getValue('phone_number_source'));
			} else if (contactSourceGr.getValue("source_type") == "email") {
				preference.email = sourceTableGr.getValue(contactSourceGr.getValue('email_source'));
			}
			else if (contactSourceGr.getValue("source_type") == "slack") {
				preference.email = sourceTableGr.getValue(contactSourceGr.getValue('email_source'));
			}
			return preference;
		}
	},

	getContactOverridesForGroup: function (userSysId, groupSysId, gdt) {
		var shifts = [];
		var rotaGr = new GlideRecord(this.TABLES.CMN_ROTA);
		rotaGr.addQuery('group', groupSysId);
		rotaGr.addActiveQuery();
		rotaGr.query();
		while (rotaGr.next()) {
			var shift = {};
			shift.details = this._onCallCommon.toJS(rotaGr, ['name']);
			if (!rotaGr.use_custom_escalation) {
				if (rotaGr.override_user_contact_preference)
					shift.shift_level_override = this.getOverridesForShift(this.ROTA_PREFERENCE_TYPES.ROTA, rotaGr.sys_id + "");
			} else {
				var escalationSetGr = new GlideRecord(this.TABLES.CMN_ROTA_ESCALATION_SET);
				escalationSetGr.addActiveQuery();
				escalationSetGr.addQuery('cmn_rota', rotaGr.sys_id + "");
				escalationSetGr.query();
				shift.escalation_sets = [];
				while (escalationSetGr.next()) {
					if (escalationSetGr.override_user_contact_preference) {
						var escalcationSet = {};
						escalcationSet.details = this._onCallCommon.toJS(escalationSetGr, ['name']);
						escalcationSet.escalation_set_level_override = this.getOverridesForShift(this.ROTA_PREFERENCE_TYPES.ESCALATION_SET, escalationSetGr.sys_id + "");
						if (escalcationSet.escalation_set_level_override.length)
							shift.escalation_sets.push(escalcationSet);
					}
				}
			}
			if (shift.shift_level_override || shift.escalation_sets.length)
				shifts.push(shift);
		}
		return shifts;
	},

	getOverridesForShift: function (type, sysId) {
		var rotaContactPreferenceGr = new GlideRecord(this.TABLES.CMN_ROTA_CONTACT_PREFERENCE);
		if (type === this.ROTA_PREFERENCE_TYPES.ROTA) {
			rotaContactPreferenceGr.addQuery('cmn_rota', sysId);
			rotaContactPreferenceGr.addQuery('type', this.ROTA_PREFERENCE_TYPES.ROTA);
		} else if (type === this.ROTA_PREFERENCE_TYPES.ESCALATION_SET) {
			rotaContactPreferenceGr.addQuery('cmn_rota_escalation_set', sysId);
			rotaContactPreferenceGr.addQuery('type', this.ROTA_PREFERENCE_TYPES.ESCALATION_SET);
		}
		rotaContactPreferenceGr.orderBy('contact_attempt');
		rotaContactPreferenceGr.query();
		var contactPreferences = [];
		while (rotaContactPreferenceGr.next()) {
			var contactPreference = this._onCallCommon.toJS(rotaContactPreferenceGr, ['contact_attempt', 'communication_types']);
			contactPreferences.push(contactPreference);
		}
		return contactPreferences;
	},

	getRotaContactPreferenceCommunicationTypes: function () {
		var communicationTypeGr = new GlideRecord(this.TABLES.ON_CALL_COMMUNICATION_TYPE);
		communicationTypeGr.query();
		var communicationTypes = [];
		while (communicationTypeGr.next())
			communicationTypes.push(this._onCallCommon.toJS(communicationTypeGr, ['type']));
		return communicationTypes;
	},

	/*
	 * Get groups that user belongs to or manages
	 */
	getGroups: function () {
		var groups = {}, filterGroups = [];
		var userSysId = gs.getUserID();
		this._populateMemberGroups(groups, userSysId);
		Object.keys(groups).forEach(function (groupId) {
			filterGroups.push(groupId);
		});
		return filterGroups;
	},

	/*
	 * Get groups that user belongs to.
	 */
	_populateMemberGroups: function (groups, userSysId) {
		var userMemberGr = new GlideRecord(this.TABLES.SYS_USER_GRMEMBER);
		userMemberGr.addQuery('user', userSysId);
		userMemberGr.addQuery('group.active', 'true');
		userMemberGr.addEncodedQuery('JOINsys_user_grmember.group=cmn_rota.group!active=true');
		userMemberGr.query();
		var memberGroupGr = new GlideRecord(this.TABLES.SYS_USER_GROUP);
		while (userMemberGr.next())
			if (!groups[userMemberGr.group + ""] && memberGroupGr.get(userMemberGr.group + "")) {
				groups[userMemberGr.group + ""] = true;
			}
	},

	getHighestOrderContactAttempt: function (userPreferenceSysId) {
		if (!userPreferenceSysId)
			return -1;
		var contactPrefGr = new GlideRecord(this.TABLES.USER_CONTACT_PREFERENCE);
		contactPrefGr.addQuery('on_call_user_preference', userPreferenceSysId);
		contactPrefGr.addNotNullQuery('contact_attempt');
		contactPrefGr.orderByDesc('contact_attempt');
		contactPrefGr.setLimit(1);
		contactPrefGr.query();
		if (contactPrefGr.next())
			return parseInt(contactPrefGr.getValue('contact_attempt'));
		return 0;
	},
	
	canCreateUserPreferences: function() {
		return GlidePluginManager.isActive('com.snc.notify') || GlidePluginManager.isActive('sn_slack_ah_v2');
	},

	type: 'OnCallUserPreferencesSNC'
};
```