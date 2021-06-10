---
title: "OnCallWorkflowUtilsSNC"
id: "oncallworkflowutilssnc"
---

API Name: global.OnCallWorkflowUtilsSNC

```js
var OnCallWorkflowUtilsSNC = Class.create();
OnCallWorkflowUtilsSNC.prototype = {
    initialize: function() {
    },
	
	TABLES: {
		ON_CALL_ESCALATION_RESPONSE: 'on_call_escalation_response'
	},
	
	COMMUNICATION_RESPONSE: {
		REJECTED: 'rejected'
	},
	
	getDeviceDetails: function(recordClass, currentEscalateeId) {
		var deviceDetails = {};
		if (recordClass == 'sys_user') {
			var notifyUtils = new NotifyUtils();
			deviceDetails.smsDevice = notifyUtils.getUniquePhoneNumbersForUsersAndGroups([], [currentEscalateeId], [], notifyUtils.numberType.sms, false);
			deviceDetails.voiceDevice = notifyUtils.getUniquePhoneNumbersForUsersAndGroups([], [currentEscalateeId], [], notifyUtils.numberType.voice, false);
			deviceDetails.emailDevice = this.getAvailableEmailDevice(currentEscalateeId);
		} else {
			var cmnNotifDevice = new GlideRecord('cmn_notif_device');
			cmnNotifDevice.get(currentEscalateeId);
			if (cmnNotifDevice) {
				var type = cmnNotifDevice.getValue('type');
				var phoneNumber = cmnNotifDevice.getValue('phone_number');
				var emailAddress = cmnNotifDevice.getValue('email_address');
				if (type == 'SMS' && JSUtil.notNil(phoneNumber)) {
					deviceDetails.smsDevice = [phoneNumber];
					deviceDetails.device_phone_number = phoneNumber;
				} else if (type == 'Voice' && JSUtil.notNil(phoneNumber)) {
					deviceDetails.voiceDevice = [phoneNumber];
					deviceDetails.device_phone_number = phoneNumber;
				} else if (type == 'Email' && JSUtil.notNil(emailAddress)) {
					deviceDetails.emailDevice = emailAddress;
					deviceDetails.device_email_address = emailAddress;
				}
			}
		}
		return deviceDetails;
	},
	
	getAvailableEmailDevice: function(userId) {
		var email = new GlideRecord("cmn_notif_device");
		email.addQuery("user", userId);
		email.addQuery("type", "email");
		email.orderBy("order");
		email.addActiveQuery();
		email.query();

		while (email.next()) {
			// if there is no schedule the device is always available
			if (email.getElement("schedule").nil())
				return email;

			// check is the device is available based on its schedule
			var gSchedule = new GlideSchedule(email.getValue("schedule"));
			if(gSchedule.isInSchedule(new GlideDateTime()))
				return email;
		}

		return null;
	},
	
	getUserName: function(userId) {
		var userGr = new GlideRecord('sys_user');
		userGr.get(userId);
		return userGr.getValue('name');
	},

	getGroupName: function(groupId) {
		var groupGr = new GlideRecord('sys_user_group');
		groupGr.get(groupId);
		return groupGr.getValue('name');
	},

	getDeviceName: function(deviceId) {
		var deviceGr = new GlideRecord('cmn_notif_device');
		deviceGr.get(deviceId);
		if (deviceGr && deviceGr.getValue('type') == 'Voice' && deviceGr.getValue('phone_number'))
			return deviceGr.getValue('name');
		return null;
	},
	
	getPhoneNumber: function(deviceId) {
		var deviceGr = new GlideRecord('cmn_notif_device');
		deviceGr.get(deviceId);
		if (deviceGr && deviceGr.getValue('type') == 'Voice' && deviceGr.getValue('phone_number'))
			return deviceGr.getValue('phone_number');
		return null;
	},

	getCatchAll: function(currentRotaID, rota) {
		var catchAllString = "";
		var catchAllType = rota.getCatchAllType(currentRotaID);
		var userGr;
		if (catchAllType == 'group_manager' || catchAllType == 'individual') {
			var catchAllUser = rota.getCatchAll(currentRotaID);
			userGr = new GlideRecord('sys_user');
			userGr.addActiveQuery();
			if (userGr.get(catchAllUser)) {
				catchAllString += gs.getMessage("- {0} (Catch All)", [userGr.getDisplayValue()]) + " \n";
			}
		}
		else if (catchAllType == 'all') {
			// get all members for this roster
			var catchAllusers = "";
			var catchAllRoster = rota.getCatchAll(currentRotaID);
			rotaMemberGr = new GlideRecord('cmn_rota_member');
			rotaMemberGr.addQuery('roster', catchAllRoster);
			rotaMemberGr.query();
			while (rotaMemberGr.next()) {
				userGr = new GlideRecord('sys_user');
				userGr.addActiveQuery();
				if (userGr.get(rotaMemberGr.member + '')) {
					catchAllusers += userGr.getDisplayValue() + ', ';
				}
			}
			if (catchAllusers.length > 0)
				catchAllusers = catchAllusers.slice(0, - 2);
			catchAllString += gs.getMessage("- {0} (Catch All)", [catchAllusers]) + " \n";
		}
		return catchAllString;
	},
	
	getRotasFromEscalationPlan: function(groupId, gdt, rota, taskGr) {
		var rotas = {};
		var escalationPlan = rota.getEscalationPlan(groupId, new GlideDateTime(gdt), null, taskGr);
		for(var i = 0;i < escalationPlan.length; i++) {
			var escalatee = escalationPlan[i];
			if (escalatee.rotaId) {
				if (!rotas[escalatee.rotaId])
					rotas[escalatee.rotaId] = [];
				rotas[escalatee.rotaId].push({
					userId: escalatee.userId,
					userIds: escalatee.userIds,
					escalationGroups: escalatee.escalationGroups,
					deviceId: escalatee.deviceId,
					deviceIds: escalatee.deviceIds,
					reminderNum: escalatee.reminderNum
				});
			}

			for (var j = 0; j < escalatee.additionalEscalatees.length; j++) {
				var additionalEscalatee = escalatee.additionalEscalatees[j];
				if(!rotas[additionalEscalatee.rotaId])
					rotas[additionalEscalatee.rotaId] = [];
				rotas[additionalEscalatee.rotaId].push({
					userId: additionalEscalatee.userId,
					userIds: additionalEscalatee.userIds,
					escalationGroups: additionalEscalatee.escalationGroups,
					deviceId: additionalEscalatee.deviceId,
					deviceIds: additionalEscalatee.deviceIds,
					reminderNum: additionalEscalatee.reminderNum});
			}
		}	
		return rotas;
	},
	
	generateWorknotes: function(rotaMaxLevel, groupName, rotas, rota) {
		var worknotes = gs.getMessage("Conference escalation is in progress with following escalation plan for {0} group:", [groupName]) + " \n\n";
		var level = 0;
		var that = this;
		while ((rotaMaxLevel + 1) > level) {
			level++;
			Object.keys(rotas).forEach(function(key) {
				if(rotas[key][level-1]) {
					if (rotas[key][level-1].userId) {
						var escalateeName = that.getUserName(rotas[key][level-1].userId);
						worknotes += gs.getMessage("- User: {0} ({1} reminder(s))", [escalateeName, rotas[key][level-1].reminderNum+'']) + ' \n';
					}
					if (rotas[key][level-1].userIds) {
						for (var i = 0; i < rotas[key][level-1].userIds.length; i++) {
							var escalateeName = that.getUserName(rotas[key][level-1].userIds[i]);
							worknotes += gs.getMessage("- User: {0} ({1} reminder(s))", [escalateeName, rotas[key][level-1].reminderNum+'']) + ' \n';
						}
					}
					if (rotas[key][level-1].escalationGroups) {
						for (var i = 0; i < rotas[key][level-1].escalationGroups.length; i++) {
							var groupName = that.getGroupName(rotas[key][level-1].escalationGroups[i]);
							worknotes += gs.getMessage("- Group: {0}", [groupName]) + ' \n';
						}
					}
					if (rotas[key][level-1].deviceId) {
						var deviceName = that.getDeviceName(rotas[key][level-1].deviceId);
						if (deviceName)
							worknotes += gs.getMessage("- Device: {0} ({1} reminder(s))", [deviceName, rotas[key][level-1].reminderNum+'']) + ' \n';
					}
					if (rotas[key][level-1].deviceIds) {
						for (var i = 0; i < rotas[key][level-1].deviceIds.length; i++) {
							var deviceName = that.getDeviceName(rotas[key][level-1].deviceIds[i]);
							if (deviceName)
								worknotes += gs.getMessage("- Device: {0} ({1} reminder(s))", [deviceName, rotas[key][level-1].reminderNum+'']) + ' \n';
						}
					}
				} else if (level == rotas[key].length + 1 ) {
					worknotes +=  that.getCatchAll(key, rota);
				}
			});
		}
		return worknotes;
	},

	escalateToCatchAll: function (currentRotaID, group, current) {
		var notifyCommTask = new sn_comm_management.CommTaskNotifyAjax();
		var rota = new OnCallRotation();
		var catchAllType = rota.getCatchAllType(currentRotaID);
		if (catchAllType == 'group_manager' || catchAllType == 'individual') {
			var catchAllUser = rota.getCatchAll(currentRotaID);
			var userGr = new GlideRecord('sys_user');
			userGr.addActiveQuery();
			if (userGr.get(catchAllUser)) {
				var callInitiated = notifyCommTask.call(userGr.getUniqueValue(), current, group.sys_id);
			}
		}
		else if (catchAllType == 'all') {
			// get all members for this roster
			var catchAllRoster = rota.getCatchAll(currentRotaID);
			rotaMemberGr = new GlideRecord('cmn_rota_member');
			rotaMemberGr.addQuery('roster', catchAllRoster);
			rotaMemberGr.query();
			while (rotaMemberGr.next()) {
				var userGr = new GlideRecord('sys_user');
				userGr.addActiveQuery();
				if (userGr.get(rotaMemberGr.member + '')) {
					var callInitiated = notifyCommTask.call(userGr.getUniqueValue(), current, group.sys_id);
				}
			}
		}
	},

	getCatchAllUsers: function (currentRotaID) {
		var rota = new OnCallRotation();
		var catchAllType = rota.getCatchAllType(currentRotaID);
		var catchAllUsers = [];

		if (catchAllType == 'group_manager' || catchAllType == 'individual') {
			var catchAllUser = rota.getCatchAll(currentRotaID);
			var userGr = new GlideRecord('sys_user');
			userGr.addActiveQuery();
			if (userGr.get(catchAllUser)) {
				catchAllUsers.push(userGr.getUniqueValue());
			}
		}
		else if (catchAllType == 'all') {
			// get all members for this roster
			var catchAllRoster = rota.getCatchAll(currentRotaID);
			rotaMemberGr = new GlideRecord('cmn_rota_member');
			rotaMemberGr.addQuery('roster', catchAllRoster);
			rotaMemberGr.query();
			while (rotaMemberGr.next()) {
				var userGr = new GlideRecord('sys_user');
				userGr.addActiveQuery();
				if (userGr.get(rotaMemberGr.member + '')) {
					catchAllUsers.push(userGr.getUniqueValue());
				}
			}
		}

		return catchAllUsers;
	},

	escalateToCatchAllByPreferences: function(currentRotaID, group, current) {
		var notifyCommTask = new sn_comm_management.CommTaskNotifyAjax();

		var rota = new OnCallRotation();
		var catchAllType = rota.getCatchAllType(currentRotaID);
		var catchAllUsers = [];

		if (catchAllType == 'group_manager' || catchAllType == 'individual') {
			var catchAllUser = rota.getCatchAll(currentRotaID);
			var userGr = new GlideRecord('sys_user');
			userGr.addActiveQuery();
			if (userGr.get(catchAllUser)) {
				catchAllUsers.push(userGr.getUniqueValue());
			}
		}
		else if (catchAllType == 'all') {
			// get all members for this roster
			var catchAllRoster = rota.getCatchAll(currentRotaID);
			rotaMemberGr = new GlideRecord('cmn_rota_member');
			rotaMemberGr.addQuery('roster', catchAllRoster);
			rotaMemberGr.query();
			while (rotaMemberGr.next()) {
				var userGr = new GlideRecord('sys_user');
				userGr.addActiveQuery();
				if (userGr.get(rotaMemberGr.member + '')) {
					catchAllUsers.push(userGr.getUniqueValue());
				}
			}
		}
		for (var i = 0; i < catchAllUsers.length; i++) {
			var userId = catchAllUsers[i];
			var userPrefs = this.getPreferencePhoneNumbers(userId, 1);
			if (userPrefs.length > 0) {
				this.callUserPreferredNumbers(userId, current, group.sys_id, userPrefs);
			}
			else {
				notifyCommTask.call(userId, current, group.sys_id);
			}
		}
	},

	startWorkflowForGroup: function (groupId, current, onCallConferenceCallEscalationByTCMWorkflowId, table, sysId, parentEscalationLevelId) {
		var wf = new Workflow();
		wf.startFlow(onCallConferenceCallEscalationByTCMWorkflowId, current, current.operation(), { group: groupId, table: table, sysid: sysId, parent_escalation_level: parentEscalationLevelId });
	},

	checkIfPrimaryAnsweredCall: function(currentEscalatee, conferenceCallSysId) {
		var participant = new GlideRecord('notify_participant');
		participant.addActiveQuery();
		participant.addQuery('notify_conference_call', conferenceCallSysId);
		if (currentEscalatee.type == 'user')
			participant.addQuery('user', currentEscalatee.id);
		else
			participant.addQuery('phone_number', currentEscalatee.phone_number);
		participant.query();
		if (participant.hasNext())
			return true;
		return false;
	},

	getRotasAndUpdateFirstReminderJoinedStatus: function (groupId, gdt, hasFirstReminderJoined, firstReminderSent, conferenceCallSysId, taskGr) {
		var rotas = {};
		var rota = new OnCallRotation();
		var escalationPlan = rota.getEscalationPlan(groupId, new GlideDateTime(gdt), null, taskGr);
		for (var i = 0; i < escalationPlan.length; i++) {
			var escalatee = escalationPlan[i];
			if (escalatee.rotaId) {
				if (!rotas[escalatee.rotaId])
					rotas[escalatee.rotaId] = [];
				if (i == 0 && firstReminderSent && escalatee.reminderNum == 0) {
					rotas[escalatee.rotaId].push({
						escalationGroups: escalatee.escalationGroups
					});
				} else {
					rotas[escalatee.rotaId].push({
						userId: escalatee.userId,
						userIds: escalatee.userIds,
						escalationGroups: escalatee.escalationGroups,
						deviceId: escalatee.deviceId,
						deviceIds: escalatee.deviceIds,
						reminderNumber: escalatee.reminderNum
					});
				}
				if (i == 0 && firstReminderSent) {
					escalatee.reminderNum--;
					if (escalatee.userId)
						hasFirstReminderJoined = hasFirstReminderJoined || this.checkIfPrimaryAnsweredCall({ type: 'user', id: escalatee.userId }, conferenceCallSysId);
					if (escalatee.userIds) {
						for (var k = 0; k < escalatee.userIds.length; k++) {
							hasFirstReminderJoined = hasFirstReminderJoined || this.checkIfPrimaryAnsweredCall({ type: 'user', id: escalatee.userIds[k] }, conferenceCallSysId);
						}
					}
					if (escalatee.deviceId) {
						var phoneNumber = this.getPhoneNumber(escalatee.deviceId);
						hasFirstReminderJoined = hasFirstReminderJoined || this.checkIfPrimaryAnsweredCall({ type: 'device', phone_number: phoneNumber }, conferenceCallSysId);
					}
					if (escalatee.deviceIds) {
						for (var k = 0; k < escalatee.deviceIds.length; k++) {
							var phoneNumber = this.getPhoneNumber(escalatee.deviceIds[k]);
							hasFirstReminderJoined = hasFirstReminderJoined || this.checkIfPrimaryAnsweredCall({ type: 'device', phone_number: phoneNumber }, conferenceCallSysId);
						}
					}
				}
				while (escalatee.reminderNum > 0) {
					rotas[escalatee.rotaId].push({
						userId: escalatee.userId,
						userIds: escalatee.userIds,
						deviceId: escalatee.deviceId,
						deviceIds: escalatee.deviceIds,
						reminderNumber: escalatee.reminderNum
					});
					escalatee.reminderNum--;
				}
			}
			for (var j = 0; j < escalatee.additionalEscalatees.length; j++) {
				var additionalEscalatee = escalatee.additionalEscalatees[j];
				if (!rotas[additionalEscalatee.rotaId])
					rotas[additionalEscalatee.rotaId] = [];
				if (i == 0 && firstReminderSent && additionalEscalatee.reminderNum == 0) {
					rotas[additionalEscalatee.rotaId].push({
						escalationGroups: additionalEscalatee.escalationGroups
					});
				} else {
					rotas[additionalEscalatee.rotaId].push({
						userId: additionalEscalatee.userId,
						userIds: additionalEscalatee.userIds,
						escalationGroups: additionalEscalatee.escalationGroups,
						deviceId: additionalEscalatee.deviceId,
						deviceIds: additionalEscalatee.deviceIds,
						reminderNumber: additionalEscalatee.reminderNum
					});
				}
				if (i == 0 && firstReminderSent) {
					additionalEscalatee.reminderNum--;
					if (additionalEscalatee.userId)
						hasFirstReminderJoined = hasFirstReminderJoined || this.checkIfPrimaryAnsweredCall({ type: 'user', id: additionalEscalatee.userId }, conferenceCallSysId);
					if (additionalEscalatee.userIds) {
						for (var k = 0; k < additionalEscalatee.userIds.length; k++) {
							hasFirstReminderJoined = hasFirstReminderJoined || this.checkIfPrimaryAnsweredCall({ type: 'user', id: additionalEscalatee.userIds[k] }, conferenceCallSysId);
						}
					}
					if (additionalEscalatee.deviceId) {
						var phoneNumber = this.getPhoneNumber(additionalEscalatee.deviceId);
						hasFirstReminderJoined = hasFirstReminderJoined || this.checkIfPrimaryAnsweredCall({ type: 'device', phone_number: phoneNumber }, conferenceCallSysId);
					}
					if (additionalEscalatee.deviceIds) {
						for (var k = 0; k < additionalEscalatee.deviceIds.length; k++) {
							var phoneNumber = this.getPhoneNumber(additionalEscalatee.deviceIds[k]);
							hasFirstReminderJoined = hasFirstReminderJoined || this.checkIfPrimaryAnsweredCall({ type: 'device', phone_number: phoneNumber }, conferenceCallSysId);
						}
					}
				}
				while (additionalEscalatee.reminderNum > 0) {
					rotas[additionalEscalatee.rotaId].push({
						userId: additionalEscalatee.userId,
						userIds: additionalEscalatee.userIds,
						deviceId: additionalEscalatee.deviceId,
						deviceIds: additionalEscalatee.deviceIds,
						reminderNumber: additionalEscalatee.reminderNum
					});
					additionalEscalatee.reminderNum--;
				}
			}
		}

		return {
			rotas: rotas,
			hasFirstReminderJoined: hasFirstReminderJoined,
			currentRotaID: rota.getCurrentRotaID()
		};
	},

	getRotasAndUpdateFirstReminderJoinedStatusByPreferences: function(groupId, gdt, hasFirstReminderJoined, firstReminderSent, conferenceCallSysId, taskGr) {
		var rotas = {};
		var rota = new OnCallRotation();
		var escalationPlan = rota.getEscalationPlan(groupId, new GlideDateTime(gdt), null, taskGr);
		for(var i = 0;i < escalationPlan.length; i++) {
			var escalatee = escalationPlan[i];
			if (escalatee.rotaId) {
				if (!rotas[escalatee.rotaId])
					rotas[escalatee.rotaId] = [];

				if (i == 0 && firstReminderSent) {
					if (escalatee.userId)
						hasFirstReminderJoined = hasFirstReminderJoined || this.checkIfPrimaryAnsweredCall({type: 'user', id: escalatee.userId}, conferenceCallSysId);
					if (escalatee.userIds) {
						for (var k = 0; k < escalatee.userIds.length; k++) {
							hasFirstReminderJoined = hasFirstReminderJoined || this.checkIfPrimaryAnsweredCall({type: 'user', id: escalatee.userIds[k]}, conferenceCallSysId);
						}
					}
					if (escalatee.deviceId) {
						var phoneNumber = this.getPhoneNumber(escalatee.deviceId);
						hasFirstReminderJoined = hasFirstReminderJoined || this.checkIfPrimaryAnsweredCall({type: 'device', phone_number: phoneNumber}, conferenceCallSysId);
					}
					if (escalatee.deviceIds) {
						for (var k = 0; k < escalatee.deviceIds.length; k++) {
							var phoneNumber = this.getPhoneNumber(escalatee.deviceIds[k]);
							hasFirstReminderJoined = hasFirstReminderJoined || this.checkIfPrimaryAnsweredCall({type: 'device', phone_number: phoneNumber}, conferenceCallSysId);
						}
					}
				}

				var contactAttempt = 1;
				while (contactAttempt <= escalatee.reminderNum + 1) {
					if (i == 0 && firstReminderSent && contactAttempt == 1) {
						rotas[escalatee.rotaId].push({
							escalationGroups: escalatee.escalationGroups,
							deviceId: escalatee.deviceId,
							deviceIds: escalatee.deviceIds,
							contactAttempt: contactAttempt,
							escalationLevel: escalatee.order,
							escalatee: escalatee
						});
					}
					else {
						var escalateeObj = {
							userId: escalatee.userId,
							userIds: escalatee.userIds,
							deviceId: escalatee.deviceId,
							deviceIds: escalatee.deviceIds,
							contactAttempt: contactAttempt,
							escalationLevel: escalatee.order,
							escalatee: escalatee
						};
						if (contactAttempt == 1) {
							escalateeObj.escalationGroups = escalatee.escalationGroups
						}
						rotas[escalatee.rotaId].push(escalateeObj);
					}
					contactAttempt++;
				}
			}

			for(var j = 0; j < escalatee.additionalEscalatees.length; j++) {
				var additionalEscalatee = escalatee.additionalEscalatees[j];
				if(!rotas[additionalEscalatee.rotaId])
					rotas[additionalEscalatee.rotaId] = [];

				if (i == 0 && firstReminderSent) {
					if (additionalEscalatee.userId)
					hasFirstReminderJoined = hasFirstReminderJoined || this.checkIfPrimaryAnsweredCall({type: 'user', id: additionalEscalatee.userId}, conferenceCallSysId);
					if (additionalEscalatee.userIds) {
						for (var k = 0; k < additionalEscalatee.userIds.length; k++) {
							hasFirstReminderJoined = hasFirstReminderJoined || this.checkIfPrimaryAnsweredCall({type: 'user', id: additionalEscalatee.userIds[k]}, conferenceCallSysId);
						}
					}
					if (additionalEscalatee.deviceId) {
						var phoneNumber = this.getPhoneNumber(additionalEscalatee.deviceId);
						hasFirstReminderJoined = hasFirstReminderJoined || this.checkIfPrimaryAnsweredCall({type: 'device', phone_number: phoneNumber}, conferenceCallSysId);
					}
					if (additionalEscalatee.deviceIds) {
						for (var k = 0; k < additionalEscalatee.deviceIds.length; k++) {
							var phoneNumber = this.getPhoneNumber(additionalEscalatee.deviceIds[k]);
							hasFirstReminderJoined = hasFirstReminderJoined || this.checkIfPrimaryAnsweredCall({type: 'device', phone_number: phoneNumber}, conferenceCallSysId);
						}
					}
				}

				var contactAttempt = 1;
				while (contactAttempt <= additionalEscalatee.reminderNum + 1) {
					if (i == 0 && firstReminderSent && contactAttempt == 1) {
						rotas[additionalEscalatee.rotaId].push({
							escalationGroups: additionalEscalatee.escalationGroups,
							deviceId: additionalEscalatee.deviceId,
							deviceIds: additionalEscalatee.deviceIds,
							contactAttempt: contactAttempt,
							escalationLevel: additionalEscalatee.order,
							escalatee: additionalEscalatee
						});
					}
					else {
						var escalateeObj = {
							userId: additionalEscalatee.userId,
							userIds: additionalEscalatee.userIds,
							deviceId: additionalEscalatee.deviceId,
							deviceIds: additionalEscalatee.deviceIds,
							contactAttempt: contactAttempt,
							escalationLevel: additionalEscalatee.order,
							escalatee: additionalEscalatee
						};
						if (contactAttempt == 1) {
							escalateeObj.escalationGroups = additionalEscalatee.escalationGroups;
						}
						rotas[additionalEscalatee.rotaId].push(escalateeObj);
					}
					contactAttempt++;
				}
			}
		}
		
		return {
			rotas: rotas,
			hasFirstReminderJoined: hasFirstReminderJoined,
			currentRotaID: rota.getCurrentRotaID()
		};
	},
	
	getEscalatees: function(escalationPlan, processedRotas) {
		var escalatees = [];
		var reminderTime = {};

		for (var i = 0; i < escalationPlan.length; i++) {
			var escalatee = escalationPlan[i];
			var reminderDelay = escalatee.timeBetweenReminders ? escalatee.timeBetweenReminders.getNumericValue() / 1000 : 0;
			var reminders = escalatee.reminderNum;
			var timeToNextStep = escalatee.timeToNextStep ? escalatee.timeToNextStep.getNumericValue() / 1000: 0;
			if(!reminderTime[escalatee.rotaId])
				reminderTime[escalatee.rotaId] = 0;
			if (processedRotas.indexOf(escalatee.rotaId) == -1) {

				var users = [];
				var groups = [];
				var devices = [];

				if (escalatee.getUserId())
					users.push(escalatee.getUserId());
				if (escalatee.getUserIds() && escalatee.getUserIds().length > 0)
					users = users.concat(escalatee.getUserIds());

				for (var j = 0; j < users.length; j++) {
					var time = reminderTime[escalatee.rotaId];
					var escalateeGr = new GlideRecord('sys_user');
					if (escalateeGr.get(users[j])) {
						escalatees.push({type: 'User', name: escalateeGr.getValue('name'), reminderTime: time});
						var reminderNum = reminders;
						while (reminderNum !== 0) {
							time = time + reminderDelay;
							escalatees.push({type: 'User', name: escalateeGr.getValue('name'), reminderTime: time});
							reminderNum--;
						}
					}
				}

				if (escalatee.getUserIds() && escalatee.getUserIds().length > 0)
					groups = escalatee.getEscalationGroups();

				for (var j = 0; j < groups.length; j++) {
					var time = reminderTime[escalatee.rotaId];
					var escalateeGr = new GlideRecord('sys_user_group');
					if (escalateeGr.get(groups[j])) {
						escalatees.push({type: 'Group', name: escalateeGr.getValue('name'), reminderTime: time});
					}
				}

				if (escalatee.getDeviceId())
					devices.push(escalatee.getDeviceId());
				if (escalatee.getDeviceIds() && escalatee.getDeviceIds().length > 0)
					devices = devices.concat(escalatee.getDeviceIds());

				for (var j = 0; j < devices.length; j++) {
					var time = reminderTime[escalatee.rotaId];
					var escalateeGr = new GlideRecord('cmn_notif_device');
					if (escalateeGr.get(devices[j])) {
						escalatees.push({type: 'Device', name: escalateeGr.getValue('name'), reminderTime: time});
						var reminderNum = reminders;
						while (reminderNum !== 0) {
							time = time + reminderDelay;
							escalatees.push({type: 'Device', name: escalateeGr.getValue('name'), reminderTime: time});
							reminderNum--;
						}
					}
				}

				if (escalatee.cmnRotaEscStepDefId)
					reminderTime[escalatee.rotaId] = reminderTime[escalatee.rotaId] + reminderDelay * reminders + timeToNextStep;
				else if(escalatee.rotaId)
					reminderTime[escalatee.rotaId] = reminderTime[escalatee.rotaId] + reminderDelay * (reminders + 1);

			}

			if(escalationPlan[i].additionalEscalatees) {
				for(var j = 0; j < escalationPlan[i].additionalEscalatees.length; j++){
					var additionalEscalatee = escalationPlan[i].additionalEscalatees[j];
					var reminderDelay = additionalEscalatee.timeBetweenReminders ? additionalEscalatee.timeBetweenReminders.getNumericValue() / 1000 : 0;
					var reminders = additionalEscalatee.reminderNum;
					var timeToNextStep = additionalEscalatee.timeToNextStep ? additionalEscalatee.timeToNextStep.getNumericValue() / 1000: 0;
					if(!reminderTime[additionalEscalatee.rotaId])
						reminderTime[additionalEscalatee.rotaId] = 0;
					if (processedRotas.indexOf(additionalEscalatee.rotaId) == -1) {

						var users = [];
						var groups = [];
						var devices = [];

						if (additionalEscalatee.getUserId())
							users.push(additionalEscalatee.getUserId());
						if (additionalEscalatee.getUserIds() && additionalEscalatee.getUserIds().length > 0)
							users = users.concat(additionalEscalatee.getUserIds());

						for (var k = 0; k < users.length; k++) {
							var time = reminderTime[additionalEscalatee.rotaId];
							var escalateeGr = new GlideRecord('sys_user');
							if (escalateeGr.get(users[k])) {
								escalatees.push({type: 'User', name: escalateeGr.getValue('name'), reminderTime: time});
								var reminderNum = reminders;
								while (reminderNum !== 0) {
									time = time + reminderDelay;
									escalatees.push({type: 'User', name: escalateeGr.getValue('name'), reminderTime: time});
									reminderNum--;
								}
							}
						}

						if (additionalEscalatee.getUserIds() && additionalEscalatee.getUserIds().length > 0)
							groups = additionalEscalatee.getEscalationGroups();

						for (var k = 0; k < groups.length; k++) {
							var time = reminderTime[additionalEscalatee.rotaId];
							var escalateeGr = new GlideRecord('sys_user_group');
							if (escalateeGr.get(groups[k])) {
								escalatees.push({type: 'Group', name: escalateeGr.getValue('name'), reminderTime: time});
							}
						}

						if (additionalEscalatee.getDeviceId())
							devices.push(additionalEscalatee.getDeviceId());
						if (additionalEscalatee.getDeviceIds() && additionalEscalatee.getDeviceIds().length > 0)
							devices = devices.concat(additionalEscalatee.getDeviceIds());

						for (var k = 0; k < devices.length; k++) {
							var time = reminderTime[additionalEscalatee.rotaId];
							var escalateeGr = new GlideRecord('cmn_notif_device');
							if (escalateeGr.get(devices[k])) {
								escalatees.push({type: 'Device', name: escalateeGr.getValue('name'), reminderTime: time});
								var reminderNum = reminders;
								while (reminderNum !== 0) {
									time = time + reminderDelay;
									escalatees.push({type: 'Device', name: escalateeGr.getValue('name'), reminderTime: time});
									reminderNum--;
								}
							}
						}

						if (additionalEscalatee.cmnRotaEscStepDefId)
							reminderTime[additionalEscalatee.rotaId] = reminderTime[additionalEscalatee.rotaId] + reminderDelay * reminders + timeToNextStep;
						else
							reminderTime[additionalEscalatee.rotaId] = reminderTime[additionalEscalatee.rotaId] + reminderDelay * (reminders + 1);

					}
				}
			}
		}

		escalatees.sort(function(a, b) {
			return a.reminderTime - b.reminderTime;
		});
		return escalatees;
	},
	
	getUser: function(userId) {
		var userGr = new GlideRecord("sys_user");
		if (userGr.get(userId)) {
			return {
				recordClass: 'sys_user',
				id: userId,
				name: userGr.getValue('name'),
				email: userGr.getValue('email')
			};
		}
		return null;
	},
	
	getDevice: function (deviceId) {
		var deviceGr = new GlideRecord('cmn_notif_device');
		if (deviceGr.get(deviceId)) {
			return {
				recordClass: 'cmn_notif_device',
				id: deviceId,
				name: deviceGr.getValue('name'),
				type: deviceGr.getValue('type'),
				email: deviceGr.getValue('email_address')
			};
		}
		return null;
	},
	
	getOnCallGroupNotifyNumber: function() {
		if(this.isNotifyPluginInstalled()){
			var notifyNumberGr = new GlideRecord('notify_number');
			notifyNumberGr.addQuery('notify_group.name', 'On-Call Group');
			notifyNumberGr.addActiveQuery();
			notifyNumberGr.query();
			if(notifyNumberGr.next())
				return notifyNumberGr.number;
		}
	},

	getOnCallGroupNotifyNumberSysId: function () {
		if(this.isNotifyPluginInstalled()){
			var notifyNumberGr = new GlideRecord('notify_number');
			notifyNumberGr.addQuery('notify_group.name', 'On-Call Group');
			notifyNumberGr.addActiveQuery();
			notifyNumberGr.query();
			if (notifyNumberGr.next())
				return notifyNumberGr.getUniqueValue();
		}
	},

	 /**
	 * Add all phone numbers of the user to a conference call
	 *
	 * @param participant
	 * @param conferenceCall
	 * @param groupId
	 * @param phoneNumbers - all phone numbers based on user preferences
	 * @returns {boolean}
	 */
	callUserPreferredNumbers: function(participant, conferenceCall, groupId, phoneNumbers) {
		var record = new GlideRecord('sys_user');
		var user;
		if (record.get(participant))
  			user = record;

		var from = conferenceCall.notify_number.number + '';
		var to;

		// got a from number?
		if (!from) {
			gs.info(gs.getMessage("Conference call record doesn't have any notify number"));
			return false;
		}

		// all Phone numbers called
		for (var i = 0; i < phoneNumbers.length; i++) {
			// add to conference call
			var notify = new sn_notify.NotifyScoped();
			notify.call(from, phoneNumbers[i], conferenceCall, (!user ? null : user.getUniqueValue()), (!groupId ? null : groupId));	
		}
		return true;
	},

	// Get preferred phone numbers for a user
	getPreferencePhoneNumbers: function(userSysId, contactAttempt) {
		var onContactPrefUtil = new OnCallContactPreferenceUtil();
		var userPrefs = onContactPrefUtil.getUserPreferences(userSysId, contactAttempt, null, 'voice');
		var phoneNums = [];
		if (userPrefs.length > 0) {
			for (var i = 0; i < userPrefs.length ; i++) {
				var pref = userPrefs[i];
				if (pref.number)
					phoneNums.push(pref.number);
			}
		} 
		return phoneNums;
	},

	addEscalatee: function (userId, preferredPhoneNumbers, scratchpad) {
		if (!preferredPhoneNumbers)
			preferredPhoneNumbers = [];
		if (scratchpad.processedEscalatees.indexOf(userId) == -1) {
			scratchpad.processedEscalatees.push(userId);
		}
		for (var i = 0; i < preferredPhoneNumbers.length; i++) {
			var phoneNumber = preferredPhoneNumbers[i];
			if (scratchpad.processedPhoneNumbers.indexOf(phoneNumber) == -1) {
				scratchpad.processedPhoneNumbers.push(phoneNumber);
			}
		}
		return scratchpad;
	},
	addPhoneNumber: function (phoneNumber, scratchpad) {
		if (scratchpad.processedPhoneNumbers.indexOf(phoneNumber) == -1)
			scratchpad.processedPhoneNumbers.push(phoneNumber);
		return scratchpad;
	},
	getNotifyCallStatusResponse: function (phoneNumber, sysId) {
		var response = '';
		var notifyCallStatus = new GlideRecord("notify_call_status");
		notifyCallStatus.addQuery("notify_call.direction", "Outbound");
		notifyCallStatus.addQuery("notify_call.phone_number", phoneNumber);
		notifyCallStatus.addQuery("notify_call.source", sysId);
		notifyCallStatus.addQuery("status", "input");
		notifyCallStatus.orderByDesc("sys_created_on");
		notifyCallStatus.query();
		if (notifyCallStatus.next()) {
			response = notifyCallStatus.getValue("digits");
		}
		return response;
	},

	clearNotifyMessageNumbers: function (sourceId) {
		if (this.isNotifyPluginInstalled()) {
			if (sourceId) {
				var message = new GlideRecord("notify_message");
				message.addQuery("source", sourceId);
				message.addQuery("direction", "outbound");
				message.query();

				while (message.next()) {
					message.setValue("message_number", "");
					message.update();
				}
			}
		}
	},
	
	addEscalateePerRota: function(scratchpad) {
		var ocwUtils = new OnCallWorkflowUtils();
		var group = scratchpad.group;
		var rotas = scratchpad.rotas;
		group.currentLevel++;
		group.currentEscalateesInThisLevel = [];
		group.rotasInThisIteration = [];
		group.rotasInThisIterationIndex = 0;

		Object.keys(rotas).forEach(function (key) {
			if (rotas[key][group.currentLevel - 1]) {
				var eachRota = {
					id: key,
					escalatees: [],
					escalationLevel: rotas[key][group.currentLevel - 1].escalationLevel,
					contactAttempt: rotas[key][group.currentLevel - 1].contactAttempt,
					escalatee: rotas[key][group.currentLevel - 1].escalatee,
					escalationGroups: rotas[key][group.currentLevel - 1].escalationGroups
				};
				if (rotas[key][group.currentLevel - 1].userId) {
					var phoneNums = ocwUtils.getPreferencePhoneNumbers(rotas[key][group.currentLevel - 1].userId, rotas[key][group.currentLevel - 1].contactAttempt);
					eachRota.escalatees.push({
						id: rotas[key][group.currentLevel - 1].userId,
						type: 'user',
						phoneNumbers: phoneNums,
						contactAttempt: rotas[key][group.currentLevel - 1].contactAttempt,
						escalationLevel: rotas[key][group.currentLevel - 1].escalationLevel,
						escalatee: rotas[key][group.currentLevel - 1].escalatee,
						rotaId: key
					});
					scratchpad = ocwUtils.addEscalatee(rotas[key][group.currentLevel - 1].userId, phoneNums, scratchpad);
				}
				if (rotas[key][group.currentLevel - 1].userIds) {
					for (var i = 0; i < rotas[key][group.currentLevel - 1].userIds.length; i++) {
						var phoneNums = ocwUtils.getPreferencePhoneNumbers(rotas[key][group.currentLevel - 1].userIds[i], rotas[key][group.currentLevel - 1].contactAttempt);
						eachRota.escalatees.push({
							id: rotas[key][group.currentLevel - 1].userIds[i],
							type: 'user',
							phoneNumbers: phoneNums,
							contactAttempt: rotas[key][group.currentLevel - 1].contactAttempt,
							escalationLevel: rotas[key][group.currentLevel - 1].escalationLevel,
							escalatee: rotas[key][group.currentLevel - 1].escalatee,
							rotaId: key
						});
						scratchpad = ocwUtils.addEscalatee(rotas[key][group.currentLevel - 1].userIds[i], phoneNums, scratchpad);
					}
				}
				if (rotas[key][group.currentLevel - 1].deviceId) {
					var phoneNumber = ocwUtils.getPhoneNumber(rotas[key][group.currentLevel - 1].deviceId);
					eachRota.escalatees.push({
						id: rotas[key][group.currentLevel - 1].deviceId,
						phone_number: phoneNumber,
						type: 'device',
						contactAttempt: rotas[key][group.currentLevel - 1].contactAttempt,
						escalationLevel: rotas[key][group.currentLevel - 1].escalationLevel,
						escalatee: rotas[key][group.currentLevel - 1].escalatee,
						rotaId: key
					});
					if (phoneNumber) {
						scratchpad = ocwUtils.addPhoneNumber(phoneNumber, scratchpad);
					}
				}
				if (rotas[key][group.currentLevel - 1].deviceIds) {
					for (var i = 0; i < rotas[key][group.currentLevel - 1].deviceIds.length; i++) {
						var phoneNumber = ocwUtils.getPhoneNumber(rotas[key][group.currentLevel - 1].deviceIds[i]);
						eachRota.escalatees.push({
							id: rotas[key][group.currentLevel - 1].deviceIds[i],
							phone_number: phoneNumber,
							type: 'device',
							contactAttempt: rotas[key][group.currentLevel - 1].contactAttempt,
							escalationLevel: rotas[key][group.currentLevel - 1].escalationLevel,
							escalatee: rotas[key][group.currentLevel - 1].escalatee,
							rotaId: key
						});
						if (phoneNumber) {
							scratchpad = ocwUtils.addPhoneNumber(phoneNumber, scratchpad);
						}
					}
				}
				group.rotasInThisIteration.push(eachRota);
			} else if (group.currentLevel == rotas[key].length + 1) {
				//handle catchAll
				var catchAllUsers = ocwUtils.getCatchAllUsers(key, group, current);
				var lastLevelInThisRota = rotas[key][rotas[key].length - 1];
				if (catchAllUsers && catchAllUsers.length > 0 && lastLevelInThisRota) {
					var eachRota = {
						id: key,
						escalatees: [],
						escalationLevel: lastLevelInThisRota.escalationLevel + 1,
						contactAttempt: 1,
						escalatee: lastLevelInThisRota.escalatee,
						catchAll: true
					};

					for (var i = 0; i < catchAllUsers.length; i++) {
						var phoneNums = ocwUtils.getPreferencePhoneNumbers(catchAllUsers[i], 1);
						eachRota.escalatees.push({
							id: catchAllUsers[i],
							type: 'user',
							phoneNumbers: phoneNums,
							contactAttempt: 1,
							escalationLevel: lastLevelInThisRota.escalationLevel + 1,
							escalatee: lastLevelInThisRota.escalatee,
							rotaId: key
						});
					}

					group.rotasInThisIteration.push(eachRota);
				}
			}
		});
		return scratchpad;	
	},
	
	getEscalationResponse: function(wfcontextId, source, table, user) {
		var gr = new GlideRecord(this.TABLES.ON_CALL_ESCALATION_RESPONSE);
		gr.addQuery('table', table);
		gr.addQuery('source', source);
		gr.addQuery('user', user);
		gr.addQuery('wf_context', wfcontextId);
		gr.query();
		return gr;
	},
		
	createEscalationResponse: function(wfcontextId, source, table, user) {
		var gr = this.getEscalationResponse(wfcontextId, source, table, user);
		if (gr.hasNext())
			return;
		gr.initialize();
		gr.wf_context = wfcontextId;
		gr.source = source;
		gr.table = table;
		gr.user = user;
		if (gr.insert())
			return gr;
	},
	
	cleanEscalationResponse: function(wfcontextId) {
		if (! wfcontextId)
			return;
		var gr = new GlideRecord(this.TABLES.ON_CALL_ESCALATION_RESPONSE);
		gr.addQuery('wf_context', wfcontextId);
		gr.deleteMultiple();
	},
	
	updateEscalationResponse: function(user, table, source, response) {
		var gr = new GlideRecord(this.TABLES.ON_CALL_ESCALATION_RESPONSE);
		gr.addQuery('table', table);
		gr.addQuery('source', source);
		gr.addQuery('user', user);
		gr.query();
		while (gr.next()) {
			gr.response = response;
			gr.update();
		}
	},
	
	getWFContextsWithRejectedEscalation: function(user, table, source) {
		var wfContextIds = [];				
		var gr = new GlideRecord(this.TABLES.ON_CALL_ESCALATION_RESPONSE);
		gr.addQuery('table', table);
		gr.addQuery('source', source);
		gr.addQuery('user', user);
		gr.query();
		while (gr.next())
			wfContextIds.push(gr.wf_context + '');
		
		var wfContextIdResponse = {};
		var gr1 = new GlideRecord(this.TABLES.ON_CALL_ESCALATION_RESPONSE);
		gr1.addQuery('wf_context', 'IN', wfContextIds);
		gr1.query();
		while (gr1.next()) {
			var wfcontextId = gr1.wf_context + '';
			if(wfContextIdResponse[wfcontextId] == undefined)
				wfContextIdResponse[wfcontextId] = true;
			if(wfContextIdResponse[wfcontextId] == true && gr1.response != this.COMMUNICATION_RESPONSE.REJECTED)
				wfContextIdResponse[wfcontextId] = false;	
		}
		return wfContextIdResponse;
	},
	
	checkIfResponseReceivedAndPopulateRejectedUsers: function(inputParamObj) {
		var response = {};
		response["rejectedUserIds"] = inputParamObj.rejectedUserIds;
		
		if (this.isNotifyPluginInstalled()) {
			for (var i = 0; i < inputParamObj.processedPhoneNumber.length; i++) {
				var processedPhoneNumberObj = inputParamObj.processedPhoneNumber[i];
				var acceptResponse = "ACC";
				var rejectResponse = "REJ";
				if (processedPhoneNumberObj.message_counter != "0") {
					acceptResponse = processedPhoneNumberObj.message_counter + "ACC";
					rejectResponse = processedPhoneNumberObj.message_counter + "REJ";
				}

				// is there an inbound SMS from the escalatee phone number
				var message = new GlideRecord("notify_message");
				message.addQuery("direction", "inbound");
				message.addQuery("phone_number", processedPhoneNumberObj.phoneNumber);
				message.addQuery("sys_created_on", ">", inputParamObj.contextSysCreatedOn);
				var query = message.addQuery("body", acceptResponse);
				query.addOrCondition("body", rejectResponse);
				message.orderBy("sys_created_on");
				message.query();

				// we only care about no response or the 1st valid response
				if (message.next()) {
					var body = message.getValue('body').toUpperCase();

					if (body === acceptResponse) {
						response["acknowledged"] = true;
						response["responsedReceived"] = true;
						return response;
					}
					else if (body === rejectResponse) {
						response["acknowledged"] = false;
						if (response.rejectedUserIds.indexOf(processedPhoneNumberObj.user_id) == -1)
							response.rejectedUserIds.push(processedPhoneNumberObj.user_id);
					}
				}
			}

			for (var i = 0; i < inputParamObj.processedVoiceNumber.length; i++) {
				var processedVoiceNumberObj = inputParamObj.processedVoiceNumber[i];			
				var notifyCallResponse = this.getNotifyCallStatusResponse(processedVoiceNumberObj.phoneNumber, inputParamObj.currentSysId);

				if (notifyCallResponse == 1) {
					response["acknowledged"] = true;
					response["responsedReceived"] = true;
					return response;
				} 
				else if (notifyCallResponse == 2) {
					response["acknowledged"] = false;
					if (response.rejectedUserIds.indexOf(processedVoiceNumberObj.user_id) == -1)
						response.rejectedUserIds.push(processedVoiceNumberObj.user_id);
				}
			}
		}

		var className = inputParamObj.currentSysClassName;
		className = className.charAt(0).toUpperCase() + className.slice(1);
	
		//Having both old and new email message to avoid issue during upgrade if a user replies to an old email
		var emailMessage = gs.getMessage("{0} was escalated.\nTo assign yourself to the {1}, reply to this email with 'ACC' in the message body.\nTo reject and move the {1} to the next person in the escalation path, reply to this email with 'REJ'", [inputParamObj.currentNumber, className]);
	
		var emailMessageOld = gs.getMessage("You are being asked to assign yourself to {0}. To accept and assign yourself to the {1} reply to this email with 'ACC'. To reject reply to this email with 'REJ'. Rejecting will progress this assignment to the next process in escalation.", [inputParamObj.currentNumber, className]);

		if (inputParamObj.isCurrentLevelCatchAll) {
		
			emailMessage = gs.getMessage("Task {0} was escalated but no on-call user accepted it in time. Please investigate.\nTo assign yourself to the task, reply to this email with 'ACC' in the message body.\nTo reject and end the escalation, reply to this email with 'REJ'", inputParamObj.currentNumber);
		
			emailMessageOld = gs.getMessage("A task with number {0} was raised and escalated but no on-call user has accepted it in time. Please investigate. To assign yourself to the task reply to this email with 'ACC'. To reject reply to this email with 'REJ'. Rejecting will end this escalation.", inputParamObj.currentNumber);
		}
	
		for (var i = 0; i < inputParamObj.processedUserForEmail.length; i++) {
			// is there an inbound email from the escalatee
			var email = new GlideRecord("sys_email");
			email.addQuery("user_id", inputParamObj.processedUserForEmail[i]);
			email.addQuery("type", "received");
			email.addQuery("sys_created_on", ">", inputParamObj.contextSysCreatedOn);
			email.orderBy("sys_created_on");
			var orEmail = email.addQuery("body_text", "CONTAINS", emailMessage);
			orEmail.addOrCondition("body_text", "CONTAINS", emailMessageOld);
			email.query();

			while (email.next()) {
			
				var actualEmailMessage = email.body_text.includes(emailMessageOld) ? emailMessageOld : emailMessage;
				// strip out the original email message from the reply
				var str = email.body_text.replace(actualEmailMessage, "");

				// match first occurrence of our expected response
				var regex = new SNC.Regex("/([0-9]*)([A-Za-z]{3})/");
				var match = regex.match(str);

				// process valid res
				if (match !== null) {
					var res = match.pop().toUpperCase();
					if (res === "ACC") {
						response["acknowledged"] = true;
						response["responsedReceived"] = true;
						return response;
					}
					else if (res === "REJ") {
						response["acknowledged"] = false;
						if (response.rejectedUserIds.indexOf(email.getValue('user_id')) == -1)
							response.rejectedUserIds.push(email.getValue('user_id'));
					}
				}
			}
		}
		
		if (this.isSlackPluginInstalled()) {
			for (var i = 0; i < inputParamObj.processedUserForSlack.length; i++) {
				var slackResponseGR = new GlideRecord("sn_slack_ah_v2_inbound");
				slackResponseGR.addQuery("user", inputParamObj.processedUserForSlack[i]);
				slackResponseGR.addQuery("context_id", inputParamObj.wfContextId);
				slackResponseGR.query();

				while (slackResponseGR.next()) {
					var action = slackResponseGR.getValue('response_action');		
					if (action === "Accept") {
						response["acknowledged"] = true;
						response["responsedReceived"] = true;
						return response;
					} else if (action === "Reject") {
						response["acknowledged"] = false;
						if (response.rejectedUserIds.indexOf(slackResponseGR.getValue('user')) == -1)
							response.rejectedUserIds.push(slackResponseGR.getValue('user'));
					}
				}
			}
		}
		
		response["responsedReceived"] = false;
		return response;
	},
	
	isNotifyPluginInstalled: function() {
		return GlidePluginManager.isActive('com.snc.notify');
	},
	isSlackPluginInstalled: function() {
		return GlidePluginManager.isActive('sn_slack_ah_v2');
	},

	type: 'OnCallWorkflowUtilsSNC'
};
```