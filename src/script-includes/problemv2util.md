---
title: "ProblemV2Util"
id: "problemv2util"
---

API Name: global.ProblemV2Util

```js
var ProblemV2Util = Class.create();
ProblemV2Util.prototype = Object.extendsObject(ProblemV2UtilSNC, {

	initialize: function(argument) {
		ProblemV2UtilSNC.prototype.initialize.call(this, argument);
	},
	
    type: 'ProblemUtil'
});
```