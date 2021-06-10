---
title: "ProblemTaskStateUtilsSNC"
id: "problemtaskstateutilssnc"
---

API Name: global.ProblemTaskStateUtilsSNC

```js
var ProblemTaskStateUtilsSNC = Class.create();

ProblemTaskStateUtilsSNC.prototype = {
    initialize: function(argument) {
	},
	
	STATES: {
		ASSESS: ProblemTaskState.States.ASSESS,
		WORK_IN_PROGRESS: ProblemTaskState.States.WORK_IN_PROGRESS,
		CLOSED: ProblemTaskState.States.CLOSED
	},

	COLUMNS: {
		STATE: "state",
		CLOSE_CODE: "close_code",
	},
	
	PROPERTIES: {
		REASSES_FROM_CLOSED: "problem_task.closed.role.reaassess_from_closed",
		CLOSED_PROBLEM_CAN_CREATE_PROBLEM_TASK: "problem.closed.can_create_tasks"
	},

	ROLE_PROP_CHOICES: {
		NOBODY: "-nobody-",
		PROBLEM_COORDINATOR: "problem_coordinator",
		PROBLEM_ANALYST: "problem_task_analyst"
	},

	validateStateTransition: function(problemTaskGr, state) {

		if (!problemTaskGr || !state || !problemTaskGr.isValid())
			return false;

		if (sn_sm.RecordStateValidator.isValidStateTransition(problemTaskGr, state))
			return true;

		return false;

	},
	
	isAllowedToReAssess: function(current) {
		if (current.state == this.STATES.CLOSED && this.validateStateTransition(current, this.STATES.ASSESS)) {

			var user = gs.getUser();
			var closeCode = current.getValue(this.COLUMNS.CLOSE_CODE);
			var reaccessFromClosedRole = gs.getProperty(this.PROPERTIES.REASSES_FROM_CLOSED);
			
			if ((reaccessFromClosedRole != this.ROLE_PROP_CHOICES.NOBODY) && user.hasRole(reaccessFromClosedRole)) 
				return true;
		}
		return false;
	},

	isAllowedToCancel: function(current) {
		
		if (current.state!=this.STATES.CLOSED)
			if ((current.state==this.STATES.ASSESS)||(current.state==this.STATES.WORK_IN_PROGRESS))
				if (this._isAllowedToClose(current))
					return true;
		return false;
	},
	
	isAllowedToComplete: function(current) {
		
		if (current.state!=this.STATES.CLOSED)
			if (current.state==this.STATES.WORK_IN_PROGRESS)
				if (this._isAllowedToClose())
					return true;
		return false;
				
	},
	
	_isAllowedToClose: function() {
		var user = gs.getUser();
		var result = user.hasRole(this.ROLE_PROP_CHOICES.PROBLEM_ANALYST);
		return result;
	
	},

	onReAssess: function(problemGr) {

		if(!problemGr || !problemGr.isValid())
			return false;

		problemGr.setValue(this.COLUMNS.STATE, this.STATES.ASSESS);
		problemGr.update();
	},
	
	canCreateProblemTask: function(source) {
	
		if (source.state == ProblemState.STATES.CLOSED && gs.getProperty(this.PROPERTIES.CLOSED_PROBLEM_CAN_CREATE_PROBLEM_TASK) == 'false') 
			return false;
		
		return true;
	},

    type: 'ProblemTaskStateUtilsSNC'
};
```