---
title: "PWDChangePasswordBL"
id: "pwdchangepasswordbl"
---

API Name: global.PWDChangePasswordBL

```js
var PWDChangePasswordBL = Class.create();
PWDChangePasswordBL.prototype = {

    credentialMgr: new SNC.PwdCredentialStoreManager(),

    CHANGE_PASSWORD_MASTER_WORKFLOW: "Pwd Change - Master",
    STAGE_CHANGE_PWD: "Change password",

    REQUEST_TYPE: 3, // request type for Change Password
    REQUEST_ACTION_TYPE: 4, // request action type for Change Password

    STATUS_ERROR: 'error',
    STATUS_BLOCKED: 'block',
    STATUS_SUCCESS: 'success',
    STATUS_FAILURE: 'failure',

    initialize: function() {},

    getProcessesForUser: function(userId) {
        var processMgr = new SNC.PwdProcessManager();
        var processIds = processMgr.getProcessIdsByUserId(userId);
        var processes = [];
        var processId;
        var process;
        var name;
        var pwdRule;
        var strengthRule;

        for (var i = 0; i < processIds.size(); i++) {
            processId = processIds.get(i);
            process = new SNC.PwdProcess(processId);

            // Skip the process if it does not support change password
            if (!process.isChangePwd())
                continue;

            name = process.getName();

            // prefix with domain name if plugin is active
            if (GlidePluginManager.isRegistered("com.glide.domain.msp_extensions.installer"))
                name = process.getDomainDisplayName() + ": " + name;

            pwdRule = this.credentialMgr.getPasswordRule(processId);
            strengthRule = this.credentialMgr.getStrengthRule(processId);

            processes.push({
                name: name,
                procId: processId,
                pwdRuleHint: this.credentialMgr.getPasswordRuleDesc(processId),
                pwdRule: pwdRule.replace("isPasswordValid", "isPasswordValid_" + processId),
                enablePasswordStrength: this.credentialMgr.getEnablePasswordStrength(processId),
                strengthRule: strengthRule.replace("calculatePasswordStrength", "calculatePasswordStrength_" + processId)
            });
        }

        return processes;
    },

    validatePassword: function(processId, newPassword) {
        var credId = this.credentialMgr.getCredentialStoreIdByProcessId(processId);

        var credGr = new GlideRecord('pwd_cred_store');
        if (credGr.get(credId)) {
            var pwdRule = credGr.getValue('pwd_rule');
            var pwdRuleCall = pwdRule + '\nisPasswordValid(password);';
            credGr.setValue('pwd_rule', pwdRuleCall);
            var vars = {
                'password': newPassword
            };
            gs.info('Debug only - cred GR changes before evaluator ' + credGr.changes());
            var evaluator = new GlideScopedEvaluator();
            var pwdValid = evaluator.evaluateScript(credGr, 'pwd_rule', vars);
            gs.info('Debug only - cred GR changes after evaluator ' + credGr.changes());
            if (pwdValid)
                return "success";
        }

        return "failure";
    },

    changePassword: function(userId, processId, newPassword, oldPassword) {
        var process = new SNC.PwdProcess(processId);
        var pwdFlowHelper = new PwdFlowHelper();
        var result = {
            status: this.STATUS_SUCCESS,
            ctxId: '',
            requestId: '',
			errorMessage: '',
        };

        if (gs.nil(userId) || gs.nil(process))
            return result;

        var trackingMgr = new SNC.PwdTrackingManager();
        var requestId = trackingMgr.createRequest(processId, userId, gs.getSessionID(), this.REQUEST_TYPE);
        trackingMgr.updateRequestActionType(requestId, this.REQUEST_ACTION_TYPE);
        result.requestId = requestId;

        // if locked quit 
        if (trackingMgr.isRequestLocked(userId, processId)) {
            var blockedMsg = "Cannot create request (process_id = " + processId + ", user_sys_id = " + userId + ") because the user is blocked.";
            trackingMgr.createActivity(PwdConstants.TYPE_ERROR, PwdConstants.STAGE_CHANGE_PWD, blockedMsg, requestId);
            // Leave request in progress state with retryCount of 0 - This way 
            // the next try with reuse this request and not lose one retry count.
            result.status = this.STATUS_BLOCKED;

            return result;
        }

        trackingMgr.createActivity(PwdConstants.TYPE_INFO, PwdConstants.STAGE_CHANGE_PWD, "User requested password change", requestId);

		//change passwords to passwd2 format
        var enc = new GlideEncrypter();
        var encNewPassword = enc.encrypt(newPassword).toString()+"";
        var encOldPassword = enc.encrypt(oldPassword).toString()+"";

		var outputs = pwdFlowHelper.startMasterSubFlow(requestId,encNewPassword, encOldPassword);
       
        if (outputs.is_flow == false) {
			if(!gs.nil(outputs.context_id)) {
				result.ctxId = outputs.context_id.sys_id;
			} else {
				result.errorMessage = "Failed to start Password Change Workflow";
				result.status = this.STATUS_FAILURE;
			}
		} else if( outputs.is_flow == true && outputs.status != "Success") {
			result.status = this.STATUS_FAILURE;
			if(!gs.nil(outputs.error_message) && outputs.error_message != 'Flow stopped executing')
				result.errorMessage = outputs.error_message;
			else
				result.errorMessage = "Change password request resulted in failure";
			
			trackingMgr.updateRequestStatusAndRetry(requestId, -1);
			trackingMgr.createActivity(PwdConstants.TYPE_ERROR, PwdConstants.STAGE_CHANGE_PWD, result.errorMessage, requestId);
		} else if(outputs.is_flow == true && outputs.status == "Success") {
			trackingMgr.updateRequestStatusAndRetry(requestId, 1);
			trackingMgr.createActivity(PwdConstants.TYPE_INFO, PwdConstants.STAGE_CHANGE_PWD, "Password Changed Succesfully", requestId);
		}
        return result;
    },

    _startChangePasswordWorkflow: function(requestId, userId, encNewPassword, encOldPassword) {

        var params = {
            u_request_id: requestId,
            u_user_id: userId,
            u_new_password: encNewPassword,
            u_old_password: encOldPassword
        };

        return PWDWorkflowHelper.startFlow(this.CHANGE_PASSWORD_MASTER_WORKFLOW, params, 'update');
    },

    type: 'PWDChangePasswordBL'
};
```