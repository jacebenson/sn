---
title: "PwdAjaxEnrollmentProcessor"
id: "pwdajaxenrollmentprocessor"
---

API Name: global.PwdAjaxEnrollmentProcessor

```js
var PwdAjaxEnrollmentProcessor  = Class.create();

PwdAjaxEnrollmentProcessor.prototype = Object.extendsObject(PwdAjaxRequestProcessor, {

   manager : new PwdEnrollmentManager(),
	
   enroll: function() {	   
	   var map ={}; 
	   
	   // total count.
	   var total = this.getParameter("sysparm_total_count");
	   
	   for(var i = 0; i < total ; i++) {
		   var name = 'sysparm_param_'+i;
		   var data = this.getParameter(name);
		   this._parseData(data,map);
	   }
	   
	   var formCnt = this.getParameter('sysparm_form_count');
	   var userId = gs.getUserID();
	   
	   for(i = 0; i < formCnt ; i++) {
		   var dataFormName = 'sysparm_macro_'+i+'_data';
		   var dataEntryMap = map[dataFormName];
		   
		   var infoName = 'sysparm_macro_'+i+'_info';
		   var infoEntryMap = map[infoName];
		   var processor = infoEntryMap['enrollment_processor'];
		   var verificationId = infoEntryMap['verificationId'];
		   
		   try
		   {
			   this.manager.initializeByScriptNameAndCategory(processor, 'password_reset.extension.enrollment_form_processor');
			   
               // if we can't find the script, just notify and abort
               // Since there is no unique constraint on name on sys_script_include, we're jut going to take the first record
			   if (!this.manager.extensionScriptFound()) {
                   this._setErrorResponse(verificationId, gs.getMessage('Cannot find enrollment processor extension: {0}', processor));
                   continue;				   
			   }
				   
			   var response = this.manager.createNew(dataEntryMap, verificationId, userId);

			   //Sets the ajax response from the processor response.
			   this._setResponse(verificationId, response);
		   } catch(err) {
			   this._setErrorResponse(verificationId,err.message);
		   }
	   }//end of for.
	},
	
	/**
	 * Sets the runtime error response
	 */
	_setErrorResponse: function(verificationId, msg) {
		var response = this.newItem(verificationId);
		response.setAttribute('status', 'failure');
		response.setAttribute('message', msg);
	},
		
	/**
	 * Parsing the data.
	 */
	_parseData: function(data, map) {
		var formId = this._getFormId(data);
		var entry = map[formId];
		if(entry==undefined) {
			entry = {}; 
			map[formId]= entry;
		}
		var name = this._getElementName(data);
		var value = this._getElementValue(data);
		
		entry[name]=value;
	},
	
	/**
	 * Returns the from Id from the data. 
	 */
	_getFormId: function(data) {
		var val = data;
		var index = val.indexOf(":");
		return val.substring(0,index);
	},
	
	/**
	 * Returns the element name from the data.
	 */
	_getElementName: function(data) {
		var val = data;
		var index = val.indexOf(':');
		val = val.substring(index+1);
		index = val.indexOf("=");
		return val.substring(0,index);
	},
	
	/**
	 * Returns the element value from the data.
	 */
	_getElementValue: function(data) {
		var val = data;
		var index = val.indexOf('=');
		try
		{
			return val.substring(index+1);
		}
		catch(err)
		{
			return '';
		}
	},
	
	/**
	 * Returns the size 
	 */
	_getSize: function(obj) {
		var size = 0;
	    for (var key in obj) {
	        if (obj.hasOwnProperty(key)) size++;
	    }
	    return size;
	},
    
	/**
	 * Sets the response message.
	 */
	_setResponse:function(verificationId, response) {
	    var res = this.newItem("_" + verificationId);
		res.setAttribute('status' , response.result);
		res.setAttribute('message', response.message);
	},
	
	type:PwdAjaxEnrollmentProcessor
});
```