---
title: "VariableAcceleratorUtil"
id: "variableacceleratorutil"
---

API Name: global.VariableAcceleratorUtil

```js
var VariableAcceleratorUtil = (function() {
	return {
	
		hasExistingPrompt : function(record) {
			return record.existing_prompt.hasValue();
		},
	
		getExistingPrompt : function(id) {
			if (!id)
				return null;
		
			var prompt = new GlideRecord("sys_cb_prompt");
			if (prompt.get(id))
				return prompt;
		
			return null;
		},
	
		getVariable : function(record) {
			var element = record.getValue("column");
			var model = record.getValue("topic");
			if (!model)
				model = record.topic_goal.topic + "";
		
			if (!element || !model)
				return null;
		
			var variable = new GlideRecord("topic_variable");
			variable.addQuery("model", model);
			variable.addQuery("element", element);
			variable.query();
		
			if (variable.next())
				return variable;
		
			return null;
		},
		
		isDeleteAction : function (action) {
			return action.getActionSysId() == "5f059b1ab3300300f7d1a13816a8dcfd";
		},
		
		canShowDelete : function(transaction) {
			if (!transaction)
				return false;
			
			var prompt_id = "sysparm_prompt_id";
			var existing_prompt = "sys_cb_variable_accelerator.existing_prompt";
			
			if (!!transaction.getRequestParameter(prompt_id))
				return true;
			
			if (!!transaction.getRequestParameter(existing_prompt))
				return true;
			
			return false;
		},
		
		shouldPrefillPrompt : function(transaction) {
			return !!transaction.getRequestParameter("sysparm_prompt_id");
		},
		
		getEditRedirectUrl : function(transaction) {
			var url = transaction.getRequestParameter("sysparm_referring_url") + "";
			
			if (!url)
				url = "/cb_close_modal.do?sysparm_direct=true";
			
			url = url.replace("$sys_id_ui11", "-1");
			url += "&sysparm_referring_url=" + encodeURIComponent(url);
			
			return url;
		}
	};
})();
```