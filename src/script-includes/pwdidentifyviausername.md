---
title: "PwdIdentifyViaUsername"
id: "pwdidentifyviausername"
---

API Name: global.PwdIdentifyViaUsername

```js
var PwdIdentifyViaUsername = Class.create();
PwdIdentifyViaUsername.prototype = {
    category: 'password_reset.extension.identification_form_processor', // DO NOT REMOVE THIS LINE!

    initialize: function() {
    },

  /**********
   * Process the identification form request, and returns the user's sys_id.  if user was not identified return null.
   *
   * @param params.processId   The sys-id of the calling password-reset process (table: pwd_process)
   * @param params.userInput   The user input for verifying identity
   * @param request            The form request object. fields in the form can be accessed using: request.getParameter('<element-id>')
   *                           Supported request paramters:
   *                               sysparm_user_id - the user identifier value entered in the form.                        
   * @return The sys-id of the user that corresponds to the requested input; if no user was found, null should be returned.
   **********/
   processForm: function(params, request) {
      return this.identify(params.userInput, request.getParameter('sysparm_process_id'));
    },


	identify: function(userInput) {
		var gr = new GlideRecord('sys_user');
		gr.addQuery('user_name', userInput);
		gr.query();
		if (!gr.next()) {
			return null;
		}
		return gr.sys_id;
	},
	
    type: 'PwdIdentifyViaUsername'
};
```