---
title: "ChartSectionUtil"
id: "chartsectionutil"
---

API Name: global.ChartSectionUtil

```js
var ChartSectionUtil = Class.create();
ChartSectionUtil.prototype = {
    initialize: function() {
    },
	filterChartsBySectionType:function(){
				
		var sectionType= current.type;
		if(sectionType == "single_score"){
			return "type=report^report.type=single_score^NQtype=PA";
		}else if(sectionType == "report"){
			return "type=report^report.type!=single_score";
		}
		return "";
	},
    type: 'ChartSectionUtil'
};
```