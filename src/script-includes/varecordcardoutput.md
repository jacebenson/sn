---
title: "VaRecordCardOutput"
id: "varecordcardoutput"
---

API Name: global.VaRecordCardOutput

```js
var VaRecordCardOutput = Class.create();
var FIELDS_LIMIT = 250;

VaRecordCardOutput.prototype = {
	
	initialize: function(columnNameLabels) {
		this.columnNameLabels = columnNameLabels;
	},
	
	build: function(refVar, tableName) {
		return this._buildCardData(refVar, tableName);
	},
	
	_buildCardData: function(refVar, tableName) {
		var jsonStr = "{}";
		var sysId = refVar.sys_id.toString();

		if (sysId) {
			if (!refVar.isValidRecord()) {
				refVar = new GlideRecordSecure(tableName);
				refVar.get(sysId);
			}
			var display_name = refVar.getClassDisplayValue();
			var display_id = refVar.getDisplayValue();
			jsonStr = this._generateJson(tableName, display_name, display_id, refVar, sysId);
		} else {
			return gs.getMessage("Can't find a valid record");
		}
		
		var outMsg = new sn_cs.SinglePartOutMsg();
		outMsg.setCardPart('Card', jsonStr);
		return outMsg;
	},
	
	_generateJson: function(tableName, display_name, display_id, refVar, sysId) {
		var jsonObj = {};
		jsonObj['table_name'] = tableName;
		jsonObj['title'] = display_name;
		jsonObj['subtitle'] = display_id;
		jsonObj['sys_id'] = "" + sysId;
		var fields = [];
		for (var key in this.columnNameLabels) {
			var fieldEntry = {};
			var label = key;
			var rec = refVar.getElement(label);
			//column could be null if user does not have proper permissions, so skip the column if that is the case
			if (!rec || rec == null)
				continue;
			var value = rec.getED().getLabel();

			if (refVar[label].getDisplayValue() != '') {
				var displayValue = gs.getMessage(refVar[label].getDisplayValue());

				if (displayValue.length > FIELDS_LIMIT) {
					displayValue = displayValue.substring(0, FIELDS_LIMIT);
					displayValue = displayValue + '...';
				}
				fieldEntry['fieldLabel'] = value;
				fieldEntry['fieldValue'] = displayValue;
				fields.push(fieldEntry);
			}
		}
		jsonObj['fields'] = fields;
		return JSON.stringify(jsonObj);
	},
	
	type: 'VaRecordCardOutput'
};
```