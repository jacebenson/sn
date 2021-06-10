---
title: "PwdNotificationManager"
id: "pwdnotificationmanager"
---

API Name: global.PwdNotificationManager

```js
var PwdNotificationManager = Class.create();
PwdNotificationManager.prototype = {
	GENERIC_FAIL_RESPONSE: 0,
	SUCCESS_RESPONSE: 1,
	
	// Table sysevent_email_action
	PWD_MESSAGE : '7cd0c421bf200100710071a7bf0739bd', 
	
	// Event
	PWD_CODE_EVENT: 'pwd.send_verify_code.trigger',
	
	pwdNotifMgr: new SNC.PwdSMSManager(),
	pwdNotifHelper: new PwdNotificationHelper(),
	
	initialize: function() {
    },

	
	/* 
	  Send enrollment code to the device
	  @param deviceId: sys_id of the device to be enrolled
	  @param verificationId
	*/
	sendEnrollmentCode: function(deviceId, verificationId) {
		var response = this.GENERIC_FAIL_RESPONSE;
		
		try {
			response = this.pwdNotifMgr.generateEnrollmentCode(deviceId, verificationId);
		
			if (response == this.SUCCESS_RESPONSE) {
				var pwdDeviceId = this._getPwdDeviceId(deviceId);
				if (pwdDeviceId == null)
					return this.GENERIC_FAIL_RESPONSE;
				var code = this.pwdNotifMgr.getLastEnrollmentCode(pwdDeviceId);

				var notifDevGr = new GlideRecord("cmn_notif_device");
				if (notifDevGr.get(deviceId)) {
					var deviceAddr = this._getDeviceAddr(notifDevGr);
					var userSysId = notifDevGr.getValue("user");

					this._sendCodeToDevices([deviceAddr], code, userSysId);
				}
			}
		} catch(err) {
			return err;
		}
		
		return response;
	},
	
	/* 
	  Verify enrollment code for the given device
	  @param deviceId: sys_id of the device to be enrolled
	  @param verificationId
	  @param code
	*/
    verifyEnrollmentCode: function(deviceId, verificationId, code) {
		return this.pwdNotifMgr.verifyEnrollmentCode(deviceId, verificationId, code);
    },
	
	
	_collectDevicesAddress: function(userId, mode, providerId) {
		var devices = [];
		
		if (mode == "subscription") {
			var cndGr = new GlideRecord('cmn_notif_device');
			cndGr.addActiveQuery();
			cndGr.addQuery("type", this.TYPE);
			cndGr.addQuery("user", userId);
			// Subscribed
			var cnmGr = cndGr.addJoinQuery('cmn_notif_message');
			cnmGr.addCondition('notification_filter', '');
			cnmGr.addCondition('notification', this.PWD_MESSAGE);
			// Verified
			var pdGr = cndGr.addJoinQuery('pwd_device');
			pdGr.addCondition('status', 1);
			
			cndGr.query();
		    while(cndGr.next())
				devices.push(this._getDeviceAddr(cndGr));
		} 
		else if (mode == this.NotEnrolled) {
			var device = this._getDeviceAddrFromProfile(userId, providerId);
			if (device != null)
				devices.push(device);
		}
		
		return devices;
	},
	
	// Abstract functions to override
	_getDeviceAddr: function(notifDevGr) {
		throw 'Need to implement _getDeviceAddr method.';
	},
	_getDeviceAddrFromProfile: function(userId, providerId) {
		throw 'Need to implement _getDeviceAddrFromProfile method.';
	},
	_sendCodeToDevices: function(devices, code) { 
		throw 'Need to implement _sendCodeToDevices method.';
	},
	
	
	// TODO: Put this in PwdRequestHelper
	_getUserId: function (requestId) {
		var gr = new GlideRecord('pwd_reset_request');
		if (gr.get(requestId)) {
			return gr.getValue('user');
		}
		return null;
	},
	
	_getPwdDeviceId: function(deviceId) {
		var gr = new GlideRecord("pwd_device");
		gr.addQuery("device", deviceId);
		gr.query();
		if (gr.next())
			return gr.getUniqueValue();
		return null;
	},
	
	_getDeviceGr: function(userSysId) {
		var deviceGr = new GlideRecord("cmn_notif_device");
		deviceGr.addQuery("user", userSysId);
		deviceGr.orderBy("order");
		deviceGr.query();
		deviceGr.next();	
		return deviceGr;
	},

    type: 'PwdNotificationManager'
};
```