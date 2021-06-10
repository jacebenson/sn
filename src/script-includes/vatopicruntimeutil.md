---
title: "VaTopicRuntimeUtil"
id: "vatopicruntimeutil"
---

API Name: global.VaTopicRuntimeUtil

```js
var VaTopicRuntimeUtil = Class.create();
VaTopicRuntimeUtil.prototype = {
    initialize: function() {
    },	
	
	executeFunction: function (obj, functionName, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
		return obj[functionName](arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8);
	},

	type: 'VaTopicRuntimeUtil'
};
```