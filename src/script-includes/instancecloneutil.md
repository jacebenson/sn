---
title: "InstanceCloneUtil"
id: "instancecloneutil"
---

API Name: global.InstanceCloneUtil

```js
var InstanceCloneUtil = Class.create();
InstanceCloneUtil.prototype = {
	initialize: function() {
	},

	type: 'InstanceCloneUtil'
};

InstanceCloneUtil.generateRecurringClones = function(parentCloneRec) {
	if(gs.nil(parentCloneRec)) 
		return;

	var cloneFrequency = parentCloneRec.getValue('clone_frequency');
	if(gs.nil(cloneFrequency) || parentCloneRec.getValue('recurring') == 0) 
		return;
	
	
	var cloneCount = 1;
	var maxOccurrences = parentCloneRec.getValue('occurrences');
	var cloneRequestedTime = parentCloneRec.getValue('scheduled');
	if(gs.nil(cloneRequestedTime)) 
		cloneRequestedTime = new GlideDateTime();

	var cloneScheduledTime = new GlideDateTime(cloneRequestedTime);

	if(gs.nil(maxOccurrences) || maxOccurrences == 1) 
		return;

	var upperBoundForMaxOccurrences = 50;// Never allow more than upperBoundForMaxOccurrences clones to be scheduled via recurring

	while(cloneCount < maxOccurrences && cloneCount <= upperBoundForMaxOccurrences) {

		if(cloneFrequency == 1) 
			cloneScheduledTime.addDaysUTC(7);
		else if(cloneFrequency == 2) 
			cloneScheduledTime.addDaysUTC(14);
		else if(cloneFrequency == 3) 
			cloneScheduledTime.addMonthsUTC(1);
		
		var parentCloneGr = new GlideRecord('clone_instance');
		parentCloneGr.addQuery('sys_id', parentCloneRec.getValue('sys_id'));
		parentCloneGr.query();
		
		if(parentCloneGr.next()) {
			parentCloneGr.setValue('scheduled', cloneScheduledTime);
			parentCloneGr.setValue('parent', parentCloneRec.getValue('sys_id'));
			parentCloneGr.setValue('clone_id', '');
			parentCloneGr.setValue('clone_frequency', '');
			parentCloneGr.insert();
		}
		
		cloneCount ++;
	}
	
	parentCloneRec.setValue('parent', parentCloneRec.getValue('sys_id'));
	parentCloneRec.setWorkflow(false);
	parentCloneRec.update();
};

InstanceCloneUtil.getOptionsJson = function(defaultOptions) {
	var options = {};

	if(gs.nil(defaultOptions)) 
		return '';

	for(var key in defaultOptions) {
		var label = defaultOptions[key];
		var value = defaultOptions[key];
		options[label] = value;
	}

	return options;
};

InstanceCloneUtil.getRecurringCloneEndDate = function(cloneRequestedTime, cloneFrequency, maxOccurrences) {
	if(gs.nil(cloneFrequency) || gs.nil(maxOccurrences)) 
		return;

	if(gs.nil(cloneRequestedTime)) 
		cloneRequestedTime = new GlideDateTime();

	if(maxOccurrences <= 1)
		return cloneRequestedTime;

	var multiplier = maxOccurrences - 1;
	var currentScheduledDate = new GlideDateTime(cloneRequestedTime);
	if(cloneFrequency == 1) 
		currentScheduledDate.addDaysUTC(7 * multiplier);
	else if(cloneFrequency == 2) 
		currentScheduledDate.addDaysUTC(14 * multiplier);
	else if (cloneFrequency == 3) 
		currentScheduledDate.addMonthsUTC(multiplier);

	return currentScheduledDate + '';
};
```