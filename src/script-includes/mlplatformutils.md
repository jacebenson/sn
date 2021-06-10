---
title: "MLPlatformUtils"
id: "mlplatformutils"
---

API Name: global.MLPlatformUtils

```js
var MLPlatformUtils = Class.create();
MLPlatformUtils.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	
	getCurrentTime:function() {
		var currentTime = new GlideDateTime();
		return currentTime;
	},
	
	deactivateSolutionWithSameSolutionDefinition:function(){
		var solution = new GlideRecord('ml_solution');
		var sys_id = this.getParameter('sysparm_sys_id');
		solution.addQuery('solution_definition',sys_id);
		solution.addQuery('active', true);
		solution.query();
		
		var currentTime = this.getCurrentTime();
		while (solution.next()) {
			solution.setValue('active', false);
			solution.setValue('last_activated_date',currentTime);
			solution.update();
		}
	},
	
	type: 'MLPlatformUtils'
});
```