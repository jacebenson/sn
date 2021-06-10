---
title: "PwdAjaxVerifyIdentity"
id: "pwdajaxverifyidentity"
---

API Name: global.PwdAjaxVerifyIdentity

```js
var PwdAjaxVerifyIdentity = Class.create();

PwdAjaxVerifyIdentity.prototype = Object.extendsObject(PwdAjaxRequestProcessor, {

	identifyBL : new PwdIdentifyStageBL(),

	isPublic: function() {
		return true;
	},

	/************
	* Server side Ajax processor for checking the identity of a user.
	*
	* Required Request Parameters:
	*  @sysparm_process_id - the password reset process-ID.
	*  @sysparm_captcha    - the captcha that the user entered or whatever ReCaptcha gives us.
	*
	* Return value:
	* "200"  - If user exists & is enrolled for the process.
	* "500"  - If, for any reason, does not exist or enrolled for the process.
	* "bad captcha" - The user submitted captcha was invalid.
	***********/
	/* eslint-disable consistent-return */
	verifyIdentity: function() {
		// check the security before anything else. If any violation is found, then just return.
		if(!this._validateSecurity()){
			return;
		}

		// Intentionally delay the response to ensure "bots" cannot attempt this ajax calls too frequently:
		var milli = GlideProperties.getInt('password_reset.verification.delay', 1000);
		new SNC.PwdUtil().sleep(milli);

		// Retrieve input params from form fields:
		/* eslint-disable no-undef */
		var sysparm_process_id = request.getParameter("sysparm_process_id");
		var sysparm_captcha = request.getParameter("sysparm_captcha");

		//Only self-service pwd request process will call this ajax req, and all self-service pwd reset process have public access
		//if the public access is false for the sys param process id, looks as a attempt to get other's password.
		var proc = new GlideRecord('pwd_process');
		proc.get(sysparm_process_id);
		if('false' == proc.getDisplayValue('public_access'))
			return '500';


		var idenObjs = [];

		// Adding the below for PRWA backward compatibility
		if(!gs.nil(request.getParameter('sysparm_user_id'))) {

			var idenUserId = request.getParameter('sysparm_user_id');
			var idenProcessorId = "default";

			// Get the processor Id
			var procGr = new GlideRecord('pwd_process');
			procGr.get(sysparm_process_id);
			var idenSysIds = procGr.getValue('identification_type');

			var idenGr = new GlideRecord('pwd_identification_type');
			idenGr.addQuery('sys_id', 'IN', idenSysIds);
			idenGr.query();
			if (idenGr.getRowCount() > 0) {
				idenGr.next();
				idenProcessorId = idenGr.getValue('identification_processor');
			}

			idenObjs.push({
				user_input: idenUserId,
				processor_id: idenProcessorId
			});
		} else {
			var idenLen = parseInt(request.getParameter("sysparm_identification_number"));
			for (var i = 0; i < idenLen; i++) {
				idenObjs.push({
					user_input: request.getParameter('sysparm_user_id_' + i),
					processor_id: request.getParameter('sysparm_processor_id_' + i)
				});
			}
		}

		/* eslint-enable no-undef */

		// verify identity
		var res = this.identifyBL.verifyIdentity(sysparm_process_id, idenObjs, sysparm_captcha, this.request);

		// verification failed, return error message
		if(res != "ok")
			return this._obfuscateResponse(res);

		// Start a workflow to retrieve the user's lock state
		var lu = new PwdUserUnlockUtil();
		lu.startGetLockStateWorkflowNoVerification(gs.getSession().getProperty('sysparm_request_id'), gs.getSession().getProperty('sysparm_sys_user_id'));

		return '200';
	},
	/* eslint-enable consistent-return */

	_obfuscateResponse: function(response) {
		if (!response ||
			response.includes('block') ||
			response.includes('user does not exist') ||
			response.includes('user is not enrolled') ||
			response.includes('not in process') ||
			response.includes('user cannot receive email') ||
			response.includes('locked') || 
			response.includes('ldap error'))
			return '500';
		else
			return response;
	},

	type: 'PwdAjaxVerifyIdentity'
});
```