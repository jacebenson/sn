---
title: "AsmtMetricsUtil"
id: "asmtmetricsutil"
---

API Name: global.AsmtMetricsUtil

```js
var AsmtMetricsUtil = Class.create();
AsmtMetricsUtil.prototype = {
	initialize: function() {
	},
	
	hasListNewAccess: function() {
		return gs.action.getGlideURI().get('sysparm_view') != 'survey' 
			&& !gs.action.getGlideURI().get('sysparm_target').includes('sample_metric') 
			&& !gs.action.getGlideURI().get('sysparm_target').includes('asmt_metric.depends_on');
	},
	type: 'AsmtMetricsUtil'
};
```