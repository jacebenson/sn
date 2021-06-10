---
title: "TechnicalServicesTablesQuery"
id: "technicalservicestablesquery"
---

API Name: global.TechnicalServicesTablesQuery

```js
var TechnicalServicesTablesQuery = Class.create();
TechnicalServicesTablesQuery.prototype = {
    initialize: function() {
    },
	
	process: function(){
		var utils = new TableUtils('cmdb_ci');
		var ciList = utils.getTableExtensions().toArray();
		utils = new TableUtils('cmdb_ci_service_auto');
		var serviceList = utils.getAllExtensions().toArray();
		var map = {};
		//mark the classes that we want to remove from list
		for (var i = 0; i < serviceList.length ; i++) {
			map[serviceList[i]] = true;
		}
		// Add cmdb_ci_service and cmdb_ci_service_group to the map of classes that we want to remove
		map['cmdb_ci_service'] = true;
		map['cmdb_ci_service_group'] = true;
		
		//change classes to remove to null
		for(i = 0 ; i < ciList.length ; i++){
			if(map[ciList[i]])
			ciList[i] = null;
		}
		//remove null classes from array
		ciList = ciList.filter(Boolean);
		// Add the query_based_service_basic_view to the array
		ciList.push('query_based_service_basic_view');
		return ciList;
	},

    type: 'TechnicalServicesTablesQuery'
};
```