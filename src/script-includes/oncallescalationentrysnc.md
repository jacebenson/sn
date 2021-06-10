---
title: "OnCallEscalationEntrySNC"
id: "oncallescalationentrysnc"
---

API Name: global.OnCallEscalationEntrySNC

```js
var OnCallEscalationEntrySNC = Class.create();
OnCallEscalationEntrySNC.prototype = {
	TABLES: {
		SYS_USER_GROUP: 'sys_user_group'
	},
	initialize: function() {
		this.log = new GSLog("com.snc.on_call_rotation.log.level", this.type);
		this.deviceDetailIsValid = false;
		this.deviceName = "";
		this.deviceType = "";
		this.emailAddress = "";
		this.phoneNumber = "";
		this.smsAddress = "";
		this.deviceActive = true;
		this.escalationType = "";
		this.delaySeconds = 0;
		this.runAt = -1;
		this.rotaSysId = "";
		this.rosterSysId = "";
		this.memberSysId = "";
		this.userId = "";
		this.userName = "";
		this.deviceSysId = "";
		this.notifiedTimeGdt = null;
		this.groupId = "";
		this.groupName = "";
	},

	setType: function(type) {
		this.escalationType = type;
	},

	getType: function() {
		return this.escalationType;
	},

	setDelay: function(baseTimeGdt, seconds) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[setDelay] baseTimeGdt: " + baseTimeGdt + " seconds: " + seconds);

		this.delaySeconds = seconds;
		this.runAt = baseTimeGdt.getNumericValue() + (this.delaySeconds * 1000);

		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[setDelay] delaySeconds: " + this.delaySeconds + " runAt: " + this.runAt);
	},

	getDelay: function() {
		return this.delaySeconds;
	},

	getRunAt: function() {
		return this.runAt;
	},

	setMember: function(memberSysId) {
		this.memberSysId = memberSysId;
	},

	getMember: function() {
		return this.memberSysId;
	},

	setUserID: function(userId) {
		this.userId = userId;
		var user = GlideUser.getUserByID(this.userId);
		if (user)
			this.userName = user.getDisplayName();
		else
			this.userName = "";
	},

	setRosterID: function(rosterSysId) {
		this.rosterSysId = rosterSysId;
	},

	setRotaID: function(rotaSysId) {
		this.rotaSysId = rotaSysId;
	},

	getUserID: function() {
		return this.userId;
	},

	getRosterID: function() {
		return this.rosterSysId;
	},

	getRotaID: function() {
		return this.rotaSysId;
	},

	getUserName: function() {
		return this.userName;
	},

	setDeviceID: function(deviceSysId) {
		this.deviceSysId = deviceSysId;
		this._getDeviceDetail();
	},

	getDeviceID: function() {
		return this.deviceSysId;
	},

	getDeviceType: function() {
		return this.deviceType;
	},

	getDeviceName: function() {
		return this.deviceName;
	},

	getDeviceEmailAddress: function() {
		return this.emailAddress;
	},

	getDevicePhoneNumber: function() {
		return this.phoneNumber;
	},

	getDeviceSMSAddress: function() {
		return this.smsAddress;
	},

	getDeviceProvider: function() {
		return this.deviceProvider;
	},

	getActive: function() {
		return this.deviceActive;
	},

	getDeviceContact: function() {
		var deviceContact = "";
		if (!this.deviceDetailIsValid)
			return deviceContact;

		if (OnCallEscalationEntrySNC.EMAIL === this.deviceType)
			deviceContact = this.emailAddress;
		else if (OnCallEscalationEntrySNC.SMS === this.deviceType)
			deviceContact = this.smsAddress;

		return deviceContact;
	},

	setNotifiedTime: function(gdt) {
		this.notifiedTimeGdt = gdt;
	},

	getNotifiedTime: function() {
		return this.notifiedTimeGdt;
	},

	setGroupId: function(groupId) {
		this.groupId = groupId;
		var groupGr = new GlideRecord(this.TABLES.SYS_USER_GROUP);
		if (groupGr.get(groupId))
			this.groupName = groupGr.getDisplayValue();
		else
			this.groupName = "";
	},

	setGroupName: function(groupName) {
		this.groupName = groupName;
	},

	getGroupId: function() {
		return this.groupId;
	},

	getGroupName: function() {
		return this.groupName;
	},

	/**
	 * Get a value based on a passed in string name
	 */
	get: function(name) {
		if (OnCallEscalationEntrySNC.TYPE === name)
				return this.getType();
		else if (OnCallEscalationEntrySNC.ROSTER === name)
			return this.getRosterID();
		else if (OnCallEscalationEntrySNC.DELAY === name)
			return this.getDelay();
		else if (OnCallEscalationEntrySNC.RUN_AT === name)
			return this.getRunAt();
		else if (OnCallEscalationEntrySNC.USER === name)
			return this.getUserID();
		else if (OnCallEscalationEntrySNC.USER_NAME === name)
			return this.getUserName();
		else if (OnCallEscalationEntrySNC.DEVICE_ID === name)
			return this.getDeviceID();
		else if (OnCallEscalationEntrySNC.DEVICE_TYPE === name)
			return this.getDeviceType();
		else if (OnCallEscalationEntrySNC.DEVICE === name)
			return this.getDeviceContact();
		else if (OnCallEscalationEntrySNC.DEVICE_NAME === name)
			return this.getDeviceName();
		else if (OnCallEscalationEntrySNC.DEVICE_EMAIL === name)
			return this.getDeviceEmailAddress();
		else if (OnCallEscalationEntrySNC.DEVICE_PHONE_NUMBER === name)
			return this.getDevicePhoneNumber();
		else if (OnCallEscalationEntrySNC.DEVICE_SMS_ADDRESS === name)
			return this.getDeviceSMSAddress();
		else if (OnCallEscalationEntrySNC.DEVICE_PROVIDER === name)
			return this.getDeviceProvider();
		else if (OnCallEscalationEntrySNC.ROTA === name)
			return this.getRotaID();
		else if (OnCallEscalationEntrySNC.GROUP_ID === name)
			return this.getGroupId();
		else if (OnCallEscalationEntrySNC.GROUP_NAME === name)
			return this.getGroupName();
		else
			this.log.error("OnCallEscalationEntrySNC.get called with invalid name: " + name);
		return "";
	},

	_getDeviceDetail: function() {
		var deviceGr = new GlideRecord("cmn_notif_device");

		if (this.deviceSysId && deviceGr.get(this.deviceSysId)) {
			this.deviceActive = deviceGr.getValue("active");
			this.deviceName = deviceGr.name + "";
			this.deviceType = deviceGr.type + "";
			this.emailAddress = deviceGr.email_address + "";
			this.phoneNumber = deviceGr.phone_number + "";
			if (OnCallEscalationEntrySNC.SMS === this.deviceType) {
				var serviceProvSysId = deviceGr.service_provider + "";
				this.smsAddress = this.phoneNumber;
				var providerGr = new GlideRecord("cmn_notif_service_provider");
				if (providerGr.get(serviceProvSysId) && providerGr.isValid()){
					this.smsAddress += "@" + providerGr.email_suffix;
					this.deviceProvider = providerGr.getDisplayValue();
				}
			}
			this.deviceDetailIsValid = true;
		} else
			this.log.error("OnCallEscalationEntrySNC.get called with invalid device ID: " + this.deviceSysId);
	},

	_createElement: function(doc) {
		var name = OnCallEscalationEntrySNC.PENDING;
		if (this.notifiedTimeGdt)
			name = OnCallEscalationEntrySNC.SENT;

		var element = doc.createElement(name);
		element.setAttribute(OnCallEscalationEntrySNC.DELAY, this.delaySeconds + "");

		if (this.notifiedTimeGdt)
			element.setAttribute("notified", this.notifiedTimeGdt.getDisplayValueInternal());
		element.setAttribute(OnCallEscalationEntrySNC.TYPE, this.escalationType);

		if (this.runAt === -1)
			this.runAt = new GlideDateTime().getNumericValue() + (this.delaySeconds * 1000);
		element.setAttribute(OnCallEscalationEntrySNC.RUN_AT, this.runAt + "");

		var gdt = new GlideDateTime();
		gdt.setNumericValue(this.runAt);
		element.setAttribute(OnCallEscalationEntrySNC.RUN_AT_USER_TIME, gdt.getDisplayValueInternal());

		if (OnCallEscalationEntrySNC.DEVICE == this.escalationType) {
			element.setAttribute(OnCallEscalationEntrySNC.DEVICE_ID, this.deviceSysId);
			element.setAttribute(OnCallEscalationEntrySNC.DEVICE_NAME, this.deviceName);
			element.setAttribute(OnCallEscalationEntrySNC.DEVICE, this.getDeviceContact());
		} else if (OnCallEscalationEntrySNC.GROUP == this.escalationType) {
			element.setAttribute(OnCallEscalationEntrySNC.GROUP_ID, this.groupId);
			element.setAttribute(OnCallEscalationEntrySNC.GROUP_NAME, this.groupName);
		} else if (OnCallEscalationEntrySNC.USER == this.escalationType) {
			element.setAttribute(OnCallEscalationEntrySNC.USER, this.userId);
			element.setAttribute(OnCallEscalationEntrySNC.USER_NAME, this.userName);
		} else {
			element.setAttribute(OnCallEscalationEntrySNC.MEMBER, this.memberSysId);
			element.setAttribute(OnCallEscalationEntrySNC.USER, this.userId);
			element.setAttribute(OnCallEscalationEntrySNC.USER_NAME, this.userName);
		}
		element.setAttribute("rota", this.rotaSysId);
		return element;
	},

	toXml: function(doc, parentElement) {
		parentElement.appendChild(this._createElement(doc));
	},

	fromXml: function(node) {
		this.escalationType = node.getAttribute("type");
		var delay = node.getAttribute(OnCallEscalationEntrySNC.DELAY);
		this.delaySeconds = parseInt(delay);
		var runAt = node.getAttribute(OnCallEscalationEntrySNC.RUN_AT);
		this.runAt = parseInt(runAt);
		if (OnCallEscalationEntrySNC.DEVICE == this.escalationType)
			this.setDeviceID(node.getAttribute(OnCallEscalationEntrySNC.DEVICE_ID));
		else if (OnCallEscalationEntrySNC.GROUP == this.escalationType) {
			this.groupId = node.getAttribute(OnCallEscalationEntrySNC.GROUP_ID);
			this.groupName = node.getAttribute(OnCallEscalationEntrySNC.GROUP_NAME);
		}
		else if (OnCallEscalationEntrySNC.USER == this.escalationType) {
			this.userId = node.getAttribute(OnCallEscalationEntrySNC.USER);
			this.userName = node.getAttribute(OnCallEscalationEntrySNC.USER_NAME);
		}
		else {
			this.memberSysId = node.getAttribute(OnCallEscalationEntrySNC.MEMBER);
			this.userId = node.getAttribute(OnCallEscalationEntrySNC.USER);
			this.userName = node.getAttribute(OnCallEscalationEntrySNC.USER_NAME);
		}
		var notified = node.getAttribute(OnCallEscalationEntrySNC.NOTIFIED);
		this.notifiedTimeGdt = null;
		if (notified) {
			this.notifiedTimeGdt = new GlideDateTime();
			this.notifiedTimeGdt.setDisplayValueInternal(notified);
		}
		this.rotaSysId = node.getAttribute("rota");
	},

	sameNotify: function(otherOnCallEscalationEntrySNC) {
		if (this.runAt !== otherOnCallEscalationEntrySNC.getRunAt())
			return false;
		if (OnCallEscalationEntrySNC.DEVICE === this.escalationType)
			return this.deviceSysId === otherOnCallEscalationEntrySNC.getDeviceID();
		return this.escalationType === otherOnCallEscalationEntrySNC.getType() && this.userId === otherOnCallEscalationEntrySNC.getUserID();
	},

	toString: function() {
		return this.type;
	},

	type: "OnCallEscalationEntrySNC"
};

// These are the names that can be used with the get() method
OnCallEscalationEntrySNC.TYPE = "type";
OnCallEscalationEntrySNC.ROTA = "rota";
OnCallEscalationEntrySNC.ROSTER = "roster";
OnCallEscalationEntrySNC.DELAY = "delay";
OnCallEscalationEntrySNC.RUN_AT = "run_at";
OnCallEscalationEntrySNC.MEMBER = "member";
OnCallEscalationEntrySNC.USER = "user";
OnCallEscalationEntrySNC.USER_NAME = "user_name";
OnCallEscalationEntrySNC.DEVICE_ID = "device_id";
OnCallEscalationEntrySNC.DEVICE_TYPE = "device_type";
OnCallEscalationEntrySNC.DEVICE = "device";	// returns phone@email_suffix if SMS is being used
OnCallEscalationEntrySNC.DEVICE_NAME = "device_name";
OnCallEscalationEntrySNC.DEVICE_SMS_ADDRESS = "device_sms_address";
OnCallEscalationEntrySNC.DEVICE_PROVIDER = "device_provider";
OnCallEscalationEntrySNC.DEVICE_EMAIL = "device_email";
OnCallEscalationEntrySNC.DEVICE_PHONE_NUMBER = "device_phone_number";
OnCallEscalationEntrySNC.GROUP = "group";
OnCallEscalationEntrySNC.GROUP_ID = "group_id";
OnCallEscalationEntrySNC.GROUP_NAME = "group_name";

// Devices types
OnCallEscalationEntrySNC.EMAIL = "Email";
OnCallEscalationEntrySNC.SMS = "SMS";
OnCallEscalationEntrySNC.INSTANT_MESSAGE = "Instant Message";

OnCallEscalationEntrySNC.DEVICE_NAME = "device_name";
OnCallEscalationEntrySNC.NOTIFIED = "notified";
OnCallEscalationEntrySNC.RUN_AT_USER_TIME = "run_at_user_time";
OnCallEscalationEntrySNC.SERVICE_PROVIDER = "service_provider";
OnCallEscalationEntrySNC.EMAIL_SUFFIX = "email_suffix";
OnCallEscalationEntrySNC.SENT = "sent";
OnCallEscalationEntrySNC.PENDING = "pending";

```