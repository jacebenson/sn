---
title: "ReportUtil"
id: "reportutil"
---

API Name: global.ReportUtil

```js
var ReportUtil = Class.create();
ReportUtil.prototype = {
    initialize: function() {
    },
	
	selectSupportedReport: function() {

		validReportsTypes = ["type=single_score", "line", "step_line", "area", "spline", "bar", "horizontal bar", "donut"];

		if (current.type == "report") {
			validReportTypes.join("^ORtype=");
			return validReportTypes;
		}
		else
			return "";
	},

    type: 'ReportUtil'
};
```