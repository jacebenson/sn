---
title: "ProblemUtil"
id: "problemutil"
---

API Name: global.ProblemUtil

```js
var ProblemUtil = Class.create();
ProblemUtil.prototype = Object.extendsObject(ProblemUtilSNC, {

	initialize: function(request, responseXML, gc) {
		ProblemUtilSNC.prototype.initialize.call(this, request, responseXML, gc);
	},
	
    type: 'ProblemUtil'
});
```