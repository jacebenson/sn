---
title: "ChangeManagementEventUtilSNC"
id: "changemanagementeventutilsnc"
---

API Name: global.ChangeManagementEventUtilSNC

```js
var ChangeManagementEventUtilSNC = Class.create();

ChangeManagementEventUtilSNC.PROP_GENERATE_STATE_EVENT_ENABLED = "com.snc.change_request.event.state_updated.enabled";
ChangeManagementEventUtilSNC.PROP_GENERATE_STATE_EVENT_STATES = "com.snc.change_request.event.state_updated.states";
ChangeManagementEventUtilSNC.EVENT_CHANGE_STATE_UPDATED = "sn_change.state.updated";

ChangeManagementEventUtilSNC.prototype = {

    initialize: function() {},

    generateStateUpdatedEvent: function(current, previous) {
        if (current.state.changes() && this._checkEventProperty(current))
            this._generateEvent(current, previous);
    },

    _checkEventProperty: function(current) {
        if (gs.getProperty(ChangeManagementEventUtilSNC.PROP_GENERATE_STATE_EVENT_ENABLED, "true") !== "true")
            return false;

        var statePropertyValue = gs.getProperty(ChangeManagementEventUtilSNC.PROP_GENERATE_STATE_EVENT_STATES, "").trim();
        if (statePropertyValue === "" || statePropertyValue.split(",").map(function(state) {
                return state.trim();
            }).indexOf(current.getValue("state")) > -1)
            return true;

        return false;
    },

    _generateEvent: function(current, previous) {
        gs.eventQueue(ChangeManagementEventUtilSNC.EVENT_CHANGE_STATE_UPDATED, current, current.state, current.operation() === "update" ? previous.state : "");
    },

    type: 'ChangeManagementEventUtilSNC'
};
```