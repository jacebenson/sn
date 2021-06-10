---
title: "PwdEnrollEmailProcessor"
id: "pwdenrollemailprocessor"
---

API Name: global.PwdEnrollEmailProcessor

```js
var PwdEnrollEmailProcessor = Class.create();
/**
 * Handles enrollment for Email.
 */
PwdEnrollEmailProcessor.prototype = {
    category: 'password_reset.extension.enrollment_form_processor', // DO NOT REMOVE THIS LINE!

    /**
     * Init function.
     */
    initialize: function() {
    },
    
    /**********
    * Process the enrollment form, and returns a PwdExtensionScriptResponse object, which contains: result, message and value 
    * 
    * @param params.userId                            The sys-id of the user trying to enroll (table: sys_user)
    * @param params.verificationId                    The sys-id of the verification to be enrolled into (table: pwd_verification)
    * @param params.enrollmentId                      The sys-id of this enrollment process.
	* 
    * @param params.getFormParameter(<form element>)  Any of the form elements
	* 
    * @return a map with the attributes: 'result' and 'message' for example: {result: 'success', message : 'bla bla'}
    **********/
    process: function(params) {
		// Email enrollment is handled using Ajax, before the form is submitted
		// Need to check if the user has an enrolled email:
		var gr = new GlideRecord('pwd_device');
		gr.addQuery('status', 1);  // Status == 1 means Verified
		var gc = gr.addJoinQuery('cmn_notif_device', 'device', 'sys_id');
		gc.addCondition('user', params.userId);
		gc.addCondition('type', "Email");
		gr.query();
		if (gr.hasNext()) {
			return {result : 'success', message : gs.getMessage('Authorized the email successfully')};
		} else {
			return {result : 'fail', message : gs.getMessage('You must authorize at least one email')};
		}		
    },
	
    type: 'PwdEnrollEmailProcessor'
};
```