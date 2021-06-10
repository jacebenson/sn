---
title: "MLSolutionHelper"
id: "mlsolutionhelper"
---

API Name: global.MLSolutionHelper

```js
var MLSolutionHelper = Class.create();

MLSolutionHelper.prototype = {
	initialize: function() {
	},
	/**
	 * Check if there is valid Solution def
	 * @param solutionDef
	 * @returns {boolean}
	 */
	hasSolutionDefinition: function(solutionDef) {
		var gr = new GlideRecord('ml_solution');
		gr.addActiveQuery();
		var ml_schema =  new global.MLSchemaHelper().getMLSchema();
		gr.addQuery(ml_schema.schema_field, solutionDef);
		gr.query();
		if (gr.hasNext()) {
			return true;
		}
		return false;
	},
	/**
	 * GET Dashboard URL
	 * @param urlConfig
	 * @param solution
	 * @param solutionDefinition
	 * @returns {string}
	 */
	getDashboardUrl: function(urlConfig, solution, solutionDefinition) {
		var url = "/$pa_dashboard.do?";
		url = url + "sysparm_dashboard=" + urlConfig.dashboardId;//02167e503b623200d41a456993efc490&
		url = url + "&sysparm_tab=" + urlConfig.tabId;//318a6c743b0332001e68455353efc4bc
		url = url + "&sysparm_cancelable=true&";
		url = url + "sysparm_editable=false&";
		url = url + "sysparm_active_panel=false&";
		url = url + "sysparm_ignore_default_filter=true&";//Set True so that passed filters will work instead of filters set //during previous session
		url = url + "sysparm_homepage_filters=" + this.getHomepageFilters(solution, solutionDefinition);
		return url;
	},
	
	/**
	 * GET Dashboard with breakdown source URL
	 * @param urlConfig
	 * @param breakdownSourceId
	 * @param solutionDefinition
	 * @returns {string}
	 */
	getDashboardWithBreakdownUrl: function(urlConfig, breakdownSourceId, solutionDefinition) {
		var url = "/$pa_dashboard.do?";
		url = url + "sysparm_dashboard=" + urlConfig.dashboardId;
		url = url + "&sysparm_tab=" + urlConfig.tabId;
		url = url + "&sysparm_cancelable=true";
		url = url + "&sysparm_editable=false";
		url = url + "&sysparm_active_panel=false";
		url = url + "&sysparm_element=" +solutionDefinition.getDisplayValue();
		url = url + "&sysparm_element_value=" + solutionDefinition.getDisplayValue();
		url = url + "&sysparm_breakdown_source=" + breakdownSourceId;
		url = url + "&sysparm_ignore_default_filter=false";
		return url;
	},
	
	/**
	 * GET Filters in Stringified format
	 * Remember to convert double to Single quotes.
	 * @param solution
	 * @param solutionDefinition
	 * @returns {string}
	 */
	getHomepageFilters: function(solution, solutionDefinition) {
		var homePageFilters = {
			"2671734e3bf232001e68455353efc4b3": {
				"f6e1f34e3bf232001e68455353efc483": [{
					"filter": "solution=" + solution,
					"table": "ml_class"
				}],
				"bb91b34e3bf232001e68455353efc46c": [{
					"filter": "solution.solution_definition=" + solutionDefinition,
					"table": "ml_class"
				}]
			}
		};
		var filter = JSON.stringify(homePageFilters).replace(/"/g, "'");//replace double quotes to single
		return filter;
	},

	type: 'MLSolutionHelper'
};
```