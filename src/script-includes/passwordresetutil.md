---
title: "PasswordResetUtil"
id: "passwordresetutil"
---

API Name: sn_pwdreset_ah.PasswordResetUtil

```js
var PasswordResetUtil = Class.create();
PasswordResetUtil.prototype = {
    initialize: function() {
        this.credStoreID = '6e51033fbf020100710071a7bf0739e0';
    },

    cleanseSingleInput: function(input) {
        return encodeURI(this.trimInput(input)).replace(/'/g, "''").replace(/"/g, "\\\"").replace(/,/g, "%2C").replace(/&/g, "%26").replace(/#/g, "%23").replace(/:/g, "%3A").replace(/\?/g, "%3F").replace(/\//g, "%2F").replace(/=/g, "%3D").replace(/\+/g, "%2B");
    },
    trimInput: function(input) {
        return input.toString().trim();
    },
    cleanseInput: function(inputs) {
        for (var val in inputs)
            if (inputs.hasOwnProperty(val))
                inputs[val] = this.trimInput(inputs[val]);
        return inputs;
    },
    throwHandler: function(ErrorType, ErrorMessage) {
        throw new ErrorType(ErrorMessage);
    },
    localUserHelper: function(inputs) {
        if (!inputs.user.user_name.getDisplayValue() || inputs.user.user_name.getDisplayValue().trim() == '') {
            this.throwHandler(Error, "User Name should not be empty");
        }
    },
    subActionsHelper: function(inputs) {
        if (!inputs.user.user_name.getDisplayValue() || inputs.user.user_name.getDisplayValue().trim() == '') {
            this.throwHandler(Error, "User Name should not be empty");
        }
        if (!inputs.password || inputs.password.trim() == '') {
            this.throwHandler(Error, "Password should not be empty");
        }
    },
    isUserValid: function(inputs, outputs) {
        var gs = new GlideRecord('sys_user');
        gs.addQuery('user_name', inputs.user.user_name.getDisplayValue());
        gs.query();
        if (!gs.next()) {
            outputs.status = 'Error';
            outputs.errorMessage = 'Invalid User Record';
        }
        return outputs;
    },
    getActiveUserLockstate: function(inputs, outputs) {
        var gr = new GlideRecord("sys_user");
        gr.addActiveQuery();
        gr.addQuery("user_name", inputs.user.user_name.getDisplayValue());
        gr.query();
        if (!gr.next()) {
            outputs.status = 'Error';
            outputs.errorMessage = 'User Inactive';
        } else {
            outputs.status = 'Success';
            if (!gr.locked_out) {
                outputs.is_locked = 'False';
            } else {
                outputs.is_locked = 'True';
            }
        }
        return outputs;
    },
    unlockAccount: function(inputs, outputs) {
        var gr = new GlideRecord('sys_user');
        gr.addQuery('user_name', inputs.user.user_name.getDisplayValue());
        gr.query();
        gr.next();
        //unlock the account
        gr.locked_out = 0;
        if (!gr.update()) {
            outputs.status = 'Error';
            outputs.errorMessage = 'Error while unlocking user account';
        } else {
            outputs.status = 'Success';
        }
        return outputs;
    },
    getLockState: function(inputs, outputs) {
        var gr = new GlideRecord("sys_user");
        gr.addQuery("user_name", inputs.user.user_name.getDisplayValue());
        gr.query();
        gr.next();
        if (gr.locked_out) {
            outputs.status = 'Error';
            outputs.errorMessage = 'User Locked';
        }
        return outputs;
    },
    verifyPassword: function(inputs, password, outputs) {
        var util = new global.PasswordResetScopedUtil();
        var authenticated = util.authenticateUser(inputs.user.user_name.getDisplayValue(), password);
        if (!authenticated) {
            outputs.authenticated = 'False';
        } else {
            outputs.authenticated = 'True';
        }
        return outputs;
    },
    isHistoryCheckNeeded: function() {
        var gr = new GlideRecord('pwd_cred_store');
        gr.addQuery('sys_id', this.credStoreID);
        gr.query();
        if (gr.next()) {
            if (gr.enforce_history_policy) {
                return true;
            }
            return false;
        }
        this.throwHandler(Error, "Credential Store is required");
    },
    historyCheck: function(inputs, newpassword, outputs) {
        var pwdHistoryManager = new global.PasswordResetScopedUtil();
        var isHistoryCheckNeeded = this.isHistoryCheckNeeded();
        if (isHistoryCheckNeeded) {
            if (pwdHistoryManager.isPasswordInHistory(inputs.user.user_name.getDisplayValue(), newpassword, this.credStoreID)) {
                outputs.historyCheckPassed = 'False';
            } else {
                outputs.historyCheckPassed = 'True';
            }
        } else {
            outputs.historyCheckPassed = 'True';
        }
        return outputs;
    },
    updatePassword: function(inputs, newPassword, outputs) {
        var pwdUpdateManager = new global.PasswordResetScopedUtil();
        var response = pwdUpdateManager.updatePassword(inputs.user.user_name.getDisplayValue(), newPassword, inputs.password_needs_reset, inputs.unlock_account);
        if (response != "200") {
                outputs.status = 'Error';
                outputs.errorMessage = response;
        }
        return outputs;
    },
    addPasswordToHistory: function(inputs, newpassword, outputs) {
        var pwdHistoryManager = new global.PasswordResetScopedUtil();
        var isHistoryCheckNeeded = this.isHistoryCheckNeeded();
        if (isHistoryCheckNeeded) {
            pwdHistoryManager.add(inputs.user.user_name.getDisplayValue(), newpassword, this.credStoreID);
        }
    },
    sendConfirmation: function(email, password, credentialSysId, isDefaultSelfServiceProcess, grUser, outputs) {
        var eventName = "pwd.email.trigger";
        var param1 = email;
        var param2 = password;
		var gr = new GlideRecord('pwd_cred_store');
		if(!gr.get(credentialSysId)) {
			outputs.status = 'Error';
			outputs.errorMessage = 'Invalid Credential Store';
			return outputs;
		}
        if (isDefaultSelfServiceProcess) {
            eventName = "password.reset";
            gr = grUser;
        }
		var enc = new global.PasswordResetScopedUtil();
		enc.sendConfirmationEmail(eventName, gr, param1, param2);

        return outputs;
    },
    type: 'PasswordResetUtil'
};
```