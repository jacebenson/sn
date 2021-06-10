---
title: "PwdEmailNotificationManager"
id: "pwdemailnotificationmanager"
---

API Name: global.PwdEmailNotificationManager

```js
var PwdEmailNotificationManager = Class.create();
PwdEmailNotificationManager.prototype = Object.extendsObject(PwdNotificationManager, {
	
	TYPE: "Email",
	NotEnrolled: "notEnrolled",
	
    initialize: function() {
    },
	
	/* 
	  Send reset code to enrolled devices or devices from user profile
	  @param requestId
	  @param verificationId
	  @param mode: subscription or notEnrolled
	*/
	sendResetCode: function(requestId, verificationId, mode) {
		var response = this.GENERIC_FAIL_RESPONSE;
		
		try {
			response = this.pwdNotifMgr.generateEmailCode(requestId, verificationId);
		
			if (response == this.SUCCESS_RESPONSE) {
				var userSysId = this._getUserId(requestId);
				var devices = this._collectDevicesAddress(userSysId, mode);
				if (devices.length == 0)
					return this.GENERIC_FAIL_RESPONSE;

				var code = this.pwdNotifMgr.getLastEmailCode(requestId);
				this._sendCodeToDevices(devices, code, userSysId);
			}
		} catch (err) {
			return err;
		}
	
		return response;
	},
	
	
	/*  
	  Verify reset code
	  @param requestId
	  @param verificationId
      @param code
	*/
	verifyResetCode: function(requestId, verificationId, code) {
		return this.pwdNotifMgr.verifyEmailCode(requestId, verificationId, code);
	},
	
	
	// @Override
	_getDeviceAddr: function(notifDevGr) {
		return notifDevGr.getValue("email_address");
	},
	
	// @Override
	_getDeviceAddrFromProfile: function(userId) {
		var email = this.pwdNotifHelper.getEmailFromProfile(userId);
		if (email == null)
			return null;

		var deviceId = this.pwdNotifHelper.emailEntryExists(userId, email);
		if (deviceId == null)
			deviceId = this.pwdNotifHelper.createEmail(userId, email, "Primary Email");

		var notifDevGr = new GlideRecord("cmn_notif_device");
		notifDevGr.get(deviceId);
		return this._getDeviceAddr(notifDevGr);
	},
	
	// @Override
	_sendCodeToDevices: function(devices, code, userSysId) {
		var parm1 = devices.join(",");
		
		// DEF0063745: Need to pass notification_type
		parm1 = "SMTP," + parm1;
		
		// PRB1263734: Use cmn_notif_device as the target record to check ACL
		var deviceGr = this._getDeviceGr(userSysId);
		
		gs.eventQueue(this.PWD_CODE_EVENT, deviceGr, parm1, code);
	},

    type: 'PwdEmailNotificationManager'
});
```