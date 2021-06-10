---
title: "PwdEnrollmentManager"
id: "pwdenrollmentmanager"
---

API Name: global.PwdEnrollmentManager

```js
var PwdEnrollmentManager = Class.create();
PwdEnrollmentManager.prototype = {
	
	extensionScriptId: null,
	
	initialize: function(extensionScriptSysId) {
		if (!gs.nil(extensionScriptSysId))
			this.extensionScriptId = extensionScriptSysId;
    },
	
	/**
		Initializes the extensionScriptGr record based on name and category
		@param {String} scriptName - Name of the script
		@param {String} category - Category of the script, for ex: 'password_reset.extension.enrollment_form_processor'
	*/
	initializeByScriptNameAndCategory: function(scriptName, category) {
		if (gs.nil(scriptName) ||gs.nil(category))
			throw gs.getMessage('Script name or category is null');
		
		// Call the processor script and process it.
		var extensionScriptGr = new GlideRecord('sys_script_include');
        extensionScriptGr.addQuery('name', scriptName);
        extensionScriptGr.addQuery('script', 'CONTAINS', 'category: \'' + category + '\'');
        extensionScriptGr.query();
		
		// Since there is no unique constraint on name on sys_script_include, we're jut going to take the first record
		if (extensionScriptGr.next())
			this.extensionScriptId = extensionScriptGr.getValue('sys_id');
	},
	
	extensionScriptFound: function() {
		return !gs.nil(this.extensionScriptId);
	},
	
	/**
		Processes the extension script based on script Id and context parameter map
		@param {Object} contextParameterMap - map of key value pairs as json
		@param {String} verificationId
		@param {String} userId - sys_id of the user who is associated with this enrollment
		@return a map with the attributes: 'result' and 'message' for example: {result: 'success', message : 'bla bla'}
	*/
	createNew: function(contextParameterMap, verificationId, userId) {
		
		if (gs.nil(verificationId) || gs.nil(userId))
			return{result: 'failure', message: 'Verification id or user id is null'};
		
		if (gs.nil(contextParameterMap))
			contextParameterMap = {};
		
		// status 0 : in progress.
		var enrollmentId = this._updateEnrollmentRecord(userId, verificationId, '0');
        var extension = new SNC.PwdExtensionScript(this.extensionScriptId);
        var extensionParams = new SNC.PwdExtensionScriptParameter();
        extensionParams.userId = userId;
        extensionParams.enrollmentId = enrollmentId;
        extensionParams.verificationId = verificationId;		
		
		//populate the form parameters:
		this._popluateFormContextParams(contextParameterMap, extensionParams);	
		var response = extension.process(extensionParams); 
		
		// If the response is not ok, 
		// then create a response message and continue.
		if (response.result == 'success')
			this._updateEnrollmentRecord(userId, verificationId, '1');  //Update the enrollment record to update the status "1" : active. 
	
		return response;
	},
	
	setAssociatedUserId: function(userId) {
		if (gs.nil(userId))
			throw gs.getMessage('Cannot assign null user id');
		
		this.userId = userId;
	},
	
	// Updates the record with userId and verification Id.
    _updateEnrollmentRecord:function (userId, verificationId, status) {
        var sysId;
        if (this._doesEnrollmentRecordExist(userId, verificationId)) {
            sysId = new SNC.PwdEnrollmentManager().updateEnrollment(userId, verificationId, status);
        } else {
            sysId =  new SNC.PwdEnrollmentManager().createEnrollment(userId, verificationId, status);
        }
        return sysId;
    },
	
	_popluateFormContextParams: function(obj, extensionParams) {
		var value;
		for (var key in obj) {
			value = obj[key];
			extensionParams.setFormParameter(key, value);
		}
	},
	
	// Returns true if an enrollment record already exists (separate 'update' from 'insert')
    _doesEnrollmentRecordExist:function (userId, verificationId) {
		var gr = new GlideRecord('pwd_enrollment');
		gr.addQuery('verification', verificationId);
		gr.addQuery('user', userId);
		gr.query();
		return gr.hasNext();
    },	

    type: 'PwdEnrollmentManager'
};
```