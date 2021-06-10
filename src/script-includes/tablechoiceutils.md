---
title: "TableChoiceUtils"
id: "tablechoiceutils"
---

API Name: global.TableChoiceUtils

```js
var TableChoiceUtils = Class.create();
TableChoiceUtils.prototype = {

    initialize: function(tableName) {
        this.tableName = tableName;
    },


    /*
    * This returns field choices (as a json object with (value, label) pairs) for the field name.
    */
    getChoicesForField: function(fieldName) {
        return this._getLabelsByValue(fieldName, null);
    },

    getLabelForFieldValue: function(fieldName, value) {
        return this._getLabelsByValue(fieldName, value)[value];
    },

    /*
    * Returns single label if value is not null,
    * else returns a json { 'value' : 'label'} for all possible values
    */
    _getLabelsByValue: function(fieldName, value) {

        var choicesValueToLabel = {};
        var sysChoice = new GlideSysChoice(this.tableName, fieldName);
        var choiceGr = sysChoice.getChoices();

        if (choiceGr == null)
            return null;

        while (choiceGr.next()) {
            var inactiveFlag = choiceGr.getValue('inactive');

            if (inactiveFlag == null || inactiveFlag == 0) {
                var choiceLabel = choiceGr.getValue('label');

                choicesValueToLabel[choiceGr.getValue('value')] = choiceLabel;

                if (value != null && choiceGr.getValue('value') == value)
                    break;
            }
        }

        return choicesValueToLabel;
    }
};
```