---
title: "GamingUtil"
id: "gamingutil"
---

API Name: x_8821_jacereytest.GamingUtil

```js
var GamingUtil = Class.create();
GamingUtil.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {
	// If you want to use initialize you can only if you include
	// AbstractAjaxProcessor with something like this;
	/*
    initialize: function(request, responseXML, gc) {
        global.AbstractAjaxProcessor.prototype.initialize.call(this, request, responseXML, gc);
        // Your code
    },
    */
	awesomeFunction: function(){
		try{
		var inputObj = JSON.parse(this.getParameter('sysparm_obj'));
		var returnObj = {
			from:"server",
			input: inputObj
		};
		var sys_user = new GlideRecord('sys_user');
		if(sys_user.get(inputObj.user)){
			returnObj.user = {};
			returnObj.user.department = sys_user.getDisplayValue('department');
		} else {
			returnObj.user = false;
			returnObj.message = "No User Found.";
		}
		return JSON.stringify(returnObj);
		} catch(e){
			return JSON.stringify(e);
		}
	},
	type: 'GamingUtil'
});
```