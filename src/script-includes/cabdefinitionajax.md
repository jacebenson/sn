---
title: "CABDefinitionAjax"
id: "cabdefinitionajax"
---

API Name: sn_change_cab.CABDefinitionAjax

```js
var CABDefinitionAjax = Class.create();
CABDefinitionAjax.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {
	updateDefinition: function() {
		var fields = this.getParameter("sysparm_fields");
		var meetId = this.getParameter("sysparm_meeting");

		var meetingGr = new GlideRecord("cab_meeting");
		if (meetingGr.get(meetId)) {
			var definitionGr = meetingGr.cab_definition.getRefRecord();
			if (definitionGr) {
				var definitionSpanGr = meetingGr.cmn_schedule_span_origin.getRefRecord();

				var fieldsObject = new global.JSON().decode(fields);
				var tableDotfields = Object.keys(fieldsObject);

				for (var i = 0; i < tableDotfields.length; i++) {
					var tableDotfield = tableDotfields[i];
					var field = tableDotfield.replace("cab_meeting.", "");
					var value = fieldsObject[tableDotfield];

					if ((field != "start") && (field != "end"))
						definitionGr.setValue(field, value);
					else {
						if (!meetingGr.cmn_schedule_span_exclude.nil()) {
							var spanGr = meetingGr.cmn_schedule_span_exclude.getRefRecord();
							spanGr.deleteRecord();
						}

						var sdt = new GlideScheduleDateTime(new GlideDateTime(value));
						definitionSpanGr.setValue(field + "_date_time", sdt.getValue());
					}
				}
				definitionGr.update();
				definitionSpanGr.update();
			}
		}
		return true;
	},

	isDefinitionManager: function() {
		var meetId = this.getParameter("sysparm_meeting");
		var managerId = this.getParameter("sysparm_manager");
		var meetingGr = new GlideRecord("cab_meeting");

		if (meetingGr.get(meetId)) {
			var definitionGr = meetingGr.cab_definition.getRefRecord();

			if (definitionGr && definitionGr.getValue("manager") == managerId)
				return true;
		}
		return false;
	},

	type: "CABDefinitionAjax"
});
```