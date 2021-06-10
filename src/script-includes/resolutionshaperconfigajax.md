---
title: "ResolutionShaperConfigAjax"
id: "resolutionshaperconfigajax"
---

API Name: sn_res_shaper.ResolutionShaperConfigAjax

```js
var ResolutionShaperConfigAjax = Class.create();
(function () {

    var PARAM_TABLE_NAME = "sysparm_table_name";

    function getConfigForTable(tableName) {
        var taskTable = tableName || this.getParameter(PARAM_TABLE_NAME);
		var parents = new GlideTableHierarchy(taskTable).getTables();
        var gr =  new GlideRecord("sys_resolutionshaper_config");
        var response = {};
        var rsConfig = {};
		var rsConfigGr = null;
		gr.addQuery('table', "IN", parents);  //get all the parent tables that have resolution shaper config
		gr.query();
		while (gr.next()) {
			//each time compare the saved rsConfig with new table's index. Pick the table with smallest index which is the closest ancestor
			if (!rsConfig.table || parents.indexOf(gr.getValue('table')) < parents.indexOf(rsConfig.table)) {
				rsConfig.table = gr.getValue('table');
				rsConfig.requestorStates = gr.getValue('requestor_states');
				rsConfig.newState = gr.getValue('new_state');
				rsConfig.closedState = gr.getValue('closed_state');
				rsConfig.fulfillerLabel = gr.getDisplayValue('fullfiller_label');
				rsConfig.callerLabel = gr.getDisplayValue('caller_label');
				rsConfig.requestLabel = gr.getValue('request_label');
				rsConfig.sysId = gr.getValue('sys_id');
			}
		}
		
        if (rsConfig.table) {
            response.config = rsConfig;
            response.isSuccess = true;
			
        }else{
            response.isSuccess = false;
            response.failureReason = "NO_DATA";
        }
        return new global.JSON().encode(response);
    }

    ResolutionShaperConfigAjax.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {
        getConfigForTable: getConfigForTable
    });
})();

```