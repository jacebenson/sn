---
title: "ChangeRequestDateMessage"
id: "changerequestdatemessage"
---

API Name: global.ChangeRequestDateMessage

```js
var ChangeRequestDateMessage = Class.create();

ChangeRequestDateMessage.prototype = {
	
    initialize: function(_gr) {
        this.gr = _gr;
    },
	
    /**
     * Gets the description message for the change request planned start/end date based on the state.
     * 
     * @returns the message to display or empty string if not applicable
     */
    getDateMsg: function() {
        if (!this.gr)
            return "";

		var state = this.gr.getValue("state") - 0;
		if (state === 4) // canceled
			state = this._getPreviousState();
        return this._getDateMessage(state);
    },

	_getDateMessage: function(state) {
		var td = GlideTableDescriptor.get("change_request");
		var startElement = td.getElementDescriptor("start_date");
		var startLabel = startElement ? startElement.getLabel() : gs.getMessage("Planned start date");
		var endElement = td.getElementDescriptor("end_date");
		var endLabel = endElement ? endElement.getLabel() : gs.getMessage("Planned end date");
		switch(state.toString()){
			case "-5": // new
			case "-4": // assess
			case "-3": // authorize
				return gs.getMessage("{0} and {1} are the requested change window", [startLabel, endLabel]);
			case "-2": // scheduled
			case "-1": // implement
			case "0": // review
			case "3": // closed
				return gs.getMessage("{0} and {1} are the approved change window", [startLabel, endLabel]);
			default:
				return "";
		}
	},

	_getPreviousState: function() {
		var gr = new GlideRecord("sys_history_line");
		gr.addEncodedQuery("field=state^set.id=" + this.gr.sys_id + "^set.table=change_request^ORDERBYDESCupdate");
		gr.query();
		if (gr.next())
			return gr.getValue("old_value");
	},

    type: "ChangeRequestDateMessage"
};
```