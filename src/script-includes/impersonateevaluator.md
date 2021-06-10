---
title: "ImpersonateEvaluator"
id: "impersonateevaluator"
---

API Name: global.ImpersonateEvaluator

```js
var ImpersonateEvaluator = Class.create();
ImpersonateEvaluator.prototype = {
	initialize: function() {},
    type: 'ImpersonateEvaluator',
	canImpersonate: function(currentUser, impersonatedUser) {
		return true;
	}
};
```