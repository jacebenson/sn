---
title: "WorkspaceEmailConfigHelper"
id: "workspaceemailconfighelper"
---

API Name: global.WorkspaceEmailConfigHelper

```js
var WorkspaceEmailConfigHelper = Class.create();
WorkspaceEmailConfigHelper.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	/*** 
	* Please ensure that each Public function has 'this._init()' call as the first statement.
	***/
	
	//Globals
	WORKSPACE_ID: '',
	LEGACY_EMAIL_CLIENT_NAME: 'sn-email-editor',
	SEISMIC_EMAIL_CLIENT_NAME: 'sn-email-client-wrapper',
	SELECTED_EMAIL_CLIENT_NAME: '',
	ERROR_CODES: {
		error: 'ERROR',
		success: 'SUCCESS',
		reject: 'REJECTED',
		invalid: 'INVALID'
	},
	
	
	//Public functions
	toggleEmailClient: function() {
		if (this._init())
			return this.ERROR_CODES.error + ': Invalid Workspace ID';
		/** sysparm_email_client_type can have two values
		* 'old' --> for legacy email client
		* 'new' --> for seismic email client
		*/
		var ec_type = this.getParameter('sysparm_email_client_type'),
			ec_id = this._getEmailClientId(ec_type);	
		
		var statusCode = this._switchEmailClient(ec_id);
		return this._getEcChangeStatus(statusCode);
	},
	
	enableUIActionSwitchEcToOld: function(id) {
		if (this._init(id))
			return this.ERROR_CODES.error + ': Invalid Workspace ID';
		var aw = new GlideRecord('sys_aw_renderer');
		aw.addQuery('workspace_config', this.WORKSPACE_ID);
		aw.addQuery('table', 'sys_email');
		aw.addQuery('custom_renderer_tag', this.SEISMIC_EMAIL_CLIENT_NAME);
		aw.query();
		if (aw.next()) return true;
		else return false;
	},
	
	enableUIActionSwitchEcToModern: function(id) {
		if (this._init(id))
			return this.ERROR_CODES.error + ': Invalid Workspace ID';
		var aw = new GlideRecord('sys_aw_renderer');
		aw.addQuery('workspace_config', this.WORKSPACE_ID);
		aw.addQuery('table', 'sys_email');
		aw.addQuery('custom_renderer_tag', this.LEGACY_EMAIL_CLIENT_NAME);
		aw.query();
		if (aw.next()) return true;
		else return false;
	},
	
	
	//Private Functions
	_init: function(id) {
		this.WORKSPACE_ID = id || this.getParameter('sysparm_workspace_id');
		if (JSUtil.nil(this.WORKSPACE_ID)) return true;	
	},
	
	_getEmailClientId: function(type) {
		if (JSUtil.nil(type)) return;
		if (type == 'new')
			this.SELECTED_EMAIL_CLIENT_NAME = this.SEISMIC_EMAIL_CLIENT_NAME;
		else if (type == 'old')
			this.SELECTED_EMAIL_CLIENT_NAME = this.LEGACY_EMAIL_CLIENT_NAME;
		
		if (!this.SELECTED_EMAIL_CLIENT_NAME) return;
		
		var ulc = new GlideRecord('sys_ux_lib_component');
		ulc.addQuery('tag', this.SELECTED_EMAIL_CLIENT_NAME);
		ulc.query();
		if (ulc._next()) return ulc.sys_id + '';
		
	},
	
	_switchEmailClient: function(ec) {
		if (!ec) 
			return this.ERROR_CODES.error;
		var sar = new GlideRecord('sys_aw_renderer'),
			statusCode;
		sar.addQuery('workspace_config', this.WORKSPACE_ID);
		sar.addQuery('table', 'sys_email');
		sar.query();
		while (sar._next()) {
			var current_val = sar.getValue('custom_renderer_tag');
			if (current_val != this.LEGACY_EMAIL_CLIENT_NAME && current_val != this.SEISMIC_EMAIL_CLIENT_NAME)
				statusCode = this.ERROR_CODES.reject;
			else if (current_val == this.SELECTED_EMAIL_CLIENT_NAME)
				statusCode = this.ERROR_CODES.invalid;
			else {
				sar.setValue('custom_renderer', ec);
				statusCode = sar.update() ? this.ERROR_CODES.success : this.ERROR_CODES.error;
			}
		}
		return statusCode || this.ERROR_CODES.error;
	},
	
	_getEcChangeStatus: function(code) {
		var result = {};
		result.status = code;
		if (code == this.ERROR_CODES.error)
			result.message = gs.getMessage("Generic Error occured in {0}.toggleEmailClient", this.type);
		else if (code == this.ERROR_CODES.success)
			result.message = gs.getMessage("Email Client changed successfully");
		else if (code == this.ERROR_CODES.reject)
			result.message = gs.getMessage("Unable to switch email client as workspace is not using OOB renderer");
		else if (code == this.ERROR_CODES.invalid)
			result.message = gs.getMessage("Invalid update requested");			

		return JSON.stringify(result);
	},
	
	type: 'WorkspaceEmailConfigHelper'
});
```