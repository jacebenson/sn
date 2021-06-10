---
title: "ProblemStateUtils"
id: "problemstateutils"
---

API Name: global.ProblemStateUtils

```js
var ProblemStateUtils = Class.create();
ProblemStateUtils.prototype = Object.extendsObject(ProblemStateUtilsSNC, {
    initialize: function(argument) {
		ProblemStateUtilsSNC.prototype.initialize.call(this, argument);
    },

    type: 'ProblemStateUtils'
});
```