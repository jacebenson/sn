---
title: "ActionablePushPayloadBuilder"
id: "actionablepushpayloadbuilder"
---

API Name: global.ActionablePushPayloadBuilder

```js
var ActionablePushPayloadBuilder = Class.create();
ActionablePushPayloadBuilder.prototype = {
    initialize: function(currentGR, pushId, layoutFields) {
        this.currentGR = currentGR;
        this.pushId = pushId;
        this.layoutFields = layoutFields;
    },

    /**
     * buildJSON - build push notification payload for given currentGR and push notification id (pushId)
     *
     *  e.g. layoutFields = {"Identifier" : "number", "Description" : "short_description", "Status" : "state" }
     **/
    buildJSON: function() {
        var json = {
            "aps": {
                "sound": "default"
            },
        };

        var pushNotificationGR = this._getRecordById('sys_sg_push_notification', this.pushId);
        if (pushNotificationGR != null) {
            var actionable = pushNotificationGR.getDisplayValue('actionable'); //boolean
            var categoryGR = pushNotificationGR.category.getRefRecord();
            var screen = pushNotificationGR.getValue("screen");
            var actions = [];
            var categoryName;
            if (actionable && categoryGR.isValidRecord()) {
                categoryName = categoryGR.getValue("name");
                var pushActionIds = categoryGR.getValue('actions');
                actions = this._buildPushActions(pushActionIds);
            }

            json["Layout"] = this._buildLayout();
            json["PushId"] = this.pushId;
            json["actionable"] = this._toBoolean(actionable);

            if (screen) {
                json["ScreenId"] = screen;
                json["Link"] = this._buildDeepLink(screen);
            }

            if (categoryName)
                json["aps"]["category"] = categoryName;

            if (actions.length > 0)
                json["Actions"] = actions;
        }

        return json;
    },

    _buildPushActions: function(pushActionIds) {
        var pushActionGR = this._getRecordsByIdArray('sys_sg_push_action', pushActionIds);
        var actions = [];
        while (pushActionGR.next()) {
            var actionInstanceGR = this._getActionInstanceGR(this.pushId, pushActionGR.getUniqueValue());
            if (actionInstanceGR == null || actionInstanceGR.getValue("button") == null)
                continue;

            var buttonGR = this._getRecordById("sys_sg_button", actionInstanceGR.getValue("button"));
            if (buttonGR == null)
                continue;

            var actionItem = {};
            var pushActionId = pushActionGR.getUniqueValue();
            actionItem['PushActionId'] = pushActionGR.getUniqueValue();
            actionItem['Name'] = pushActionGR.getValue("name");
            actionItem['Label'] = pushActionGR.getValue("label");
            var responseType = pushActionGR.getValue("response_type");
            actionItem['ResponseType'] = responseType;
            actionItem['Foreground'] = this._toBoolean(pushActionGR.getValue("foreground"));
            if (responseType && responseType == 'text_response')
                actionItem['PlaceHolderText'] = pushActionGR.getValue("placeholder_text");

            var buttonType = buttonGR.getValue("type");
            var buttonContext = buttonGR.getValue("context");

            actionItem['ActionType'] = buttonType;
            if (buttonType == null)
                continue;
            else if (buttonType == "write_back" && buttonContext == "record" && actionItem['Foreground'] == "true")
                actionItem['Destination'] = buttonGR.getValue("destination_screen");
            else if (buttonType == "write_back")
                actionItem['Context'] = this._getButtonContext(buttonContext);
            else {
                var buttonAction = this._getButtonAction(actionInstanceGR);
                actionItem['ButtonAction'] = buttonAction;
            }

            if (buttonType == "write_back" || buttonAction != null )
                actions.push(actionItem);
        }

        return actions;
    },

    _getButtonAction: function(actionInstanceGR) {
		var glideRecord = this._getRecordById(this.currentGR.getTableName(), this.currentGR.getUniqueValue());
        return JSON.parse(new SNC.SGButtonAction(actionInstanceGR, glideRecord).getJSONString());
    },

    _getButtonContext: function(buttonContext) {
		var contextGR = this._getRecordById(this.currentGR.getTableName(), this.currentGR.getUniqueValue());
		if (buttonContext == "record")
			return JSON.parse(new SNC.SGContext(contextGR).getJSONString());
		else
			return JSON.parse(new SNC.SGContext().getJSONString());
    },

    _buildDeepLink: function(screen) {
        var deepLinkGenerator = new global.MobileDeepLinkGenerator("Agent");
        var recordTable = this.currentGR.getTableName();
        var recordId = this.currentGR.getUniqueValue();
        var deepLink = deepLinkGenerator.getFormScreenLink(screen, recordTable, recordId);
        return deepLink;
    },

    _buildLayout: function() {
        var layoutFieldGenerator = new global.NotificationLayoutFieldGenerator();
        var recordTable = this.currentGR.getTableName();
        var recordId = this.currentGR.getUniqueValue();
        var layout = {};
        // use layoutFields or if not provided use empty map
        var fieldMap = this.layoutFields || {};
        var idField = fieldMap["Identifier"];
        if (idField && this.currentGR.isValidField(idField))
            layout["Identifier"] = layoutFieldGenerator.layoutField(recordTable, recordId, idField);
        else
            layout["Identifier"] = layoutFieldGenerator.layoutField(recordTable, recordId, "sys_id");

        var shortDescField = fieldMap["Description"];
        if (shortDescField && this.currentGR.isValidField(shortDescField))
            layout["Description"] = layoutFieldGenerator.layoutField(recordTable, recordId, shortDescField);

        var statusField = fieldMap["Status"];
        if (statusField && this.currentGR.isValidField(statusField))
            layout["Status"] = layoutFieldGenerator.layoutField(recordTable, recordId, statusField);

        return layout;
    },

    _getActionInstanceGR: function(pushId, pushActionId) {
        var actionInstanceGR = new GlideRecord("sys_sg_push_action_instance");
        actionInstanceGR.addQuery("push_notification", pushId);
        actionInstanceGR.addQuery("push_action", pushActionId);
        actionInstanceGR.query();
        if (actionInstanceGR.next())
            return actionInstanceGR;

        return null;
    },

    _getRecordById: function(table_name, id) {
        var glideRecordById = new GlideRecord(table_name);
        glideRecordById.get(id);

        return glideRecordById;
    },

    _getRecordsByIdArray: function(table_name, id_array) {
        var glideRecordByArray = new GlideRecord(table_name);
        glideRecordByArray.addQuery('sys_id', 'IN', id_array);
        glideRecordByArray.orderBy('order');
        glideRecordByArray.query();
        return glideRecordByArray;
    },

	_toBoolean: function(fieldVal) {
		if(gs.nil(fieldVal))
			return false;
		return fieldVal == "1" || fieldVal.toLowerCase() == "true" ? true : false;
	},

    type: 'ActionablePushPayloadBuilder'
};
```