---
title: "ProblemTaskStateUtils"
id: "problemtaskstateutils"
---

API Name: global.ProblemTaskStateUtils

```js
var ProblemTaskStateUtils = Class.create();

ProblemTaskStateUtils.prototype = Object.extendsObject(ProblemTaskStateUtilsSNC, {
    initialize: function(argument) {
		ProblemTaskStateUtilsSNC.prototype.initialize.call(this, argument);
    },

    type: 'ProblemTaskStateUtils'
});
```