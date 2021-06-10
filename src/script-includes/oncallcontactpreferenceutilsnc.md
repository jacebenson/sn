---
title: "OnCallContactPreferenceUtilSNC"
id: "oncallcontactpreferenceutilsnc"
---

API Name: global.OnCallContactPreferenceUtilSNC

```js
var OnCallContactPreferenceUtilSNC = Class.create();
OnCallContactPreferenceUtilSNC.prototype = {
	TABLES: {
		CMN_ROTA: 'cmn_rota',
		CMN_ROTA_ESCALATION_SET: 'cmn_rota_escalation_set',
		CMN_ROTA_ESCALATION_STEP_DEFINITION: 'cmn_rota_esc_step_def',
		CMN_ROTA_ROSTER: 'cmn_rota_roster',
		CMN_ROTA_MEMBER: 'cmn_rota_member',
		SYS_USER: 'sys_user',
		SYS_USER_GROUP: 'sys_user_group',
		CMN_NOTIF_DEVICE: 'cmn_notif_device',
		CMN_ROTA_CONTACT_PREFERENCE: 'cmn_rota_contact_preference',
		ON_CALL_COMMUNICATION_TYPE: 'on_call_communication_type',
		ON_CALL_USER_PREFERENCE: 'on_call_user_preference',
		ON_CALL_USER_CONTACT_PREFERENCE: 'on_call_user_contact_preference',
		SYS_ON_CALL_CONTACT_SOURCE: 'sys_on_call_contact_source',
		CMN_SCHEDULE: 'cmn_schedule',
		CMN_SCHEDULE_SPAN: 'cmn_schedule_span'
	},
	ATTRS: {
		CMN_ROTA: 'cmn_rota',
		CMN_ROTA_ESCALATION_SET: 'cmn_rota_escalation_set',
		CONTACT_ATTEMPT: 'contact_attempt',
		COMMUNICATION_TYPES: 'communication_types'
	},
	COMMUNICATION_TYPES: {
		EMAIL: 'email',
		SMS: 'sms',
		VOICE: 'voice',
		SLACK: 'slack'
	},
	CMN_NOTIFY_DEVICE_TYPES: {
		EMAIL: 'Email',
		SMS: 'SMS',
		VOICE: 'Voice',
		SLACK: 'Slack'
	},
	PREFERENCE_SOURCE_MAP: {
		USER: "user",
		CONTACT: "contact",
		DEFAULT: "system",
		DEVICE: "device"
	},
	initialize: function () {
		this.onCallCommon = new OnCallCommon();
		this.ocRotation = new OnCallRotation();
		this.onCallCommon = new OnCallCommon();
		this.isNotifyInstalled = GlidePluginManager.isActive('com.snc.notify');
		this.isSlackInstalled = GlidePluginManager.isActive('sn_slack_ah_v2');
		if (this.isNotifyInstalled) {
			this.notifyUtils = new NotifyUtils();
		}
	},
	getCatchAllContacts: function (rotaId, gdt) {
		var contacts = [];
		if (!rotaId)
			return contacts;
		gdt = gdt || new GlideDateTime();
		var rotaGr = new GlideRecord(this.TABLES.CMN_ROTA);
		if (rotaGr.get(rotaId)) {
			var isCustomEscalation = this._isCustomEscalation(rotaGr);
			if (!isCustomEscalation) {
				var catchAllType = this.ocRotation.getCatchAllType(rotaId);
				var contactAttempt = 1; //contact attempt is 1 for catch all preferences
				if (JSUtil.notNil(catchAllType)) {
					var overrideUserContactPreference = rotaGr.override_user_contact_preference + '' == 'true';
					var contactPreferences = this._getRotaDefaultContactPreferences(rotaGr, contactAttempt);
					var catchAllUsers = [];
					if (catchAllType == 'all') {
						var catchAllRoster = this.ocRotation.getCatchAll(rotaId);
						var rosterMemberGr = new GlideRecord('cmn_rota_member');
						rosterMemberGr.addQuery('roster', catchAllRoster);
						rosterMemberGr.query();
						while (rosterMemberGr.next()) {
							catchAllUsers.push(rosterMemberGr.member + '');
						}
					}
					else {
						var catchAllUser = this.ocRotation.getCatchAll(rotaId);
						var userGr = new GlideRecord(this.TABLES.SYS_USER);
						if (userGr.get(catchAllUser)) {
							catchAllUsers.push(catchAllUser);
						}
					}
					for (var i = 0; i < catchAllUsers.length; i++) {
						var userId = catchAllUsers[i];
						var userContact = this._getContactObject('user', userId, rotaId, '', '', '', overrideUserContactPreference, "", contactAttempt);
						var communicationTypes = this._resolveCommunicationTypesByOverrides(contactPreferences, overrideUserContactPreference, userContact.sys_id, contactAttempt, gdt, userContact);
						this._populateUserContactPreferencesByCommunicationTypes(userContact, contactAttempt, gdt, communicationTypes);
						contacts.push(userContact);
					}
				}
			}
		}
		return contacts;
	},
	/**
	 * escalatee (mandatory) - escalatee at current position/escalation level
	 * contactAttempt (optional) - The attempt you are trying to contact [ default value = 1 ]
	 *                             1 - first time
	 * 							   2 - reminder 1 and so on...
	 * gdt (optional) - This is used incase of user preferences [default value = new GlideDateTime()]
	 * rotaSysIds (optional) - comma seperated sys_id's of rota's [ default value = Rota's at current time ]
	 *
	 * Example:
	 *
	 * 	var serviceDeskSysId = 'd625dccec0a8016700a222a0f7900d06';
		var escalationPlan = new OnCallRotation().getEscalationPlan(serviceDeskSysId);
		var escalatee = escalationPlan[0];
		var onContactPrefUtil = new OnCallContactPreferenceUtil();
		var contacts = onContactPrefUtil.getContactsAtByEscalatee(escalatee);
	 *
	 *
	 */
	getContactsAtByEscalatee: function (escalatee, contactAttempt, gdt, rotaSysIds) {
		var contacts = [];
		if (!escalatee)
			return contacts;
		if (!contactAttempt)
			contactAttempt = 1;
		if (!gdt)
			gdt = new GlideDateTime();
		if (!rotaSysIds) {
			//fetch rotaSysIds from escalatee object as we dont have access to ocRotation instance
			rotaSysIds = this._getRotasFromEscalatee(escalatee);
		}
		rotaSysIds = rotaSysIds.split(',');
		for (var i = 0; i < rotaSysIds.length; i++) {
			var rotaContacts = this._getRotaContacts(rotaSysIds[i], escalatee, contactAttempt, gdt);
			contacts = contacts.concat(rotaContacts);
		}
		return contacts;
	},
	getPreferencesByContactAttempt: function(groupId, escalationLevel, gdt, rotaId, escalationSetSysId, taskTable, taskSysId, contactAttempt, escalatee) {
		if (!contactAttempt)
			return [];
		
		if (!groupId)
			return contactPreferences;
			
		var rota = new OnCallRotation();
		var escalationPlan;
		if (!escalatee) {
			if (escalationSetSysId) {
				escalationPlan = rota.getEscalationPlanByEscalationSet(escalationSetSysId, groupId, rotaId, gdt);
			} else {
				var taskGr;
				if (taskTable && taskSysId) {
					taskGr = new GlideRecord(taskTable);
					if (!taskGr.get(taskSysId)) {
						taskGr = null;
					}
				}
				escalationPlan = rota.getEscalationPlan(groupId, gdt, rotaId, taskGr);
			}
			var escalatees = escalationPlan[escalationLevel - 1];
			if (!escalatees)
				return [];				
		}
		return this.getContactsAtByEscalatee(escalatee, contactAttempt, gdt, rotaId);
	},
	
	getContactPreferenceAtEscalationLevel: function (groupId, escalationLevel, gdt, rotaId, escalationSetSysId, taskTable, taskSysId) {
		var contactPreferences = [];
		escalationLevel = !escalationLevel ? 0 : escalationLevel;
		if (!groupId)
			return contactPreferences;
		var rota = new OnCallRotation();
		var escalationPlan;
		if (escalationSetSysId) {
			escalationPlan = rota.getEscalationPlanByEscalationSet(escalationSetSysId, groupId, rotaId, gdt);
		} else {
			var taskGr;
			if (taskTable && taskSysId) {
				taskGr = new GlideRecord(taskTable);
				if (!taskGr.get(taskSysId)) {
					taskGr = null;
				}
			}
			escalationPlan = rota.getEscalationPlan(groupId, gdt, rotaId, taskGr);
		}
		// Handle catch-all scenario
		if (escalationPlan && escalationPlan.length == escalationLevel) {
			var rotaGr = new GlideRecord(this.TABLES.CMN_ROTA);
			if (!rotaId || !rotaGr.get(rotaId))
				return contactPreferences;
			var isCustomEscalation = this._isCustomEscalation(rotaGr);
			if (!isCustomEscalation)
				return this.getCatchAllContacts(rotaId, gdt);
		}
		var escalatee = escalationPlan[escalationLevel];
		if (!escalatee)
			return contactPreferences;
		var reminders = escalatee.reminderNum ? parseInt(escalatee.reminderNum) + 1 : 1;
		for (var contactAttempt = 1; contactAttempt <= reminders; contactAttempt++) {
			var preferenceAtAttempt = this.getContactsAtByEscalatee(escalatee, contactAttempt, gdt, rotaId);
			contactPreferences = contactPreferences.concat(preferenceAtAttempt);
		}
		return contactPreferences;
	},
	_getRotasFromEscalatee: function (escalatee) {
		if (!escalatee)
			return '';
		var rotaSysIds = escalatee.getRotaId() || '';
		var additionalEscalatees = escalatee.additionalEscalatees;
		if (additionalEscalatees && additionalEscalatees.length > 0) {
			for (var i = 0; i < additionalEscalatees.length; i++) {
				var additionalEscalatee = additionalEscalatees[i];
				rotaSysIds = rotaSysIds + ',' + additionalEscalatee.getRotaId();
			}
		}
		return rotaSysIds;
	},
	_getRotaContacts: function (rotaId, escalatee, contactAttempt, gdt) {
		var rotaContacts = [];
		var rotaGr = new GlideRecord(this.TABLES.CMN_ROTA);
		if (!rotaGr.get(rotaId))
			return rotaContacts;
		var contactPreferences = this._getRotaContactPreferences(rotaGr, contactAttempt, escalatee);
		var currentRotaEscalatee;
		if (rotaId == escalatee.getRotaId()) {
			currentRotaEscalatee = escalatee;
		}
		else {
			var additionalEscalatees = escalatee.additionalEscalatees;
			if (additionalEscalatees && additionalEscalatees.length > 0) {
				for (var j = 0; j < additionalEscalatees.length; j++) {
					var additionalEscalatee = additionalEscalatees[j];
					if (rotaId == additionalEscalatee.getRotaId()) {
						currentRotaEscalatee = additionalEscalatee;
						break;
					}
				}
			}
		}
		var userContacts = this._getEscalateeUserContacts(currentRotaEscalatee, contactPreferences, contactAttempt, gdt);
		rotaContacts = rotaContacts.concat(userContacts);
		var deviceContacts = this._getEscalateeDeviceContacts(currentRotaEscalatee, gdt, contactAttempt);
		rotaContacts = rotaContacts.concat(deviceContacts);
		return rotaContacts;
	},
	_getEscalateeDeviceContacts: function (escalatee, gdt, contactAttempt) {
		var deviceContacts = [];
		var deviceContact, i;
		var overrideUserContactPreference = escalatee.getOverrideUserContactPreference();
		if (escalatee.getDeviceId()) {
			deviceContact = this._getContactObject('device', escalatee.getDeviceId(), escalatee.getRotaId(), escalatee.getRosterId(), escalatee.getCmnRotaEscStepDefId(), escalatee.getForcedCommunicationChannel(), overrideUserContactPreference, this.PREFERENCE_SOURCE_MAP.DEVICE, contactAttempt);
			deviceContact.contact_preferences = this._getDeviceContactDetails(deviceContact, gdt);
			deviceContacts.push(deviceContact);
		}
		var deviceIds = escalatee.getDeviceIds();
		if (deviceIds && deviceIds.length > 0) {
			for (i = 0; i < deviceIds.length; i++) {
				deviceContact = this._getContactObject('device', deviceIds[i], escalatee.getRotaId(), escalatee.getRosterId(), escalatee.getCmnRotaEscStepDefId(), escalatee.getForcedCommunicationChannel(), overrideUserContactPreference, this.PREFERENCE_SOURCE_MAP.DEVICE, contactAttempt);
				deviceContact.contact_preferences = this._getDeviceContactDetails(deviceContact, gdt);
				deviceContacts.push(deviceContact);
			}
		}
		for (i = 0; i < deviceContacts.length; i++) {
			deviceContact = deviceContacts[i];
			deviceContact.device_has_user = false;
			deviceContact.user_id = '';
			deviceContact.user_preferences = [];
			if (deviceContact.contact_preferences.length > 0) {
				devicePreference = deviceContact.contact_preferences[0];
				if (devicePreference.user) {
					deviceContact.device_has_user = true;
					deviceContact.user_id = devicePreference.user;
					delete devicePreference.user;
				}
			}
		}
		return deviceContacts;
	},
	_resolveCommunicationTypesByOverrides: function (contactPreferences, isOverride, userSysId, contactAttempt, gdt, userContact) {
		var managerPreferredCommunicationTypes = contactPreferences;
		var userPreferredCommunicationTypes;
		var resolvedCommunicationTypes = [];
		if (isOverride) {
			//if override is true - consider only shift preferences
			resolvedCommunicationTypes = managerPreferredCommunicationTypes;
			userContact.preference_source = this.PREFERENCE_SOURCE_MAP.CONTACT;
		}
		else {
			//if override is false - consider only user preferences
			userPreferredCommunicationTypes = this._getUserPreferredCommunicationTypes(userSysId, contactAttempt, gdt);
			resolvedCommunicationTypes = userPreferredCommunicationTypes;
			userContact.preference_source = this.PREFERENCE_SOURCE_MAP.USER;
			if (resolvedCommunicationTypes.length == 0) {
				//if there are no user prefrences - then fallback to shift preference even though override is false
				resolvedCommunicationTypes = managerPreferredCommunicationTypes;
				userContact.preference_source = this.PREFERENCE_SOURCE_MAP.CONTACT;
			}
		}
		resolvedCommunicationTypes = resolvedCommunicationTypes.filter(function (item, pos) { return resolvedCommunicationTypes.indexOf(item) == pos });
		if (resolvedCommunicationTypes.length == 0) {
			resolvedCommunicationTypes = this._getDefaultContactPreferenceForUser(userSysId);
			userContact.preference_source = this.PREFERENCE_SOURCE_MAP.DEFAULT;
		}
		return resolvedCommunicationTypes;
	},
	_getUserPreferredCommunicationTypes: function (userSysId, contactAttempt, gdt) {
		var preferredCommunicationTypes = [];
		var userPrefs = this.getUserPreferences(userSysId, contactAttempt, gdt);
		for (var i = 0; i < userPrefs.length; i++) {
			var userPref = userPrefs[i];
			if (preferredCommunicationTypes.indexOf(userPref.type) == -1) {
				preferredCommunicationTypes.push(userPref.type);
			}
		}
		return preferredCommunicationTypes;
	},
	_populateUserContactPreferencesByCommunicationTypes: function (userContact, contactAttempt, gdt, communicationTypes) {
		userContact.user_preferences = this.getUserPreferences(userContact.sys_id, contactAttempt, gdt, communicationTypes.join(','));
		var userPreferredCommunicationTypes = [];
		var i;
		for (i = 0; i < userContact.user_preferences.length; i++) {
			var userPref = userContact.user_preferences[i];
			if (userPreferredCommunicationTypes.indexOf(userPref.type) == -1) {
				userPreferredCommunicationTypes.push(userPref.type);
			}
		}
		for (i = 0; i < communicationTypes.length; i++) {
			var commType = communicationTypes[i];
			if (userPreferredCommunicationTypes.indexOf(commType) != -1) {
				communicationTypes.splice(i, 1);
				i--;
			}
		}
		userContact.contact_preferences = [];
		if (communicationTypes.length > 0) {
			userContact.contact_preferences = this._getUserContactDetailsByPreferences(userContact, communicationTypes);
		}
	},
	_getEscalateeUserContacts: function (escalatee, contactPreferences, contactAttempt, gdt) {
		if (!contactPreferences)
			contactPreferences = [];
		var overrideUserContactPreference = escalatee.getOverrideUserContactPreference();
		var forcedCommunicationChannel = escalatee.getForcedCommunicationChannel();
		if (forcedCommunicationChannel && contactPreferences.indexOf(forcedCommunicationChannel) == -1)
			contactPreferences.push(forcedCommunicationChannel);
		var userContacts = [];
		var userContact, communicationTypes;
		if (escalatee.getUserId()) {
			userContact = this._getContactObject('user', escalatee.getUserId(), escalatee.getRotaId(), escalatee.getRosterId(), escalatee.getCmnRotaEscStepDefId(), escalatee.getForcedCommunicationChannel(), overrideUserContactPreference, this.PREFERENCE_SOURCE_MAP.DEFAULT, contactAttempt);
			communicationTypes = this._resolveCommunicationTypesByOverrides(contactPreferences, overrideUserContactPreference, userContact.sys_id, contactAttempt, gdt, userContact);
			this._populateUserContactPreferencesByCommunicationTypes(userContact, contactAttempt, gdt, communicationTypes);
			userContacts.push(userContact);
		}
		var userIds = escalatee.getUserIds();
		if (userIds && userIds.length > 0) {
			for (var i = 0; i < userIds.length; i++) {
				userContact = this._getContactObject('user', userIds[i], escalatee.getRotaId(), escalatee.getRosterId(), escalatee.getCmnRotaEscStepDefId(), escalatee.getForcedCommunicationChannel(), overrideUserContactPreference, this.PREFERENCE_SOURCE_MAP.DEFAULT, contactAttempt);
				communicationTypes = this._resolveCommunicationTypesByOverrides(contactPreferences, overrideUserContactPreference, userContact.sys_id, contactAttempt, gdt, userContact);
				this._populateUserContactPreferencesByCommunicationTypes(userContact, contactAttempt, gdt, communicationTypes);
				userContacts.push(userContact);
			}
		}
		return userContacts;
	},
	getUserPreferences: function (userSysId, contactAttempt, gdt, communicationTypes) {
		var userPreferences = [];
		if (!userSysId)
			return userPreferences;
		if (!contactAttempt)
			contactAttempt = 1;
		if (!communicationTypes) {
			communicationTypes = [];
			for (var key in this.COMMUNICATION_TYPES) {
				communicationTypes.push(this.COMMUNICATION_TYPES[key]);
			}
		}
		else {
			communicationTypes = communicationTypes.split(',');
		}
		gdt = gdt || new GlideDateTime();
		var userPreferenceGr = this._getUserPreferenceByGdt(userSysId, gdt);
		if (userPreferenceGr) {
			var userContactPreferenceGr = new GlideRecord(this.TABLES.ON_CALL_USER_CONTACT_PREFERENCE);
			userContactPreferenceGr.addQuery('on_call_user_preference', userPreferenceGr.getUniqueValue());
			userContactPreferenceGr.addQuery('contact_attempt', contactAttempt);
			userContactPreferenceGr.query();
			if (userContactPreferenceGr.next()) {
				var devicesPreferences = this._getDevicesPreferencesInUserContactPreference(userContactPreferenceGr, gdt, communicationTypes);
				userPreferences = userPreferences.concat(devicesPreferences);
				if (communicationTypes.indexOf(this.COMMUNICATION_TYPES.EMAIL) != -1) {
					var emailPreferences = this._getEmailPreferencesInUserContactPreference(userContactPreferenceGr, userSysId);
					userPreferences = userPreferences.concat(emailPreferences);
				}
				if (this.isSlackInstalled && (communicationTypes.indexOf(this.COMMUNICATION_TYPES.SLACK) != -1)) {
					var slackPreferences = this._getSlackPreferencesInUserContactPreference(userContactPreferenceGr, userSysId);
					userPreferences = userPreferences.concat(slackPreferences);
				}
				if (this.isNotifyInstalled) {
					if (communicationTypes.indexOf(this.COMMUNICATION_TYPES.SMS) != -1) {
						var smsPreferences = this._getSMSPreferencesInUserContactPreference(userContactPreferenceGr, userSysId);
						userPreferences = userPreferences.concat(smsPreferences);
					}
					if (communicationTypes.indexOf(this.COMMUNICATION_TYPES.VOICE) != -1) {
						var voicePreferences = this._getVoicePreferencesInUserContactPreference(userContactPreferenceGr, userSysId);
						userPreferences = userPreferences.concat(voicePreferences);
					}
				}
			}
		}
		return userPreferences;
	},
	_getEmailPreferencesInUserContactPreference: function (userContactPreferenceGr, userSysId) {
		return this._getPreferencesFromSources(userContactPreferenceGr, this.COMMUNICATION_TYPES.EMAIL, userSysId);
	},
	_getSMSPreferencesInUserContactPreference: function (userContactPreferenceGr, userSysId) {
		return this._getPreferencesFromSources(userContactPreferenceGr, this.COMMUNICATION_TYPES.SMS, userSysId);
	},
	_getVoicePreferencesInUserContactPreference: function (userContactPreferenceGr, userSysId) {
		return this._getPreferencesFromSources(userContactPreferenceGr, this.COMMUNICATION_TYPES.VOICE, userSysId);
	},
	_getSlackPreferencesInUserContactPreference: function (userContactPreferenceGr, userSysId) {
		return this._getPreferencesFromSources(userContactPreferenceGr, this.COMMUNICATION_TYPES.SLACK, userSysId);
	},
	_getPreferencesFromSources: function (userContactPreferenceGr, type, userSysId) {
		var preferences = [];
		var sourceSysIds = userContactPreferenceGr.getValue(type);
		if (sourceSysIds) {
			var contactSourceGr = new GlideRecord(this.TABLES.SYS_ON_CALL_CONTACT_SOURCE);
			contactSourceGr.addQuery('sys_id', 'IN', sourceSysIds);
			contactSourceGr.addActiveQuery();
			contactSourceGr.query();
			while (contactSourceGr.next()) {
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
						type: type
					};
					if (type == this.COMMUNICATION_TYPES.SMS || type == this.COMMUNICATION_TYPES.VOICE) {
						preference.number = sourceTableGr.getValue(contactSourceGr.getValue('phone_number_source'));
						preferences.push(preference);
					}
					else if (type == this.COMMUNICATION_TYPES.EMAIL) {
						preference.email = sourceTableGr.getValue(contactSourceGr.getValue('email_source'));
						preferences.push(preference);
					}
					else if (type == this.COMMUNICATION_TYPES.SLACK) {
						preference.slack = sourceTableGr.getValue(contactSourceGr.getValue('email_source'));
						preferences.push(preference);
					}
				}
			}
		}
		return preferences;
	},
	_getDevicesPreferencesInUserContactPreference: function (userContactPreferenceGr, gdt, communicationTypes) {
		if (!communicationTypes)
			communicationTypes = [];
		var devicesPreferences = [];
		var deviceSysIds = userContactPreferenceGr.getValue('devices');
		if (deviceSysIds) {
			var notifyDeviceGr = new GlideRecord(this.TABLES.CMN_NOTIF_DEVICE);
			notifyDeviceGr.addActiveQuery();
			notifyDeviceGr.addQuery('sys_id', 'IN', deviceSysIds);
			if (communicationTypes.length > 0) {
				var deviceTypes = [];
				for (var i = 0; i < communicationTypes.length; i++) {
					var commType = communicationTypes[i];
					if (commType == this.COMMUNICATION_TYPES.EMAIL)
						deviceTypes.push(this.CMN_NOTIFY_DEVICE_TYPES.EMAIL);
					if (commType == this.COMMUNICATION_TYPES.SMS)
						deviceTypes.push(this.CMN_NOTIFY_DEVICE_TYPES.SMS);
					if (commType == this.COMMUNICATION_TYPES.VOICE)
						deviceTypes.push(this.CMN_NOTIFY_DEVICE_TYPES.VOICE);
					if (commType == this.COMMUNICATION_TYPES.SLACK)
						deviceTypes.push(this.CMN_NOTIFY_DEVICE_TYPES.SLACK);
				}
				notifyDeviceGr.addQuery('type', 'IN', deviceTypes.join(','));
			}
			notifyDeviceGr.query();
			while (notifyDeviceGr.next()) {
				if (this._isDeviceInSchedule(notifyDeviceGr, gdt)) {
					var preference = this.getPreferenceFromDevice(notifyDeviceGr);
					devicesPreferences.push(preference);
				}
			}
		}
		return devicesPreferences;
	},
	_isDeviceInSchedule: function (notifyDeviceGr, gdt) {
		var isDeviceInSchedule = true;
		var deviceScheduleSysId = notifyDeviceGr.schedule + '';
		if (deviceScheduleSysId) {
			var userSysId = notifyDeviceGr.user + '';
			var deviceSchedule = this._getCmnSchedule(deviceScheduleSysId, userSysId);
			if (deviceSchedule.isValid()) {
				isDeviceInSchedule = deviceSchedule.isInSchedule(gdt);
			}
		}
		return isDeviceInSchedule;
	},
	getPreferenceFromDevice: function (notifyDeviceGr) {
		var preference = {};
		if (notifyDeviceGr.getValue('type') == this.CMN_NOTIFY_DEVICE_TYPES.EMAIL) {
			preference.type = this.COMMUNICATION_TYPES.EMAIL;
			preference.email = notifyDeviceGr.getValue('email_address');
		}
		else if (notifyDeviceGr.getValue('type') == this.CMN_NOTIFY_DEVICE_TYPES.SMS) {
			preference.type = this.COMMUNICATION_TYPES.SMS;
			preference.number = notifyDeviceGr.getValue('phone_number');
		}
		else if (notifyDeviceGr.getValue('type') == this.CMN_NOTIFY_DEVICE_TYPES.VOICE) {
			preference.type = this.COMMUNICATION_TYPES.VOICE;
			preference.number = notifyDeviceGr.getValue('phone_number');
		}
		else if (notifyDeviceGr.getValue('type') == this.CMN_NOTIFY_DEVICE_TYPES.SLACK) {
			preference.type = this.COMMUNICATION_TYPES.SLACK;
			preference.slack = notifyDeviceGr.user.email;
		}
		return preference;
	},
	_getUserPreferenceByGdt: function (userSysId, gdt) {
		var userPreferenceGr = new GlideRecord(this.TABLES.ON_CALL_USER_PREFERENCE);
		userPreferenceGr.addActiveQuery();
		userPreferenceGr.addQuery('user', userSysId);
		userPreferenceGr.query();
		while (userPreferenceGr.next()) {
			if (this._isGdtinUserPreferenceSchedule(userPreferenceGr, gdt)) {
				return userPreferenceGr;
			}
		}
		return null;
	},
	_getUserLocalDate: function (userSysId, gdt) {
		var userTZ = this._getUserTZ(userSysId);
		var userGdt = gdt ? new GlideDateTime(gdt.getValue()) : new GlideDateTime();
		userGdt.setTZ(userTZ);
		return userGdt.getLocalDate();
	},
	_isGdtinUserPreferenceSchedule: function (userPreferenceGr, gdt) {
		gdt = gdt || new GlideDateTime();
		var userSysId = userPreferenceGr.user + '';
		var userTZ = this._getUserTZ(userSysId);
		if (userPreferenceGr.schedule_type == 'simple') {
			var isInSchedule = false;
			var localDate = this._getUserLocalDate(userSysId, gdt);
			var preferedStartTime = new GlideDateTime(userPreferenceGr.start_time);
			preferedStartTime.setTZ(userTZ);
			var startTime = preferedStartTime.getLocalTime();
			var startTimeGdt = new GlideDateTime();
			startTimeGdt.setTZ(userTZ);
			startTimeGdt.setDisplayValueInternal(localDate + ' 00:00:00');
			startTimeGdt.add(startTime);
			var preferedEndTime = new GlideDateTime(userPreferenceGr.end_time);
			preferedEndTime.setTZ(userTZ);
			var endTime = preferedEndTime.getLocalTime();
			var endTimeGdt = new GlideDateTime();
			endTimeGdt.setTZ(userTZ);
			endTimeGdt.setDisplayValueInternal(localDate + ' 00:00:00');
			endTimeGdt.add(endTime);
			gdt.setTZ(userTZ);
			var isEndTimeOnNextDay = endTimeGdt.onOrBefore(startTimeGdt);
			if (isEndTimeOnNextDay) {
				startTimeGdt.addDaysLocalTime(-1);//decrease startTimeGdt by 1 day
				isInSchedule = gdt.onOrAfter(startTimeGdt) && gdt.onOrBefore(endTimeGdt);
				if (!isInSchedule) {
					startTimeGdt.addDaysLocalTime(1);//reset the startTimeGdt happened in above step
					endTimeGdt.addDaysLocalTime(1);//increase endTimeGdt by 1 day
					isInSchedule = gdt.onOrAfter(startTimeGdt) && gdt.onOrBefore(endTimeGdt);
				}
			}
			else {
				isInSchedule = gdt.after(startTimeGdt) && gdt.before(endTimeGdt);
			}
			var userPreferredDaysOfWeek = userPreferenceGr.days_of_week + '';
			var isStartTimeOnUserPreferredDays = userPreferredDaysOfWeek.indexOf(startTimeGdt.getDayOfWeek()) != -1;
			return isInSchedule && isStartTimeOnUserPreferredDays;
		}
		else {
			var schedule = this._getCmnSchedule(userPreferenceGr.schedule + '', userSysId);
			return schedule.isValid() && schedule.isInSchedule(gdt);
		}
	},
	_getCmnSchedule: function (scheduleSysId, userSysId) {
		var schedule = new GlideSchedule(scheduleSysId);
		var cmnScheduleGr = new GlideRecord(this.TABLES.CMN_SCHEDULE);
		if (cmnScheduleGr.get(scheduleSysId)) {
			var scheduleTimeZone = cmnScheduleGr.getValue('time_zone');
			if (!scheduleTimeZone) {
				//schedule has floating timezone, fallback to user timezone
				var userTimeZone = this._getUserTimeZone(userSysId);
				schedule.setTimeZone(userTimeZone);
			}
		}
		return schedule;
	},
	_getUserTimeZone: function (userSysId) {
		if (!userSysId)
			return new GlideUser().getSysTimeZone();
		var userGr = new GlideRecord(this.TABLES.SYS_USER);
		userGr.get(userSysId);
		var userTimeZone = userGr.time_zone;
		if (userTimeZone)
			return userTimeZone;
		//user doesn't have timezone, fallback to system timezone
		return new GlideUser().getSysTimeZone();
	},
	_getUserTZ: function (userSysId) {
		var userTimeZone = this._getUserTimeZone(userSysId);
		var schedule = new GlideSchedule();
		schedule.setTimeZone(userTimeZone);
		var userTZ = schedule.getTZ();
		return userTZ;
	},
	_getContactObject: function (type, sysId, rotaId, rosterId, escalationStepId, forcedCommunicationChannel, overrideUserContactPreference, preferenceSource, contactAttempt) {
		return {
			type: type,
			sys_id: sysId,
			rota_id: rotaId,
			roster_id: rosterId,
			escalation_step_id: escalationStepId,
			forced_communication_channel: forcedCommunicationChannel,
			override_user_contact_preference: overrideUserContactPreference,
			preference_source: preferenceSource,
			contact_attempt: contactAttempt
		};
	},
	_getDeviceContactDetails: function (deviceContact, gdt) {
		gdt = gdt || new GlideDateTime();
		deviceContactDetails = [];
		var notifyDeviceGr = new GlideRecord(this.TABLES.CMN_NOTIF_DEVICE);
		if (notifyDeviceGr.get(deviceContact.sys_id)) {
			var isDeviceInSchedule = this._isDeviceInSchedule(notifyDeviceGr, gdt);
			if (isDeviceInSchedule) {
				var preference = {};
				preference.user = notifyDeviceGr.user + '';
				if (notifyDeviceGr.getValue('type') == this.CMN_NOTIFY_DEVICE_TYPES.EMAIL) {
					preference.type = this.COMMUNICATION_TYPES.EMAIL;
					preference.email = notifyDeviceGr.getValue('email_address');
				}
				else if (this.isNotifyInstalled && notifyDeviceGr.getValue('type') == this.CMN_NOTIFY_DEVICE_TYPES.SMS) {
					preference.type = this.COMMUNICATION_TYPES.SMS;
					preference.number = notifyDeviceGr.getValue('phone_number');
				}
				else if (this.isNotifyInstalled && notifyDeviceGr.getValue('type') == this.CMN_NOTIFY_DEVICE_TYPES.VOICE) {
					preference.type = this.COMMUNICATION_TYPES.VOICE;
					preference.number = notifyDeviceGr.getValue('phone_number');
				}
				deviceContactDetails.push(preference);
			}
		}
		return deviceContactDetails;
	},
	_checkIfUserHasNumber: function (userSysId, communicationType) {
		var numbers = this.notifyUtils.getUniquePhoneNumbersForUsersAndGroups([], [userSysId], [], communicationType);
		return numbers.length > 0;
	},
	_getDefaultContactPreferenceForUser: function (userSysId) {
		//doesn't have any contact preferences or forced communication channel
		//fallback to default communication channel in below order
		//voice - if notify is installed and has a device which supports voice
		//sms - if notify is installed and has a device which supports sms
		//email - if notify is not installed
		if (this.isNotifyInstalled) {
			if (this._checkIfUserHasNumber(userSysId, this.COMMUNICATION_TYPES.VOICE)) {
				return [this.COMMUNICATION_TYPES.VOICE];
			}
			if (this._checkIfUserHasNumber(userSysId, this.COMMUNICATION_TYPES.SMS)) {
				return [this.COMMUNICATION_TYPES.SMS];
			}
		}
		return [this.COMMUNICATION_TYPES.EMAIL];
	},
	
	_getDefaultEscalateePreferences: function(escalateeSysId, communicationTypes) {
		if (!escalateeSysId)
			return [];
		
		if (!communicationTypes) {
			communicationTypes = [];
			for (var key in this.COMMUNICATION_TYPES) {
				communicationTypes.push(this.COMMUNICATION_TYPES[key]);
			}
		}
		var preferences = [];
		for (var i = 0; i < communicationTypes.length; i++) {
			var commType = communicationTypes[i];
			if (commType == this.COMMUNICATION_TYPES.SMS || commType == this.COMMUNICATION_TYPES.VOICE && this.isNotifyInstalled) {
				var numbers = this.notifyUtils.getUniquePhoneNumbersForUsersAndGroups([], [escalateeSysId], [], commType);
				preferences.push({
						type: commType,
						number: numbers[0] || ""
					});
			} else if (commType == this.COMMUNICATION_TYPES.EMAIL) {
				preferences.push({
					type: commType,
					email: this._getUserEmailAddress(escalateeSysId)
				});
			}
		}
		return preferences;
	},
	
	_getUserContactDetailsByPreferences: function (userContact, contactPreferences) {
		if (!contactPreferences)
			contactPreferences = [];
		if (contactPreferences.length == 0) {
			contactPreferences = this._getDefaultContactPreferenceForUser(userContact.sys_id);
		}
		var userContactDetails = [];
		for (var i = 0; i < contactPreferences.length; i++) {
			var preference = contactPreferences[i];
			if (this.isNotifyInstalled && (preference == this.COMMUNICATION_TYPES.SMS || preference == this.COMMUNICATION_TYPES.VOICE)) {
				var numbers = this.notifyUtils.getUniquePhoneNumbersForUsersAndGroups([], [userContact.sys_id], [], preference);
				userContactDetails.push({
						type: preference,
						number: numbers[0] || ""
					});
			}
			else if (preference == this.COMMUNICATION_TYPES.EMAIL) {
				userContactDetails.push({
					type: preference,
					email: this._getUserEmailAddress(userContact.sys_id)
				});
			}
			else if (preference == this.COMMUNICATION_TYPES.SLACK) {
				userContactDetails.push({
					type: preference,
					slack: this._getUserEmailAddressForSlack(userContact.sys_id)
				});
			}
		}
		return userContactDetails;
	},
	_getUserEmailAddress: function (userSysId) {
		var cmnNotifyDeviceGr = new GlideRecord(this.TABLES.CMN_NOTIF_DEVICE);
		cmnNotifyDeviceGr.addQuery('user', userSysId);
		cmnNotifyDeviceGr.addQuery('type', 'Email');
		cmnNotifyDeviceGr.addActiveQuery();
		cmnNotifyDeviceGr.orderBy('order');
		cmnNotifyDeviceGr.query();
		while (cmnNotifyDeviceGr.next()) {
			var emailAddress = cmnNotifyDeviceGr.getValue('email_address');
			if (emailAddress) {
				return emailAddress
			}
		}
		//return email address on sys_user record if no notify devices found
		var userGr = new GlideRecord(this.TABLES.SYS_USER);
		if (userGr.get(userSysId)) {
			if (userGr.email + '')
				return userGr.email + '';
		}
		return '';
	},
	_getUserEmailAddressForSlack: function (userSysId) {
		var userGr = new GlideRecord(this.TABLES.SYS_USER);
		if (userGr.get(userSysId)) {
			if (userGr.email + '')
				return userGr.email + '';
		}
		return '';
	},
	_getRotaContactPreferences: function (rotaGr, contactAttempt, escalatee) {
		var isCustomEscalation = this._isCustomEscalation(rotaGr);
		var contactPreferences;
		if (isCustomEscalation) {
			contactPreferences = this._getCustomEscalationContactPreferences(rotaGr, contactAttempt, escalatee.cmnRotaEscStepDefId);
		}
		else {
			contactPreferences = this._getRotaDefaultContactPreferences(rotaGr, contactAttempt);
		}
		return contactPreferences;
	},
	_getCustomEscalationContactPreferences: function (rotaGr, contactAttempt, escStepId) {
		var contactPreferences = [];
		var escalationStepGr = new GlideRecord(this.TABLES.CMN_ROTA_ESCALATION_STEP_DEFINITION);
		escalationStepGr.get(escStepId);
		var escalationSetSysId = escalationStepGr.escalation_set + '';
		var escalationSetGr = new GlideRecord(this.TABLES.CMN_ROTA_ESCALATION_SET);
		if (!escalationSetGr.get(escalationSetSysId))
			return contactPreferences;
		var contactPreferenceGr = new GlideRecord(this.TABLES.CMN_ROTA_CONTACT_PREFERENCE);
		contactPreferenceGr.addQuery('type', 'escalation_set');
		contactPreferenceGr.addQuery('cmn_rota_escalation_set', escalationSetGr.getUniqueValue());
		contactPreferenceGr.addQuery('contact_attempt', contactAttempt);
		contactPreferenceGr.query();
		if (contactPreferenceGr.next()) {
			contactPreferences = this._getCommunicationTypes(contactPreferenceGr.getValue('communication_types'));
		}
		return contactPreferences;
	},
	_getRotaDefaultContactPreferences: function (rotaGr, contactAttempt) {
		var contactPreferences = [];
		var contactPreferenceGr = new GlideRecord(this.TABLES.CMN_ROTA_CONTACT_PREFERENCE);
		contactPreferenceGr.addQuery('type', 'rota');
		contactPreferenceGr.addQuery('cmn_rota', rotaGr.getUniqueValue());
		contactPreferenceGr.addQuery('contact_attempt', contactAttempt);
		contactPreferenceGr.query();
		if (contactPreferenceGr.next()) {
			contactPreferences = this._getCommunicationTypes(contactPreferenceGr.getValue('communication_types'));
		}
		return contactPreferences;
	},
	_getCommunicationTypes: function (communicationTypesSysIds) {
		var communicationTypes = [];
		if (!communicationTypesSysIds)
			return communicationTypes;
		var communicationTypeGr = new GlideRecord(this.TABLES.ON_CALL_COMMUNICATION_TYPE);
		communicationTypeGr.addQuery('sys_id', 'IN', communicationTypesSysIds);
		communicationTypeGr.query();
		while (communicationTypeGr.next()) {
			communicationTypes.push(communicationTypeGr.getValue('type'));
		}
		return communicationTypes;
	},
	_isCustomEscalation: function (rotaGr) {
		return rotaGr.getValue('use_custom_escalation') == '1';
	},
	isScheduleOverlappingWithOtherPreferences: function (userPreferenceGr) {
		var isOverlapping = false;
		var currentPreferenceSchedule = this._getGlideScheduleFromPreference(userPreferenceGr);
		if (!currentPreferenceSchedule.isValid())
			return isOverlapping;
		var otherPreferencesGr = new GlideRecord(this.TABLES.ON_CALL_USER_PREFERENCE);
		otherPreferencesGr.addActiveQuery();
		otherPreferencesGr.addQuery('user', userPreferenceGr.user + '');
		otherPreferencesGr.addQuery('sys_id', '!=', userPreferenceGr.getUniqueValue());
		otherPreferencesGr.query();
		while (otherPreferencesGr.next()) {
			var otherPreferenceSchedule = this._getGlideScheduleFromPreference(otherPreferencesGr);
			isOverlapping = this._checkForScheduleOverlap(currentPreferenceSchedule, otherPreferenceSchedule);
			if (otherPreferencesGr.schedule_type == 'simple')
				this._deleteCmnSchedule(otherPreferenceSchedule.getID());
			if (isOverlapping) {
				break;
			}
		}
		if (userPreferenceGr.schedule_type == 'simple')
			this._deleteCmnSchedule(currentPreferenceSchedule.getID());
		return isOverlapping;
	},
	_deleteCmnSchedule: function (sysId) {
		var cmnScheduleGr = new GlideRecord(this.TABLES.CMN_SCHEDULE);
		if (cmnScheduleGr.get(sysId)) {
			cmnScheduleGr.deleteRecord();
		}
	},
	_checkForScheduleOverlap: function (currentSchedule, otherSchedule) {
		if (!otherSchedule)
			return false;
		var otherScheduleSpanGr = this._getScheduleSpans(otherSchedule.getID());
		while (otherScheduleSpanGr.next()) {
			var overlaps = currentSchedule.overlapsWith(otherScheduleSpanGr, currentSchedule.getTimeZone());
			var isOverlapping = !overlaps.isEmpty();
			if (isOverlapping)
				return true;
		}
		return false;
	},
	_getScheduleSpans: function (scheduleSysId) {
		var scheduleSpanGr = new GlideRecord(this.TABLES.CMN_SCHEDULE_SPAN);
		scheduleSpanGr.addQuery('schedule', scheduleSysId);
		scheduleSpanGr.query();
		return scheduleSpanGr;
	},
	_getGlideScheduleFromPreference: function (userPreferenceGr) {
		if (userPreferenceGr.schedule_type == 'simple') {
			return this._createCmnScheduleFromSimplePreference(userPreferenceGr);
		}
		else if (userPreferenceGr.schedule_type == 'schedule') {
			var scheduleSysId = userPreferenceGr.schedule + '';
			var userSysId = userPreferenceGr.user + '';
			return this._getCmnSchedule(scheduleSysId, userSysId);
		}
	},
	getLocalGdtFromGlideTime: function (time, userSysId) {
		var localDate = this._getUserLocalDate(userSysId);
		var userTZ = this._getUserTZ(userSysId);
		var gdt = new GlideDateTime(time);
		gdt.setTZ(userTZ);
		var localTime = gdt.getLocalTime();
		var timeGdt = new GlideDateTime();
		timeGdt.setTZ(userTZ);
		timeGdt.setDisplayValueInternal(localDate + ' 00:00:00');
		timeGdt.add(localTime);
		return timeGdt;
	},
	/**
	* Do a reverse lookup by number to get the associated user. Note that
	* this is currently error prone as the phone number fields for the user
	* and its notification devices (sms, voice) are not E164 phone number
	* fields. Also, when multiple users have the same number configured the
	* first matching user will be returned. To improve the behaviour of this
	* method, upgrade the phone numbers  fields to the E164 compliant phone
	* number field. Checks users, devices and contact sources.
	*
	* @param number        String
	* @returns {*}         sys_id of the user associated
	*/
	getUserByNumber: function(number) {
		if (GlidePluginManager.isActive('com.snc.notify')) {
			// try to lookup any device matching this number
			var device = new GlideRecord(this.TABLES.CMN_NOTIF_DEVICE);
			device.setLimit(1);
			device.query('phone_number', number);
			// check if we have any results
			if (device.next()) {
				var owner = device.getValue('user');
				return owner;
			}
			// check if any user record matched this number
			var user = new GlideRecord(this.TABLES.SYS_USER);
			var condition = user.addQuery('mobile_phone', number);
			condition.addOrCondition('phone', number);
			user.setLimit(1);
			user.query();
			// check if we have any results
			if (user.next())
				return user.getUniqueValue();
			// check further in contact sources if none of the above match
			var csGr = new GlideRecord(this.TABLES.SYS_ON_CALL_CONTACT_SOURCE);
			csGr.addQuery('source_type', 'phone_number');
			csGr.addQuery('active', true);
			csGr.query();
			while (csGr.next()) {
				var gr = new GlideRecord(csGr.table + '');
				gr.addQuery(csGr.phone_number_source, number);
				gr.query();
				if (gr.next()) {
					if (csGr.table == 'sys_user')
						return gr.getValue('sys_id');
					else
						return gr.getValue(csGr.user_field);
				}
			}
		}
	},
	_createCmnScheduleFromSimplePreference: function (userPreferenceGr) {
		var userSysId = userPreferenceGr.user + '';
		var userTimeZone = this._getUserTimeZone(userSysId);
		var userTz = this._getUserTZ(userSysId);
		var cmnScheduleGr = new GlideRecord(this.TABLES.CMN_SCHEDULE);
		cmnScheduleGr.initialize();
		cmnScheduleGr.name = userPreferenceGr.user.getDisplayValue();
		cmnScheduleGr.time_zone = userTimeZone;
		cmnScheduleGr.type = "oc_user_preference_simple_schedule";
		cmnScheduleGr.read_only = false;
		var cmnScheduleId = cmnScheduleGr.insert();
		var startTimeGdt = this.getLocalGdtFromGlideTime(userPreferenceGr.start_time, userSysId);
		var endTimeGdt = this.getLocalGdtFromGlideTime(userPreferenceGr.end_time, userSysId);
		startTimeGdt.addDaysLocalTime(-4);
		endTimeGdt.addDaysLocalTime(-4);
		var isEndTimeOnNextDay = endTimeGdt.before(startTimeGdt) || endTimeGdt.equals(startTimeGdt);
		if (isEndTimeOnNextDay) {
			endTimeGdt.addDaysLocalTime(1);
		}
		var start = new GlideScheduleDateTime(startTimeGdt.getNumericValue(), userTz);
		var end = new GlideScheduleDateTime(endTimeGdt.getNumericValue(), userTz);
		// create and insert the span for the new schedule
		var spanGr = new GlideRecord(this.TABLES.CMN_SCHEDULE_SPAN);
		spanGr.initialize();
		spanGr.name = userPreferenceGr.user.getDisplayValue();
		spanGr.schedule = cmnScheduleId;
		spanGr.setValue("start_date_time", start.getValue());
		spanGr.setValue("end_date_time", end.getValue());
		spanGr.repeat_type = 'weekly';
		spanGr.repeat_count = 1;
		spanGr.days_of_week = userPreferenceGr.days_of_week + '';
		spanGr.insert();
		var schedule = new GlideSchedule(cmnScheduleId);
		return schedule;
	},
	getPreferencesByContact: function (contact, eliminateDuplicates) {
		var allPreferences;
		var contactPreferences = contact.contact_preferences;
		var userPreferences = contact.user_preferences;
		if (!contactPreferences)
			contactPreferences = [];
		if (!userPreferences)
			userPreferences = [];
		allPreferences = contactPreferences.concat(userPreferences);
		if (eliminateDuplicates) {
			this._removeDuplicatePreferences(allPreferences);
		}
		return allPreferences;
	},
	_removeDuplicatePreferences: function (preferences) {
		if (!preferences)
			return;
		for (var i = 0; i < preferences.length; ++i) {
			for (var j = i + 1; j < preferences.length; ++j) {
				if (preferences[i].type == preferences[j].type) {
					if ((preferences[i].type == 'email' && preferences[i].email == preferences[j].email) || ((preferences[i].type == 'sms' || preferences[i].type == 'voice') && preferences[i].number == preferences[j].number)) {
						preferences.splice(j--, 1);
					}
				}
			}
		}
	},
	getContactPreferences: function(type, sysId) {
		if (!type || !sysId) {
			return [];
		}
		var contactPreferenceGr = [];
		if (type == 'escalation_set')
			contactPreferenceGr = this._getContactPreferenceByEscalationSet(sysId);
		else if (type == 'rota')
			contactPreferenceGr = this._getContactPreferenceByRota(sysId, type);
		
		var contactPreferences = [];
		var allCommTypes = this.getAllCommunicationTypes();
		while (contactPreferenceGr.next()) {
			if (!contactPreferenceGr.canRead()) {
				throw {
					message: gs.getMessage("Does not have read permission"),
					securityError: true
				};
			}
			var contactAttempts = this.onCallCommon.toJS(contactPreferenceGr, [this.ATTRS.CONTACT_ATTEMPT, 'type']);
			contactAttempts.communication_types = this._filterCommunicationTypes(allCommTypes, contactPreferenceGr.getValue(this.ATTRS.COMMUNICATION_TYPES).split(','));						contactPreferences.push(contactAttempts);
		}
		return contactPreferences;
	},
	
	_getContactPreferenceByEscalationSet: function (escalationSetSysId) {
		var contactPreferenceGr = new GlideRecord(this.TABLES.CMN_ROTA_CONTACT_PREFERENCE);
		contactPreferenceGr.addQuery(this.ATTRS.CMN_ROTA_ESCALATION_SET, escalationSetSysId);
		contactPreferenceGr.orderBy(this.ATTRS.CONTACT_ATTEMPT);
		contactPreferenceGr.query();
		return contactPreferenceGr;
	},
	
	_getContactPreferenceByRota: function (rotaSysId, type) {
		var contactPreferenceGr = new GlideRecord(this.TABLES.CMN_ROTA_CONTACT_PREFERENCE);
		contactPreferenceGr.addQuery(this.ATTRS.CMN_ROTA, rotaSysId);
		type && contactPreferenceGr.addQuery('type', type);
		contactPreferenceGr.orderBy(this.ATTRS.CONTACT_ATTEMPT);
		contactPreferenceGr.query();
		return contactPreferenceGr;
	},
	
	deleteContactPreference: function (contactPrefSysId) {
		var contactPrefGr = new GlideRecord(this.TABLES.CMN_ROTA_CONTACT_PREFERENCE);
		if (contactPrefGr.get(contactPrefSysId)) {
			if (contactPrefGr.canDelete())
				return contactPrefGr.deleteRecord();
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
	
	_filterCommunicationTypes: function(allCommTypes, filterCommTypes) {
		var result = allCommTypes.filter(function(item) {
			if (filterCommTypes.indexOf(item.sys_id.value) == -1)
				return false;
			
			return true;
		});
		return result;
	},
	
	getAllCommunicationTypes: function() {
		var commTypesGr = new GlideRecord(this.TABLES.ON_CALL_COMMUNICATION_TYPE);
		commTypesGr.query();
		var resp = [];
		if (commTypesGr.canRead()) {
			while(commTypesGr.next())
				resp.push(this.onCallCommon.toJS(commTypesGr, ['type']));
		}
		return resp;
	},
	
	saveContactPreference: function(record) {
		var map = {
			rota: 'cmn_rota',
			escalation_set: 'cmn_rota_escalation_set'
		};
		
		var contactPreferenceGr = new GlideRecord(this.TABLES.CMN_ROTA_CONTACT_PREFERENCE);
		if (!record['sys_id'] && contactPreferenceGr.canCreate()) {
			if (!record['contact_attempt']) {
				var maxAttempt =  new OCEscDesignerContactPrefUtilAjax().getHighestOrderContactAttempt(record.type, record[map[record.type]]);
				record.contact_attempt = maxAttempt + 1;
			}
			contactPreferenceGr.initialize();
			this._setSaveRecordProperties(record, contactPreferenceGr);
			contactPreferenceGr.insert();
		}
		else if(record['sys_id']) {
			contactPreferenceGr.get(record['sys_id']);
			this._setSaveRecordProperties(record, contactPreferenceGr);
			contactPreferenceGr.update();
		}
	},
	_setSaveRecordProperties: function(record, gr) {
		for (var key in record) {
			if (record.hasOwnProperty(key))
				gr.setValue(key, record[key]);
		}
	},
	
	getUserFromDeviceOrContactSource: function (contactSourceValue, type) {
		var notifDeviceSourceMap = {
			'Voice': 'phone_number',
			'SMS': 'phone_number',
			'Email': 'email_address'
		};
		
		var contactSourceMap = {
			'Voice': {
				sourceTypeValue: 'phone_number',
				sourceField: 'phone_number_source'
			},
			'SMS': {
				sourceTypeValue: 'phone_number',
				sourceField: 'phone_number_source'
			},
			'Email': {
				sourceTypeValue: 'email',
				sourceField: 'email_source'
			}
		};
		
		var voiceDeviceGr = new GlideRecord("cmn_notif_device");
		voiceDeviceGr.addQuery(notifDeviceSourceMap[type], contactSourceValue);
		voiceDeviceGr.addNotNullQuery("user");
		voiceDeviceGr.addQuery("type", type);
		voiceDeviceGr.query();
		if (voiceDeviceGr.next())
			return voiceDeviceGr.user;

		var csGr = new GlideRecord('sys_on_call_contact_source');
		csGr.addQuery('source_type', contactSourceMap[type].sourceTypeValue);
		csGr.addQuery('active', true);
		csGr.query();

		while (csGr.next()) {
			var gr = new GlideRecord(csGr.table + '');
			gr.addQuery(csGr[contactSourceMap[type].sourceField], contactSourceValue);
			gr.query();
			if (gr.next()) {
				if (csGr.table == 'sys_user')
					return gr.getValue('sys_id');
				else
					return gr.getValue(csGr.user_field);
			}
		}
	},
	
	canCreateContactOverrides: function() {
		return GlidePluginManager.isActive('com.snc.notify') || GlidePluginManager.isActive('sn_slack_ah_v2');
	},
	
	type: 'OnCallContactPreferenceUtilSNC'
};
```