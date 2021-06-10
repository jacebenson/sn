---
title: "ProblemStateSNC"
id: "problemstatesnc"
---

API Name: global.ProblemStateSNC

```js
var ProblemStateSNC = Class.create();

ProblemStateSNC.NEW = "101";
ProblemStateSNC.ASSESS = "102";
ProblemStateSNC.ROOT_CAUSE_ANALYSIS = "103";
ProblemStateSNC.FIX_IN_PROGRESS = "104";
ProblemStateSNC.RESOLVED = "106";
ProblemStateSNC.CLOSED = "107";

ProblemStateSNC.RESOLUTION_CODES = {
	FIX_APPLIED: "fix_applied",
	RISK_ACCEPTED: "risk_accepted",
	CANCELED: "canceled",
	DUPLICATE: "duplicate"
};

ProblemStateSNC.prototype = {
    initialize: function() {},
    type: 'ProblemStateSNC'
};
```