---
title: "PwdWFRequestProcessor"
id: "pwdwfrequestprocessor"
---

API Name: global.PwdWFRequestProcessor

```js
var PwdWFRequestProcessor = Class.create();
PwdWFRequestProcessor.prototype = {
    TYPE_INFO: "Info",
    TYPE_WARNING: "Warning",
    TYPE_ERROR: "Error",

    STAGE_RESET: "Reset",

    MASTER_WORKFLOW: "Pwd Reset - Master",

    responseMsg: null,

    initialize: function() {},

    validatePassword: function(processId, newPwd) {
        var credMgr = new SNC.PwdCredentialStoreManager();
        var credId = credMgr.getCredentialStoreIdByProcessId(processId);

        var credGr = new GlideRecord('pwd_cred_store');
        if (credGr.get(credId)) {
            var pwdRule = credGr.getValue('pwd_rule');
            var pwdRuleCall = pwdRule + '\nisPasswordValid(password);';
            credGr.setValue('pwd_rule', pwdRuleCall);
            var vars = {
                'password': newPwd
            };

            var evaluator = new GlideScopedEvaluator();
            var pwdValid = evaluator.evaluateScript(credGr, 'pwd_rule', vars);
            if (pwdValid) {
                return "success";
            }
        }

        return "failure";
    },

    startWorkflow: function(sysparm_request_id, sysparm_new_password) {
        var LOG_ID = "[PwdAjaxWFRequestProcessor:startWorkflow] ";
        var ctxId = "";
        var trackingMgr = new SNC.PwdTrackingManager();
        var requestId = sysparm_request_id;
        var newPasswd = sysparm_new_password;
        var pwdFlowHelper = new PwdFlowHelper();

        // Retrieve request by request id
        var requestVerified = trackingMgr.requestVerified(requestId);

        try {
            // return error if the request is not verified:
            if (!requestVerified) {
                var requestMsg = "Could not verify request: " + requestId;
                trackingMgr.createActivity(PwdConstants.TYPE_WARNING, PwdConstants.STAGE_RESET, requestMsg, requestId);
                var reqMsg = gs.getMessage("{0} Could not verify request: {1}", [LOG_ID, requestId]);
                this._setResponseMessage("failure", reqMsg, requestId);
                return this.responseMsg;
            }

            var processId = trackingMgr.getProcessIdByRequestId(requestId);

            this._updateRequestAction(processId, requestId);

            // auto-generate new password, if needed
            if (gs.nil(newPasswd)) {
                newPasswd = new SNC.PwdProcessManager().generatePasswordByProcessId(processId);

                // Fail workflow if we get an empty response
                if (typeof(newPasswd) == 'undefined' || newPasswd == null || newPasswd == '') {
                    var passwordMsg = 'Empty password generated';
                    trackingMgr.createActivity(PwdConstants.TYPE_WARNING, PwdConstants.STAGE_RESET, passwordMsg, requestId);
                    var genPasswordMsg = gs.getMessage("{0} Empty password generated", LOG_ID);
                    this._setResponseMessage("failure", genPasswordMsg, requestId);
                    return this.responseMsg;
                }
                gs.getSession().putProperty('temp_password', newPasswd);
            }

            trackingMgr.createActivity(PwdConstants.TYPE_INFO, PwdConstants.STAGE_RESET, "Starting Password Reset Master Subflow", requestId);

            var enc = new GlideEncrypter();
            var encyptedPasswd = enc.encrypt(newPasswd).toString()+"";

            var outputs = pwdFlowHelper.startMasterSubFlow(requestId,encyptedPasswd,'');

            if(outputs.is_flow == false  && outputs.context_id) {
                ctxId = outputs.context_id.sys_id;
            }
			
			if(outputs.is_flow == true && outputs.status == 'Success') {
				trackingMgr.updateRequestStatus(requestId, 1);
				trackingMgr.createActivity(PwdConstants.TYPE_INFO, PwdConstants.STAGE_RESET, "Flow Completed Successfully", requestId);
			}

            if (outputs.is_flow == false && outputs.context_id == undefined) {
                var errorMsg = "Failed to start password reset process";
                trackingMgr.createActivity(PwdConstants.TYPE_ERROR, PwdConstants.STAGE_RESET, errorMsg, requestId);
                responseErrorMsg = gs.getMessage("{0} Failed to start workflow process", [LOG_ID]);
                this._setResponseMessage("failure", responseErrorMsg, requestId);
                return this.responseMsg;
            } else if (outputs.is_flow == true && outputs.status != 'Success') {
		trackingMgr.createActivity(PwdConstants.TYPE_ERROR, PwdConstants.STAGE_RESET, 'Password reset failed', requestId);
                this._setResponseMessage("failure", outputs.error_message, requestId);
                return this.responseMsg;
			}


            //Invalidate the token for the user if he/she is resetting the password through a URL
            var request = new GlideRecord("pwd_reset_request");
            if (request.get(requestId))
                SNC.PasswordResetUtil.invalidateTokenForUser(request.user, '');

            this._setResponseMessage("success", "The request has been successfully completed", ctxId);
            return this.responseMsg;

        } catch (error) {
            var exceptionMsg = gs.getMessage("Exception: {0}", error);
            trackingMgr.createActivity(PwdConstants.TYPE_ERROR, PwdConstants.STAGE_RESET, exceptionMsg, requestId);
            var responseExceptionMsg = gs.getMessage("{0} Exception: {1}", [LOG_ID, error]);
            this._setResponseMessage("failure", responseExceptionMsg, ctxId);
            return this.responseMsg;
        }

    },


    _setResponseMessage: function(status, msg, value) {
        this.responseMsg = {
            "status": status,
            "message": msg,
            "value": value
        };
    },


    //------------------------------------------------------------------------------------------------------------------
    // Starts a new workflow and returns the new workflow sys Id.
    //------------------------------------------------------------------------------------------------------------------
    _startWorkflow: function(requestId, newPasswd) {
        var workflowName = this.MASTER_WORKFLOW;
        var wf = new Workflow();
        var workflowId = wf.getWorkflowFromName(workflowName);
        var request = new GlideRecord("pwd_reset_request");
        var getRequest = request.get(requestId);

        var gr = wf.startFlow(workflowId, request, 'update', {
            u_request_id: requestId,
            u_new_password: newPasswd
        });
        gr.next();
        var ctxId = gr.getValue('sys_id');
        return ctxId;
    },

    _updateRequestAction: function(processId, requestId) {
        var processSupportsUnlock = 0;
        var proc = new GlideRecord('pwd_process');
        if (proc.get(processId)) {
            processSupportsUnlock = proc.getValue('unlock_account');
        }

        var value = '1'; // Reset Password
        var gr = new GlideRecord('pwd_reset_request');
        if (gr.get(requestId)) {
            var lockState = gr.getValue('lock_state');
            if (processSupportsUnlock == '1' && lockState == '1') {
                value = '3'; // Reset and Unlock
            }
            gr.setValue('action_type', value);
            gr.update();
        }
    },

    type: 'PwdWFRequestProcessor'
};
```