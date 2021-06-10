---
title: "UACountEvaluatorScript"
id: "uacountevaluatorscript"
---

API Name: global.UACountEvaluatorScript

```js
var UACountEvaluatorScript = Class.create();
UACountEvaluatorScript.prototype = {
    initialize: function() {
    },
	
	execute : function() {
		var tblName = current.getTableName();
		var result = new SNC.UsageAnalyticsScriptUtils().getExecutionStats(current);
		var jsonObj =  JSON.parse(result);
		var msg = 'Result: ';
		var count = jsonObj.count;
		var executionTime = jsonObj.executiontime;
		var agg_data = jsonObj.ua_defn_agg;

		if(!gs.nil(executionTime))
			msg += 'Time taken to execute (ms): ' + executionTime + ', ';

		if(!gs.nil(count)) {
			msg += 'Count: ' + count + '. ';

			if(count == -1) {
				if (tblName == 'usageanalytics_count_cfg' && 
					JSUtil.notNil(current.getValue('script')))
					msg += 'Invalid script, please check the console log for errors. ';
				else
					msg += 'Either table name and/or query is invalid, please check the console log for errors. ';
			}
		} else {
			msg += jsonObj.message;
		}
		
		gs.addInfoMessage(msg);
		
		if(!gs.nil(agg_data)){
			var href = "<a href = '/syslog_list.do?sysparm_query=sys_created_on%3E%3Djavascript%3Ags.beginningOfLastMinute()%5Esource%3Dua_defn_agg&sysparm_view='>here</a>";
			var url	= gs.getMessage("Click {0} to view aggregate data", href);
			gs.addInfoMessage(url);
	    }
		
		action.setRedirectURL(current);
	},

    type: 'UACountEvaluatorScript'
};
```