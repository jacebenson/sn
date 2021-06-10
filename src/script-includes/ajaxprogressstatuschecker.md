---
title: "AJAXProgressStatusChecker"
id: "ajaxprogressstatuschecker"
---

API Name: global.AJAXProgressStatusChecker

```js
var AJAXProgressStatusChecker = Class.create();


AJAXProgressStatusChecker.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	getStatus: function() {
		var execution_id = this.getParameter("sysparm_execution_id");
		var tgr = new GlideRecord("sys_execution_tracker");
		if (tgr.get(execution_id)) {
			var status = this.getStatusLayer(tgr, tgr.canRead());
			return new JSON().encode(status);
		} else {
			// Tracker not found
			var noTrackerObj = {};
			var RecordNotFoundMsg = GlideSysMessage.format("Record not found");
			noTrackerObj.name = RecordNotFoundMsg;
			noTrackerObj.message = RecordNotFoundMsg;
			// State value -1 will tell the client API to stop polling for progress, as record not found
			noTrackerObj.state = "-1";
			noTrackerObj.sys_id = execution_id;
			noTrackerObj.children = [];
			noTrackerObj.results = [];
			return new JSON().encode(noTrackerObj);
		}
	},

	getStatusLayer: function(gr, hasReadAccess) {
		var obj = {};
		if (hasReadAccess) {
			obj.name = gr.name.toString();
			obj.state = gr.state.toString();
			obj.message = gr.message.toString();
			obj.detail_message = gr.detail_message.toString();
			try {
				obj.result = new JSON().decode(gr.result.toString());
			} catch (e) {
				gs.print("Error occurred while parsing execution tracker result: " + e);
			}
			obj.sys_id = gr.sys_id.toString();
			obj.percent_complete = gr.percent_complete.toString();
			obj.updated_on = gr.sys_updated_on.toString();

			var startTime = new GlideDateTime(gr.start_time);
			var endTime = new GlideDateTime(gr.completion_time);
			var duration = new GlideDuration(endTime.getNumericValue() - startTime.getNumericValue());

			obj.duration = duration.getDisplayValue();
		} else {
			var AccessDeniedMsg = GlideSysMessage.format("Access denied");
			obj.name = AccessDeniedMsg;
			obj.message = AccessDeniedMsg;
			obj.state = "1";
			// State value 1 lets the client API know it may be "Running", instead of abruptly saying we are done and break client rendering
			// Running state help the client to continue poll, if somehow access opens up after a bit. Example: ATF impersonation use case
			obj.sys_id = gr.sys_id.toString();
		}

		obj.children = [];
		obj.results = [];
		var pgr = new GlideRecord("sys_execution_tracker");
		pgr.addQuery("parent", gr.sys_id);
		pgr.orderBy("order");
		pgr.query();
		while (pgr.next()) {
			obj.children.push(this.getStatusLayer(pgr, hasReadAccess));
		}
		return obj;
	},

	type: 'AJAXProgressStatusChecker'

});
```