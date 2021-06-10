---
title: "ProblemState"
id: "problemstate"
---

API Name: global.ProblemState

```js
var ProblemState = Class.create();

ProblemState.STATES = {
	NEW : ProblemStateSNC.NEW,
	ASSESS : ProblemStateSNC.ASSESS,
	ROOT_CAUSE_ANALYSIS : ProblemStateSNC.ROOT_CAUSE_ANALYSIS,
	FIX_IN_PROGRESS : ProblemStateSNC.FIX_IN_PROGRESS,
	RESOLVED : ProblemStateSNC.RESOLVED,
	CLOSED : ProblemStateSNC.CLOSED
};

ProblemState.RESOLUTION_CODES = ProblemStateSNC.RESOLUTION_CODES;

ProblemState.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {

	getProblemState: function() {
		return ProblemState.STATES;
	},

	getResolutionCodes: function() {
		return ProblemState.RESOLUTION_CODES;
	},

    type: 'ProblemState'
});
```